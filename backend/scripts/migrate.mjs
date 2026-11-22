import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from '../src/config/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, '../../database/schema.sql');

let exitCode = 0;

try {
  const sql = await readFile(schemaPath, 'utf8');
  const pool = getPool();
  await pool.query(sql);
  console.log('[db] Schema applied successfully.');
} catch (error) {
  exitCode = 1;
  console.error('[db] Migration failed:', error.message);
} finally {
  await closePool();
  process.exitCode = exitCode;
}
