import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV_CONFIG } from '../config/environment.js';
import { verifyTokenHelper, verifyRefreshToken, generateToken } from '../controllers/authController.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const headerToken = (req.headers['x-access-token'] as string) || undefined;
  const queryToken = (req.query && (req.query as any).token) as string | undefined;
  const token = bearerToken || headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const JWT_SECRET = ENV_CONFIG.JWT_SECRET;
    const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 60 }) as any;
    const user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    if (!user.id || !user.email || !user.role) {
      return res.status(403).json({ error: 'Invalid token structure' });
    }
    req.user = user;
    return next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      const refreshHeader = (req.headers['x-refresh-token'] as string) || undefined;
      const refreshBody = (req.body && (req.body as any).refresh_token) as string | undefined;
      const refreshToken = refreshHeader || refreshBody;
      if (!refreshToken) {
        console.log('[AuthMiddleware] Token expired and no refresh token provided');
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      try {
        const r = verifyRefreshToken(refreshToken) as any;
        const newAccess = generateToken({ id: r.id || r.userId, email: r.email, role: r.role });
        res.setHeader('x-access-token', newAccess);
        req.user = { id: r.id || r.userId, email: r.email, role: r.role };
        return next();
      } catch (refreshError) {
        console.log('[AuthMiddleware] Refresh token verification failed:', refreshError);
        return res.status(401).json({ error: 'Invalid refresh token', code: 'REFRESH_FAILED' });
      }
    }
    console.log('[AuthMiddleware] Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Allow admin role to access everything, or check if user role is in allowed roles
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    console.log(`[AuthMiddleware] Access denied for user ${req.user.email} with role ${req.user.role}. Required roles: ${roles.join(', ')}`);
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyTokenHelper(token);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without user info
      req.user = undefined;
    }
  }

  next();
}
