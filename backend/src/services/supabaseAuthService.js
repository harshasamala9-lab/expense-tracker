import { AppError } from '../utils/AppError.js';

/**
 * Exchanges a Supabase access token for a local administrator session.
 *
 * Google login is offered through Supabase (Real Sign In With Google). The
 * user still authenticates against the local PostgreSQL `users` table through
 * the normal API JWT; this service bridges the two so the frontend does not
 * need to know anything about Supabase.
 */
export class SupabaseAuthService {
  constructor({ authService, userRepository, supabaseUrl, supabaseAnonKey, logger = console }) {
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
      throw new AppError(401, 'Google sign-in failed. Try again.');
    }

    const data = await response.json().catch(() => ({}));
    const user = data?.user;
    const email = user?.user_metadata?.email || user?.email;

    if (!email) {
      throw new AppError(401, 'Google sign-in failed. Try again.');
    }

    const localUser = await this.userRepository.findByEmail(email);

    if (!localUser || localUser.role !== 'admin') {
      this.logger.warn(
        `[auth] Google sign-in attempted for ${email.slice(0, 5)}… with no local admin account.`,
      );
      throw new AppError(
        403,
        'You do not have access to the administration area. Sign in with the administrator account.',
      );
    }

    return this.authService.issueSession(localUser);
  }
}
