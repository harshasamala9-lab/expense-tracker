const TASK_COLUMNS = `
  id, title, description, task_type, status, priority, source_type, source_id,
  idempotency_key, assigned_to, created_by, due_at, snoozed_until, started_at,
  completed_at, completed_by, cancelled_at, cancelled_by, resolution_note,
  metadata, created_at, updated_at
`;

const ACTIVITY_COLUMNS = `
  id, task_id, actor_id, action, previous_value, new_value, description, created_at
`;

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapTask(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    task_type: row.task_type,
    status: row.status,
    priority: row.priority,
    source_type: row.source_type,
    source_id: row.source_id,
    idempotency_key: row.idempotency_key,
    assigned_to: row.assigned_to,
    created_by: row.created_by,
    due_at: toIso(row.due_at),
    snoozed_until: toIso(row.snoozed_until),
    started_at: toIso(row.started_at),
    completed_at: toIso(row.completed_at),
    completed_by: row.completed_by,
    cancelled_at: toIso(row.cancelled_at),
    cancelled_by: row.cancelled_by,
    resolution_note: row.resolution_note,
    metadata: row.metadata ?? {},
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function mapActivity(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    actor_id: row.actor_id,
    action: row.action,
    previous_value: row.previous_value ?? null,
    new_value: row.new_value ?? null,
    description: row.description,
    created_at: toIso(row.created_at),
  };
}

function mapReminder(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    reminder_type: row.reminder_type,
    window_key: row.window_key,
    sent_at: toIso(row.sent_at),
    metadata: row.metadata ?? {},
  };
}

const SORT_CLAUSES = {
  newest: 'created_at DESC, id DESC',
  oldest: 'created_at ASC, id ASC',
  priority: `CASE priority
    WHEN 'CRITICAL' THEN 4
    WHEN 'HIGH' THEN 3
    WHEN 'NORMAL' THEN 2
    ELSE 1
  END DESC, created_at DESC, id DESC`,
  due: 'due_at ASC NULLS LAST, created_at DESC, id DESC',
};

export class PgTaskRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(input, client = this.pool) {
    const { rows } = await client.query(
      `INSERT INTO admin_tasks (
         title, description, task_type, status, priority, source_type,
         source_id, idempotency_key, assigned_to, created_by, due_at,
         snoozed_until, metadata
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb
       )
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING ${TASK_COLUMNS}`,
      [
        input.title,
        input.description ?? '',
        input.task_type ?? 'GENERAL',
        input.status ?? 'PENDING',
        input.priority ?? 'NORMAL',
        input.source_type ?? 'manual',
        input.source_id ?? null,
        input.idempotency_key,
        input.assigned_to ?? null,
        input.created_by ?? null,
        input.due_at ?? null,
        input.snoozed_until ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return rows[0] ? mapTask(rows[0]) : null;
  }

  async findById(id, client = this.pool, { forUpdate = false } = {}) {
    const { rows } = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE id = $1
        ${forUpdate ? 'FOR UPDATE' : ''}`,
      [id],
    );

    return mapTask(rows[0]);
  }

  async findByIdempotencyKey(idempotencyKey, client = this.pool) {
    const { rows } = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE idempotency_key = $1
        LIMIT 1`,
      [idempotencyKey],
    );

    return mapTask(rows[0]);
  }

  async findOpenBySource(sourceType, sourceId, client = this.pool) {
    if (!sourceId) {
      return null;
    }

    const { rows } = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE source_type = $1
          AND source_id = $2
          AND status IN ('PENDING', 'IN_PROGRESS')
        ORDER BY created_at DESC
        LIMIT 1`,
      [sourceType, sourceId],
    );

    return mapTask(rows[0]);
  }

  async list(filters, client = this.pool) {
    const where = [];
    const params = [];

    const add = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.status) {
      where.push(`status = ${add(filters.status)}`);
    }

    if (filters.task_type) {
      where.push(`task_type = ${add(filters.task_type)}`);
    }

    if (filters.priority) {
      where.push(`priority = ${add(filters.priority)}`);
    }

    if (filters.assigned_to === 'unassigned') {
      where.push('assigned_to IS NULL');
    } else if (filters.assigned_to) {
      where.push(`assigned_to = ${add(filters.assigned_to)}`);
    }

    if (filters.overdue) {
      where.push(
        `due_at IS NOT NULL
         AND due_at < NOW()
         AND status IN ('PENDING', 'IN_PROGRESS')`,
      );
    }

    if (filters.search) {
      const placeholder = add(`%${filters.search}%`);
      where.push(
        `(title ILIKE ${placeholder}
          OR description ILIKE ${placeholder}
          OR COALESCE(source_id, '') ILIKE ${placeholder})`,
      );
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sortSql = SORT_CLAUSES[filters.sort] ?? SORT_CLAUSES.newest;
    const limit = filters.pageSize;
    const offset = (filters.page - 1) * filters.pageSize;

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM admin_tasks ${whereSql}`,
      params,
    );

    const listParams = [...params, limit, offset];
    const rowsResult = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
         ${whereSql}
        ORDER BY ${sortSql}
        LIMIT $${listParams.length - 1}
       OFFSET $${listParams.length}`,
      listParams,
    );

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      tasks: rowsResult.rows.map(mapTask),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
      },
    };
  }

  async getSummary(client = this.pool) {
    const { rows } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'PENDING')::int AS total_pending,
         COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
         COUNT(*) FILTER (
           WHERE priority = 'CRITICAL'
             AND status IN ('PENDING', 'IN_PROGRESS')
         )::int AS critical,
         COUNT(*) FILTER (
           WHERE due_at IS NOT NULL
             AND due_at < NOW()
             AND status IN ('PENDING', 'IN_PROGRESS')
         )::int AS overdue,
         COUNT(*) FILTER (
           WHERE created_at >= date_trunc('day', NOW())
         )::int AS created_today,
         COUNT(*) FILTER (
           WHERE task_type IN ('AUTOMATION_FAILURE', 'IMPORT_FAILURE', 'PARSING_ERROR')
             AND status IN ('PENDING', 'IN_PROGRESS')
         )::int AS automation_failures
       FROM admin_tasks`,
    );

    const row = rows[0] ?? {};

    return {
      totalPending: Number(row.total_pending ?? 0),
      inProgress: Number(row.in_progress ?? 0),
      completed: Number(row.completed ?? 0),
      critical: Number(row.critical ?? 0),
      overdue: Number(row.overdue ?? 0),
      createdToday: Number(row.created_today ?? 0),
      automationFailures: Number(row.automation_failures ?? 0),
    };
  }

  async update(id, fields, client = this.pool) {
    const allowed = [
      'title',
      'description',
      'priority',
      'due_at',
      'snoozed_until',
      'assigned_to',
      'status',
      'started_at',
      'completed_at',
      'completed_by',
      'cancelled_at',
      'cancelled_by',
      'resolution_note',
    ];

    const assignments = [];
    const params = [id];

    for (const [key, value] of Object.entries(fields)) {
      if (!allowed.includes(key)) {
        continue;
      }

      params.push(value);
      assignments.push(`${key} = $${params.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(id, client);
    }

    const { rows } = await client.query(
      `UPDATE admin_tasks
          SET ${assignments.join(', ')},
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${TASK_COLUMNS}`,
      params,
    );

    return mapTask(rows[0]);
  }

  async addActivity(activity, client = this.pool) {
    const { rows } = await client.query(
      `INSERT INTO task_activity (
         task_id, actor_id, action, previous_value, new_value, description
       )
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING ${ACTIVITY_COLUMNS}`,
      [
        activity.task_id,
        activity.actor_id ?? null,
        activity.action,
        activity.previous_value === undefined
          ? null
          : JSON.stringify(activity.previous_value),
        activity.new_value === undefined
          ? null
          : JSON.stringify(activity.new_value),
        activity.description ?? null,
      ],
    );

    return mapActivity(rows[0]);
  }

  async listActivities(taskId, client = this.pool) {
    const { rows } = await client.query(
      `SELECT ${ACTIVITY_COLUMNS}
         FROM task_activity
        WHERE task_id = $1
        ORDER BY created_at ASC, id ASC`,
      [taskId],
    );

    return rows.map(mapActivity);
  }

  async insertReminder(reminder, client = this.pool) {
    const { rows } = await client.query(
      `INSERT INTO task_reminders (
         task_id, reminder_type, window_key, metadata
       )
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (task_id, reminder_type, window_key) DO NOTHING
       RETURNING id, task_id, reminder_type, window_key, sent_at, metadata`,
      [
        reminder.task_id,
        reminder.reminder_type,
        reminder.window_key,
        JSON.stringify(reminder.metadata ?? {}),
      ],
    );

    return rows[0] ? mapReminder(rows[0]) : null;
  }

  async findReminderCandidates(
    {
      dueSoonHours = 24,
      longRunningHours = 72,
      criticalAgeHours = 4,
      repeatedFailureThreshold = 3,
    } = {},
    client = this.pool,
  ) {
    const baseWhere = `
      status IN ('PENDING', 'IN_PROGRESS')
      AND (snoozed_until IS NULL OR snoozed_until <= NOW())
    `;

    const overdueResult = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE ${baseWhere}
          AND due_at IS NOT NULL
          AND due_at < NOW()
        ORDER BY due_at ASC
        LIMIT 200`,
    );

    const dueSoonResult = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE ${baseWhere}
          AND due_at IS NOT NULL
          AND due_at >= NOW()
          AND due_at <= NOW() + ($1::int * INTERVAL '1 hour')
        ORDER BY due_at ASC
        LIMIT 200`,
      [dueSoonHours],
    );

    const criticalResult = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE ${baseWhere}
          AND priority = 'CRITICAL'
          AND created_at <= NOW() - ($1::int * INTERVAL '1 hour')
        ORDER BY created_at ASC
        LIMIT 200`,
      [criticalAgeHours],
    );

    const longRunningResult = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE ${baseWhere}
          AND status = 'IN_PROGRESS'
          AND COALESCE(started_at, updated_at) <= NOW() - ($1::int * INTERVAL '1 hour')
        ORDER BY COALESCE(started_at, updated_at) ASC
        LIMIT 200`,
      [longRunningHours],
    );

    const repeatedResult = await client.query(
      `SELECT ${TASK_COLUMNS}
         FROM admin_tasks
        WHERE status IN ('PENDING', 'IN_PROGRESS')
          AND task_type IN ('AUTOMATION_FAILURE', 'IMPORT_FAILURE', 'PARSING_ERROR')
        ORDER BY created_at DESC
        LIMIT 200`,
    );

    return {
      overdue: overdueResult.rows.map(mapTask),
      dueSoon: dueSoonResult.rows.map(mapTask),
      critical: criticalResult.rows.map(mapTask),
      longRunning: longRunningResult.rows.map(mapTask),
      repeatedAutomationFailures:
        repeatedResult.rows.length >= repeatedFailureThreshold
          ? {
              count: repeatedResult.rows.length,
              latestTask: mapTask(repeatedResult.rows[0]),
            }
          : null,
    };
  }
}
