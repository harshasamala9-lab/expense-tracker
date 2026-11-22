import { randomUUID } from 'node:crypto';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

const PRIORITY_RANK = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

/**
 * Deterministic task store for automated tests. It mirrors the PostgreSQL
 * repository contract, including idempotency and reminder uniqueness.
 */
export class InMemoryTaskRepository {
  constructor(seed = [], { now = () => new Date() } = {}) {
    this.now = now;
    this.tasks = [];
    this.activities = [];
    this.reminders = [];

    for (const task of seed) {
      this.tasks.push({
        id: task.id ?? randomUUID(),
        title: task.title ?? 'Seeded task',
        description: task.description ?? '',
        task_type: task.task_type ?? 'GENERAL',
        status: task.status ?? 'PENDING',
        priority: task.priority ?? 'NORMAL',
        source_type: task.source_type ?? 'manual',
        source_id: task.source_id ?? null,
        idempotency_key: task.idempotency_key ?? `seed:${randomUUID()}`,
        assigned_to: task.assigned_to ?? null,
        created_by: task.created_by ?? null,
        due_at: task.due_at ?? null,
        snoozed_until: task.snoozed_until ?? null,
        started_at: task.started_at ?? null,
        completed_at: task.completed_at ?? null,
        completed_by: task.completed_by ?? null,
        cancelled_at: task.cancelled_at ?? null,
        cancelled_by: task.cancelled_by ?? null,
        resolution_note: task.resolution_note ?? null,
        metadata: task.metadata ?? {},
        created_at: task.created_at ?? this.now().toISOString(),
        updated_at: task.updated_at ?? task.created_at ?? this.now().toISOString(),
      });
    }
  }

  snapshot() {
    return {
      tasks: clone(this.tasks),
      activities: clone(this.activities),
      reminders: clone(this.reminders),
    };
  }

  restore(snapshot) {
    if (!snapshot) {
      return;
    }

    this.tasks = snapshot.tasks;
    this.activities = snapshot.activities;
    this.reminders = snapshot.reminders;
  }

  async create(input) {
    const existing = this.tasks.find(
      (task) => task.idempotency_key === input.idempotency_key,
    );

    if (existing) {
      return null;
    }

    const timestamp = this.now().toISOString();
    const task = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? '',
      task_type: input.task_type ?? 'GENERAL',
      status: input.status ?? 'PENDING',
      priority: input.priority ?? 'NORMAL',
      source_type: input.source_type ?? 'manual',
      source_id: input.source_id ?? null,
      idempotency_key: input.idempotency_key,
      assigned_to: input.assigned_to ?? null,
      created_by: input.created_by ?? null,
      due_at: input.due_at ?? null,
      snoozed_until: input.snoozed_until ?? null,
      started_at: null,
      completed_at: null,
      completed_by: null,
      cancelled_at: null,
      cancelled_by: null,
      resolution_note: null,
      metadata: clone(input.metadata ?? {}),
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.tasks.push(task);
    return clone(task);
  }

  async findById(id) {
    const task = this.tasks.find((item) => item.id === id);
    return task ? clone(task) : null;
  }

  async findByIdempotencyKey(idempotencyKey) {
    const task = this.tasks.find(
      (item) => item.idempotency_key === idempotencyKey,
    );
    return task ? clone(task) : null;
  }

  async findOpenBySource(sourceType, sourceId) {
    if (!sourceId) {
      return null;
    }

    const task = this.tasks
      .filter(
        (item) =>
          item.source_type === sourceType &&
          item.source_id === sourceId &&
          ['PENDING', 'IN_PROGRESS'].includes(item.status),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    return task ? clone(task) : null;
  }

  async list(filters) {
    const now = this.now().getTime();
    let tasks = this.tasks.slice();

    if (filters.status) {
      tasks = tasks.filter((task) => task.status === filters.status);
    }

    if (filters.task_type) {
      tasks = tasks.filter((task) => task.task_type === filters.task_type);
    }

    if (filters.priority) {
      tasks = tasks.filter((task) => task.priority === filters.priority);
    }

    if (filters.assigned_to === 'unassigned') {
      tasks = tasks.filter((task) => !task.assigned_to);
    } else if (filters.assigned_to) {
      tasks = tasks.filter(
        (task) => task.assigned_to === filters.assigned_to,
      );
    }

    if (filters.overdue) {
      tasks = tasks.filter(
        (task) =>
          task.due_at &&
          new Date(task.due_at).getTime() < now &&
          ['PENDING', 'IN_PROGRESS'].includes(task.status),
      );
    }

    if (filters.search) {
      const search = normalize(filters.search);
      tasks = tasks.filter((task) =>
        [task.title, task.description, task.source_id]
          .map(normalize)
          .some((value) => value.includes(search)),
      );
    }

    tasks.sort((a, b) => {
      switch (filters.sort) {
        case 'oldest':
          return (
            a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
          );
        case 'priority':
          return (
            PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
            b.created_at.localeCompare(a.created_at)
          );
        case 'due':
          if (!a.due_at && !b.due_at) {
            return b.created_at.localeCompare(a.created_at);
          }
          if (!a.due_at) {
            return 1;
          }
          if (!b.due_at) {
            return -1;
          }
          return (
            a.due_at.localeCompare(b.due_at) ||
            b.created_at.localeCompare(a.created_at)
          );
        default:
          return (
            b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
          );
      }
    });

    const total = tasks.length;
    const start = (filters.page - 1) * filters.pageSize;

    return {
      tasks: tasks
        .slice(start, start + filters.pageSize)
        .map((task) => clone(task)),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
      },
    };
  }

  async getSummary() {
    const now = this.now().getTime();
    const open = (task) => ['PENDING', 'IN_PROGRESS'].includes(task.status);

    return {
      totalPending: this.tasks.filter((task) => task.status === 'PENDING')
        .length,
      inProgress: this.tasks.filter((task) => task.status === 'IN_PROGRESS')
        .length,
      completed: this.tasks.filter((task) => task.status === 'COMPLETED')
        .length,
      critical: this.tasks.filter(
        (task) => task.priority === 'CRITICAL' && open(task),
      ).length,
      overdue: this.tasks.filter(
        (task) =>
          open(task) &&
          task.due_at &&
          new Date(task.due_at).getTime() < now,
      ).length,
      createdToday: this.tasks.filter(
        (task) =>
          new Date(task.created_at).toISOString().slice(0, 10) ===
          this.now().toISOString().slice(0, 10),
      ).length,
      automationFailures: this.tasks.filter(
        (task) =>
          open(task) &&
          ['AUTOMATION_FAILURE', 'IMPORT_FAILURE', 'PARSING_ERROR'].includes(
            task.task_type,
          ),
      ).length,
    };
  }

  async update(id, fields) {
    const task = this.tasks.find((item) => item.id === id);
    if (!task) {
      return null;
    }

    Object.assign(task, fields, { updated_at: this.now().toISOString() });
    return clone(task);
  }

  async addActivity(activity) {
    const entry = {
      id: randomUUID(),
      task_id: activity.task_id,
      actor_id: activity.actor_id ?? null,
      action: activity.action,
      previous_value: activity.previous_value ?? null,
      new_value: activity.new_value ?? null,
      description: activity.description ?? null,
      created_at: this.now().toISOString(),
    };

    this.activities.push(entry);
    return clone(entry);
  }

  async listActivities(taskId) {
    return this.activities
      .filter((activity) => activity.task_id === taskId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((activity) => clone(activity));
  }

  async insertReminder(reminder) {
    const exists = this.reminders.some(
      (item) =>
        item.task_id === reminder.task_id &&
        item.reminder_type === reminder.reminder_type &&
        item.window_key === reminder.window_key,
    );

    if (exists) {
      return null;
    }

    const entry = {
      id: randomUUID(),
      task_id: reminder.task_id,
      reminder_type: reminder.reminder_type,
      window_key: reminder.window_key,
      sent_at: this.now().toISOString(),
      metadata: clone(reminder.metadata ?? {}),
    };

    this.reminders.push(entry);
    return clone(entry);
  }

  async findReminderCandidates({
    dueSoonHours = 24,
    longRunningHours = 72,
    criticalAgeHours = 4,
    repeatedFailureThreshold = 3,
  } = {}) {
    const now = this.now().getTime();
    const hour = 60 * 60 * 1000;
    const open = (task) => ['PENDING', 'IN_PROGRESS'].includes(task.status);
    const notSnoozed = (task) =>
      !task.snoozed_until || new Date(task.snoozed_until).getTime() <= now;

    const overdue = this.tasks.filter(
      (task) =>
        open(task) &&
        notSnoozed(task) &&
        task.due_at &&
        new Date(task.due_at).getTime() < now,
    );

    const dueSoon = this.tasks.filter(
      (task) =>
        open(task) &&
        notSnoozed(task) &&
        task.due_at &&
        new Date(task.due_at).getTime() >= now &&
        new Date(task.due_at).getTime() <= now + dueSoonHours * hour,
    );

    const critical = this.tasks.filter(
      (task) =>
        open(task) &&
        notSnoozed(task) &&
        task.priority === 'CRITICAL' &&
        new Date(task.created_at).getTime() <= now - criticalAgeHours * hour,
    );

    const longRunning = this.tasks.filter(
      (task) =>
        task.status === 'IN_PROGRESS' &&
        notSnoozed(task) &&
        new Date(task.started_at ?? task.updated_at).getTime() <=
          now - longRunningHours * hour,
    );

    const repeated = this.tasks
      .filter(
        (task) =>
          open(task) &&
          ['AUTOMATION_FAILURE', 'IMPORT_FAILURE', 'PARSING_ERROR'].includes(
            task.task_type,
          ),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return {
      overdue: overdue.map((task) => clone(task)),
      dueSoon: dueSoon.map((task) => clone(task)),
      critical: critical.map((task) => clone(task)),
      longRunning: longRunning.map((task) => clone(task)),
      repeatedAutomationFailures:
        repeated.length >= repeatedFailureThreshold
          ? { count: repeated.length, latestTask: clone(repeated[0]) }
          : null,
    };
  }
}
