import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { validateLoginBody } from '../middleware/authValidation.js';
import { AppError } from '../utils/AppError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignupPayload(req, res, next) {
  const body = req.body;
  const errors = [];
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }
  if (password.length < 12) {
    errors.push({ field: 'password', message: 'Password must be at least 12 characters.' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'Please correct the highlighted fields.', errors));
  }

  req.validatedSignup = { email, password };
  return next();
}

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
  router.post('/signup', validateSignupPayload, authController.signup);
  router.get('/me', requireAuth(authService), authController.me);

  return router;
}
