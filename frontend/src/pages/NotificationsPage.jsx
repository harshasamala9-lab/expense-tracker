import PageHeader from '../components/PageHeader.jsx';
import ErrorState from '../components/ErrorState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import NotificationList from '../components/NotificationList.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { IconBell, IconRefresh } from '../components/Icons.jsx';

export default function NotificationsPage() {
  const { items, unreadCount, loading, refreshing, error, refresh, markAllRead } =
    useNotifications();

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Notifications"
        description="Inbox notifications generated from expense and automation activity."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={refresh}
              disabled={loading || refreshing}
            >
              {refreshing ? <span className="spinner" aria-hidden="true" /> : <IconRefresh />}
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </>
        }
      />

      {error ? <InlineAlert message={error} onRetry={refresh} /> : null}
      {error && !items.length ? (
        <section className="card">
          <ErrorState
            title="Could not load notifications"
            message={error}
            onRetry={refresh}
          />
        </section>
      ) : null}

      {!loading && !error && !items.length ? (
        <section className="card">
          <EmptyState
            icon={IconBell}
            title="No notifications"
            description="You are all caught up."
          />
        </section>
      ) : (
        <section className="card notification-card" aria-label="Notification inbox">
          <NotificationList items={items} unreadCount={unreadCount} />
        </section>
      )}
    </>
  );
}
