import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Controllers translate HTTP requests into service calls and HTTP responses.
 * They contain no SQL and no validation rules.
 */
export function createExpenseController(service) {
  return {
    list: asyncHandler(async (req, res) => {
      const expenses = await service.list(req.query.category);
      res.status(200).json({ expenses, count: expenses.length });
    }),

    create: asyncHandler(async (req, res) => {
      const expense = await service.create(req.validatedExpense);
      res.status(201).json(expense);
    }),

    update: asyncHandler(async (req, res) => {
      const expense = await service.update(req.params.id, req.validatedExpense);
      res.status(200).json(expense);
    }),

    remove: asyncHandler(async (req, res) => {
      await service.remove(req.params.id);
      res.status(204).send();
    }),

    summary: asyncHandler(async (req, res) => {
      const summary = await service.getSummary();
      res.status(200).json(summary);
    }),
  };
}
