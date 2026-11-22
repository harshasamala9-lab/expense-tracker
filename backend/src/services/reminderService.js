import { OPEN_TASK_STATUSES } from '../constants/tasks.js';

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function isSnoozed(task, now) {
  return (
    task.snoozed_until && new Date(task.snoozed_until).getTime() > now.getTime()
  );
}

/**
 * Durable reminder engine.
 *
 * Each reminder is claimed by inserting a row into task_reminders under a
 * per-task/type/window advisory lock. The unique constraint is the final
 * guarantee, so two API instances, a restart, or a manual CLI run can never
 * send the same reminder twice.
 */
export class ReminderService {
  constructor({
    taskRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger = console,
    now = () => new Date(),
    options = {},
  }) {
    this.taskRepository = taskRepository;
    this.notificationService = notificationService;
    this.transactionManager = transactionManager;
    this.realtimeBus = realtimeBus;
    this.logger = logger;
    this.now = now;
    this.options = {
      dueSoonHours: 24,
      longRunningHours: 72,
      criticalAgeHours: 4,
      repeatedFailureThreshold: 3,
      ...options,
    };
  }

  async run() {
    const now = this.now();
    const candidates = await this.taskRepository.findReminderCandidates(
      this.options,
    );
    const counts = {
      overdue: 0,
      dueSoon: 0,
      critical: 0,
      longRunning: 0,
      repeatedFailure: 0,
      skipped: 0,
      failed: 0,
    };

    for (const task of candidates.overdue) {
      const sent = await this.deliver(task, {
        type: 'OVERDUE',
        windowKey: `overdue:${dayKey(now)}`,
        severity: 'HIGH',
        title: `Task overdue: ${task.title}`,
        message: task.due_at
          ? `This task was due on ${task.due_at}.`
          : 'This task is overdue.',
      });
      this.tally(counts, 'overdue', sent);
    }

    for (const task of candidates.dueSoon) {
      const windowKey = `due-soon:${String(task.due_at).slice(0, 10)}`;
      const sent = await this.deliver(task, {
        type: 'DUE_SOON',
        windowKey,
        severity: 'WARNING',
        title: `Task due soon: ${task.title}`,
        message: task.due_at
          ? `This task is due on ${task.due_at}.`
          : 'This task is due soon.',
      });
      this.tally(counts, 'dueSoon', sent);
    }

    for (const task of candidates.critical) {
      const sent = await this.deliver(task, {
        type: 'CRITICAL',
        windowKey: `critical:${dayKey(now)}`,
        severity: 'CRITICAL',
        title: `Critical task still open: ${task.title}`,
        message:
          task.description ||
          'A critical task has remained open and needs immediate attention.',
      });
      this.tally(counts, 'critical', sent);
    }

    for (const task of candidates.longRunning) {
      const sent = await this.deliver(task, {
        type: 'LONG_RUNNING',
        windowKey: `long-running:${dayKey(now)}`,
        severity: 'WARNING',
        title: `Task running for a long time: ${task.title}`,
        message: 'This task has been in progress for an extended period.',
      });
      this.tally(counts, 'longRunning', sent);
    }

    if (candidates.repeatedAutomationFailures) {
      const { latestTask, count } = candidates.repeatedAutomationFailures;
      const sent = await this.deliver(latestTask, {
        type: 'REPEATED_FAILURE',
        windowKey: `repeated-failure:${dayKey(now)}`,
        severity: 'HIGH',
        title: 'Repeated automation failures detected',
        message: `${count} open automation failure task${
          count === 1 ? '' : 's'
        } are waiting for review. Investigate the root cause instead of retrying blindly.`,
      });
      this.tally(counts, 'repeatedFailure', sent);
    }

    return counts;
  }

  tally(counts, key, outcome) {
    if (outcome === 'sent') {
      counts[key] += 1;
    } else if (outcome === 'failed') {
      counts.failed += 1;
    } else if (outcome === 'skipped') {
      counts.skipped += 1;
    }
  }

  async deliver(task, { type, windowKey, title, message, severity }) {
    try {
      const result = await this.transactionManager.run(
        async (client) => {
          const current = await this.taskRepository.findById(task.id, client, {
            forUpdate: true,
          });

          if (
            !current ||
            !OPEN_TASK_STATUSES.includes(current.status) ||
            isSnoozed(current, this.now())
          ) {
            return { skipped: true, reason: 'task_not_eligible' };
          }

          const reminder = await this.taskRepository.insertReminder(
            {
              task_id: current.id,
              reminder_type: type,
              window_key: windowKey,
              metadata: {
                priority: current.priority,
                dueAt: current.due_at,
              },
            },
            client,
          );

          if (!reminder) {
            return { skipped: true, reason: 'already_sent' };
          }

          const notifications = await this.notificationService.notifyAdmins(
            {
              task_id: current.id,
              notification_type: type,
              title,
              message,
              severity,
              deduplication_key: `reminder:${type}:${current.id}:${windowKey}`,
              action_type: 'TASK',
              action_id: current.id,
              metadata: {
                reminderType: type,
                windowKey,
                priority: current.priority,
              },
            },
            client,
          );

          await this.taskRepository.addActivity(
            {
              task_id: current.id,
              actor_id: null,
              action: 'REMINDER_SENT',
              new_value: { reminder_type: type, window_key: windowKey },
              description: `Reminder sent: ${type}.`,
            },
            client,
          );

          return { reminder, notifications, task: current };
        },
        {
          advisoryLockKey: `reminder:${task.id}:${type}:${windowKey}`,
        },
      );

      if (result.skipped) {
        return 'skipped';
      }

      this.notificationService.publish(result.notifications);
      this.realtimeBus.publish({
        type: 'task.reminder',
        data: {
          taskId: result.task.id,
          reminderType: type,
          windowKey,
        },
      });

      return 'sent';
    } catch (error) {
      this.logger.error(
        `[reminders] Could not deliver ${type} reminder for task ${task.id}:`,
        error.message,
      );
      return 'failed';
    }
  }
}

/**
 * Restart-safe interval worker. The durable reminder/event tables are the
 * source of truth; this helper only schedules work inside one process.
 */
export function createIntervalWorker({
  name,
  intervalMs,
  run,
  logger = console,
  runOnStart = true,
  startDelayMs = 5_000,
}) {
  let timer = null;
  let startupTimer = null;
  let running = false;
  let stopped = true;

  async function trigger() {
    if (running) {
      logger.warn(`[worker:${name}] Previous run is still active; skipping.`);
      return null;
    }

    running = true;

    try {
      const result = await run();
      return result;
    } catch (error) {
      logger.error(`[worker:${name}] Run failed:`, error);
      return null;
    } finally {
      running = false;
    }
  }

  return {
    name,

    start() {
      if (!stopped) {
        return;
      }

      stopped = false;

      if (runOnStart) {
        startupTimer = setTimeout(() => {
          void trigger();
        }, startDelayMs);
        startupTimer.unref?.();
      }

      timer = setInterval(() => {
        void trigger();
      }, intervalMs);
      timer.unref?.();

      logger.log(
        `[worker:${name}] Started (every ${Math.round(intervalMs / 1000)}s).`,
      );
    },

    stop() {
      stopped = true;

      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
    },

    trigger,
  };
}
