import { randomUUID } from 'node:crypto';

/**
 * Deterministic user repository for automated tests. It mirrors the methods
 * used by AuthService without requiring a database connection.
 */
export class InMemoryUserRepository {
  constructor(seed = []) {
    this.users = seed.map((user) => ({
      id: user.id ?? randomUUID(),
      email: user.email,
      password_hash: user.password_hash ?? user.passwordHash,
      role: user.role ?? 'admin',
      created_at: user.created_at ?? new Date().toISOString(),
      last_login_at: user.last_login_at ?? null,
    }));
  }

  async findByEmail(email) {
    const normalized = String(email).toLowerCase();
    return (
      this.users.find(
        (user) => user.email.toLowerCase() === normalized,
      ) ?? null
    );
  }

  async findById(id) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async create({ email, passwordHash, role = 'admin' }) {
    const user = {
      id: randomUUID(),
      email,
      password_hash: passwordHash,
      role,
      created_at: new Date().toISOString(),
      last_login_at: null,
    };

    this.users.push(user);
    return { id: user.id, email: user.email, role: user.role };
  }

  async updatePassword(id, passwordHash) {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      return null;
    }

    user.password_hash = passwordHash;
    return { id: user.id, email: user.email, role: user.role };
  }

  async updateLastLogin(id) {
    const user = this.users.find((item) => item.id === id);
    if (user) {
      user.last_login_at = new Date().toISOString();
    }
  }

  async findAdmins() {
    return this.users
      .filter((user) => user.role === 'admin')
      .map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }
}
