export const TASK_STATUSES = Object.freeze([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const OPEN_TASK_STATUSES = Object.freeze(['PENDING', 'IN_PROGRESS']);

export const TASK_PRIORITIES = Object.freeze([
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL',
]);

export const TASK_TYPES = Object.freeze([
  'GENERAL',
  'EXPENSE_REVIEW',
  'DUPLICATE_EXPENSE',
  'CATEGORIZATION_REVIEW',
  'IMPORT_FAILURE',
  'IMPORT_RECONCILIATION',
  'PARSING_ERROR',
  'AUTOMATION_FAILURE',
  'SYSTEM_INCIDENT',
  'FINANCIAL_REVIEW',
  'REPORT_FAILURE',
]);

export const TASK_SOURCES = Object.freeze([
  'manual',
  'expense',
  'import_run',
  'automation_event',
  'automation_service',
  'system',
]);

export const NOTIFICATION_SEVERITIES = Object.freeze([
  'INFO',
  'WARNING',
  'HIGH',
  'CRITICAL',
]);

export const NOTIFICATION_TYPES = Object.freeze([
  'TASK_CREATED',
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_OVERDUE',
  'TASK_DUE_SOON',
  'TASK_CRITICAL',
  'TASK_LONG_RUNNING',
  'AUTOMATION_FAILURE',
  'EXPENSE_REVIEW',
  'IMPORT_FAILURE',
  'REPEATED_FAILURE',
  'SYSTEM_ALERT',
]);

export const AUTOMATION_EVENT_TYPES = Object.freeze([
  'IMPORT_STARTED',
  'IMPORT_COMPLETED',
  'IMPORT_FAILED',
  'TRANSACTION_REQUIRES_REVIEW',
  'PARSING_FAILED',
  'CATEGORIZATION_REQUIRED',
  'AUTOMATION_FAILED',
  'EXPENSE_REVIEW_REQUIRED',
  'SYSTEM_INCIDENT',
]);

export const REMINDER_TYPES = Object.freeze([
  'DUE_SOON',
  'OVERDUE',
  'CRITICAL',
  'LONG_RUNNING',
  'REPEATED_FAILURE',
]);

export const TASK_PRIORITY_RANK = Object.freeze({
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
});

export function priorityToSeverity(priority) {
  switch (priority) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'LOW':
      return 'INFO';
    default:
      return 'WARNING';
  }
}

export function isTaskStatus(value) {
  return TASK_STATUSES.includes(value);
}

export function isTaskPriority(value) {
  return TASK_PRIORITIES.includes(value);
}

export function isTaskType(value) {
  return TASK_TYPES.includes(value);
}

export function isNotificationSeverity(value) {
  return NOTIFICATION_SEVERITIES.includes(value);
}

export function isNotificationType(value) {
  return NOTIFICATION_TYPES.includes(value);
}

export function isAutomationEventType(value) {
  return AUTOMATION_EVENT_TYPES.includes(value);
}
