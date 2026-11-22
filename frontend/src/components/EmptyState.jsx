import { IconReceipt } from './Icons.jsx';

export default function EmptyState({
  icon: StateIcon = IconReceipt,
  title,
  description,
  action,
}) {
  return (
    <div className="state-card">
      <span className="state-icon">
        <StateIcon />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
