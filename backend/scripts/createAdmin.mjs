/**
 * Creates or resets an administrator account.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' npm run admin:create
 *
 * The password is hashed with bcrypt before it reaches PostgreSQL. It is never
 * printed, logged, or stored in plain text. Running the command again for the
 * same email resets the password and role.
 */
import bcrypt from 'bcryptjs';
import { closePool, getPool } from '../src/config/db.js';
import { PgUserRepository } from '../src/repositories/PgUserRepository.js';

const MIN_PASSWORD_LENGTH = 12;
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const role = String(process.env.ADMIN_ROLE || 'admin').trim().toLowerCase();

function fail(message) {
  console.error(`[admin:create] ${message}`);
  process.exitCode = 1;
}

try {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (!['admin', 'viewer'].includes(role)) {
    throw new Error('ADMIN_ROLE must be either "admin" or "viewer".');
  }

  const pool = getPool();
  const repository = new PgUserRepository(pool);
  const existing = await repository.findByEmail(email);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await repository.updatePassword(existing.id, passwordHash);
    console.log(
      `[admin:create] Reset password for existing ${role} account: ${email}`,
    );
  } else {
    await repository.create({ email, passwordHash, role });
    console.log(`[admin:create] Created ${role} account: ${email}`);
  }

  console.log(
    '[admin:create] Password was hashed with bcrypt and was not logged.',
  );
  await closePool();
} catch (error) {
  fail(error.message);
  await closePool();
}
