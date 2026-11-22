import { closePool, getPool } from '../src/config/db.js';

let exitCode = 0;

try {
  const pool = getPool();

  const info = await pool.query(
    'SELECT current_database() AS database, current_user AS db_user',
  );

  console.log(`[db] Connected to database "${info.rows[0].database}".`);

  const tables = ['expenses', 'users', 'import_runs'];

  for (const table of tables) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS row_count FROM ${table}`,
      );
      console.log(
        `[db] ${table} table is ready (${result.rows[0].row_count} rows).`,
      );
    } catch (error) {
      if (error.code === '42P01') {
        console.error(
          `[db] The ${table} table does not exist yet. Run: npm run db:migrate`,
        );
        exitCode = 1;
      } else {
        throw error;
      }
    }
  }
} catch (error) {
  exitCode = 1;
  console.error('[db] Connection check failed:', error.message);
} finally {
  await closePool();
  process.exitCode = exitCode;
}
