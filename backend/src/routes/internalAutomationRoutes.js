import { Router } from 'express';
import { requireInternalKey } from '../middleware/internalAuth.js';
import { validateAutomationEventBody } from '../middleware/taskValidation.js';

export function createInternalAutomationRouter(
  internalAutomationController,
  internalKey,
) {
  const router = Router();

  router.use(requireInternalKey(internalKey));
  router.post(
    '/events',
    validateAutomationEventBody,
    internalAutomationController.receiveEvent,
  );

  return router;
}
