import { CATEGORIES, getCategoryMeta } from '../constants/categories.js';
import {
  IconCategoryBills,
  IconCategoryFood,
  IconCategoryOther,
  IconCategoryShopping,
  IconCategoryTravel,
} from './Icons.jsx';
import { formatCurrency, percentage } from '../utils/format.js';

const CATEGORY_ICONS = {
  Food: IconCategoryFood,
  Travel: IconCategoryTravel,
  Shopping: IconCategoryShopping,
  Bills: IconCategoryBills,
  Other: IconCategoryOther,
};

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
              <span className="category-summary-name">
                <span
                  className="category-summary-icon"
                  style={{ color: meta.color }}
                  aria-hidden="true"
                >
                  {(() => {
                    const Icon = CATEGORY_ICONS[category] ?? IconCategoryOther;
                    return <Icon />;
                  })()}
                </span>
                {category}
              </span>
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
