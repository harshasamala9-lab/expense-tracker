import { requireDatabaseUrl } from '../src/config/env.js';
import { closePool, getPool } from '../src/config/db.js';
import { PgUserRepository } from '../src/repositories/PgUserRepository.js';
import { PgExpenseRepository } from '../src/repositories/PgExpenseRepository.js';
import { createTaskEngine } from '../src/bootstrap/taskEngine.js';

requireDatabaseUrl();

const limitArg = Number(process.argv[2]);
const limit =
  Number.isInteger(limitArg) && limitArg > 0 && limitArg <= 200
    ? limitArg
    : 50;

let exitCode = 0;

try {
  const pool = getPool();
  const engine = createTaskEngine({
    pool,
    userRepository: new PgUserRepository(pool),
    expenseRepository: new PgExpenseRepository(pool),
  });

  const result = await engine.taskEventService.processPending(limit);
  console.log('[automation-events] Run complete:', JSON.stringify(result));
} catch (error) {
  exitCode = 1;
  console.error('[automation-events] Run failed:', error.message);
} finally {
  await closePool();
  process.exitCode = exitCode;
}
