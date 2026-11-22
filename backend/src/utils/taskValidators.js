import {
  AUTOMATION_EVENT_TYPES,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  isAutomationEventType,
  isNotificationSeverity,
  isNotificationType,
  isTaskPriority,
  isTaskStatus,
  isTaskType,
} from '../constants/tasks.js';
import { AppError } from './AppError.js';
import { isUuid } from './validators.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_METADATA_BYTES = 8192;
const MAX_SEARCH_LENGTH = 100;
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseTimestamp(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  if (typeof value !== 'string') {
    return { error: 'Must be an ISO 8601 timestamp.' };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { error: 'Must be a valid ISO 8601 timestamp.' };
  }

  return { value: date.toISOString() };
}

function validateMetadata(value) {
  if (value === undefined) {
    return { value: {} };
  }

  if (!isPlainObject(value)) {
    return { error: 'Metadata must be a JSON object.' };
  }

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { error: 'Metadata must be JSON serializable.' };
  }

  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
    return { error: `Metadata must be ${MAX_METADATA_BYTES} bytes or smaller.` };
  }

  return { value };
}

function errorsOrValue(errors, value) {
  return errors.length > 0 ? { errors } : { value };
}

export function validateTaskCreatePayload(body) {
  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const errors = [];
  const title = text(body.title);

  if (title.length < 3 || title.length > MAX_TITLE_LENGTH) {
    errors.push({
      field: 'title',
      message: `Title must be between 3 and ${MAX_TITLE_LENGTH} characters.`,
    });
  }

  let description = '';
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be text.',
      });
    } else {
      description = body.description.trim();
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push({
          field: 'description',
          message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
        });
      }
    }
  }

  const taskType = body.task_type ?? 'GENERAL';
  if (!isTaskType(taskType)) {
    errors.push({
      field: 'task_type',
      message: `Task type must be one of: ${TASK_TYPES.join(', ')}.`,
    });
  }

  const priority = body.priority ?? 'NORMAL';
  if (!isTaskPriority(priority)) {
    errors.push({
      field: 'priority',
      message: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`,
    });
  }

  let assignedTo = null;
  if (body.assigned_to !== undefined && body.assigned_to !== null) {
    if (!isUuid(body.assigned_to)) {
      errors.push({
        field: 'assigned_to',
        message: 'Assigned administrator must be a valid UUID.',
      });
    } else {
      assignedTo = body.assigned_to;
    }
  }

  const dueAtResult = parseTimestamp(body.due_at);
  if (dueAtResult.error) {
    errors.push({ field: 'due_at', message: dueAtResult.error });
  }

  let idempotencyKey = null;
  if (body.idempotency_key !== undefined && body.idempotency_key !== null) {
    if (typeof body.idempotency_key !== 'string') {
      errors.push({
        field: 'idempotency_key',
        message: 'Idempotency key must be text.',
      });
    } else {
      idempotencyKey = body.idempotency_key.trim();
      if (
        idempotencyKey.length < 1 ||
        idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH
      ) {
        errors.push({
          field: 'idempotency_key',
          message: `Idempotency key must be between 1 and ${MAX_IDEMPOTENCY_KEY_LENGTH} characters.`,
        });
      }
    }
  }

  const metadataResult = validateMetadata(body.metadata);
  if (metadataResult.error) {
    errors.push({ field: 'metadata', message: metadataResult.error });
  }

  return errorsOrValue(errors, {
    title,
    description,
    task_type: taskType,
    priority,
    assigned_to: assignedTo,
    due_at: dueAtResult.value,
    idempotency_key: idempotencyKey,
    metadata: metadataResult.value ?? {},
  });
}

export function validateTaskUpdatePayload(body) {
  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const errors = [];
  const value = {};
  let changed = 0;

  if (body.title !== undefined) {
    if (typeof body.title !== 'string') {
      errors.push({ field: 'title', message: 'Title must be text.' });
    } else {
      const title = body.title.trim();
      if (title.length < 3 || title.length > MAX_TITLE_LENGTH) {
        errors.push({
          field: 'title',
          message: `Title must be between 3 and ${MAX_TITLE_LENGTH} characters.`,
        });
      } else {
        value.title = title;
        changed += 1;
      }
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be text.',
      });
    } else {
      const description = body.description.trim();
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push({
          field: 'description',
          message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
        });
      } else {
        value.description = description;
        changed += 1;
      }
    }
  }

  if (body.priority !== undefined) {
    if (!isTaskPriority(body.priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`,
      });
    } else {
      value.priority = body.priority;
      changed += 1;
    }
  }

  if (body.due_at !== undefined) {
    const dueAtResult = parseTimestamp(body.due_at);
    if (dueAtResult.error) {
      errors.push({ field: 'due_at', message: dueAtResult.error });
    } else {
      value.due_at = dueAtResult.value;
      changed += 1;
    }
  }

  if (body.snoozed_until !== undefined) {
    const snoozedResult = parseTimestamp(body.snoozed_until);
    if (snoozedResult.error) {
      errors.push({ field: 'snoozed_until', message: snoozedResult.error });
    } else {
      value.snoozed_until = snoozedResult.value;
      changed += 1;
    }
  }

  if (changed === 0 && errors.length === 0) {
    errors.push({
      field: 'body',
      message: 'Provide at least one editable field: title, description, priority, due_at or snoozed_until.',
    });
  }

  return errorsOrValue(errors, value);
}

export function validateTaskFilters(query = {}) {
  const errors = [];
  const value = {
    status: null,
    task_type: null,
    priority: null,
    assigned_to: null,
    overdue: false,
    search: null,
    sort: 'newest',
    page: 1,
    pageSize: 20,
  };

  if (query.status !== undefined && query.status !== '' && query.status !== 'ALL') {
    if (!isTaskStatus(query.status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${TASK_STATUSES.join(', ')}.`,
      });
    } else {
      value.status = query.status;
    }
  }

  if (
    query.task_type !== undefined &&
    query.task_type !== '' &&
    query.task_type !== 'ALL'
  ) {
    if (!isTaskType(query.task_type)) {
      errors.push({
        field: 'task_type',
        message: `Task type must be one of: ${TASK_TYPES.join(', ')}.`,
      });
    } else {
      value.task_type = query.task_type;
    }
  }

  if (
    query.priority !== undefined &&
    query.priority !== '' &&
    query.priority !== 'ALL'
  ) {
    if (!isTaskPriority(query.priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`,
      });
    } else {
      value.priority = query.priority;
    }
  }

  if (
    query.assigned_to !== undefined &&
    query.assigned_to !== '' &&
    query.assigned_to !== 'ALL'
  ) {
    if (query.assigned_to === 'unassigned') {
      value.assigned_to = 'unassigned';
    } else if (!isUuid(query.assigned_to)) {
      errors.push({
        field: 'assigned_to',
        message: 'Assigned administrator filter must be a UUID or "unassigned".',
      });
    } else {
      value.assigned_to = query.assigned_to;
    }
  }

  if (query.overdue !== undefined) {
    if (query.overdue === 'true' || query.overdue === true) {
      value.overdue = true;
    } else if (query.overdue === 'false' || query.overdue === false) {
      value.overdue = false;
    } else {
      errors.push({
        field: 'overdue',
        message: 'Overdue must be true or false.',
      });
    }
  }

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      errors.push({ field: 'search', message: 'Search must be text.' });
    } else {
      const search = query.search.trim();
      if (search.length > MAX_SEARCH_LENGTH) {
        errors.push({
          field: 'search',
          message: `Search must be ${MAX_SEARCH_LENGTH} characters or fewer.`,
        });
      } else if (search) {
        value.search = search;
      }
    }
  }

  if (query.sort !== undefined) {
    if (!['newest', 'oldest', 'priority', 'due'].includes(query.sort)) {
      errors.push({
        field: 'sort',
        message: 'Sort must be one of: newest, oldest, priority, due.',
      });
    } else {
      value.sort = query.sort;
    }
  }

  const page = Number(query.page ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    errors.push({ field: 'page', message: 'Page must be a positive integer.' });
  } else {
    value.page = page;
  }

  const pageSize = Number(query.pageSize ?? 20);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    errors.push({
      field: 'pageSize',
      message: 'Page size must be an integer between 1 and 100.',
    });
  } else {
    value.pageSize = pageSize;
  }

  return errorsOrValue(errors, value);
}

export function validateNotificationFilters(query = {}) {
  const errors = [];
  const value = {
    status: 'all',
    severity: null,
    notification_type: null,
    task_id: null,
    search: null,
    page: 1,
    pageSize: 20,
  };

  if (query.status !== undefined && query.status !== '') {
    if (!['all', 'unread', 'read'].includes(query.status)) {
      errors.push({
        field: 'status',
        message: 'Status must be one of: all, unread, read.',
      });
    } else {
      value.status = query.status;
    }
  }

  if (
    query.severity !== undefined &&
    query.severity !== '' &&
    query.severity !== 'ALL'
  ) {
    if (!isNotificationSeverity(query.severity)) {
      errors.push({
        field: 'severity',
        message: `Severity must be one of: ${NOTIFICATION_SEVERITIES.join(', ')}.`,
      });
    } else {
      value.severity = query.severity;
    }
  }

  if (
    query.notification_type !== undefined &&
    query.notification_type !== '' &&
    query.notification_type !== 'ALL'
  ) {
    if (!isNotificationType(query.notification_type)) {
      errors.push({
        field: 'notification_type',
        message: `Notification type must be one of: ${NOTIFICATION_TYPES.join(', ')}.`,
      });
    } else {
      value.notification_type = query.notification_type;
    }
  }

  if (query.task_id !== undefined && query.task_id !== '') {
    if (!isUuid(query.task_id)) {
      errors.push({ field: 'task_id', message: 'Task ID must be a valid UUID.' });
    } else {
      value.task_id = query.task_id;
    }
  }

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      errors.push({ field: 'search', message: 'Search must be text.' });
    } else {
      const search = query.search.trim();
      if (search.length > MAX_SEARCH_LENGTH) {
        errors.push({
          field: 'search',
          message: `Search must be ${MAX_SEARCH_LENGTH} characters or fewer.`,
        });
      } else if (search) {
        value.search = search;
      }
    }
  }

  const page = Number(query.page ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    errors.push({ field: 'page', message: 'Page must be a positive integer.' });
  } else {
    value.page = page;
  }

  const pageSize = Number(query.pageSize ?? 20);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    errors.push({
      field: 'pageSize',
      message: 'Page size must be an integer between 1 and 100.',
    });
  } else {
    value.pageSize = pageSize;
  }

  return errorsOrValue(errors, value);
}

export function validateAssignmentPayload(body) {
  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  if (body.assigned_to === null) {
    return { value: { assigned_to: null } };
  }

  if (!isUuid(body.assigned_to)) {
    return {
      errors: [
        {
          field: 'assigned_to',
          message: 'Assigned administrator must be a valid UUID or null.',
        },
      ],
    };
  }

  return { value: { assigned_to: body.assigned_to } };
}

export function validateTaskNotePayload(body) {
  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  if (typeof body.note !== 'string' || body.note.trim().length === 0) {
    return {
      errors: [{ field: 'note', message: 'Note must be non-empty text.' }],
    };
  }

  const note = body.note.trim();
  if (note.length > MAX_DESCRIPTION_LENGTH) {
    return {
      errors: [
        {
          field: 'note',
          message: `Note must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
        },
      ],
    };
  }

  return { value: { note } };
}

export function validateTaskActionPayload(body) {
  if (body === undefined || body === null) {
    return { value: { note: null } };
  }

  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string') {
      return { errors: [{ field: 'note', message: 'Note must be text.' }] };
    }

    const note = body.note.trim();
    if (note.length > MAX_DESCRIPTION_LENGTH) {
      return {
        errors: [
          {
            field: 'note',
            message: `Note must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
          },
        ],
      };
    }

    return { value: { note: note || null } };
  }

  return { value: { note: null } };
}

function sanitizeFileName(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const base = value.split(/[\\/]/).pop()?.trim() ?? '';
  return base ? base.slice(0, 255) : null;
}

function nonNegativeInteger(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function optionalStringField(rawValue, field, maxLength, errors) {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    errors.push({ field, message: `${field} must be text.` });
    return null;
  }

  const value = rawValue.trim();
  if (value.length > maxLength) {
    errors.push({
      field,
      message: `${field} must be ${maxLength} characters or fewer.`,
    });
    return null;
  }

  return value || null;
}

export function validateAutomationEventPayload(body) {
  if (!isPlainObject(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const errors = [];
  const eventId = text(body.eventId);

  if (!/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,119}$/.test(eventId)) {
    errors.push({
      field: 'eventId',
      message: 'eventId is required and must be 1-120 safe characters.',
    });
  }

  if (!isAutomationEventType(body.eventType)) {
    errors.push({
      field: 'eventType',
      message: `eventType must be one of: ${AUTOMATION_EVENT_TYPES.join(', ')}.`,
    });
  }

  let source = 'python-automation';
  if (body.source !== undefined) {
    if (typeof body.source !== 'string' || !body.source.trim()) {
      errors.push({ field: 'source', message: 'source must be non-empty text.' });
    } else {
      source = body.source.trim().slice(0, 60);
    }
  }

  let occurredAt = new Date().toISOString();
  if (body.occurredAt !== undefined) {
    const result = parseTimestamp(body.occurredAt);
    if (result.error) {
      errors.push({ field: 'occurredAt', message: result.error });
    } else if (result.value) {
      occurredAt = result.value;
    }
  }

  if (!isPlainObject(body.payload)) {
    errors.push({ field: 'payload', message: 'payload must be a JSON object.' });
  }

  const rawPayload = isPlainObject(body.payload) ? body.payload : {};
  const payload = {};

  const runId = optionalStringField(rawPayload.runId, 'payload.runId', 64, errors);
  if (runId) {
    payload.runId = runId;
  }

  if (rawPayload.fileName !== undefined && rawPayload.fileName !== null) {
    if (typeof rawPayload.fileName !== 'string') {
      errors.push({
        field: 'payload.fileName',
        message: 'fileName must be text.',
      });
    } else {
      const fileName = sanitizeFileName(rawPayload.fileName);
      if (fileName) {
        payload.fileName = fileName;
      }
    }
  }

  for (const key of [
    'importedCount',
    'skippedCount',
    'failedCount',
    'parseErrorCount',
    'categorizationRequiredCount',
    'rowCount',
  ]) {
    if (rawPayload[key] !== undefined) {
      const count = nonNegativeInteger(rawPayload[key]);
      if (count === undefined) {
        errors.push({
          field: `payload.${key}`,
          message: `${key} must be a non-negative integer.`,
        });
      } else {
        payload[key] = count;
      }
    }
  }

  const errorSummary = optionalStringField(
    rawPayload.errorSummary,
    'payload.errorSummary',
    500,
    errors,
  );
  if (errorSummary) {
    payload.errorSummary = errorSummary;
  }

  const sourceId = optionalStringField(
    rawPayload.sourceId,
    'payload.sourceId',
    255,
    errors,
  );
  if (sourceId) {
    payload.sourceId = sourceId;
  }

  const status = optionalStringField(
    rawPayload.status,
    'payload.status',
    30,
    errors,
  );
  if (status) {
    payload.status = status;
  }

  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
    errors.push({
      field: 'payload',
      message: `payload must be ${MAX_METADATA_BYTES} bytes or smaller.`,
    });
  }

  return errorsOrValue(errors, {
    eventId,
    eventType: body.eventType,
    source,
    occurredAt,
    payload,
  });
}

export function validateUuidParam(paramName = 'id') {
  return (req, res, next) => {
    if (!isUuid(req.params[paramName])) {
      return next(
        new AppError(400, 'The supplied identifier must be a valid UUID.'),
      );
    }
    return next();
  };
}

