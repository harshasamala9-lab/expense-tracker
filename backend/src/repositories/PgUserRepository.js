/**
 * PostgreSQL user repository used for authentication and role-based access.
 *
 * Emails are compared case-insensitively so an account cannot be duplicated
 * by changing the letter case.
 */
export class PgUserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByEmail(email) {
    const { rows } = await this.pool.query(
      `SELECT id, email, password_hash, role, created_at, last_login_at
         FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [email],
    );

    return rows[0] ?? null;
  }

  async findById(id, client = this.pool) {
    const { rows } = await client.query(
      `SELECT id, email, password_hash, role, created_at, last_login_at
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [id],
    );

    return rows[0] ?? null;
  }

  async create({ email, passwordHash, role = 'admin' }) {
    const { rows } = await this.pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, role],
    );

    return rows[0];
  }

  async updatePassword(id, passwordHash) {
    const { rows } = await this.pool.query(
      `UPDATE users
          SET password_hash = $2
        WHERE id = $1
        RETURNING id, email, role`,
      [id, passwordHash],
    );

    return rows[0] ?? null;
  }

  async updateLastLogin(id) {
    await this.pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id],
    );
  }

  async findAdmins(client = this.pool) {
    const { rows } = await client.query(
      `SELECT id, email, role
         FROM users
        WHERE role = 'admin'
        ORDER BY LOWER(email) ASC`,
    );

    return rows;
  }
}
