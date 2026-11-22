import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadCsv } from '../middleware/uploadCsv.js';

export function createAdminRouter(adminController, authService) {
  const router = Router();

  router.use(requireAuth(authService), requireRole('admin'));

  router.get('/analytics', adminController.analytics);
  router.get('/automation/status', adminController.automationStatus);
  router.post('/automation/import', uploadCsv, adminController.importCsv);

  return router;
}
