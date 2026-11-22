import { AppError } from '../utils/AppError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginBody(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(new AppError(400, 'Request body must be a JSON object.'));
  }

  const errors = [];
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }

  if (password.length < 1 || password.length > 200) {
    errors.push({ field: 'password', message: 'Enter your password.' });
  }

  if (errors.length > 0) {
    return next(
      new AppError(
        400,
        'Please correct the highlighted fields.',
        errors,
      ),
    );
  }

  req.validatedLogin = { email, password };
  return next();
}
