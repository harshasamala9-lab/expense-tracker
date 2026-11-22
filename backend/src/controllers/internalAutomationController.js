import { asyncHandler } from '../utils/asyncHandler.js';

export function createInternalAutomationController(eventService) {
  return {
    receiveEvent: asyncHandler(async (req, res) => {
      const result = await eventService.receive(req.validatedEvent);
      res.status(202).json(result);
    }),
  };
}
