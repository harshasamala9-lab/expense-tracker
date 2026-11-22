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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    maxAge: 86_400,
  };
}

/**
 * Builds the Express application without starting a server.
 *
 * Dependencies are injected so tests can pass an in-memory repository while
 * production passes the PostgreSQL repository.
 */
export function createApp({
  expenseController,
  frontendUrl = '',
  healthCheck,
  enableLogging = true,
}) {
  if (!expenseController) {
    throw new Error('createApp requires an expenseController.');
  }

  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors(buildCorsOptions(frontendUrl)));
  app.use(express.json({ limit: '16kb' }));

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
      version: '1.0.0',
      endpoints: [
        'GET /api/health',
        'GET /api/expenses?category=Food',
        'POST /api/expenses',
        'PUT /api/expenses/:id',
        'DELETE /api/expenses/:id',
        'GET /api/summary',
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

  app.use('/api/expenses', createExpenseRouter(expenseController));
  app.use('/api/summary', createSummaryRouter(expenseController));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
