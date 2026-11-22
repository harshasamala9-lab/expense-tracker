import { CATEGORIES, getCategoryMeta } from '../constants/categories.js';
import { formatCurrency, percentage } from '../utils/format.js';

export default function CategoryBreakdown({ breakdown, totalSpent }) {
  if (!totalSpent) {
    return (
      <div className="chart-empty chart-empty--compact">
        <p>No spending recorded yet.</p>
      </div>
    );
  }

  const byCategory = new Map(
    breakdown.map((item) => [item.category, item]),
  );

  const rows = CATEGORIES.map((category) => ({
    category,
    total: byCategory.get(category)?.total ?? 0,
    count: byCategory.get(category)?.count ?? 0,
  })).sort((a, b) => b.total - a.total);

  return (
    <ul className="category-bars">
      {rows.map((row) => {
        const meta = getCategoryMeta(row.category);
        const share = percentage(row.total, totalSpent);

        return (
          <li key={row.category}>
            <div className="category-bar-head">
              <span>
                <span
                  className="category-dot"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden="true"
                />
                {row.category}
              </span>
              <span>{formatCurrency(row.total)}</span>
            </div>
            <div className="progress" aria-hidden="true">
              <span
                style={{
                  width: `${row.total > 0 ? Math.max(share, 3) : 0}%`,
                  backgroundColor: meta.color,
                }}
              />
            </div>
            <p className="category-bar-meta">
              {row.count} {row.count === 1 ? 'expense' : 'expenses'} ·{' '}
              {share}% of spending
            </p>
          </li>
        );
      })}
    </ul>
  );
}
