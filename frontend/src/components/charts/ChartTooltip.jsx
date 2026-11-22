import { formatCurrency } from '../../utils/format.js';

export default function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const name = item.payload?.category ?? item.name ?? '';
  const value = item.value ?? item.payload?.total ?? 0;

  return (
    <div className="chart-tooltip">
      <p>{name}</p>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}
