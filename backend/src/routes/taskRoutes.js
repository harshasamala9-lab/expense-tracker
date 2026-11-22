import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  validateAssignmentBody,
  validateTaskActionBody,
  validateTaskCreateBody,
  validateTaskListQuery,
  validateTaskNoteBody,
  validateTaskUpdateBody,
} from '../middleware/taskValidation.js';
import { validateUuidParam } from '../utils/taskValidators.js';

export function createTaskRouter(taskController, authService) {
  const router = Router();

  router.use(requireAuth(authService), requireRole('admin'));

  router.get('/', validateTaskListQuery, taskController.list);
  router.get('/summary', taskController.summary);
  router.post('/', validateTaskCreateBody, taskController.create);

  router.get('/:id', validateUuidParam(), taskController.get);
  router.patch(
    '/:id',
    validateUuidParam(),
    validateTaskUpdateBody,
    taskController.update,
  );
  router.post(
    '/:id/start',
    validateUuidParam(),
    validateTaskActionBody,
    taskController.start,
  );
  router.post(
    '/:id/complete',
    validateUuidParam(),
    validateTaskActionBody,
    taskController.complete,
  );
  router.post(
    '/:id/cancel',
    validateUuidParam(),
    validateTaskActionBody,
    taskController.cancel,
  );
  router.post(
    '/:id/assign',
    validateUuidParam(),
    validateAssignmentBody,
    taskController.assign,
  );
  router.post(
    '/:id/notes',
    validateUuidParam(),
    validateTaskNoteBody,
    taskController.addNote,
  );

  return router;
}
