import { formatDate } from '../utils/format.js';
import {
  IconAlertCircle,
  IconBell,
  IconCheckCircle,
  IconInfo,
} from '../components/Icons.jsx';

const ICONS = {
  CRITICAL: IconAlertCircle,
  HIGH: IconAlertCircle,
  WARNING: IconAlertCircle,
  INFO: IconCheckCircle,
};

export default function NotificationList({ items, unreadCount = 0 }) {
  if (!items.length) {
    return <p className="muted">No notifications yet.</p>;
  }

  return (
    <ul className="notification-list">
      {items.map((notification) => {
        const Icon = ICONS[notification.severity] ?? IconBell;
        const unread = !notification.read_at;

        return (
          <li
            key={notification.id}
            className={`notification-item${unread ? ' notification-item--unread' : ''}`}
            aria-label={`${unread ? 'Unread' : 'Read'} notification: ${notification.title}`}
          >
            <span className="notification-item-icon">
              <Icon />
            </span>
            <div className="notification-item-body">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <small>
                {formatDate(notification.created_at)} · {notification.severity}
              </small>
            </div>
            <span className="notification-item-unread-count">{unreadCount}</span>
          </li>
        );
      })}
    </ul>
  );
}
