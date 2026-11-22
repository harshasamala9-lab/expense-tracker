import { useState } from 'react';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconPin,
} from '../components/Icons.jsx';
import { formatDate } from '../utils/format.js';

const PRIORITY_ICONS = {
  CRITICAL: IconAlertCircle,
  HIGH: IconAlertCircle,
  NORMAL: IconClock,
  LOW: IconPin,
};

const PRIORITY_LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
};

export default function TaskItem({ task, onComplete, onCancel }) {
  const [note, setNote] = useState('');
  const PriorityIcon = PRIORITY_ICONS[task.priority] ?? IconPin;

  return (
    <article
      className={`task-item task-item--${task.status}`}
      aria-labelledby={`task-title-${task.id}`}
    >
      <div className="task-main">
        <h3 className="task-title" id={`task-title-${task.id}`}>
          <PriorityIcon />
          {task.title}
        </h3>
        {task.description ? (
          <p className="task-description">{task.description}</p>
        ) : null}
        <div className="task-meta">
          <span
            className={`task-status task-status--${task.status}`}
          >
            {task.status}
          </span>
          {PRIORITY_LABELS[task.priority] ? (
            <span className="task-priority">{PRIORITY_LABELS[task.priority]}</span>
          ) : null}
          {task.due_at ? (
            <span
              className={
                new Date(task.due_at) < new Date() ? 'task-due overdue' : 'task-due'
              }
            >
              Due {formatDate(task.due_at)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={task.status !== 'PENDING'}
          onClick={() => onComplete?.(task)}
        >
          <IconCheckCircle />
          Complete
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={task.status !== 'PENDING'}
          onClick={() => onCancel?.(task)}
        >
          Cancel
        </button>
        <input
          aria-label={`Note for ${task.title}`}
          className="task-note-input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
        />
      </div>
    </article>
  );
}
