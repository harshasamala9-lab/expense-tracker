import { useEffect, useState } from 'react';
import { CATEGORIES } from '../constants/categories.js';
import { getCurrencySymbol, todayISO } from '../utils/format.js';
import {
  IconLock,
  IconPencil,
  IconPlus,
  IconX,
} from './Icons.jsx';

const MAX_AMOUNT = 9_999_999_999.99;
const MAX_DESCRIPTION_LENGTH = 500;

function emptyValues() {
  return {
    amount: '',
    category: 'Food',
    description: '',
    expense_date: todayISO(),
  };
}

function validate(values) {
  const errors = {};
  const amount = Number(values.amount);

  if (!values.amount.trim()) {
    errors.amount = 'Enter an amount.';
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (amount > MAX_AMOUNT) {
    errors.amount = 'Amount is too large.';
  } else if (Number(amount.toFixed(2)) !== amount) {
    errors.amount = 'Use at most two decimal places.';
  }

  if (!values.expense_date) {
    errors.expense_date = 'Choose a date.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.expense_date)) {
    errors.expense_date = 'Enter a valid date.';
  }

  if (values.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  return errors;
}

export default function ExpenseForm({
  editingExpense,
  onSave,
  onCancelEdit,
  submitting,
}) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const currencySymbol = getCurrencySymbol();
  const isEditing = Boolean(editingExpense);

  useEffect(() => {
    if (editingExpense) {
      setValues({
        amount: String(editingExpense.amount),
        category: editingExpense.category,
        description: editingExpense.description ?? '',
        expense_date: editingExpense.expense_date,
      });
    } else {
      setValues(emptyValues());
    }
    setErrors({});
  }, [editingExpense]);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const saved = await onSave({
      amount: Number(values.amount),
      category: values.category,
      description: values.description.trim() || null,
      expense_date: values.expense_date,
    });

    if (saved) {
      setValues(emptyValues());
      setErrors({});
    }
  }

  const descriptionCount = values.description.length;
  const editingLabel =
    editingExpense?.description || editingExpense?.category || 'expense';

  return (
    <section className="card form-card" aria-labelledby="expense-form-title">
      <div className="form-card-header">
        <h2 id="expense-form-title">
          {isEditing ? 'Edit expense' : 'Add an expense'}
        </h2>
        <p>
          {isEditing
            ? 'Update the record, then save your changes.'
            : 'Record a purchase and keep your spending up to date.'}
        </p>
      </div>

      {isEditing && (
        <div className="editing-banner">
          <span>Editing “{editingLabel}”</span>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Cancel editing"
          >
            <IconX size={14} />
            Cancel
          </button>
        </div>
      )}

      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <div className={`field${errors.amount ? ' has-error' : ''}`}>
          <label htmlFor="expense-amount">Amount</label>
          <div className="input-shell">
            <span className="input-prefix" aria-hidden="true">
              {currencySymbol}
            </span>
            <input
              id="expense-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={MAX_AMOUNT}
              placeholder="0.00"
              value={values.amount}
              onChange={handleChange}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={
                errors.amount ? 'expense-amount-error' : 'expense-amount-hint'
              }
              required
            />
          </div>
          {errors.amount ? (
            <p id="expense-amount-error" className="field-error">
              {errors.amount}
            </p>
          ) : (
            <p id="expense-amount-hint" className="field-hint">
              Must be greater than zero.
            </p>
          )}
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="expense-category">Category</label>
            <select
              id="expense-category"
              name="category"
              value={values.category}
              onChange={handleChange}
              required
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`field${errors.expense_date ? ' has-error' : ''}`}
          >
            <label htmlFor="expense-date">Date</label>
            <input
              id="expense-date"
              name="expense_date"
              type="date"
              value={values.expense_date}
              onChange={handleChange}
              aria-invalid={Boolean(errors.expense_date)}
              aria-describedby={
                errors.expense_date ? 'expense-date-error' : undefined
              }
              required
            />
            {errors.expense_date && (
              <p id="expense-date-error" className="field-error">
                {errors.expense_date}
              </p>
            )}
          </div>
        </div>

        <div className={`field${errors.description ? ' has-error' : ''}`}>
          <label htmlFor="expense-description">
            Description <span className="optional">(optional)</span>
          </label>
          <textarea
            id="expense-description"
            name="description"
            rows="3"
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="What was this expense for?"
            value={values.description}
            onChange={handleChange}
            aria-invalid={Boolean(errors.description)}
            aria-describedby="expense-description-meta"
          />
          <div className="field-meta-row" id="expense-description-meta">
            <span className="field-hint">A short note helps you remember.</span>
            <span
              className={`char-count${
                descriptionCount > MAX_DESCRIPTION_LENGTH * 0.9
                  ? ' is-near'
                  : ''
              }`}
            >
              {descriptionCount}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          {errors.description && (
            <p className="field-error">{errors.description}</p>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner" aria-hidden="true" />
            ) : isEditing ? (
              <IconPencil />
            ) : (
              <IconPlus />
            )}
            {submitting
              ? 'Saving…'
              : isEditing
                ? 'Update expense'
                : 'Save expense'}
          </button>

          {isEditing && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancelEdit}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>

        <p className="form-note">
          <IconLock />
          Every expense is validated again on the server before it is stored
          in PostgreSQL.
        </p>
      </form>
    </section>
  );
}
