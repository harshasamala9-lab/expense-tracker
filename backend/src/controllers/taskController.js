import { asyncHandler } from '../utils/asyncHandler.js';

export function createTaskController(taskService, notificationService) {
  return {
    list: asyncHandler(async (req, res) => {
      const result = await taskService.list(req.validatedTaskFilters);
      res.status(200).json(result);
    }),

    summary: asyncHandler(async (req, res) => {
      const [summary, unreadNotifications] = await Promise.all([
        taskService.getSummary(),
        notificationService.getUnreadCount(req.user.id),
      ]);

      res.status(200).json({ ...summary, unreadNotifications });
    }),

    get: asyncHandler(async (req, res) => {
      const result = await taskService.getById(req.params.id);
      res.status(200).json(result);
    }),

    create: asyncHandler(async (req, res) => {
      const result = await taskService.create(req.validatedTask, req.user);
      res.status(201).json(result);
    }),

    update: asyncHandler(async (req, res) => {
      const result = await taskService.update(
        req.params.id,
        req.validatedTaskUpdate,
        req.user,
      );
      res.status(200).json(result);
    }),

    start: asyncHandler(async (req, res) => {
      const result = await taskService.start(
        req.params.id,
        req.user,
        req.validatedAction.note,
      );
      res.status(200).json(result);
    }),

    complete: asyncHandler(async (req, res) => {
      const result = await taskService.complete(
        req.params.id,
        req.user,
        req.validatedAction.note,
      );
      res.status(200).json(result);
    }),

    cancel: asyncHandler(async (req, res) => {
      const result = await taskService.cancel(
        req.params.id,
        req.user,
        req.validatedAction.note,
      );
      res.status(200).json(result);
    }),

    assign: asyncHandler(async (req, res) => {
      const result = await taskService.assign(
        req.params.id,
        req.validatedAssignment.assigned_to,
        req.user,
      );
      res.status(200).json(result);
    }),

    addNote: asyncHandler(async (req, res) => {
      const result = await taskService.addNote(
        req.params.id,
        req.validatedNote.note,
        req.user,
      );
      res.status(201).json(result);
    }),
  };
}
