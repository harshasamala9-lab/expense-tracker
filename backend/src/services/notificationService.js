import { AppError } from '../utils/AppError.js';
import { priorityToSeverity } from '../constants/tasks.js';

/**
 * Owns the notification lifecycle.
 *
 * Notifications are durable rows in PostgreSQL. Their read state is completely
 * independent from the related task's status, so completing a task never marks
 * its notifications read and reading a notification never changes a task.
 */
export class NotificationService {
  constructor({
    notificationRepository,
    userRepository,
    realtimeBus,
    logger = console,
  }) {
    this.notificationRepository = notificationRepository;
    this.userRepository = userRepository;
    this.realtimeBus = realtimeBus;
    this.logger = logger;
  }

  async createForRecipients(recipientIds, notification, client) {
    return this.notificationRepository.createForRecipients(
      recipientIds,
      notification,
      client,
    );
  }

  async notifyAdmins(notification, client) {
    const admins = await this.userRepository.findAdmins(client);
    return this.createForRecipients(
      admins.map((admin) => admin.id),
      notification,
      client,
    );
  }

  /**
   * Publishes created notifications after the surrounding transaction has
   * committed. Publishing inside the transaction would let a client refresh
   * and see a notification that is later rolled back.
   */
  publish(notifications) {
    for (const notification of notifications ?? []) {
      this.realtimeBus.publish({
        type: 'notification.created',
        recipientId: notification.recipient_id,
        data: notification,
      });
    }
  }

  publishUnreadCount(recipientId, unreadCount) {
    this.realtimeBus.publish({
      type: 'notification.unread_count',
      recipientId,
      data: { unreadCount },
    });
  }

  async list(recipientId, filters) {
    return this.notificationRepository.list(recipientId, filters);
  }

  async getUnreadCount(recipientId) {
    return this.notificationRepository.countUnread(recipientId);
  }

  async markRead(id, recipientId) {
    const notification = await this.notificationRepository.markRead(
      id,
      recipientId,
    );

    if (!notification) {
      throw new AppError(404, 'Notification not found.');
    }

    const unreadCount = await this.notificationRepository.countUnread(
      recipientId,
    );
    this.publishUnreadCount(recipientId, unreadCount);

    return { notification, unreadCount };
  }

  async markAllRead(recipientId) {
    const updated = await this.notificationRepository.markAllRead(recipientId);
    this.publishUnreadCount(recipientId, 0);
    return { updated, unreadCount: 0 };
  }

  /**
   * Standard notification for a task event. The deduplication key is stable,
   * so replaying the same event cannot create a second inbox entry.
   */
  buildTaskNotification(task, { type, title, message, dedupSuffix = '' }) {
    return {
      task_id: task.id,
      notification_type: type,
      title,
      message,
      severity: priorityToSeverity(task.priority),
      deduplication_key: `task:${type}:${task.id}${dedupSuffix}`,
      action_type: 'TASK',
      action_id: task.id,
      metadata: {
        taskType: task.task_type,
        priority: task.priority,
      },
    };
  }
}
