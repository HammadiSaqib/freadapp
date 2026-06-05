import { Request, Response, NextFunction } from 'express';
import { logActivity } from '../database/enhancedSchema.js';
import { securityLogger, LogLevel } from '../utils/securityLogger.js';

// Middleware to handle JSON parsing errors
export function jsonErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('JSON parsing error:', {
      error: err.message,
      body: err.body,
      url: req.url,
      method: req.method,
      headers: req.headers
    });
    
    return res.status(400).json({
      error: 'Invalid JSON format in request body',
      message: 'Please ensure your request body contains valid JSON',
      details: 'The request body could not be parsed as JSON'
    });
  }
  
  next(err);
}

// General error handler
export function generalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const redactBody = (body: any) => {
    try {
      const sensitiveKeys = ['password', 'current_password', 'new_password', 'password_hash', 'stripe_secret_key', 'api_key', 'nmi_api_key', 'nmi_password'];
      const clone = typeof body === 'object' && body !== null ? JSON.parse(JSON.stringify(body)) : body;
      if (clone && typeof clone === 'object') {
        for (const key of Object.keys(clone)) {
          if (sensitiveKeys.includes(key)) {
            clone[key] = '[REDACTED]';
          }
        }
      }
      return clone;
    } catch {
      return undefined;
    }
  };
  const classify = (req: Request) => {
    const url = String(req.url || '');
    const method = String(req.method || 'GET').toUpperCase();
    if (url.includes('/api/credit-reports')) {
      return { task: 'report_pull', activity: 'report_generated' };
    }
    if (url.includes('/api/support/settings') || url.includes('/api/super-admin/stripe') || url.includes('/api/affiliate/settings') || url.includes('/api/admin') && url.includes('settings')) {
      return { task: 'settings_update', activity: 'other' };
    }
    if (url.includes('/api/auth') && (url.includes('reset-password') || (url.includes('/profile') && (req.body?.new_password || req.body?.current_password)))) {
      return { task: 'password_change', activity: 'password_changed' };
    }
    if (url.includes('/api/clients')) {
      if (method === 'POST') return { task: 'client_add', activity: 'client_created' };
      if (method === 'PUT') return { task: 'client_update', activity: 'client_updated' };
      if (method === 'DELETE') return { task: 'client_delete', activity: 'other' };
    }
    return { task: 'general', activity: 'other' };
  };
  const ctx = classify(req);
  const userId = (req as any)?.user?.id;
  const ip = req.ip;
  const ua = req.get('User-Agent') || '';
  const safeBody = redactBody(req.body);
  console.error('Unhandled error:', {
    error: err?.message,
    stack: err?.stack,
    url: req.url,
    method: req.method,
    body: safeBody
  });
  try {
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
        url: req.url,
        method: req.method,
        body: safeBody,
        status: err?.status || 500,
        message: err?.message,
        stack: isDevelopment ? err?.stack : undefined
      },
      ip,
      ua
    );
  } catch {}
  try {
    securityLogger.logSecurityEvent({
      level: LogLevel.ERROR,
      eventType: 'server_error' as any,
      userId,
      ip,
      userAgent: ua,
      message: `${ctx.task} error at ${req.method} ${req.url}: ${err?.message || 'Unknown error'}`,
      metadata: {
        activity: ctx.activity,
        status: err?.status || 500
      }
    });
  } catch {}

  // Don't leak error details in production
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
}
