import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.js';

/**
 * Shape of the user object that the API Gateway injects into headers
 * after verifying the JWT.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

// Augment Express Request globally so every service sees `req.user`.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Read the user identity that the API Gateway placed into headers.
 *
 * Headers expected:
 *   x-user-id, x-user-email, x-user-role
 *
 * Call this early in the middleware chain — it populates `req.user`
 * but does NOT reject unauthenticated requests (use `requireAuth` for that).
 */
export function extractUser(req: Request, _res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string | undefined;
  const email = req.headers['x-user-email'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  if (userId && email && role) {
    req.user = { userId, email, role };
  }

  next();
}

/**
 * Reject the request if `req.user` is not set.
 * Mount after `extractUser` (or after your own JWT middleware).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  next();
}

/**
 * Reject the request if the user's role is not in the allowed list.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}
