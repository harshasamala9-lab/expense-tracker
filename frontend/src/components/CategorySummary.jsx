import { CATEGORIES, getCategoryMeta } from '../constants/categories.js';
import { formatCurrency, percentage } from '../utils/format.js';

export default function CategorySummary({ breakdown, totalSpent }) {
  const byCategory = new Map(
    breakdown.map((item) => [item.category, item]),
  );

  return (
    <div className="category-summary-grid">
      {CATEGORIES.map((category) => {
        const meta = getCategoryMeta(category);
        const item = byCategory.get(category) ?? { total: 0, count: 0 };
        const share = percentage(item.total, totalSpent);

        return (
          <article
            className="category-summary-card"
            key={category}
            style={{
              '--category-color': meta.color,
              '--category-soft': meta.soft,
            }}
          >
            <div className="category-summary-top">
              <span className="category-summary-name">{category}</span>
              <span className="category-share">{share}%</span>
            </div>
            <strong>{formatCurrency(item.total)}</strong>
            <p>
              {item.count} {item.count === 1 ? 'expense' : 'expenses'}
            </p>
          </article>
        );
      })}
    </div>
  );
}
