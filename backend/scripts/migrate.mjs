import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from '../src/config/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(here, '../../database');
const schemaPath = path.join(databaseDir, 'schema.sql');
const migrationsDir = path.join(databaseDir, 'migrations');

let exitCode = 0;

try {
  const pool = getPool();

  // schema.sql is the complete, idempotent baseline. Running it first makes
  // this command safe for both brand-new and existing databases.
  const schemaSql = await readFile(schemaPath, 'utf8');
  await pool.query(schemaSql);
  console.log('[db] Baseline schema applied successfully.');

  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );

  const appliedResult = await pool.query(
    'SELECT filename FROM schema_migrations',
  );
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      console.log(`[db] Migration already applied: ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query(
      `INSERT INTO schema_migrations (filename)
       VALUES ($1)
       ON CONFLICT (filename) DO NOTHING`,
      [file],
    );
    console.log(`[db] Applied migration: ${file}`);
  }

  console.log('[db] All migrations are up to date.');
} catch (error) {
  exitCode = 1;
  console.error('[db] Migration failed:', error.message);
} finally {
  await closePool();
  process.exitCode = exitCode;
}
