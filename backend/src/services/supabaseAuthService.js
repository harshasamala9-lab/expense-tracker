import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

/**
 * Exchanges a Supabase access token for a local administrator session.
 *
 * Any verified Supabase account is provisioned as a local admin on first
 * login. That means personal Gmail accounts and organization accounts both
 * work; access is not restricted to a pre-created admin list.
 */
export class SupabaseAuthService {
  constructor({
    authService,
    userRepository,
    supabaseUrl,
    supabaseAnonKey,
    logger = console,
  }) {
    this.authService = authService;
    this.userRepository = userRepository;
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.logger = logger;
  }

  async loginWithToken(accessToken) {
    const response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new AppError(401, 'Sign-in failed. Try again.');
    }

    const data = await response.json().catch(() => ({}));
    const providerUser = data?.user;
    const email = String(
      providerUser?.user_metadata?.email || providerUser?.email || '',
    )
      .trim()
      .toLowerCase();

    if (!email) {
      throw new AppError(401, 'Sign-in failed. Try again.');
    }

    const verified =
      providerUser?.user_metadata?.email_verified === true ||
      providerUser?.email_verified === true ||
      Boolean(providerUser?.confirmed_at);

    if (!verified) {
      throw new AppError(401, 'Verify your email before signing in.');
    }

    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      // First-time Supabase users get a session with a random local password.
      // They can still sign in with Supabase OTP or their linked provider.
      const passwordHash = await bcrypt.hash(`supabase:${randomUUID()}`, 12);
      user = await this.userRepository.create({
        email,
        passwordHash,
        role: 'admin',
      });
      this.logger.log(`[auth] Provisioned admin for ${email}`);
    }

    if (user.role !== 'admin') {
      user = await this.userRepository.updateRole?.(user.id, 'admin');
      if (!user) {
        throw new AppError(403, 'This account cannot access the admin area.');
      }
    }

    return this.authService.issueSession(user);
  }
}
