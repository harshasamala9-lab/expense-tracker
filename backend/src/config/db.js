import pg from 'pg';
import { config, requireDatabaseUrl } from './env.js';

/**
 * PostgreSQL returns DATE values as JavaScript Date objects by default. That
 * can shift a calendar date by one day when it is serialized to JSON in a
 * different timezone. We only need the plain "YYYY-MM-DD" value, so return
 * the raw string for the DATE type (OID 1082).
 */
pg.types.setTypeParser(1082, (value) => value);

let pool = null;

function sslConfig(databaseUrl) {
  const isLocal =
    /(^|@)(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(databaseUrl);

  if (isLocal || process.env.DB_SSL === 'false') {
    return false;
  }

  return { rejectUnauthorized: config.dbSslRejectUnauthorized };
}

/**
 * Lazily creates a single connection pool for the process. Importing this
 * module never opens a connection, which keeps unit tests database-free.
 */
export function getPool() {
  if (!pool) {
    const connectionString = requireDatabaseUrl();

    pool = new pg.Pool({
      connectionString,
      ssl: sslConfig(connectionString),
      max: Number(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on('error', (error) => {
      // Never crash the API because an idle client was dropped.
      console.error('[db] Unexpected idle client error:', error.message);
    });
  }

  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
