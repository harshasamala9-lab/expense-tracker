import { createApp } from './app.js';
import { config, requireDatabaseUrl } from './config/env.js';
import { closePool, getPool } from './config/db.js';
import { PgExpenseRepository } from './repositories/PgExpenseRepository.js';
import { ExpenseService } from './services/expenseService.js';
import { createExpenseController } from './controllers/expenseController.js';

requireDatabaseUrl();

const pool = getPool();
const repository = new PgExpenseRepository(pool);
const service = new ExpenseService(repository);
const controller = createExpenseController(service);

const app = createApp({
  expenseController: controller,
  frontendUrl: config.frontendUrl,
  healthCheck: () => pool.query('SELECT 1'),
});

try {
  await pool.query('SELECT 1');
  console.log('[db] Connected to PostgreSQL');
} catch (error) {
  console.error('[db] Could not connect to PostgreSQL:', error.message);
  process.exit(1);
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
