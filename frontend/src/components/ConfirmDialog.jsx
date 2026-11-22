import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '../utils/format.js';
import { IconTrash } from './Icons.jsx';

export default function ConfirmDialog({
  open,
  title,
  description,
  expense,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  busy = false,
}) {
  const cancelButtonRef = useRef(null);
  const cancelHandlerRef = useRef(onCancel);
  const busyRef = useRef(busy);

  cancelHandlerRef.current = onCancel;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        cancelHandlerRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <span className="modal-icon">
          <IconTrash />
        </span>

        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>

        {expense && (
          <div className="modal-expense">
            <div>
              <strong>{expense.description || expense.category}</strong>
              <span>
                {expense.category} · {formatDate(expense.expense_date)}
              </span>
            </div>
            <span>{formatCurrency(expense.amount)}</span>
          </div>
        )}

        <div className="modal-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <span className="spinner spinner--light" aria-hidden="true" />
            ) : (
              <IconTrash />
            )}
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
