import { formatCurrency, formatDate } from '../utils/format.js';
import CategoryBadge from './CategoryBadge.jsx';
import { IconPencil, IconTrash } from './Icons.jsx';

export default function ExpenseTable({
  expenses,
  onEdit,
  onDelete,
  deletingId,
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">
          Recorded expenses, sorted newest first
        </caption>
        <thead>
          <tr>
            <th scope="col">Amount</th>
            <th scope="col">Category</th>
            <th scope="col">Description</th>
            <th scope="col">Date</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const label = expense.description || expense.category;

            return (
              <tr
                key={expense.id}
                className={deletingId === expense.id ? 'is-deleting' : ''}
              >
                <td data-label="Amount">
                  <span className="amount-cell">
                    {formatCurrency(expense.amount)}
                  </span>
                </td>
                <td data-label="Category">
                  <CategoryBadge category={expense.category} />
                </td>
                <td data-label="Description">
                  <span
                    className={`description-cell${
                      expense.description ? '' : ' is-empty'
                    }`}
                    title={expense.description || ''}
                  >
                    {expense.description || 'No description'}
                  </span>
                </td>
                <td data-label="Date">
                  <span className="date-cell">
                    {formatDate(expense.expense_date)}
                  </span>
                </td>
                <td data-label="Actions">
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onEdit(expense)}
                      aria-label={`Edit ${label} expense`}
                      title="Edit expense"
                      disabled={deletingId === expense.id}
                    >
                      <IconPencil />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      onClick={() => onDelete(expense)}
                      aria-label={`Delete ${label} expense`}
                      title="Delete expense"
                      disabled={deletingId === expense.id}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
