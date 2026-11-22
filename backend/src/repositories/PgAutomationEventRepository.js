const EVENT_COLUMNS = `
  id, event_id, event_type, source, status, payload, attempts, last_error,
  task_id, received_at, processed_at, next_attempt_at
`;

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapEvent(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    event_id: row.event_id,
    event_type: row.event_type,
    source: row.source,
    status: row.status,
    payload: row.payload ?? {},
    attempts: Number(row.attempts ?? 0),
    last_error: row.last_error,
    task_id: row.task_id,
    received_at: toIso(row.received_at),
    processed_at: toIso(row.processed_at),
    next_attempt_at: toIso(row.next_attempt_at),
  };
}

export class PgAutomationEventRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async enqueue(event, client = this.pool) {
    const { rows } = await client.query(
      `INSERT INTO automation_events (
         event_id, event_type, source, status, payload, next_attempt_at
       )
       VALUES ($1, $2, $3, 'pending', $4::jsonb, NOW())
       ON CONFLICT (event_id) DO NOTHING
       RETURNING ${EVENT_COLUMNS}`,
      [
        event.event_id,
        event.event_type,
        event.source ?? 'python-automation',
        JSON.stringify(event.payload ?? {}),
      ],
    );

    if (rows[0]) {
      return { event: mapEvent(rows[0]), created: true };
    }

    const existing = await this.findByEventId(event.event_id, client);
    return { event: existing, created: false };
  }

  async findByEventId(eventId, client = this.pool, { forUpdate = false } = {}) {
    const { rows } = await client.query(
      `SELECT ${EVENT_COLUMNS}
         FROM automation_events
        WHERE event_id = $1
        ${forUpdate ? 'FOR UPDATE' : ''}`,
      [eventId],
    );

    return mapEvent(rows[0]);
  }

  async listPendingIds(limit = 20, client = this.pool) {
    const { rows } = await client.query(
      `SELECT event_id
         FROM automation_events
        WHERE status IN ('pending', 'failed')
          AND next_attempt_at <= NOW()
          AND attempts < $1
        ORDER BY received_at ASC
        LIMIT $2`,
      [10, limit],
    );

    return rows.map((row) => row.event_id);
  }

  async markProcessed(id, taskId, client = this.pool) {
    const { rows } = await client.query(
      `UPDATE automation_events
          SET status = 'processed',
              task_id = $2,
              processed_at = NOW(),
              last_error = NULL
        WHERE id = $1
        RETURNING ${EVENT_COLUMNS}`,
      [id, taskId ?? null],
    );

    return mapEvent(rows[0]);
  }

  async markIgnored(id, reason, client = this.pool) {
    const { rows } = await client.query(
      `UPDATE automation_events
          SET status = 'ignored',
              last_error = $2,
              processed_at = NOW()
        WHERE id = $1
        RETURNING ${EVENT_COLUMNS}`,
      [id, reason ?? null],
    );

    return mapEvent(rows[0]);
  }

  async markFailed(id, errorMessage, nextAttemptAt, client = this.pool) {
    const { rows } = await client.query(
      `UPDATE automation_events
          SET status = 'failed',
              attempts = attempts + 1,
              last_error = $2,
              next_attempt_at = $3
        WHERE id = $1
        RETURNING ${EVENT_COLUMNS}`,
      [id, errorMessage, nextAttemptAt],
    );

    return mapEvent(rows[0]);
  }

  async countFailed(client = this.pool) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS failed
         FROM automation_events
        WHERE status = 'failed'`,
    );

    return Number(rows[0]?.failed ?? 0);
  }
}
