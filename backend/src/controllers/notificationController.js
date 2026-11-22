import { asyncHandler } from '../utils/asyncHandler.js';

export function createNotificationController(notificationService) {
  return {
    list: asyncHandler(async (req, res) => {
      const [result, unreadCount] = await Promise.all([
        notificationService.list(
          req.user.id,
          req.validatedNotificationFilters,
        ),
        notificationService.getUnreadCount(req.user.id),
      ]);

      res.status(200).json({ ...result, unreadCount });
    }),

    unreadCount: asyncHandler(async (req, res) => {
      const unreadCount = await notificationService.getUnreadCount(req.user.id);
      res.status(200).json({ unreadCount });
    }),

    markRead: asyncHandler(async (req, res) => {
      const result = await notificationService.markRead(
        req.params.id,
        req.user.id,
      );
      res.status(200).json(result);
    }),

    markAllRead: asyncHandler(async (req, res) => {
      const result = await notificationService.markAllRead(req.user.id);
      res.status(200).json(result);
    }),
  };
}
