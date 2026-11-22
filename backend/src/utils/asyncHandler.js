/**
 * Wraps an async Express handler so rejected promises reach the centralized
 * error-handling middleware instead of becoming unhandled rejections.
 */
export function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
