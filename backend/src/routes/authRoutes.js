import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { validateLoginBody } from '../middleware/authValidation.js';

/**
 * Creates the public authentication router. Only login is public; /me
 * requires a valid Bearer token.
 */
export function createAuthRouter(authController, authService, options = {}) {
  const router = Router();

  const loginLimiter =
    options.loginLimiter ??
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      message: {
        message:
          'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
      },
    });

  router.post('/login', loginLimiter, validateLoginBody, authController.login);
  router.get('/me', requireAuth(authService), authController.me);

  return router;
}
