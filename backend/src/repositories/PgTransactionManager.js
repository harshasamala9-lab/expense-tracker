/**
 * PostgreSQL transaction boundary used by task, notification, event and
 * reminder services. Repositories accept the same client so related writes
 * either all commit or all roll back.
 */
export class PgTransactionManager {
  constructor(pool) {
    this.pool = pool;
  }

  async run(callback, { advisoryLockKey = null } = {}) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (advisoryLockKey) {
        const { rows } = await client.query(
          'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',
          [advisoryLockKey],
        );

        if (!rows[0]?.locked) {
          await client.query('ROLLBACK');
          return { skipped: true, reason: 'advisory_lock_not_acquired' };
        }
      }

      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[db] Rollback failed:', rollbackError.message);
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
