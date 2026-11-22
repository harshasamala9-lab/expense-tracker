import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { PgNotificationRepository } from '../repositories/PgNotificationRepository.js';
import { PgAutomationEventRepository } from '../repositories/PgAutomationEventRepository.js';
import { PgTransactionManager } from '../repositories/PgTransactionManager.js';
import { NotificationService } from '../services/notificationService.js';
import { TaskService } from '../services/taskService.js';
import { TaskEventService } from '../services/taskEventService.js';
import { ReminderService } from '../services/reminderService.js';
import { createRealtimeBus } from '../services/realtimeBus.js';

/**
 * Single composition root for the task engine. The HTTP server and the CLI
 * workers both use it so reminder/event behavior cannot drift between the two
 * execution paths.
 */
export function createTaskEngine({
  pool,
  userRepository,
  expenseRepository,
  realtimeBus = createRealtimeBus(),
  options = {},
  logger = console,
}) {
  const taskRepository = new PgTaskRepository(pool);
  const notificationRepository = new PgNotificationRepository(pool);
  const automationEventRepository = new PgAutomationEventRepository(pool);
  const transactionManager = new PgTransactionManager(pool);

  const notificationService = new NotificationService({
    notificationRepository,
    userRepository,
    realtimeBus,
    logger,
  });

  const taskService = new TaskService({
    taskRepository,
    userRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger,
  });

  const taskEventService = new TaskEventService({
    taskService,
    eventRepository: automationEventRepository,
    expenseRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger,
  });

  const reminderService = new ReminderService({
    taskRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger,
    options,
  });

  return {
    taskRepository,
    notificationRepository,
    automationEventRepository,
    transactionManager,
    realtimeBus,
    notificationService,
    taskService,
    taskEventService,
    reminderService,
  };
}
