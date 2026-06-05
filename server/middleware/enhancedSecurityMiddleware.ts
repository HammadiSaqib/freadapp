import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { InputSanitizer, ValidationResult } from '../utils/inputValidation';
import { SecurityLogger } from '../utils/securityLogger';
import { EnvironmentConfig } from '../config/environment';
import { SECURITY_CONFIG } from '../config/security';
import jwt from 'jsonwebtoken';
import { User } from '../types/auth';

// Extend Request interface to include user and security context
declare global {
  namespace Express {
    interface Request {
      user?: User;
      securityContext?: {
        ipAddress: string;
        userAgent: string;
        requestId: string;
        timestamp: Date;
        sanitizedBody?: any;
        sanitizedQuery?: any;
      };
    }
  }
}

const securityLogger = new SecurityLogger();

// Enhanced security headers middleware
export const enhancedSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Request context middleware
export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  req.securityContext = {
    ipAddress,
    userAgent,
    requestId,
    timestamp: new Date()
  };

  // Add request ID to response headers for tracking
  res.setHeader('X-Request-ID', requestId);

  // Log request
  securityLogger.logSecurityEvent('REQUEST_RECEIVED', {
    method: req.method,
    url: req.url,
    ipAddress,
    userAgent,
    requestId
  });

  next();
};

// Enhanced input sanitization middleware
export const enhancedInputSanitization = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      const bodyResult = InputSanitizer.sanitizeObject(req.body, {
        maxLength: 1000,
        trimWhitespace: true
      });

      if (!bodyResult.isValid) {
        securityLogger.logSecurityEvent('INPUT_VALIDATION_FAILED', {
          errors: bodyResult.errors,
          ipAddress: req.securityContext?.ipAddress,
          requestId: req.securityContext?.requestId
        });

        return res.status(400).json({
          error: 'Invalid input data',
          details: bodyResult.errors
        });
      }

      req.securityContext!.sanitizedBody = bodyResult.sanitizedValue;
      req.body = bodyResult.sanitizedValue;

      if (bodyResult.warnings.length > 0) {
        securityLogger.logSecurityEvent('INPUT_SANITIZED', {
          warnings: bodyResult.warnings,
          ipAddress: req.securityContext?.ipAddress,
          requestId: req.securityContext?.requestId
        });
      }
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      const queryResult = InputSanitizer.sanitizeObject(req.query as Record<string, any>, {
        maxLength: 500,
        trimWhitespace: true
      });

      if (!queryResult.isValid) {
        securityLogger.logSecurityEvent('QUERY_VALIDATION_FAILED', {
          errors: queryResult.errors,
          ipAddress: req.securityContext?.ipAddress,
          requestId: req.securityContext?.requestId
        });

        return res.status(400).json({
          error: 'Invalid query parameters',
          details: queryResult.errors
        });
      }

      req.securityContext!.sanitizedQuery = queryResult.sanitizedValue;
      req.query = queryResult.sanitizedValue;
    }

    next();
  } catch (error) {
    securityLogger.logSecurityEvent('SANITIZATION_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.securityContext?.ipAddress,
      requestId: req.securityContext?.requestId
    });

    res.status(500).json({ error: 'Internal server error during input processing' });
  }
};

// Enhanced authentication middleware
export const enhancedAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      securityLogger.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        reason: 'No token provided',
        ipAddress: req.securityContext?.ipAddress,
        userAgent: req.securityContext?.userAgent,
        requestId: req.securityContext?.requestId,
        endpoint: req.path
      });

      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, EnvironmentConfig.JWT_SECRET) as any;
    
    // Additional token validation
    if (!decoded.userId || !decoded.email) {
      securityLogger.logSecurityEvent('INVALID_TOKEN_STRUCTURE', {
        ipAddress: req.securityContext?.ipAddress,
        requestId: req.securityContext?.requestId
      });

      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      securityLogger.logSecurityEvent('EXPIRED_TOKEN_USED', {
        userId: decoded.userId,
        ipAddress: req.securityContext?.ipAddress,
        requestId: req.securityContext?.requestId
      });

      return res.status(401).json({ error: 'Token expired' });
    }

    // Set user context
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    // Log successful authentication
    securityLogger.logSecurityEvent('AUTHENTICATION_SUCCESS', {
      userId: decoded.userId,
      ipAddress: req.securityContext?.ipAddress,
      requestId: req.securityContext?.requestId
    });

    next();
  } catch (error) {
    let errorType = 'TOKEN_VERIFICATION_FAILED';
    let errorMessage = 'Invalid token';

    if (error instanceof jwt.JsonWebTokenError) {
      errorType = 'MALFORMED_TOKEN';
      errorMessage = 'Malformed token';
    } else if (error instanceof jwt.TokenExpiredError) {
      errorType = 'EXPIRED_TOKEN';
      errorMessage = 'Token expired';
    } else if (error instanceof jwt.NotBeforeError) {
      errorType = 'PREMATURE_TOKEN';
      errorMessage = 'Token not active yet';
    }

    securityLogger.logSecurityEvent(errorType as any, {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.securityContext?.ipAddress,
      requestId: req.securityContext?.requestId
    });

    res.status(401).json({ error: errorMessage });
  }
};

// Optional authentication (for public endpoints that can benefit from user context)
export const optionalAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const decoded = jwt.verify(token, EnvironmentConfig.JWT_SECRET) as any;
      
      if (decoded.userId && decoded.email) {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role || 'user'
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Enhanced rate limiting with different tiers
export const createEnhancedRateLimit = (options: {
  windowMs?: number;
  max?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}) => {
  return rateLimit({
    windowMs: options.windowMs || SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
    max: options.max || SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id?.toString() || req.ip || 'unknown';
    }),
    handler: (req, res) => {
      const key = options.keyGenerator ? options.keyGenerator(req) : (req.user?.id?.toString() || req.ip);
      
      securityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        key,
        ipAddress: req.securityContext?.ipAddress,
        userAgent: req.securityContext?.userAgent,
        requestId: req.securityContext?.requestId,
        endpoint: req.path
      });

      if (options.onLimitReached) {
        options.onLimitReached(req);
      }

      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(options.windowMs! / 1000)
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Predefined rate limiters
export const generalRateLimit = createEnhancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

export const authRateLimit = createEnhancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  skipSuccessfulRequests: true
});

export const apiRateLimit = createEnhancedRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60 // 60 requests per minute
});

export const strictRateLimit = createEnhancedRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute for sensitive operations
});

// Request size limiting
export const requestSizeLimit = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      securityLogger.logSecurityEvent('REQUEST_SIZE_EXCEEDED', {
        contentLength,
        maxSize,
        ipAddress: req.securityContext?.ipAddress,
        requestId: req.securityContext?.requestId
      });

      return res.status(413).json({
        error: 'Request too large',
        maxSize: `${maxSize} bytes`
      });
    }

    next();
  };
};

// Suspicious activity detection
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /exec\(/gi, // Code execution
    /eval\(/gi, // Code evaluation
    /javascript:/gi, // JavaScript protocol
    /vbscript:/gi, // VBScript protocol
    /data:text\/html/gi, // Data URI XSS
  ];

  const checkForSuspiciousContent = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForSuspiciousContent(value));
    }
    
    return false;
  };

  const url = req.url;
  const body = req.body;
  const query = req.query;

  if (checkForSuspiciousContent(url) || 
      checkForSuspiciousContent(body) || 
      checkForSuspiciousContent(query)) {
    
    securityLogger.logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', {
      ipAddress: req.securityContext?.ipAddress,
      userAgent: req.securityContext?.userAgent,
      requestId: req.securityContext?.requestId,
      url,
      method: req.method,
      suspiciousContent: {
        url: checkForSuspiciousContent(url),
        body: checkForSuspiciousContent(body),
        query: checkForSuspiciousContent(query)
      }
    });

    return res.status(400).json({
      error: 'Suspicious activity detected',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};

// Enhanced error handler
export const enhancedErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log the error
  securityLogger.logSecurityEvent('APPLICATION_ERROR', {
    error: err.message,
    stack: isDevelopment ? err.stack : undefined,
    ipAddress: req.securityContext?.ipAddress,
    requestId: req.securityContext?.requestId,
    endpoint: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = isDevelopment ? err.message : 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    requestId: req.securityContext?.requestId,
    ...(isDevelopment && { stack: err.stack })
  });
};

// Security middleware chain factory
export const createSecurityMiddlewareChain = (options: {
  enableRateLimit?: boolean;
  enableInputSanitization?: boolean;
  enableSuspiciousActivityDetection?: boolean;
  customRateLimit?: any;
} = {}) => {
  const middlewares = [
    enhancedSecurityHeaders,
    requestContext
  ];

  if (options.enableInputSanitization !== false) {
    middlewares.push(enhancedInputSanitization);
  }

  if (options.enableSuspiciousActivityDetection !== false) {
    middlewares.push(suspiciousActivityDetection);
  }

  if (options.enableRateLimit !== false) {
    middlewares.push(options.customRateLimit || generalRateLimit);
  }

  return middlewares;
};

export default {
  enhancedSecurityHeaders,
  requestContext,
  enhancedInputSanitization,
  enhancedAuthentication,
  optionalAuthentication,
  createEnhancedRateLimit,
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  strictRateLimit,
  requestSizeLimit,
  suspiciousActivityDetection,
  enhancedErrorHandler,
  createSecurityMiddlewareChain
};