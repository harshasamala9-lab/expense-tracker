import { config, requireDatabaseUrl } from '../src/config/env.js';
import { closePool, getPool } from '../src/config/db.js';
import { PgUserRepository } from '../src/repositories/PgUserRepository.js';
import { PgExpenseRepository } from '../src/repositories/PgExpenseRepository.js';
import { createTaskEngine } from '../src/bootstrap/taskEngine.js';

requireDatabaseUrl();

let exitCode = 0;

try {
  const pool = getPool();
  const engine = createTaskEngine({
    pool,
    userRepository: new PgUserRepository(pool),
    expenseRepository: new PgExpenseRepository(pool),
    options: {
      dueSoonHours: config.reminderDueSoonHours,
      longRunningHours: config.reminderLongRunningHours,
      criticalAgeHours: config.reminderCriticalAgeHours,
      repeatedFailureThreshold: config.repeatedFailureThreshold,
    },
  });

  const counts = await engine.reminderService.run();
  console.log('[reminders] Run complete:', JSON.stringify(counts));
} catch (error) {
  exitCode = 1;
  console.error('[reminders] Run failed:', error.message);
} finally {
  await closePool();
  process.exitCode = exitCode;
}
