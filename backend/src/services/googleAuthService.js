import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Direct Google OAuth 2.0 code exchange.
 *
 * Google redirects to the Vercel login page with an authorization code. The
 * frontend sends that code here; the backend exchanges it with Google using
 * the confidential client secret, verifies the email, and issues the same
 * local JWT used by the rest of the admin API.
 */
export class GoogleAuthService {
  constructor({ authService, userRepository, clientId, clientSecret, logger = console }) {
    this.authService = authService;
    this.userRepository = userRepository;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.logger = logger;
  }

  get configured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  async exchange({ code, redirectUri }) {
    if (!this.configured) {
      throw new AppError(503, 'Google sign-in is not configured on the server.');
    }

    if (!code || typeof code !== 'string' || code.length > 4096) {
      throw new AppError(400, 'A Google authorization code is required.');
    }

    if (!redirectUri || typeof redirectUri !== 'string' || !redirectUri.startsWith('https://')) {
      throw new AppError(400, 'A valid redirect URI is required.');
    }

    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      this.logger.warn('[auth] Google token exchange failed:', tokenResponse.status);
      throw new AppError(401, 'Google sign-in failed. Please try again.');
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new AppError(401, 'Google sign-in failed. Please try again.');
    }

    const profile = await userResponse.json();
    const email = String(profile.email ?? '').trim().toLowerCase();

    if (!email || profile.email_verified !== true) {
      throw new AppError(401, 'A verified Google email is required.');
    }

    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Google-only accounts have a random password hash. They cannot sign in
      // with a password until an admin explicitly resets it.
      const passwordHash = await bcrypt.hash(
        `google:${randomUUID()}`,
        12,
      );
      user = await this.userRepository.create({
        email,
        passwordHash,
        role: 'admin',
      });
    }

    if (user.role !== 'admin') {
      throw new AppError(403, 'This Google account is not an administrator.');
    }

    return this.authService.issueSession(user);
  }
}
