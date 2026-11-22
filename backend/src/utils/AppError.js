/**
 * An error that is safe to expose to API clients.
 *
 * Any error without this marker is treated as an unexpected exception and
 * reported to the client as a generic 500 response.
 */
export class AppError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }
}
