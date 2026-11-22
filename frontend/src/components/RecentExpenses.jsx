import { getCategoryMeta } from '../constants/categories.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { IconReceipt } from './Icons.jsx';

export default function RecentExpenses({ expenses, emptyAction, limit = 5 }) {
  const visible = expenses.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="recent-empty">
        <span className="recent-empty-icon">
          <IconReceipt />
        </span>
        <p>No expenses yet</p>
        <span>Add your first expense to see it here.</span>
        {emptyAction}
      </div>
    );
  }

  return (
    <ul className="recent-list">
      {visible.map((expense) => {
        const meta = getCategoryMeta(expense.category);

        return (
          <li className="recent-item" key={expense.id}>
            <span
              className="recent-dot"
              style={{ backgroundColor: meta.color }}
              aria-hidden="true"
            />
            <div className="recent-main">
              <p
                className="recent-title"
                title={expense.description || expense.category}
              >
                {expense.description || expense.category}
              </p>
              <p className="recent-meta">
                <span>{expense.category}</span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(expense.expense_date)}</span>
              </p>
            </div>
            <span className="recent-amount">
              {formatCurrency(expense.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
