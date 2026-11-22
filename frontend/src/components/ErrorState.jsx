import { IconAlertCircle, IconRefresh } from './Icons.jsx';

export default function ErrorState({
  title = 'Could not load data',
  message,
  onRetry,
}) {
  return (
    <div className="state-card state-card--error" role="alert">
      <span className="state-icon">
        <IconAlertCircle />
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <IconRefresh />
          Try again
        </button>
      )}
    </div>
  );
}
