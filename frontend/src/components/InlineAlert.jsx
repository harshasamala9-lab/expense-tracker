import { IconAlertCircle } from './Icons.jsx';

export default function InlineAlert({ message, onRetry }) {
  return (
    <div className="inline-alert" role="alert">
      <span>
        <IconAlertCircle />
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
