import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { OPEN_TASK_STATUSES, priorityToSeverity } from '../constants/tasks.js';

function assertOpen(task) {
  if (!OPEN_TASK_STATUSES.includes(task.status)) {
    throw new AppError(
      409,
      `This task is already ${task.status.toLowerCase()} and cannot be changed.`,
    );
  }
}

function isNoopTransition(task, status) {
  return task.status === status;
}

/**
 * Business rules for administrator tasks.
 *
 * Every mutation runs inside a transaction supplied by TransactionManager and
 * publishes realtime events only after that transaction commits. Task creation
 * is idempotent at both the service layer (lookup) and the database layer
 * (unique constraint), so a retried event can never create a second task.
 */
export class TaskService {
  constructor({
    taskRepository,
    userRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger = console,
    now = () => new Date(),
  }) {
    this.taskRepository = taskRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
    this.transactionManager = transactionManager;
    this.realtimeBus = realtimeBus;
    this.logger = logger;
    this.now = now;
  }

  async list(filters) {
    return this.taskRepository.list(filters);
  }

  async getSummary() {
    return this.taskRepository.getSummary();
  }

  async getById(id) {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new AppError(404, 'Task not found.');
    }

    const activities = await this.taskRepository.listActivities(id);
    return { task, activities };
  }

  async create(input, actor) {
    const idempotencyKey = input.idempotency_key || `manual:${randomUUID()}`;

    const result = await this.transactionManager.run(async (client) =>
      this.createWithinTransaction(
        {
          ...input,
          idempotency_key: idempotencyKey,
          source_type: 'manual',
          source_id: null,
          created_by: actor?.id ?? null,
        },
        { client, actor },
      ),
    );

    this.publishResult(result);
    return result;
  }

  /**
   * Used by the automation event engine and duplicate-expense detector.
   * The caller may already hold a transaction, so no new transaction is opened.
   */
  async createSystemTask(input, { client = null, actor = null } = {}) {
    const result = await this.createWithinTransaction(
      {
        ...input,
        created_by: input.created_by ?? null,
      },
      { client, actor },
    );

    this.publishResult(result);
    return result;
  }

  /**
   * Core idempotent insert. Must be called with a transaction client whenever
   * the caller needs the task and the event bookkeeping to commit atomically.
   */
  async createWithinTransaction(input, { client = null, actor = null } = {}) {
    const task = await this.taskRepository.create(
      {
        title: input.title,
        description: input.description ?? '',
        task_type: input.task_type ?? 'GENERAL',
        status: 'PENDING',
        priority: input.priority ?? 'NORMAL',
        source_type: input.source_type ?? 'manual',
        source_id: input.source_id ?? null,
        idempotency_key: input.idempotency_key,
        assigned_to: input.assigned_to ?? null,
        created_by: input.created_by ?? actor?.id ?? null,
        due_at: input.due_at ?? null,
        snoozed_until: input.snoozed_until ?? null,
        metadata: input.metadata ?? {},
      },
      client,
    );

    if (!task) {
      const existing = await this.taskRepository.findByIdempotencyKey(
        input.idempotency_key,
        client,
      );

      if (!existing) {
        throw new AppError(
          409,
          'A task with this idempotency key already exists.',
        );
      }

      return { task: existing, created: false, notifications: [] };
    }

    await this.taskRepository.addActivity(
      {
        task_id: task.id,
        actor_id: actor?.id ?? null,
        action: 'CREATED',
        new_value: {
          status: task.status,
          priority: task.priority,
          task_type: task.task_type,
        },
        description: input.activity_description ?? 'Task created.',
      },
      client,
    );

    const notifications = [];
    const custom = input.notification ?? {};

    const createdNotifications = await this.notificationService.notifyAdmins(
      {
        task_id: task.id,
        notification_type: custom.type ?? 'TASK_CREATED',
        title: custom.title ?? `New task: ${task.title}`,
        message:
          custom.message ??
          task.description ??
          'A new task needs administrator attention.',
        severity: custom.severity ?? priorityToSeverity(task.priority),
        deduplication_key: `task-created:${task.id}`,
        action_type: 'TASK',
        action_id: task.id,
        metadata: {
          taskType: task.task_type,
          priority: task.priority,
          sourceType: task.source_type,
        },
      },
      client,
    );

    notifications.push(...createdNotifications);

    if (task.assigned_to) {
      const assigned = await this.notificationService.createForRecipients(
        [task.assigned_to],
        {
          task_id: task.id,
          notification_type: 'TASK_ASSIGNED',
          title: `Task assigned: ${task.title}`,
          message: custom.assigneeMessage ?? 'This task was assigned to you.',
          severity: priorityToSeverity(task.priority),
          deduplication_key: `task-assigned:${task.id}:${task.assigned_to}`,
          action_type: 'TASK',
          action_id: task.id,
          metadata: { taskType: task.task_type, priority: task.priority },
        },
        client,
      );

      notifications.push(...assigned);
    }

    return { task, created: true, notifications };
  }

  async update(id, fields, actor) {
    const result = await this.transactionManager.run(async (client) => {
      const task = await this.taskRepository.findById(id, client, {
        forUpdate: true,
      });

      if (!task) {
        throw new AppError(404, 'Task not found.');
      }

      assertOpen(task);

      const previous = {};
      for (const key of Object.keys(fields)) {
        previous[key] = task[key];
      }

      const updated = await this.taskRepository.update(id, fields, client);
      await this.taskRepository.addActivity(
        {
          task_id: id,
          actor_id: actor?.id ?? null,
          action: 'UPDATED',
          previous_value: previous,
          new_value: fields,
          description: 'Task details updated.',
        },
        client,
      );

      const notifications = [];
      if (fields.priority === 'CRITICAL' && task.priority !== 'CRITICAL') {
        const created = await this.notificationService.notifyAdmins(
          {
            task_id: id,
            notification_type: 'TASK_CRITICAL',
            title: `Critical task: ${updated.title}`,
            message:
              updated.description ||
              'This task was escalated to critical priority.',
            severity: 'CRITICAL',
            deduplication_key: `task-critical:${id}`,
            action_type: 'TASK',
            action_id: id,
            metadata: { taskType: updated.task_type, priority: 'CRITICAL' },
          },
          client,
        );

        notifications.push(...created);
      }

      return { task: updated, previous, notifications, changed: true };
    });

    this.publishResult(result);
    return result;
  }

  async start(id, actor, note = null) {
    return this.transition(id, {
      actor,
      note,
      toStatus: 'IN_PROGRESS',
      activityAction: 'STARTED',
      activityDescription: 'Task work started.',
      apply(task) {
        return { status: 'IN_PROGRESS', started_at: new Date().toISOString() };
      },
      idempotent: (task) => isNoopTransition(task, 'IN_PROGRESS'),
    });
  }

  async complete(id, actor, note = null) {
    return this.transition(id, {
      actor,
      note,
      toStatus: 'COMPLETED',
      activityAction: 'COMPLETED',
      activityDescription: 'Task completed.',
      apply() {
        return {
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          completed_by: actor?.id ?? null,
        };
      },
      idempotent: (task) => isNoopTransition(task, 'COMPLETED'),
      notification: {
        type: 'TASK_STATUS_CHANGED',
        title: (task) => `Task completed: ${task.title}`,
        message: 'An administrator marked this task completed.',
        dedupSuffix: ':completed',
      },
    });
  }

  async cancel(id, actor, note = null) {
    return this.transition(id, {
      actor,
      note,
      toStatus: 'CANCELLED',
      activityAction: 'CANCELLED',
      activityDescription: 'Task cancelled.',
      apply() {
        return {
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          cancelled_by: actor?.id ?? null,
        };
      },
      idempotent: (task) => isNoopTransition(task, 'CANCELLED'),
      notification: {
        type: 'TASK_STATUS_CHANGED',
        title: (task) => `Task cancelled: ${task.title}`,
        message: 'An administrator cancelled this task.',
        dedupSuffix: ':cancelled',
      },
    });
  }

  async transition(id, options) {
    const result = await this.transactionManager.run(async (client) => {
      const task = await this.taskRepository.findById(id, client, {
        forUpdate: true,
      });

      if (!task) {
        throw new AppError(404, 'Task not found.');
      }

      if (options.idempotent(task)) {
        return { task, changed: false, notifications: [] };
      }

      assertOpen(task);

      const fields = options.apply(task);
      if (options.note) {
        fields.resolution_note = options.note;
      }

      const updated = await this.taskRepository.update(id, fields, client);

      await this.taskRepository.addActivity(
        {
          task_id: id,
          actor_id: options.actor?.id ?? null,
          action: options.activityAction,
          previous_value: { status: task.status },
          new_value: { status: updated.status },
          description: options.note
            ? `${options.activityDescription} Note: ${options.note}`
            : options.activityDescription,
        },
        client,
      );

      const notifications = [];
      if (options.notification) {
        const created = await this.notificationService.notifyAdmins(
          {
            task_id: id,
            notification_type: options.notification.type,
            title: options.notification.title(updated),
            message: options.notification.message,
            severity: priorityToSeverity(updated.priority),
            deduplication_key: `task-status:${id}${options.notification.dedupSuffix}`,
            action_type: 'TASK',
            action_id: id,
            metadata: {
              taskType: updated.task_type,
              status: updated.status,
            },
          },
          client,
        );

        notifications.push(...created);
      }

      return { task: updated, changed: true, notifications };
    });

    this.publishResult(result);
    return result;
  }

  async assign(id, assignedTo, actor) {
    const result = await this.transactionManager.run(async (client) => {
      const task = await this.taskRepository.findById(id, client, {
        forUpdate: true,
      });

      if (!task) {
        throw new AppError(404, 'Task not found.');
      }

      assertOpen(task);

      if (task.assigned_to === assignedTo) {
        return { task, changed: false, notifications: [] };
      }

      if (assignedTo) {
        const assignee = await this.userRepository.findById(assignedTo, client);

        if (!assignee || assignee.role !== 'admin') {
          throw new AppError(
            400,
            'The assigned administrator does not exist or is not an admin.',
          );
        }
      }

      const updated = await this.taskRepository.update(
        id,
        { assigned_to: assignedTo },
        client,
      );

      await this.taskRepository.addActivity(
        {
          task_id: id,
          actor_id: actor?.id ?? null,
          action: assignedTo ? 'ASSIGNED' : 'UNASSIGNED',
          previous_value: { assigned_to: task.assigned_to },
          new_value: { assigned_to: assignedTo },
          description: assignedTo
            ? 'Task assigned to an administrator.'
            : 'Task unassigned.',
        },
        client,
      );

      const notifications = [];
      if (assignedTo) {
        const created = await this.notificationService.createForRecipients(
          [assignedTo],
          {
            task_id: id,
            notification_type: 'TASK_ASSIGNED',
            title: `Task assigned: ${updated.title}`,
            message:
              updated.description || 'An administrator assigned this task to you.',
            severity: priorityToSeverity(updated.priority),
            deduplication_key: `task-assigned:${id}:${assignedTo}`,
            action_type: 'TASK',
            action_id: id,
            metadata: {
              taskType: updated.task_type,
              priority: updated.priority,
            },
          },
          client,
        );

        notifications.push(...created);
      }

      return { task: updated, changed: true, notifications };
    });

    this.publishResult(result);
    return result;
  }

  async addNote(id, note, actor) {
    const result = await this.transactionManager.run(async (client) => {
      const task = await this.taskRepository.findById(id, client, {
        forUpdate: true,
      });

      if (!task) {
        throw new AppError(404, 'Task not found.');
      }

      const activity = await this.taskRepository.addActivity(
        {
          task_id: id,
          actor_id: actor?.id ?? null,
          action: 'NOTE_ADDED',
          new_value: { note },
          description: note,
        },
        client,
      );

      const updated = await this.taskRepository.update(id, {}, client);
      return { task: updated, activity, changed: true, notifications: [] };
    });

    this.publishResult(result);
    return result;
  }

  publishResult(result) {
    if (!result) {
      return;
    }

    this.notificationService.publish(result.notifications);

    if (result.task && result.changed) {
      this.realtimeBus.publish({
        type: 'task.updated',
        data: result.task,
      });
    }
  }
}
