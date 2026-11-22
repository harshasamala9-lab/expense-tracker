import { AppError } from '../utils/AppError.js';

function readBearerToken(req) {
  const header = req.get('authorization');

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (!/^Bearer$/i.test(scheme) || !token) {
    return null;
  }

  return token.trim();
}

export function requireAuth(authService) {
  return (req, res, next) => {
    const token = readBearerToken(req);

    if (!token) {
      return next(new AppError(401, 'Authentication required.'));
    }

    try {
      req.user = authService.verifyToken(token);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'You do not have permission to access this resource.',
        ),
      );
    }

    return next();
  };
}
