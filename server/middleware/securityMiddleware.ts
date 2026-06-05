import { Request, Response, NextFunction } from 'express';
import { verifyTokenHelper } from '../controllers/enhancedAuthController.js';
import { SECURITY_CONFIG, SECURITY_HEADERS, sanitizeInput } from '../config/security.js';
import { z } from 'zod';
import { logActivity } from '../database/enhancedSchema.js';
import { securityLogger, LogLevel } from '../utils/securityLogger.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    sessionId?: string;
  };
}

// Rate limiting store
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Enhanced authentication middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyTokenHelper(token);
    
    // Validate token structure
    if (!decoded.id || !decoded.email || !decoded.role) {
      return res.status(403).json({ error: 'Invalid token structure' });
    }
    
    // Check if token is not a refresh token
    if (decoded.type === 'refresh') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    
    return res.status(403).json({ error: 'Invalid or malformed token' });
  }
}

// Role-based access control
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin role has access to everything
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Insufficient permissions',
      required: allowedRoles,
      current: req.user.role
    });
  };
}

// Optional authentication (for public endpoints that can benefit from user context)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyTokenHelper(token);
      if (decoded.id && decoded.email && decoded.role && decoded.type !== 'refresh') {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          sessionId: decoded.sessionId
        };
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
}

// Rate limiting middleware
export function rateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) {
  const windowMs = options?.windowMs || SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS;
  const maxRequests = options?.maxRequests || SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS;
  const message = options?.message || 'Too many requests, please try again later';
  const skipSuccessfulRequests = options?.skipSuccessfulRequests || false;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // Reset if window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    entry.count++;
    rateLimitStore.set(key, entry);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
    });
    
    if (entry.count > maxRequests) {
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }
    
    // Handle skip successful requests
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function(body) {
        if (res.statusCode < 400) {
          // Decrement count for successful requests
          const currentEntry = rateLimitStore.get(key);
          if (currentEntry) {
            currentEntry.count = Math.max(0, currentEntry.count - 1);
            rateLimitStore.set(key, currentEntry);
          }
        }
        return originalSend.call(this, body);
      };
    }
    
    next();
  };
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Set security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}

// Input sanitization middleware
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  // Sanitize string inputs in body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

// Helper function to recursively sanitize object properties
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Request size limiting middleware
export function limitRequestSize(maxSize: string = SECURITY_CONFIG.VALIDATION.MAX_REQUEST_SIZE) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({ 
          error: 'Request entity too large',
          maxSize: maxSize
        });
      }
    }
    
    next();
  };
}

// Helper function to parse size strings (e.g., '10mb', '1gb')
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
}

// Request validation middleware factory
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      console.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// CORS middleware with enhanced security
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const allowedOrigins = Array.isArray(SECURITY_CONFIG.CORS.ORIGIN) 
    ? SECURITY_CONFIG.CORS.ORIGIN 
    : [SECURITY_CONFIG.CORS.ORIGIN];
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow localhost in development
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.setHeader('Access-Control-Allow-Credentials', SECURITY_CONFIG.CORS.CREDENTIALS.toString());
  res.setHeader('Access-Control-Allow-Methods', SECURITY_CONFIG.CORS.METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', SECURITY_CONFIG.CORS.ALLOWED_HEADERS.join(', '));
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip}`);
  
  // Log response when finished
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Log errors
    if (res.statusCode >= 400) {
      console.error(`[ERROR] ${req.method} ${req.url} - ${res.statusCode} - IP: ${ip} - UA: ${userAgent}`);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

// Error handling middleware
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled error:', error);
  const ip = req.ip || (req as any)?.connection?.remoteAddress || 'unknown';
  const ua = req.get('User-Agent') || 'unknown';
  const url = String(req.url || '');
  const method = String(req.method || 'GET').toUpperCase();
  const classify = () => {
    if (url.includes('/api/credit-reports')) return { task: 'report_pull', activity: 'report_generated' };
    if (url.includes('/api/support/settings') || url.includes('/api/super-admin/stripe') || (url.includes('/api/affiliate/settings')) || (url.includes('/api/admin') && url.includes('settings'))) return { task: 'settings_update', activity: 'other' };
    if (url.includes('/api/auth') && (url.includes('reset-password') || (url.includes('/profile') && ((req as any)?.body?.new_password || (req as any)?.body?.current_password)))) return { task: 'password_change', activity: 'password_changed' };
    if (url.includes('/api/clients')) {
      if (method === 'POST') return { task: 'client_add', activity: 'client_created' };
      if (method === 'PUT') return { task: 'client_update', activity: 'client_updated' };
      if (method === 'DELETE') return { task: 'client_delete', activity: 'other' };
    }
    return { task: 'general', activity: 'other' };
  };
  const ctx = classify();
  try {
    const safeBody = (() => {
      try {
        const sensitiveKeys = ['password', 'current_password', 'new_password', 'password_hash', 'stripe_secret_key', 'api_key', 'nmi_api_key', 'nmi_password'];
        const clone = typeof (req as any)?.body === 'object' && (req as any)?.body !== null ? JSON.parse(JSON.stringify((req as any).body)) : (req as any).body;
        if (clone && typeof clone === 'object') {
          for (const key of Object.keys(clone)) {
            if (sensitiveKeys.includes(key)) clone[key] = '[REDACTED]';
          }
        }
        return clone;
      } catch {
        return undefined;
      }
    })();
    const userId = (req as any)?.user?.id;
    logActivity(
      'other',
      'server_error',
      userId,
      undefined,
      undefined,
      {
        is_error: true,
        task: ctx.task,
        activity: ctx.activity,
        url,
        method,
        body: safeBody,
        status: error?.status || 500,
        message: error?.message
      },
      ip,
      ua
    );
  } catch {}
  try {
    const userId = (req as any)?.user?.id;
    securityLogger.logSecurityEvent({
      level: LogLevel.ERROR,
      eventType: 'server_error' as any,
      userId,
      ip,
      userAgent: ua,
      message: `${ctx.task} error at ${method} ${url}: ${error?.message || 'Unknown error'}`,
      metadata: {
        activity: ctx.activity,
        status: error?.status || 500
      }
    });
  } catch {}
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: isDevelopment ? error.message : 'Invalid input data'
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: isDevelopment ? error.message : 'Authentication required'
    });
  }
  
  // Generic error response
  res.status(500).json({
    error: 'Internal server error',
    details: isDevelopment ? error.message : 'Something went wrong'
  });
}
