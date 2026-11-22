import { AppError } from '../utils/AppError.js';
import { CATEGORIES } from '../constants.js';
import { isUuid, validateExpensePayload } from '../utils/validators.js';

export function validateExpenseBody(req, res, next) {
  const result = validateExpensePayload(req.body);

  if (result.errors) {
    return next(
      new AppError(
        400,
        'Please correct the highlighted fields.',
        result.errors,
      ),
    );
  }

  req.validatedExpense = result.value;
  return next();
}

export function validateExpenseId(req, res, next) {
  if (!isUuid(req.params.id)) {
    return next(new AppError(400, 'Expense ID must be a valid UUID.'));
  }

  return next();
}

export function validateCategoryQuery(req, res, next) {
  const { category } = req.query;

  if (category === undefined) {
    return next();
  }

  if (typeof category !== 'string' || !CATEGORIES.includes(category)) {
    return next(
      new AppError(
        400,
        `Category filter must be one of: ${CATEGORIES.join(', ')}.`,
      ),
    );
  }

  return next();
}
