import { AppError } from '../utils/AppError.js';

/**
 * Centralized error handler. Every response uses the same JSON shape:
 *   { "message": "...", "details": [{ "field": "...", "message": "..." }] }
 *
 * Database internals, stack traces, and connection strings are never sent to
 * the client. Unexpected errors are logged on the server for debugging.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = 'An unexpected error occurred. Please try again.';
  let details;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body contains invalid JSON.';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else if (error.name === 'MulterError') {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'CSV files must be 2 MB or smaller.'
        : 'The CSV upload could not be processed.';
  } else if (error.code === '22P02') {
    // invalid_text_representation
    statusCode = 400;
    message = 'One of the supplied values has an invalid format.';
  } else if (error.code === '23514') {
    // check_violation
    statusCode = 400;
    message = 'The submitted values violate a database constraint.';
  } else if (error.code === '23503') {
    // foreign_key_violation
    statusCode = 400;
    message = 'The submitted values reference a record that does not exist.';
  } else if (error.code === '23505') {
    // unique_violation
    statusCode = 409;
    message = 'That record already exists.';
  } else if (
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01'].includes(error.code)
  ) {
    statusCode = 503;
    message = 'The database is temporarily unavailable. Please try again.';
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  } else if (process.env.NODE_ENV !== 'test') {
    console.warn(
      `[warn] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`,
    );
  }

  const body = { message };
  if (details) {
    body.details = details;
  }

  return res.status(statusCode).json(body);
}
