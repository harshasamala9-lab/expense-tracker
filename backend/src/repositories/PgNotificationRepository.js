const NOTIFICATION_COLUMNS = `
  id, recipient_id, task_id, notification_type, title, message, severity,
  deduplication_key, action_type, action_id, read_at, created_at, metadata
`;

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapNotification(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    recipient_id: row.recipient_id,
    task_id: row.task_id,
    notification_type: row.notification_type,
    title: row.title,
    message: row.message,
    severity: row.severity,
    deduplication_key: row.deduplication_key,
    action_type: row.action_type,
    action_id: row.action_id,
    read_at: toIso(row.read_at),
    created_at: toIso(row.created_at),
    metadata: row.metadata ?? {},
  };
}

export class PgNotificationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createForRecipients(recipientIds, notification, client = this.pool) {
    const uniqueRecipients = [...new Set(recipientIds.filter(Boolean))];

    if (uniqueRecipients.length === 0) {
      return [];
    }

    const { rows } = await client.query(
      `INSERT INTO admin_notifications (
         recipient_id, task_id, notification_type, title, message, severity,
         deduplication_key, action_type, action_id, metadata
       )
       SELECT recipient_id, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
         FROM unnest($1::uuid[]) AS recipient_id
       ON CONFLICT (recipient_id, deduplication_key) DO NOTHING
       RETURNING ${NOTIFICATION_COLUMNS}`,
      [
        uniqueRecipients,
        notification.task_id ?? null,
        notification.notification_type,
        notification.title,
        notification.message,
        notification.severity ?? 'INFO',
        notification.deduplication_key,
        notification.action_type ?? 'TASK',
        notification.action_id ?? notification.task_id ?? null,
        JSON.stringify(notification.metadata ?? {}),
      ],
    );

    return rows.map(mapNotification);
  }

  async list(recipientId, filters, client = this.pool) {
    const where = ['recipient_id = $1'];
    const params = [recipientId];

    const add = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.status === 'unread') {
      where.push('read_at IS NULL');
    } else if (filters.status === 'read') {
      where.push('read_at IS NOT NULL');
    }

    if (filters.severity) {
      where.push(`severity = ${add(filters.severity)}`);
    }

    if (filters.notification_type) {
      where.push(`notification_type = ${add(filters.notification_type)}`);
    }

    if (filters.task_id) {
      where.push(`task_id = ${add(filters.task_id)}`);
    }

    if (filters.search) {
      const placeholder = add(`%${filters.search}%`);
      where.push(`(title ILIKE ${placeholder} OR message ILIKE ${placeholder})`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const limit = filters.pageSize;
    const offset = (filters.page - 1) * filters.pageSize;

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
         FROM admin_notifications
         ${whereSql}`,
      params,
    );

    const listParams = [...params, limit, offset];
    const rowsResult = await client.query(
      `SELECT ${NOTIFICATION_COLUMNS}
         FROM admin_notifications
         ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT $${listParams.length - 1}
       OFFSET $${listParams.length}`,
      listParams,
    );

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      notifications: rowsResult.rows.map(mapNotification),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
      },
    };
  }

  async countUnread(recipientId, client = this.pool) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS unread
         FROM admin_notifications
        WHERE recipient_id = $1
          AND read_at IS NULL`,
      [recipientId],
    );

    return Number(rows[0]?.unread ?? 0);
  }

  async findById(id, recipientId, client = this.pool) {
    const { rows } = await client.query(
      `SELECT ${NOTIFICATION_COLUMNS}
         FROM admin_notifications
        WHERE id = $1
          AND recipient_id = $2
        LIMIT 1`,
      [id, recipientId],
    );

    return mapNotification(rows[0]);
  }

  async markRead(id, recipientId, client = this.pool) {
    const { rows } = await client.query(
      `UPDATE admin_notifications
          SET read_at = NOW()
        WHERE id = $1
          AND recipient_id = $2
          AND read_at IS NULL
        RETURNING ${NOTIFICATION_COLUMNS}`,
      [id, recipientId],
    );

    if (rows[0]) {
      return mapNotification(rows[0]);
    }

    // Idempotent behavior: an already-read notification is still returned,
    // but a notification belonging to another administrator is not.
    return this.findById(id, recipientId, client);
  }

  async markAllRead(recipientId, client = this.pool) {
    const result = await client.query(
      `UPDATE admin_notifications
          SET read_at = NOW()
        WHERE recipient_id = $1
          AND read_at IS NULL`,
      [recipientId],
    );

    return result.rowCount;
  }
}
