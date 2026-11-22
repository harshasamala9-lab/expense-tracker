import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

function readInternalKey(req) {
  const headerKey = req.get('x-automation-key');
  if (headerKey) {
    return headerKey.trim();
  }

  const authorization = req.get('authorization');
  if (authorization) {
    const [scheme, token] = authorization.split(' ');
    if (/^Bearer$/i.test(scheme) && token) {
      return token.trim();
    }
  }

  return '';
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Protects server-to-server automation endpoints with a dedicated shared
 * secret. This is intentionally separate from administrator JWTs: the Python
 * worker is a service, not a person, and should never receive admin rights.
 */
export function requireInternalKey(expectedKey) {
  return (req, res, next) => {
    if (!expectedKey || expectedKey.length < 16) {
      return next(
        new AppError(
          503,
          'The internal automation endpoint is not configured on this server.',
        ),
      );
    }

    const supplied = readInternalKey(req);

    if (!supplied || !safeEqual(supplied, expectedKey)) {
      return next(new AppError(401, 'Invalid automation credentials.'));
    }

    return next();
  };
}
