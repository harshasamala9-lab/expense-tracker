import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { AppError } from './utils/AppError.js';
import { asyncHandler } from './utils/asyncHandler.js';
import {
  createExpenseRouter,
  createSummaryRouter,
} from './routes/expenseRoutes.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createAdminRouter } from './routes/adminRoutes.js';
import { createTaskRouter } from './routes/taskRoutes.js';
import { createNotificationRouter } from './routes/notificationRoutes.js';
import { createRealtimeRouter } from './routes/realtimeRoutes.js';
import { createInternalAutomationRouter } from './routes/internalAutomationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

function buildCorsOptions(frontendUrl) {
  const allowedOrigins = String(frontendUrl || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Requests without an Origin header (curl, server-to-server, health
      // checks) are allowed. Browser requests must match FRONTEND_URL.
      if (!origin || allowedOrigins.length === 0) {
        return callback(null, true);
      }

      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      return callback(
        new AppError(403, 'This origin is not allowed to access the API.'),
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    maxAge: 86_400,
  };
}

/**
 * Builds the Express application without starting a server.
 *
 * Dependencies are injected so tests can pass in-memory repositories while
 * production passes the PostgreSQL implementations.
 */
export function createApp({
  expenseController,
  authController,
  authService,
  adminController,
  taskController = null,
  notificationController = null,
  realtimeController = null,
  internalAutomationController = null,
  internalAutomationKey = '',
  frontendUrl = '',
  healthCheck,
  enableLogging = true,
}) {
  if (!expenseController) {
    throw new Error('createApp requires an expenseController.');
  }

  if (!authController || !authService) {
    throw new Error('createApp requires authController and authService.');
  }

  if (!adminController) {
    throw new Error('createApp requires an adminController.');
  }

  const app = express();
  app.disable('x-powered-by');

  // Render and the public development tunnel both terminate TLS at a proxy.
  // Trusting the first hop keeps rate limiting and CORS accurate without
  // trusting arbitrary client-supplied forwarding headers.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors(buildCorsOptions(frontendUrl)));
  app.use(express.json({ limit: '64kb' }));

  if (enableLogging) {
    app.use(
      morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', {
        skip: (req) => req.path === '/api/health',
      }),
    );
  }

  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'Expense Tracker API',
      version: '2.0.0',
      endpoints: [
        'GET /api/health',
        'GET /api/expenses?category=Food',
        'POST /api/expenses',
        'PUT /api/expenses/:id',
        'DELETE /api/expenses/:id',
        'GET /api/summary',
        'POST /api/auth/login',
        'GET /api/auth/me',
        'GET /api/admin/analytics',
        'GET /api/admin/automation/status',
        'POST /api/admin/automation/import',
        'GET /api/admin/tasks',
        'POST /api/admin/tasks',
        'GET /api/admin/tasks/summary',
        'GET /api/admin/tasks/:id',
        'PATCH /api/admin/tasks/:id',
        'POST /api/admin/tasks/:id/start',
        'POST /api/admin/tasks/:id/complete',
        'POST /api/admin/tasks/:id/cancel',
        'POST /api/admin/tasks/:id/assign',
        'POST /api/admin/tasks/:id/notes',
        'GET /api/admin/notifications',
        'GET /api/admin/notifications/unread-count',
        'POST /api/admin/notifications/:id/read',
        'POST /api/admin/notifications/read-all',
        'GET /api/admin/realtime',
        'POST /api/internal/automation/events',
      ],
    });
  });

  app.get(
    '/api/health',
    asyncHandler(async (req, res) => {
      if (healthCheck) {
        await healthCheck();
      }

      res.status(200).json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }),
  );

  app.use('/api/auth', createAuthRouter(authController, authService));
  app.use('/api/admin', createAdminRouter(adminController, authService));

  if (taskController) {
    app.use(
      '/api/admin/tasks',
      createTaskRouter(taskController, authService),
    );
  }

  if (notificationController) {
    app.use(
      '/api/admin/notifications',
      createNotificationRouter(notificationController, authService),
    );
  }

  if (realtimeController) {
    app.use(
      '/api/admin/realtime',
      createRealtimeRouter(realtimeController, authService),
    );
  }

  if (internalAutomationController) {
    app.use(
      '/api/internal/automation',
      createInternalAutomationRouter(
        internalAutomationController,
        internalAutomationKey,
      ),
    );
  }

  app.use('/api/expenses', createExpenseRouter(expenseController));
  app.use('/api/summary', createSummaryRouter(expenseController));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
