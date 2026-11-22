import { Router } from 'express';
import {
  validateCategoryQuery,
  validateExpenseBody,
  validateExpenseId,
} from '../middleware/validation.js';

export function createExpenseRouter(controller) {
  const router = Router();

  router.get('/', validateCategoryQuery, controller.list);
  router.post('/', validateExpenseBody, controller.create);
  router.put('/:id', validateExpenseId, validateExpenseBody, controller.update);
  router.delete('/:id', validateExpenseId, controller.remove);

  return router;
}

export function createSummaryRouter(controller) {
  const router = Router();
  router.get('/', controller.summary);
  return router;
}
