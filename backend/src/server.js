import { createApp } from './app.js';
import {
  config,
  requireDatabaseUrl,
  requireJwtSecret,
} from './config/env.js';
import { closePool, getPool } from './config/db.js';
import { PgExpenseRepository } from './repositories/PgExpenseRepository.js';
import { PgUserRepository } from './repositories/PgUserRepository.js';
import { PgAdminRepository } from './repositories/PgAdminRepository.js';
import { ExpenseService } from './services/expenseService.js';
import { AuthService } from './services/authService.js';
import { SupabaseAuthService } from './services/supabaseAuthService.js';
import { GoogleAuthService } from './services/googleAuthService.js';
import { AdminService } from './services/adminService.js';
import { AutomationClient } from './services/automationClient.js';
import { createIntervalWorker } from './services/reminderService.js';
import { createRealtimeBus } from './services/realtimeBus.js';
import { createTaskEngine } from './bootstrap/taskEngine.js';
import { createExpenseController } from './controllers/expenseController.js';
import { createAuthController } from './controllers/authController.js';
import { createAdminController } from './controllers/adminController.js';
import { createTaskController } from './controllers/taskController.js';
import { createNotificationController } from './controllers/notificationController.js';
import { createRealtimeController } from './controllers/realtimeController.js';
import { createInternalAutomationController } from './controllers/internalAutomationController.js';

requireDatabaseUrl();
const jwtSecret = requireJwtSecret();

const pool = getPool();

const expenseRepository = new PgExpenseRepository(pool);
const userRepository = new PgUserRepository(pool);
const adminRepository = new PgAdminRepository(pool);
const realtimeBus = createRealtimeBus();

const {
  notificationService,
  taskService,
  taskEventService,
  reminderService,
} = createTaskEngine({
  pool,
  userRepository,
  expenseRepository,
  realtimeBus,
  options: {
    dueSoonHours: config.reminderDueSoonHours,
    longRunningHours: config.reminderLongRunningHours,
    criticalAgeHours: config.reminderCriticalAgeHours,
    repeatedFailureThreshold: config.repeatedFailureThreshold,
  },
});

const expenseController = createExpenseController(
  new ExpenseService(expenseRepository, {
    onExpenseCreated: (expense) =>
      taskEventService.handleExpenseCreated(expense),
  }),
);
const authService = new AuthService(userRepository, {
  jwtSecret,
  jwtExpiresIn: config.jwtExpiresIn,
});
const googleAuthService = new GoogleAuthService({
  authService,
  userRepository,
  clientId: config.googleClientId,
  clientSecret: config.googleClientSecret,
});
if (googleAuthService.configured) {
  console.log('[auth] Direct Google OAuth is enabled.');
}
const supabaseAuthService = new SupabaseAuthService({
  authService,
  userRepository,
  supabaseUrl: config.supabaseUrl,
  supabaseAnonKey: config.supabaseAnonKey,
});
if (config.supabaseUrl && config.supabaseAnonKey) {
  console.log('[auth] Supabase Google login is enabled for Google users.');
}
const authController = createAuthController(
  authService,
  googleAuthService,
  supabaseAuthService,
);
const automationClient = new AutomationClient({
  baseUrl: config.automationUrl,
  apiKey: config.automationKey,
});
const adminController = createAdminController(
  new AdminService(adminRepository),
  automationClient,
);
const taskController = createTaskController(taskService, notificationService);
const notificationController =
  createNotificationController(notificationService);
const realtimeController = createRealtimeController({
  realtimeBus,
  notificationService,
});
const internalAutomationController = createInternalAutomationController(
  taskEventService,
);

const app = createApp({
  expenseController,
  authController,
  authService,
  adminController,
  taskController,
  notificationController,
  realtimeController,
  internalAutomationController,
  internalAutomationKey: config.internalAutomationKey,
  frontendUrl: config.frontendUrl,
  healthCheck: () => pool.query('SELECT 1'),
});

try {
  await pool.query('SELECT 1');
  console.log('[db] Connected to PostgreSQL');

  const { rows } = await pool.query(
    `SELECT to_regclass('public.admin_tasks') AS tasks,
            to_regclass('public.admin_notifications') AS notifications,
            to_regclass('public.automation_events') AS events`,
  );

  if (!rows[0]?.tasks || !rows[0]?.notifications || !rows[0]?.events) {
    console.warn(
      '[db] Task/notification tables are missing. Run "npm run db:migrate" before using the admin task engine.',
    );
  }
} catch (error) {
  console.error('[db] Could not connect to PostgreSQL:', error.message);
  process.exit(1);
}

if (automationClient.configured) {
  const status = await automationClient.getStatus();
  console.log(
    `[automation] Python service ${status.reachable ? 'reachable' : 'unreachable'} at ${config.automationUrl}`,
  );
} else {
  console.warn(
    '[automation] AUTOMATION_URL / AUTOMATION_KEY are not configured; admin CSV imports are disabled.',
  );
}

if (!config.internalAutomationKey) {
  console.warn(
    '[automation] INTERNAL_AUTOMATION_KEY is not configured; POST /api/internal/automation/events is disabled.',
  );
}

const workers = [];

if (config.enableWorkers) {
  const reminderWorker = createIntervalWorker({
    name: 'reminders',
    intervalMs: config.reminderIntervalMs,
    run: () => reminderService.run(),
  });
  const eventWorker = createIntervalWorker({
    name: 'automation-events',
    intervalMs: config.automationEventIntervalMs,
    run: () => taskEventService.processPending(20),
  });

  reminderWorker.start();
  eventWorker.start();
  workers.push(reminderWorker, eventWorker);
} else {
  console.warn(
    '[workers] ENABLE_WORKERS=false; reminder and event workers are not running in this process.',
  );
}

const server = app.listen(config.port, () => {
  console.log(
    `[api] Expense Tracker API listening on http://localhost:${config.port} (${config.nodeEnv})`,
  );
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down gracefully...`);

  for (const worker of workers) {
    worker.stop();
  }

  const forceExit = setTimeout(() => {
    console.error('[api] Shutdown timed out.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await closePool();
      console.log('[api] Shutdown complete.');
      process.exit(0);
    } catch (error) {
      console.error('[api] Error while closing the database pool:', error);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
