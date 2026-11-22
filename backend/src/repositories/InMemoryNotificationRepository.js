import { randomUUID } from 'node:crypto';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Deterministic notification store for tests. Recipient scoping and
 * deduplication are enforced exactly as they are in PostgreSQL.
 */
export class InMemoryNotificationRepository {
  constructor(seed = [], { now = () => new Date() } = {}) {
    this.now = now;
    this.notifications = seed.map((notification) => ({
      id: notification.id ?? randomUUID(),
      recipient_id: notification.recipient_id,
      task_id: notification.task_id ?? null,
      notification_type: notification.notification_type ?? 'TASK_CREATED',
      title: notification.title ?? 'Notification',
      message: notification.message ?? '',
      severity: notification.severity ?? 'INFO',
      deduplication_key:
        notification.deduplication_key ?? `seed:${randomUUID()}`,
      action_type: notification.action_type ?? 'TASK',
      action_id: notification.action_id ?? notification.task_id ?? null,
      read_at: notification.read_at ?? null,
      created_at: notification.created_at ?? this.now().toISOString(),
      metadata: notification.metadata ?? {},
    }));
  }

  snapshot() {
    return clone(this.notifications);
  }

  restore(snapshot) {
    if (snapshot) {
      this.notifications = snapshot;
    }
  }

  async createForRecipients(recipientIds, notification) {
    const uniqueRecipients = [...new Set(recipientIds.filter(Boolean))];
    const created = [];

    for (const recipientId of uniqueRecipients) {
      const exists = this.notifications.some(
        (item) =>
          item.recipient_id === recipientId &&
          item.deduplication_key === notification.deduplication_key,
      );

      if (exists) {
        continue;
      }

      const entry = {
        id: randomUUID(),
        recipient_id: recipientId,
        task_id: notification.task_id ?? null,
        notification_type: notification.notification_type,
        title: notification.title,
        message: notification.message,
        severity: notification.severity ?? 'INFO',
        deduplication_key: notification.deduplication_key,
        action_type: notification.action_type ?? 'TASK',
        action_id:
          notification.action_id ?? notification.task_id ?? null,
        read_at: null,
        created_at: this.now().toISOString(),
        metadata: clone(notification.metadata ?? {}),
      };

      this.notifications.push(entry);
      created.push(clone(entry));
    }

    return created;
  }

  async list(recipientId, filters) {
    let items = this.notifications.filter(
      (item) => item.recipient_id === recipientId,
    );

    if (filters.status === 'unread') {
      items = items.filter((item) => !item.read_at);
    } else if (filters.status === 'read') {
      items = items.filter((item) => item.read_at);
    }

    if (filters.severity) {
      items = items.filter((item) => item.severity === filters.severity);
    }

    if (filters.notification_type) {
      items = items.filter(
        (item) => item.notification_type === filters.notification_type,
      );
    }

    if (filters.task_id) {
      items = items.filter((item) => item.task_id === filters.task_id);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.message.toLowerCase().includes(search),
      );
    }

    items.sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
    );

    const total = items.length;
    const start = (filters.page - 1) * filters.pageSize;

    return {
      notifications: items
        .slice(start, start + filters.pageSize)
        .map((item) => clone(item)),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
      },
    };
  }

  async countUnread(recipientId) {
    return this.notifications.filter(
      (item) => item.recipient_id === recipientId && !item.read_at,
    ).length;
  }

  async findById(id, recipientId) {
    const notification = this.notifications.find(
      (item) => item.id === id && item.recipient_id === recipientId,
    );
    return notification ? clone(notification) : null;
  }

  async markRead(id, recipientId) {
    const notification = this.notifications.find(
      (item) => item.id === id && item.recipient_id === recipientId,
    );

    if (!notification) {
      return null;
    }

    if (!notification.read_at) {
      notification.read_at = this.now().toISOString();
    }

    return clone(notification);
  }

  async markAllRead(recipientId) {
    let updated = 0;

    for (const notification of this.notifications) {
      if (notification.recipient_id === recipientId && !notification.read_at) {
        notification.read_at = this.now().toISOString();
        updated += 1;
      }
    }

    return updated;
  }
}
