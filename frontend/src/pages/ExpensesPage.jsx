import { useRef, useState } from 'react';
import CategoryFilter from '../components/CategoryFilter.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import ExpenseTable from '../components/ExpenseTable.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';
import { IconPlus, IconReceipt } from '../components/Icons.jsx';
import { useExpenses } from '../hooks/useExpenses.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from '../services/api.js';

export default function ExpensesPage() {
  usePageTitle('Expenses');

  const [filter, setFilter] = useState('All');
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const formSectionRef = useRef(null);
  const { showToast } = useToast();

  const { expenses, loading, error, refresh } = useExpenses(
    filter === 'All' ? undefined : filter,
  );

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function focusForm() {
    scrollToForm();
    window.setTimeout(() => {
      document.getElementById('expense-amount')?.focus();
    }, 350);
  }

  function handleEdit(expense) {
    setEditingExpense(expense);
    scrollToForm();
  }

  async function handleSave(payload) {
    setSubmitting(true);

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        showToast('Expense updated successfully.');
        setEditingExpense(null);
      } else {
        await createExpense(payload);
        showToast('Expense added successfully.');
      }

      const filterNeedsReset =
        filter !== 'All' && filter !== payload.category;

      if (filterNeedsReset) {
        setFilter('All');
      } else {
        await refresh();
      }

      return true;
    } catch (requestError) {
      showToast(
        requestError.message || 'Could not save the expense.',
        'error',
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!expenseToDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteExpense(expenseToDelete.id);
      showToast('Expense deleted successfully.');

      if (editingExpense?.id === expenseToDelete.id) {
        setEditingExpense(null);
      }

      setExpenseToDelete(null);
      await refresh();
    } catch (requestError) {
      showToast(
        requestError.message || 'Could not delete the expense.',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  }

  const initialLoading = loading && expenses.length === 0;
  const filtered = filter !== 'All';

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Expenses"
        description="Record, review, and manage every expense in one place."
        actions={
          <span className="count-pill">
            {loading
              ? 'Loading…'
              : `${expenses.length} ${
                  expenses.length === 1 ? 'record' : 'records'
                }`}
          </span>
        }
      />

      <div className="expenses-layout">
        <div className="expenses-form-column" ref={formSectionRef}>
          <ExpenseForm
            editingExpense={editingExpense}
            onSave={handleSave}
            onCancelEdit={() => setEditingExpense(null)}
            submitting={submitting}
          />
        </div>

        <section
          className="card table-card"
          aria-labelledby="expenses-table-title"
        >
          <div className="table-toolbar">
            <div className="table-toolbar-copy">
              <h2 id="expenses-table-title">
                {filtered ? `${filter} expenses` : 'All expenses'}
              </h2>
              <p>
                {filtered
                  ? `Showing records in the ${filter} category.`
                  : 'Newest expense dates appear first.'}
              </p>
            </div>

            <CategoryFilter value={filter} onChange={setFilter} />
          </div>

          {error && expenses.length > 0 && (
            <InlineAlert message={error} onRetry={refresh} />
          )}

          {initialLoading ? (
            <TableSkeleton />
          ) : error && expenses.length === 0 ? (
            <ErrorState
              title="Could not load expenses"
              message={error}
              onRetry={refresh}
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={IconReceipt}
              title={
                filtered ? `No ${filter.toLowerCase()} expenses` : 'No expenses yet'
              }
              description={
                filtered
                  ? 'Try another category or add an expense in this category.'
                  : 'Add your first expense to see it here and on your dashboard.'
              }
              action={
                filtered ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFilter('All')}
                  >
                    Clear filter
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={focusForm}
                  >
                    <IconPlus />
                    Add your first expense
                  </button>
                )
              }
            />
          ) : (
            <ExpenseTable
              expenses={expenses}
              onEdit={handleEdit}
              onDelete={setExpenseToDelete}
              deletingId={expenseToDelete?.id}
            />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(expenseToDelete)}
        title="Delete this expense?"
        description="This permanently removes the record from PostgreSQL. This action cannot be undone."
        expense={expenseToDelete}
        confirmLabel="Delete expense"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) {
            setExpenseToDelete(null);
          }
        }}
      />
    </>
  );
}
