import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

export function createRealtimeRouter(realtimeController, authService) {
  const router = Router();

  router.use(requireAuth(authService), requireRole('admin'));
  router.get('/', realtimeController.stream);

  return router;
}
