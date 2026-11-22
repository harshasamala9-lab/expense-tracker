import { CATEGORIES } from '../constants.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MAX_AMOUNT = 9_999_999_999.99; // NUMERIC(12,2) upper bound
const MAX_DESCRIPTION_LENGTH = 500;

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isValidDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Reject impossible dates such as 2026-02-31.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeAmount(rawValue) {
  const amount =
    typeof rawValue === 'string' && rawValue.trim() !== ''
      ? Number(rawValue)
      : rawValue;

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { error: 'Amount must be a valid number.' };
  }

  if (amount <= 0) {
    return { error: 'Amount must be greater than zero.' };
  }

  if (amount > MAX_AMOUNT) {
    return { error: 'Amount is too large.' };
  }

  // Reject more than two decimal places instead of silently rounding money.
  if (Number(amount.toFixed(2)) !== amount) {
    return { error: 'Amount can have at most two decimal places.' };
  }

  return { value: Math.round(amount * 100) / 100 };
}

/**
 * Validates a create/update payload and returns either normalized values or
 * a list of field-level errors. Unknown fields are ignored on purpose.
 */
export function validateExpensePayload(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      errors: [
        { field: 'body', message: 'Request body must be a JSON object.' },
      ],
    };
  }

  const errors = [];

  const amountResult = normalizeAmount(body.amount);
  if (amountResult.error) {
    errors.push({ field: 'amount', message: amountResult.error });
  }

  if (
    typeof body.category !== 'string' ||
    !CATEGORIES.includes(body.category)
  ) {
    errors.push({
      field: 'category',
      message: `Category must be one of: ${CATEGORIES.join(', ')}.`,
    });
  }

  if (!isValidDateString(body.expense_date)) {
    errors.push({
      field: 'expense_date',
      message: 'Date must be a valid calendar date in YYYY-MM-DD format.',
    });
  }

  let description = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be text.',
      });
    } else {
      const trimmed = body.description.trim();
      if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
        errors.push({
          field: 'description',
          message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
        });
      } else {
        description = trimmed === '' ? null : trimmed;
      }
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    value: {
      amount: amountResult.value,
      category: body.category,
      description,
      expense_date: body.expense_date,
    },
  };
}
