import crypto from 'crypto';

// Security configuration constants
export const SECURITY_CONFIG = {
  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || generateSecureSecret(),
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    ALGORITHM: 'HS256' as const,
    ISSUER: process.env.JWT_ISSUER || 'creditrepair-pro',
    AUDIENCE: process.env.JWT_AUDIENCE || 'creditrepair-users'
  },

  // Password Configuration
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    BCRYPT_ROUNDS: 12, // Increased from 10 for better security
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // per window
    AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    AUTH_MAX_REQUESTS: 5, // login attempts per window
    SKIP_SUCCESSFUL_REQUESTS: true
  },

  // Session Configuration
  SESSION: {
    COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    COOKIE_SECURE: process.env.NODE_ENV === 'production',
    COOKIE_HTTP_ONLY: true,
    COOKIE_SAME_SITE: 'strict' as const
  },

  // CORS Configuration
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',
    CREDENTIALS: true,
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Skip-Refresh-Token-Persist']
  },

  // Input Validation
  VALIDATION: {
    MAX_REQUEST_SIZE: '10mb',
    MAX_FIELD_SIZE: '1mb',
    MAX_FILES: 5,
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
  }
};

// Generate a secure random secret if none is provided
function generateSecureSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using auto-generated JWT secret in production. Set JWT_SECRET environment variable!');
  }
  return crypto.randomBytes(64).toString('hex');
}

// Password strength validation
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = SECURITY_CONFIG.PASSWORD;

  if (password.length < config.MIN_LENGTH) {
    errors.push(`Password must be at least ${config.MIN_LENGTH} characters long`);
  }

  if (password.length > config.MAX_LENGTH) {
    errors.push(`Password must not exceed ${config.MAX_LENGTH} characters`);
  }

  if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Input sanitization helpers
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>"'&]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    });
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Timing-safe string comparison
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Security headers middleware configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:;"
};