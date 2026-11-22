import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export function createAdminController(adminService, automationClient) {
  return {
    analytics: asyncHandler(async (req, res) => {
      const days = Number(req.query.days) || 30;
      const analytics = await adminService.getAnalytics({ days });
      res.status(200).json(analytics);
    }),

    automationStatus: asyncHandler(async (req, res) => {
      const status = await automationClient.getStatus();
      res.status(200).json(status);
    }),

    importCsv: asyncHandler(async (req, res) => {
      if (!req.file) {
        throw new AppError(400, 'Choose a CSV file to import.');
      }

      const result = await automationClient.importCsv(req.file);
      res.status(201).json(result);
    }),
  };
}
