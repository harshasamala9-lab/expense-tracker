import { AppError } from '../utils/AppError.js';
import {
  validateAssignmentPayload,
  validateAutomationEventPayload,
  validateNotificationFilters,
  validateTaskActionPayload,
  validateTaskCreatePayload,
  validateTaskFilters,
  validateTaskNotePayload,
  validateTaskUpdatePayload,
} from '../utils/taskValidators.js';

function respondWithErrors(result) {
  return new AppError(
    400,
    'Please correct the highlighted fields.',
    result.errors,
  );
}

export function validateTaskCreateBody(req, res, next) {
  const result = validateTaskCreatePayload(req.body);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedTask = result.value;
  return next();
}

export function validateTaskUpdateBody(req, res, next) {
  const result = validateTaskUpdatePayload(req.body);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedTaskUpdate = result.value;
  return next();
}

export function validateTaskListQuery(req, res, next) {
  const result = validateTaskFilters(req.query);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedTaskFilters = result.value;
  return next();
}

export function validateNotificationListQuery(req, res, next) {
  const result = validateNotificationFilters(req.query);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedNotificationFilters = result.value;
  return next();
}

export function validateAssignmentBody(req, res, next) {
  const result = validateAssignmentPayload(req.body);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedAssignment = result.value;
  return next();
}

export function validateTaskNoteBody(req, res, next) {
  const result = validateTaskNotePayload(req.body);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedNote = result.value;
  return next();
}

export function validateTaskActionBody(req, res, next) {
  const result = validateTaskActionPayload(req.body);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedAction = result.value;
  return next();
}

export function validateAutomationEventBody(req, res, next) {
  const result = validateAutomationEventPayload(req.body);

  if (result.errors) {
    return next(respondWithErrors(result));
  }

  req.validatedEvent = result.value;
  return next();
}
