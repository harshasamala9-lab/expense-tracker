import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import TaskItem from '../components/TaskItem.jsx';
import { useTasks } from '../hooks/useTasks.js';
import * as api from '../services/api.js';
import { IconRefresh, IconAlertCircle, IconTasks } from '../components/Icons.jsx';

export default function TasksPage() {
  const { tasks, summary, loading, error, refresh, act } = useTasks();

  const complete = (task) => void act(async () => api.completeTask(task.id));
  const cancel = (task) => void act(async () => api.cancelTask(task.id));

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Pending tasks"
        description="Real administrator work queued for this workspace."
        actions={
          <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
            <IconRefresh />
            Refresh
          </button>
        }
      />

      {error ? <InlineAlert message={error} onRetry={refresh} /> : null}
      {error && !tasks.length ? (
        <section className="card">
          <ErrorState title="Could not load tasks" message={error} onRetry={refresh} />
        </section>
      ) : null}

      {!loading && !error && !tasks.length ? (
        <section className="card">
          <EmptyState icon={IconTasks} title="No pending tasks" description="No new work is scheduled for this workspace right now." />
        </section>
      ) : (
        <>
          <div className="stat-grid tasks-stat-grid">
            <StatCard label="Pending" value={summary?.totalPending ?? 0} icon={IconTasks} />
            <StatCard label="In progress" value={summary?.inProgress ?? 0} icon={IconRefresh} />
            <StatCard label="Critical" value={summary?.critical ?? 0} icon={IconAlertCircle} />
            <StatCard label="Overdue" value={summary?.overdue ?? 0} icon={IconAlertCircle} />
          </div>

          <div className="task-list" aria-label="Pending tasks">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={complete}
                onCancel={cancel}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
