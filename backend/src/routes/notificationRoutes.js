import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateNotificationListQuery } from '../middleware/taskValidation.js';
import { validateUuidParam } from '../utils/taskValidators.js';

export function createNotificationRouter(notificationController, authService) {
  const router = Router();

  router.use(requireAuth(authService), requireRole('admin'));

  router.get(
    '/',
    validateNotificationListQuery,
    notificationController.list,
  );
  router.get('/unread-count', notificationController.unreadCount);
  router.post('/read-all', notificationController.markAllRead);
  router.post(
    '/:id/read',
    validateUuidParam(),
    notificationController.markRead,
  );

  return router;
}
