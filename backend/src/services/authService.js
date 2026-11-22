import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

// A valid bcrypt hash used only to keep failed-login timing similar when the
// supplied email does not exist. It is not a real account password.
const DUMMY_PASSWORD_HASH =
  '$2b$10$rHauWqnmOvQKVYguo4cPJemK11ejY8rfG9lex193jZEGmDTPCi5wK';

const MIN_PASSWORD_LENGTH = 12;

export class AuthService {
  constructor(
    userRepository,
    {
      jwtSecret,
      jwtExpiresIn = '8h',
      bcryptRounds = 12,
      now = () => new Date(),
    } = {},
  ) {
    if (!jwtSecret) {
      throw new Error('AuthService requires a jwtSecret.');
    }

    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.bcryptRounds = bcryptRounds;
    this.now = now;
  }

  async login(email, password) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    // Always run a bcrypt comparison, even for an unknown email, so the
    // response timing does not reveal whether the account exists.
    const passwordMatches = await bcrypt.compare(
      String(password ?? ''),
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AppError(401, 'Invalid email or password.');
    }

    return this.issueSession(user);
  }

  /** Issues a session token for a known admin user without checking a password. */
  async issueSession(user) {
    await this.userRepository.updateLastLogin(user.id);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
      {
        expiresIn: this.jwtExpiresIn,
        issuer: 'expense-tracker-api',
        audience: 'expense-tracker-admin',
      },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  verifyToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'expense-tracker-api',
        audience: 'expense-tracker-admin',
      });

      if (
        !payload ||
        typeof payload !== 'object' ||
        typeof payload.sub !== 'string' ||
        !['admin', 'viewer'].includes(payload.role)
      ) {
        throw new Error('Invalid token payload.');
      }

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      throw new AppError(
        401,
        'Your session is invalid or has expired. Please sign in again.',
      );
    }
  }

  async getCurrentUser(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(401, 'This account no longer exists.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    };
  }

  async createAdmin({ email, password, role = 'admin' }) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('ADMIN_EMAIL must be a valid email address.');
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }

    if (!['admin', 'viewer'].includes(role)) {
      throw new Error('ADMIN_ROLE must be either "admin" or "viewer".');
    }

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    if (existing) {
      const updated = await this.userRepository.updatePassword(
        existing.id,
        passwordHash,
      );

      return {
        user: updated,
        created: false,
      };
    }

    const user = await this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      role,
    });

    return { user, created: true };
  }
}
