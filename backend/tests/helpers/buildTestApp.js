import { createApp } from '../../src/app.js';
import { createExpenseController } from '../../src/controllers/expenseController.js';
import { createAuthController } from '../../src/controllers/authController.js';
import { createAdminController } from '../../src/controllers/adminController.js';
import { createTaskController } from '../../src/controllers/taskController.js';
import { createNotificationController } from '../../src/controllers/notificationController.js';
import { createRealtimeController } from '../../src/controllers/realtimeController.js';
import { createInternalAutomationController } from '../../src/controllers/internalAutomationController.js';
import { InMemoryExpenseRepository } from '../../src/repositories/InMemoryExpenseRepository.js';
import { InMemoryUserRepository } from '../../src/repositories/InMemoryUserRepository.js';
import { InMemoryAdminRepository } from '../../src/repositories/InMemoryAdminRepository.js';
import { InMemoryTaskRepository } from '../../src/repositories/InMemoryTaskRepository.js';
import { InMemoryNotificationRepository } from '../../src/repositories/InMemoryNotificationRepository.js';
import { InMemoryAutomationEventRepository } from '../../src/repositories/InMemoryAutomationEventRepository.js';
import { InMemoryTransactionManager } from '../../src/repositories/InMemoryTransactionManager.js';
import { ExpenseService } from '../../src/services/expenseService.js';
import { AuthService } from '../../src/services/authService.js';
import { AdminService } from '../../src/services/adminService.js';
import { AutomationClient } from '../../src/services/automationClient.js';
import { NotificationService } from '../../src/services/notificationService.js';
import { TaskService } from '../../src/services/taskService.js';
import { TaskEventService } from '../../src/services/taskEventService.js';
import { ReminderService } from '../../src/services/reminderService.js';
import { createRealtimeBus } from '../../src/services/realtimeBus.js';

export const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const VIEWER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const ADMIN_EMAIL = 'admin@example.com';
export const VIEWER_EMAIL = 'viewer@example.com';
export const TEST_PASSWORD = 'TestPassword123!';
export const TEST_JWT_SECRET =
  'test-only-jwt-secret-that-is-longer-than-32-characters';
export const TEST_INTERNAL_KEY = 'test-internal-automation-key-32-chars';

// bcrypt hash of TEST_PASSWORD at cost 4. A lower cost keeps the test suite
// fast; production uses cost 12.
const TEST_PASSWORD_HASH =
  '$2b$04$d0R3NnXzWGfBIQHDTXiF6es9XzzLOAdjjO6UtvJm3oDcoCOEtFHcS';

export function buildTestApp({
  seed = [],
  users,
  importRuns = [],
  tasks = [],
  notifications = [],
  automationEvents = [],
  automationClient,
  frontendUrl = '',
  now,
} = {}) {
  const clock = now ?? (() => new Date());
  const expenseRepository = new InMemoryExpenseRepository(seed);
  const userRepository = new InMemoryUserRepository(
    users ?? [
      {
        id: ADMIN_ID,
        email: ADMIN_EMAIL,
        password_hash: TEST_PASSWORD_HASH,
        role: 'admin',
      },
      {
        id: VIEWER_ID,
        email: VIEWER_EMAIL,
        password_hash: TEST_PASSWORD_HASH,
        role: 'viewer',
      },
    ],
  );
  const adminRepository = new InMemoryAdminRepository(
    expenseRepository,
    importRuns,
  );
  const taskRepository = new InMemoryTaskRepository(tasks, { now: clock });
  const notificationRepository = new InMemoryNotificationRepository(
    notifications,
    { now: clock },
  );
  const eventRepository = new InMemoryAutomationEventRepository(
    automationEvents,
    { now: clock },
  );
  const transactionManager = new InMemoryTransactionManager([
    taskRepository,
    notificationRepository,
    eventRepository,
  ]);
  const realtimeBus = createRealtimeBus();

  const notificationService = new NotificationService({
    notificationRepository,
    userRepository,
    realtimeBus,
    logger: { log() {}, warn() {}, error() {} },
  });

  const taskService = new TaskService({
    taskRepository,
    userRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger: { log() {}, warn() {}, error() {} },
    now: clock,
  });

  const taskEventService = new TaskEventService({
    taskService,
    eventRepository,
    expenseRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger: { log() {}, warn() {}, error() {} },
    now: clock,
  });

  const reminderService = new ReminderService({
    taskRepository,
    notificationService,
    transactionManager,
    realtimeBus,
    logger: { log() {}, warn() {}, error() {} },
    now: clock,
  });

  const authService = new AuthService(userRepository, {
    jwtSecret: TEST_JWT_SECRET,
    jwtExpiresIn: '1h',
    bcryptRounds: 10,
  });

  const app = createApp({
    expenseController: createExpenseController(
      new ExpenseService(expenseRepository, {
        onExpenseCreated: (expense) =>
          taskEventService.handleExpenseCreated(expense),
        logger: { error() {} },
      }),
    ),
    authController: createAuthController(authService),
    authService,
    adminController: createAdminController(
      new AdminService(adminRepository),
      automationClient ??
        new AutomationClient({ baseUrl: '', apiKey: '' }),
    ),
    taskController: createTaskController(taskService, notificationService),
    notificationController: createNotificationController(notificationService),
    realtimeController: createRealtimeController({
      realtimeBus,
      notificationService,
    }),
    internalAutomationController:
      createInternalAutomationController(taskEventService),
    internalAutomationKey: TEST_INTERNAL_KEY,
    frontendUrl,
    enableLogging: false,
    healthCheck: async () => {},
  });

  return {
    app,
    expenseRepository,
    userRepository,
    adminRepository,
    taskRepository,
    notificationRepository,
    eventRepository,
    realtimeBus,
    authService,
    notificationService,
    taskService,
    taskEventService,
    reminderService,
  };
}

export async function loginAs(app, email = ADMIN_EMAIL) {
  const response = await requestLogin(app, email);
  return response.body.token;
}

async function requestLogin(app, email) {
  const { default: request } = await import('supertest');
  return request(app)
    .post('/api/auth/login')
    .send({ email, password: TEST_PASSWORD });
}
