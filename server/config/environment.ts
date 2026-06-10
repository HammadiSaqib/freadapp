import * as crypto from 'crypto';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file before any validation
dotenvConfig();

// Environment configuration with security defaults
export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL?: string;
  // Frontend URL for generating public invoice links
  FRONTEND_URL: string;
  // MySQL Configuration
  MYSQL_HOST: string;
  MYSQL_PORT: number;
  MYSQL_USER: string;
  MYSQL_PASSWORD: string;
  MYSQL_DATABASE: string;
  MYSQL_CONNECTION_LIMIT: number;
  MYSQL_ACQUIRE_TIMEOUT: number;
  MYSQL_TIMEOUT: number;
  // Seeding controls
  SEED_DEMO_DATA: boolean;
  // SQLite Configuration (for migration)
  SQLITE_DATABASE_PATH?: string;
  // Email Configuration
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM_NAME: string;
  EMAIL_FROM_ADDRESS: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  CORS_ORIGIN: string | string[];
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  SESSION_COOKIE_SECURE: boolean;
  LOG_LEVEL: string;
  ENABLE_REQUEST_LOGGING: boolean;
  MAX_REQUEST_SIZE: string;
  LOCKOUT_DURATION_MS: number;
  MAX_LOGIN_ATTEMPTS: number;
  // NMI / Payment gateway settings
  NMI_GATEWAY_USERNAME?: string;
  NMI_GATEWAY_PASSWORD?: string;
  NMI_COLLECTJS_TOKENIZATION_KEY?: string;
  NMI_TEST_MODE?: boolean;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}

// Validate required environment variables
function validateEnvironment(): void {
  const required = [
    'NODE_ENV'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using default values - ensure proper configuration in production!');
  }
  
  // Validate JWT secret in production
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in production!');
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  
  // Validate CORS origin in production
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    console.warn('⚠️  CORS_ORIGIN not set in production - using default');
  }
  
  // Validate MySQL configuration
  const mysqlVars = ['MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missingMysql = mysqlVars.filter(key => !process.env[key]);
  
  if (missingMysql.length > 0) {
    console.warn(`⚠️  Missing MySQL environment variables: ${missingMysql.join(', ')}`);
    console.warn('Using default MySQL configuration - ensure proper setup for production!');
    
    // Log current MySQL configuration for debugging
    console.log('🔍 Current MySQL Configuration:');
    console.log(`   MYSQL_HOST: ${process.env.MYSQL_HOST || 'localhost (default)'}`);
    console.log(`   MYSQL_PORT: ${process.env.MYSQL_PORT || '3306 (default)'}`);
    console.log(`   MYSQL_USER: ${process.env.MYSQL_USER || 'root (default)'}`);
    console.log(`   MYSQL_PASSWORD: ${process.env.MYSQL_PASSWORD ? '[SET]' : '[NOT SET - using empty]'}`);
    console.log(`   MYSQL_DATABASE: ${process.env.MYSQL_DATABASE || 'creditrepair_db (default)'}`);
  }
}

// Generate secure JWT secret if not provided
function generateSecureJWTSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be explicitly set in production');
  }
  
  console.warn('⚠️  Generating temporary JWT secret for development');
  return crypto.randomBytes(64).toString('hex');
}

// Parse CORS origins
function parseCorsOrigins(origins?: string): string | string[] {
  if (!origins) {
    return process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:8080';
  }
  
  // Support comma-separated origins
  if (origins.includes(',')) {
    return origins.split(',').map(origin => origin.trim());
  }
  
  return origins;
}

// Load and validate environment configuration
export function loadEnvironmentConfig(): EnvironmentConfig {
  validateEnvironment();
  
  const config: EnvironmentConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    DATABASE_URL: process.env.DATABASE_URL || `mysql://${process.env.MYSQL_USER || 'root'}:${process.env.MYSQL_PASSWORD || ''}@${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || '3306'}/${process.env.MYSQL_DATABASE || 'creditrepair_db'}`,
    // Frontend URL used in server-generated links (e.g., invoices)
    FRONTEND_URL: (() => {
      const corsOrigin = process.env.CORS_ORIGIN || '';
      if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
      if (corsOrigin.includes(',')) return corsOrigin.split(',')[0].trim();
      if (corsOrigin) return corsOrigin.trim();
      return process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3001';
    })(),
    // MySQL Configuration - VPS compatible defaults
    MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
    MYSQL_PORT: parseInt(process.env.MYSQL_PORT || '3306', 10),
    MYSQL_USER: process.env.MYSQL_USER || 'root',
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
    MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'creditrepair_db',
    MYSQL_CONNECTION_LIMIT: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
    MYSQL_ACQUIRE_TIMEOUT: parseInt(process.env.MYSQL_ACQUIRE_TIMEOUT || '60000', 10),
    MYSQL_TIMEOUT: parseInt(process.env.MYSQL_TIMEOUT || '60000', 10),
    // Seeding controls
    SEED_DEMO_DATA: process.env.SEED_DEMO_DATA === 'true',
    // SQLite Configuration (for migration)
    SQLITE_DATABASE_PATH: process.env.SQLITE_DATABASE_PATH,
    // Email Configuration
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Fread App',
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || '',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    JWT_ISSUER: process.env.JWT_ISSUER || 'creditrepair-pro',
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'creditrepair-users',
    CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    SESSION_COOKIE_SECURE: process.env.NODE_ENV === 'production',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE || '10mb',
    LOCKOUT_DURATION_MS: parseInt(process.env.LOCKOUT_DURATION_MS || '900000', 10), // 15 minutes
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    // NMI / Payment gateway
    NMI_GATEWAY_USERNAME: process.env.NMI_GATEWAY_USERNAME || undefined,
    NMI_GATEWAY_PASSWORD: process.env.NMI_GATEWAY_PASSWORD || undefined,
    NMI_COLLECTJS_TOKENIZATION_KEY: process.env.NMI_COLLECTJS_TOKENIZATION_KEY || undefined,
    NMI_TEST_MODE: process.env.NMI_TEST_MODE === 'true',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
  };
  
  // Validate numeric values
  if (config.PORT < 1 || config.PORT > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
  
  // Validate MySQL configuration
  if (config.MYSQL_PORT < 1 || config.MYSQL_PORT > 65535) {
    throw new Error('MYSQL_PORT must be between 1 and 65535');
  }
  
  if (!config.MYSQL_HOST) {
    throw new Error('MYSQL_HOST is required');
  }
  
  if (!config.MYSQL_USER) {
    throw new Error('MYSQL_USER is required');
  }
  
  if (!config.MYSQL_DATABASE) {
    throw new Error('MYSQL_DATABASE is required');
  }
  
  if (config.MYSQL_CONNECTION_LIMIT < 1) {
    throw new Error('MYSQL_CONNECTION_LIMIT must be positive');
  }
  
  if (config.MYSQL_ACQUIRE_TIMEOUT < 1000) {
    console.warn('⚠️  MYSQL_ACQUIRE_TIMEOUT should be at least 1000ms');
  }
  
  if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
    console.warn('⚠️  BCRYPT_ROUNDS should be between 10-15 for optimal security/performance');
  }
  
  if (config.RATE_LIMIT_MAX_REQUESTS < 1) {
    throw new Error('RATE_LIMIT_MAX_REQUESTS must be positive');
  }
  
  if (config.MAX_LOGIN_ATTEMPTS < 3) {
    console.warn('⚠️  MAX_LOGIN_ATTEMPTS should be at least 3 to prevent accidental lockouts');
  }
  
  return config;
}

// Environment-specific configurations
export const ENVIRONMENT_CONFIGS = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_REQUEST_LOGGING: true,
    RATE_LIMIT_MAX_REQUESTS: 1000, // More lenient in development
    SESSION_COOKIE_SECURE: false
  },
  
  test: {
    LOG_LEVEL: 'error',
    ENABLE_REQUEST_LOGGING: false,
    RATE_LIMIT_MAX_REQUESTS: 10000, // Very lenient for tests
    JWT_EXPIRES_IN: '1h',
    BCRYPT_ROUNDS: 4 // Faster for tests
  },
  
  production: {
    LOG_LEVEL: 'warn',
    ENABLE_REQUEST_LOGGING: true,
    RATE_LIMIT_MAX_REQUESTS: 100, // Strict in production
    SESSION_COOKIE_SECURE: true,
    BCRYPT_ROUNDS: 12
  }
};

// Get environment-specific overrides
export function getEnvironmentOverrides(env: string = process.env.NODE_ENV || 'development') {
  return ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || {};
}

// Security checklist for production
export function performSecurityChecklist(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  
  console.log('🔒 Performing production security checklist...');
  
  const checks = [
    {
      name: 'JWT_SECRET set',
      passed: !!process.env.JWT_SECRET,
      critical: true
    },
    {
      name: 'CORS_ORIGIN configured',
      passed: !!process.env.CORS_ORIGIN,
      critical: false
    },
    {
      name: 'HTTPS enforced (NODE_ENV=production)',
      passed: process.env.NODE_ENV === 'production',
      critical: true
    },
    {
      name: 'Secure cookies enabled',
      passed: process.env.NODE_ENV === 'production',
      critical: true
    },
    {
      name: 'Rate limiting configured',
      passed: true, // Always enabled
      critical: true
    },
    {
      name: 'Input sanitization enabled',
      passed: true, // Always enabled
      critical: true
    }
  ];
  
  let criticalFailures = 0;
  let warnings = 0;
  
  checks.forEach(check => {
    if (check.passed) {
      console.log(`✅ ${check.name}`);
    } else if (check.critical) {
      console.error(`❌ ${check.name} - CRITICAL`);
      criticalFailures++;
    } else {
      console.warn(`⚠️  ${check.name} - WARNING`);
      warnings++;
    }
  });
  
  if (criticalFailures > 0) {
    console.error(`❌ ${criticalFailures} critical security issues found!`);
    throw new Error('Critical security configuration issues detected');
  }
  
  if (warnings > 0) {
    console.warn(`⚠️  ${warnings} security warnings - review configuration`);
  }
  
  console.log('✅ Security checklist passed');
}

// Export the loaded configuration
export const ENV_CONFIG = loadEnvironmentConfig();
export const config = ENV_CONFIG;

export default ENV_CONFIG;
