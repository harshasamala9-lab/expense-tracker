import { AppError } from '../utils/AppError.js';

const RETRY_BASE_MS = 60_000;
const RETRY_MAX_MS = 60 * 60_000;

function dueInHours(hours, now = new Date()) {
  return new Date(now.getTime() + hours * 60 * 60_000).toISOString();
}

function fileLabel(payload) {
  return payload?.fileName ? ` — ${payload.fileName}` : '';
}

function compactMetadata(event) {
  const payload = event.payload ?? {};
  const metadata = {
    eventId: event.event_id,
    eventType: event.event_type,
    occurredAt: event.occurred_at ?? event.received_at ?? null,
  };

  for (const key of [
    'runId',
    'fileName',
    'importedCount',
    'skippedCount',
    'failedCount',
    'parseErrorCount',
    'categorizationRequiredCount',
    'rowCount',
    'status',
    'sourceId',
    'errorSummary',
  ]) {
    if (payload[key] !== undefined && payload[key] !== null) {
      metadata[key] = payload[key];
    }
  }

  return metadata;
}

/**
 * Translates durable automation events into administrator tasks.
 *
 * The event row and the generated task are committed in the same PostgreSQL
 * transaction while a per-event advisory lock is held. A crash between the two
 * writes is therefore impossible, and two API instances processing the same
 * event cannot both create a task.
 */
export class TaskEventService {
  constructor({
    taskService,
    eventRepository,
    expenseRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger = console,
    now = () => new Date(),
    maxAttempts = 10,
  }) {
    this.taskService = taskService;
    this.eventRepository = eventRepository;
    this.expenseRepository = expenseRepository;
    this.notificationService = notificationService;
    this.transactionManager = transactionManager;
    this.realtimeBus = realtimeBus;
    this.logger = logger;
    this.now = now;
    this.maxAttempts = maxAttempts;
  }

  async receive(event) {
    const { event: stored, created } = await this.eventRepository.enqueue({
      event_id: event.eventId,
      event_type: event.eventType,
      source: event.source,
      payload: event.payload,
    });

    if (!created) {
      return {
        accepted: true,
        duplicate: true,
        processed: ['processed', 'ignored'].includes(stored?.status),
        eventId: stored?.event_id ?? event.eventId,
      };
    }

    const result = await this.processEvent(event.eventId);

    return {
      accepted: true,
      duplicate: false,
      eventId: event.eventId,
      processed: result.processed ?? false,
      queued: result.queued ?? false,
      taskIds: result.tasks?.map((task) => task.id) ?? [],
    };
  }

  async processEvent(eventId) {
    const existing = await this.eventRepository.findByEventId(eventId);

    if (!existing) {
      throw new AppError(404, 'Automation event not found.');
    }

    if (['processed', 'ignored'].includes(existing.status)) {
      return { processed: true, skipped: true, reason: existing.status };
    }

    try {
      const result = await this.transactionManager.run(
        async (client) => {
          const event = await this.eventRepository.findByEventId(
            eventId,
            client,
            { forUpdate: true },
          );

          if (!event || ['processed', 'ignored'].includes(event.status)) {
            return { skipped: true, processed: true };
          }

          const inputs = await this.buildTaskInputs(event, client);

          if (inputs.length === 0) {
            await this.eventRepository.markIgnored(
              event.id,
              'No administrator action required.',
              client,
            );
            return { event, tasks: [], notifications: [], ignored: true };
          }

          const tasks = [];
          const notifications = [];

          for (const input of inputs) {
            const taskResult = await this.taskService.createWithinTransaction(
              input,
              { client, actor: null },
            );

            if (taskResult.task) {
              tasks.push(taskResult.task);
            }
            notifications.push(...taskResult.notifications);
          }

          await this.eventRepository.markProcessed(
            event.id,
            tasks[0]?.id ?? null,
            client,
          );

          return { event, tasks, notifications };
        },
        { advisoryLockKey: `automation-event:${eventId}` },
      );

      if (result.skipped) {
        return { processed: false, skipped: true, reason: result.reason };
      }

      this.notificationService.publish(result.notifications);
      for (const task of result.tasks) {
        this.realtimeBus.publish({ type: 'task.created', data: task });
      }

      return {
        processed: true,
        ignored: result.ignored ?? false,
        tasks: result.tasks,
      };
    } catch (error) {
      const attempts = (existing.attempts ?? 0) + 1;
      const delay = Math.min(RETRY_BASE_MS * 2 ** (attempts - 1), RETRY_MAX_MS);
      const nextAttemptAt = new Date(
        this.now().getTime() + delay,
      ).toISOString();

      try {
        if (attempts >= this.maxAttempts) {
          await this.eventRepository.markIgnored(
            existing.id,
            `Retry limit reached: ${error.message}`.slice(0, 1000),
          );
        } else {
          await this.eventRepository.markFailed(
            existing.id,
            String(error.message ?? 'Unknown event processing error').slice(
              0,
              1000,
            ),
            nextAttemptAt,
          );
        }
      } catch (recordError) {
        this.logger.error(
          '[tasks] Could not record automation event failure:',
          recordError,
        );
      }

      this.logger.error(
        `[tasks] Automation event ${eventId} failed:`,
        error.message,
      );

      return {
        processed: false,
        queued: true,
        failed: true,
        error: error.message,
      };
    }
  }

  async processPending(limit = 20) {
    const eventIds = await this.eventRepository.listPendingIds(limit);
    const results = [];

    for (const eventId of eventIds) {
      results.push({
        eventId,
        ...(await this.processEvent(eventId)),
      });
    }

    return {
      attempted: results.length,
      processed: results.filter((item) => item.processed).length,
      failed: results.filter((item) => item.failed).length,
      results,
    };
  }

  async buildTaskInputs(event, client) {
    const payload = event.payload ?? {};
    const label = fileLabel(payload);
    const base = {
      source_type: 'automation_event',
      source_id: event.event_id,
      metadata: compactMetadata(event),
    };

    const single = (index, fields) => [
      {
        ...base,
        ...fields,
        idempotency_key: `automation:${event.event_id}:${index}`,
      },
    ];

    switch (event.event_type) {
      case 'IMPORT_FAILED':
        return single(0, {
          title: `Import failed${label}`,
          description:
            payload.errorSummary ||
            'The automated CSV import failed. Review the run and retry it after fixing the source file.',
          task_type: 'IMPORT_FAILURE',
          priority: 'HIGH',
          due_at: dueInHours(24, this.now()),
          notification: {
            type: 'IMPORT_FAILURE',
            severity: 'HIGH',
            title: 'Automated import failed',
            message:
              payload.errorSummary ||
              `The import${label ? ` of ${payload.fileName}` : ''} failed and needs review.`,
          },
        });

      case 'PARSING_FAILED':
        return single(0, {
          title: `CSV parsing failed${label}`,
          description:
            payload.errorSummary ||
            'Rows in an automated CSV import could not be parsed. Check the file format and column headers.',
          task_type: 'PARSING_ERROR',
          priority: 'HIGH',
          due_at: dueInHours(24, this.now()),
          notification: {
            type: 'IMPORT_FAILURE',
            severity: 'HIGH',
            title: 'CSV parsing failed',
            message:
              payload.errorSummary ||
              `The file${label ? ` ${payload.fileName}` : ''} could not be parsed.`,
          },
        });

      case 'AUTOMATION_FAILED':
        return single(0, {
          title: `Automation service failure${label}`,
          description:
            payload.errorSummary ||
            'The Python automation service reported a failure. Check its logs and rerun the job.',
          task_type: 'AUTOMATION_FAILURE',
          priority: 'HIGH',
          due_at: dueInHours(12, this.now()),
          notification: {
            type: 'AUTOMATION_FAILURE',
            severity: 'HIGH',
            title: 'Automation service failure',
            message:
              payload.errorSummary ||
              'The automation service reported a failure that needs review.',
          },
        });

      case 'CATEGORIZATION_REQUIRED': {
        const count = Number(payload.categorizationRequiredCount ?? 0);
        if (count <= 0) {
          return [];
        }

        return single(0, {
          title: `Categorization review required${label}`,
          description: `${count} imported transaction${
            count === 1 ? '' : 's'
          } could not be categorized confidently. Review them and assign the correct category.`,
          task_type: 'CATEGORIZATION_REVIEW',
          priority: 'NORMAL',
          due_at: dueInHours(48, this.now()),
          notification: {
            type: 'EXPENSE_REVIEW',
            severity: 'WARNING',
            title: 'Categorization review required',
            message: `${count} imported transaction${
              count === 1 ? '' : 's'
            } need a category.`,
          },
        });
      }

      case 'TRANSACTION_REQUIRES_REVIEW':
      case 'EXPENSE_REVIEW_REQUIRED':
        return single(0, {
          title: `Expense review required${label}`,
          description:
            payload.errorSummary ||
            'An imported transaction needs an administrator to review it before it is trusted.',
          task_type: 'EXPENSE_REVIEW',
          priority: 'HIGH',
          due_at: dueInHours(24, this.now()),
          notification: {
            type: 'EXPENSE_REVIEW',
            severity: 'HIGH',
            title: 'Expense review required',
            message:
              payload.errorSummary ||
              'An imported transaction needs administrator review.',
          },
        });

      case 'SYSTEM_INCIDENT':
        return single(0, {
          title: `System incident${label}`,
          description:
            payload.errorSummary ||
            'The automation service reported a system incident. Investigate immediately.',
          task_type: 'SYSTEM_INCIDENT',
          priority: 'CRITICAL',
          due_at: dueInHours(4, this.now()),
          notification: {
            type: 'SYSTEM_ALERT',
            severity: 'CRITICAL',
            title: 'System incident reported',
            message:
              payload.errorSummary ||
              'A system incident was reported by the automation service.',
          },
        });

      case 'IMPORT_COMPLETED':
        return this.buildImportCompletedInputs(event, client);

      case 'IMPORT_STARTED':
      default:
        return [];
    }
  }

  async buildImportCompletedInputs(event, client) {
    const payload = event.payload ?? {};
    const label = fileLabel(payload);
    const inputs = [];

    const failedCount = Number(payload.failedCount ?? 0);
    const skippedCount = Number(payload.skippedCount ?? 0);
    const parseErrorCount = Number(payload.parseErrorCount ?? 0);
    const categorizationCount = Number(
      payload.categorizationRequiredCount ?? 0,
    );
    const needsReconciliation =
      failedCount > 0 ||
      skippedCount > 0 ||
      parseErrorCount > 0 ||
      categorizationCount > 0;

    const base = {
      source_type: 'automation_event',
      source_id: event.event_id,
      metadata: compactMetadata(event),
    };

    if (needsReconciliation) {
      inputs.push({
        ...base,
        title: `Reconcile import${label}`,
        description: `The import completed with ${payload.importedCount ?? 0} imported, ${skippedCount} skipped, ${failedCount} failed, ${parseErrorCount} parsing error${
          parseErrorCount === 1 ? '' : 's'
        } and ${categorizationCount} row${
          categorizationCount === 1 ? '' : 's'
        } needing categorization. Reconcile the run and correct any rejected rows.`,
        task_type: 'IMPORT_RECONCILIATION',
        priority: failedCount > 0 || parseErrorCount > 0 ? 'HIGH' : 'NORMAL',
        due_at: dueInHours(48, this.now()),
        idempotency_key: `automation:${event.event_id}:reconcile`,
        notification: {
          type: 'IMPORT_FAILURE',
          severity: failedCount > 0 || parseErrorCount > 0 ? 'HIGH' : 'WARNING',
          title: 'Import completed with issues',
          message: `An import completed with ${failedCount} failed and ${skippedCount} skipped row${
            skippedCount === 1 ? '' : 's'
          }.`,
        },
      });
    }

    const runId = payload.runId;
    if (
      runId &&
      typeof this.expenseRepository.findDuplicatePairsForImportRun === 'function'
    ) {
      const pairs = await this.expenseRepository.findDuplicatePairsForImportRun(
        runId,
        client,
      );

      for (const pair of pairs.slice(0, 10)) {
        const { expense, duplicateIds } = pair;
        const keyIds = [expense.id, ...duplicateIds].sort();
        inputs.push({
          source_type: 'import_run',
          source_id: runId,
          title: `Possible duplicate imported expense: ${expense.category} ${Number(
            expense.amount,
          ).toFixed(2)} on ${expense.expense_date}`,
          description:
            'Two or more imported expenses share the same amount, category, date and description. Review both records. Nothing was deleted automatically.',
          task_type: 'DUPLICATE_EXPENSE',
          priority: 'HIGH',
          due_at: dueInHours(24, this.now()),
          idempotency_key: `expense-duplicate:${keyIds[0]}:${keyIds[1]}`,
          metadata: {
            ...compactMetadata(event),
            primaryExpenseId: expense.id,
            duplicateExpenseIds: duplicateIds,
            amount: Number(expense.amount),
            category: expense.category,
            expenseDate: expense.expense_date,
          },
          notification: {
            type: 'EXPENSE_REVIEW',
            severity: 'HIGH',
            title: 'Possible duplicate imported expense',
            message: `${expense.category} ${Number(expense.amount).toFixed(
              2,
            )} on ${expense.expense_date} appears more than once. Review the records; nothing was deleted.`,
          },
        });
      }
    }

    return inputs;
  }

  /**
   * Called after a manually created expense. Duplicate expenses are flagged in
   * a task and notification, never deleted or modified.
   */
  async handleExpenseCreated(expense) {
    if (
      !this.expenseRepository ||
      typeof this.expenseRepository.findPotentialDuplicates !== 'function'
    ) {
      return null;
    }

    const duplicates = await this.expenseRepository.findPotentialDuplicates(
      expense,
    );

    if (duplicates.length === 0) {
      return null;
    }

    const amount = Number(expense.amount).toFixed(2);

    return this.taskService.createSystemTask({
      title: `Possible duplicate expense: ${expense.category} ${amount} on ${expense.expense_date}`,
      description:
        'This expense matches one or more recent expenses with the same amount, category, date and description. Review the records and remove a duplicate manually only if it is truly duplicated. Nothing was deleted automatically.',
      task_type: 'DUPLICATE_EXPENSE',
      priority: 'HIGH',
      source_type: 'expense',
      source_id: expense.id,
      idempotency_key: `expense-duplicate:${expense.id}`,
      due_at: dueInHours(24, this.now()),
      metadata: {
        expenseId: expense.id,
        amount: Number(expense.amount),
        category: expense.category,
        expenseDate: expense.expense_date,
        duplicateExpenseIds: duplicates.map((item) => item.id),
      },
      notification: {
        type: 'EXPENSE_REVIEW',
        severity: 'HIGH',
        title: 'Possible duplicate expense detected',
        message: `A ${expense.category} expense of ${amount} on ${expense.expense_date} looks like ${duplicates.length} existing record${
          duplicates.length === 1 ? '' : 's'
        }. Review it; nothing was deleted.`,
      },
    });
  }
}
