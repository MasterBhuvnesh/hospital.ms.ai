import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export function gatewayAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(); // Anonymous — let downstream service decide
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-email'] = payload.email;
    req.headers['x-user-role'] = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
