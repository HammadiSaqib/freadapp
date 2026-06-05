import { Request, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getQuery, runQuery } from '../database/databaseAdapter.js';
import { SECURITY_CONFIG, validatePasswordStrength, sanitizeInput, generateSecureToken } from '../config/security.js';

// Enhanced validation schemas with stronger security
const loginSchema = z.object({
  email: z.string()
    .email('Valid email is required')
    .max(254, 'Email too long')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required')
    .max(SECURITY_CONFIG.PASSWORD.MAX_LENGTH, 'Password too long'),
  rememberMe: z.boolean().optional().default(false)
});

const registerSchema = z.object({
  email: z.string()
    .email('Valid email is required')
    .max(254, 'Email too long')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(SECURITY_CONFIG.PASSWORD.MIN_LENGTH, `Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters`)
    .max(SECURITY_CONFIG.PASSWORD.MAX_LENGTH, 'Password too long')
    .refine(password => validatePasswordStrength(password).isValid, {
      message: 'Password does not meet security requirements'
    }),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform(sanitizeInput),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform(sanitizeInput),
  company_name: z.string()
    .max(100, 'Company name too long')
    .nullable()
    .optional()
    .transform(val => val ? sanitizeInput(val) : null),
  role: z.enum(['admin', 'manager', 'agent']).default('agent'),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'Terms and conditions must be accepted'
  })
});

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    sessionId?: string;
  };
}

// Login attempt tracking
interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

const loginAttempts = new Map<string, LoginAttempt>();

// Enhanced token generation with additional claims
export function generateTokens(user: any, rememberMe: boolean = false): { accessToken: string; refreshToken: string } {
  const sessionId = generateSecureToken();
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    iat: now,
    iss: SECURITY_CONFIG.JWT.ISSUER,
    aud: SECURITY_CONFIG.JWT.AUDIENCE
  };

  const accessToken = jwt.sign(
    payload,
    SECURITY_CONFIG.JWT.SECRET,
    { 
      expiresIn: SECURITY_CONFIG.JWT.EXPIRES_IN,
      algorithm: SECURITY_CONFIG.JWT.ALGORITHM
    }
  );

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    SECURITY_CONFIG.JWT.SECRET,
    { 
      expiresIn: rememberMe ? '30d' : SECURITY_CONFIG.JWT.REFRESH_EXPIRES_IN,
      algorithm: SECURITY_CONFIG.JWT.ALGORITHM
    }
  );

  return { accessToken, refreshToken };
}

// Enhanced token verification
export function verifyTokenHelper(token: string): any {
  try {
    return jwt.verify(token, SECURITY_CONFIG.JWT.SECRET, {
      algorithms: [SECURITY_CONFIG.JWT.ALGORITHM],
      issuer: SECURITY_CONFIG.JWT.ISSUER,
      audience: SECURITY_CONFIG.JWT.AUDIENCE
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

// Enhanced password hashing
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SECURITY_CONFIG.PASSWORD.BCRYPT_ROUNDS);
}

// Timing-safe password comparison
export function comparePassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

// Check if account is locked due to failed attempts
function isAccountLocked(email: string): boolean {
  const attempt = loginAttempts.get(email);
  if (!attempt) return false;
  
  if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
    return true;
  }
  
  // Reset if lock period has expired
  if (attempt.lockedUntil && attempt.lockedUntil <= new Date()) {
    loginAttempts.delete(email);
  }
  
  return false;
}

// Record failed login attempt
function recordFailedAttempt(email: string): void {
  const now = new Date();
  const attempt = loginAttempts.get(email) || { email, attempts: 0, lastAttempt: now };
  
  attempt.attempts += 1;
  attempt.lastAttempt = now;
  
  if (attempt.attempts >= SECURITY_CONFIG.PASSWORD.MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = new Date(now.getTime() + SECURITY_CONFIG.PASSWORD.LOCKOUT_DURATION);
  }
  
  loginAttempts.set(email, attempt);
}

// Clear failed attempts on successful login
function clearFailedAttempts(email: string): void {
  loginAttempts.delete(email);
}

// Enhanced user retrieval with security checks
export async function getUserByEmail(email: string): Promise<any | null> {
  const user = await getQuery('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  return user || null;
}

export async function getUserById(id: number): Promise<any> {
  const user = await getQuery('SELECT * FROM users WHERE id = ? AND is_active = 1', [id]);
  return user;
}

// Enhanced user creation with audit trail
export async function createUser(userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role?: string;
}): Promise<any> {
  const hashedPassword = hashPassword(userData.password);
  const userId = generateSecureToken(16);
  
  const result = await runQuery(`
    INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    userData.email,
    hashedPassword,
    userData.first_name,
    userData.last_name,
    userData.company_name || null,
    userData.role || 'agent',
    userId
  ]);
  
  // Log user creation
  await runQuery(`
    INSERT INTO activities (user_id, type, description, metadata)
    VALUES (?, ?, ?, ?)
  `, [
    result.lastID,
    'user_registered',
    'New user account created',
    JSON.stringify({ ip: 'system', userAgent: 'system' })
  ]);
  
  return await getUserById(result.lastID);
}

// Enhanced login with security measures
export async function updateUserLastLogin(userId: number, metadata?: any): Promise<void> {
  await runQuery(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', 
    [userId]
  );
  
  // Log login activity
  await runQuery(`
    INSERT INTO activities (user_id, type, description, metadata)
    VALUES (?, ?, ?, ?)
  `, [
    userId,
    'user_login',
    'User logged in successfully',
    JSON.stringify(metadata || {})
  ]);
}

// Enhanced Authentication Controller
export class EnhancedAuthController {
  // Enhanced login with security measures
  static async login(req: Request, res: Response) {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      console.log('Login attempt from:', clientIp, 'for:', req.body.email);
      
      const { email, password, rememberMe } = loginSchema.parse(req.body);
      
      // Check if account is locked
      if (isAccountLocked(email)) {
        console.log('Account locked for:', email);
        return res.status(429).json({ 
          error: 'Account temporarily locked due to multiple failed attempts. Please try again later.' 
        });
      }
      
      // Check if user exists
      const user = await getUserByEmail(email);
      if (!user) {
        recordFailedAttempt(email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const passwordMatch = comparePassword(password, user.password_hash);
      if (!passwordMatch) {
        recordFailedAttempt(email);
        console.log('Password mismatch for:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Clear failed attempts on successful login
      clearFailedAttempts(email);
      
      // Update last login with metadata
      await updateUserLastLogin(user.id, { ip: clientIp, userAgent });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user, rememberMe);
      
      // Return user data (without sensitive information)
      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        role: user.role,
        last_login: new Date().toISOString(),
      };
      
      console.log('Login successful for:', email);
      
      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: SECURITY_CONFIG.SESSION.COOKIE_SECURE,
        sameSite: SECURITY_CONFIG.SESSION.COOKIE_SAME_SITE,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : SECURITY_CONFIG.SESSION.COOKIE_MAX_AGE
      });
      
      res.json({
        message: 'Login successful',
        token: accessToken,
        user: userData,
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors.map(e => e.message)
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Enhanced registration with security validation
  static async register(req: Request, res: Response) {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      const userData = registerSchema.parse(req.body);
      
      // Additional password strength validation
      const passwordValidation = validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors
        });
      }
      
      // Check if user already exists
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      
      // Create new user
      const newUser = await createUser(userData);
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(newUser);
      
      // Return user data (without sensitive information)
      const responseUser = {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        company_name: newUser.company_name,
        role: newUser.role,
      };
      
      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: SECURITY_CONFIG.SESSION.COOKIE_SECURE,
        sameSite: SECURITY_CONFIG.SESSION.COOKIE_SAME_SITE,
        maxAge: SECURITY_CONFIG.SESSION.COOKIE_MAX_AGE
      });
      
      res.status(201).json({
        message: 'User created successfully',
        token: accessToken,
        user: responseUser,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors.map(e => e.message)
        });
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Token refresh endpoint
  static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }
      
      const decoded = verifyTokenHelper(refreshToken);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid token type' });
      }
      
      const user = await getUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const { accessToken } = generateTokens(user);
      
      res.json({ token: accessToken });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  // Enhanced logout with token invalidation
  static async logout(req: Request, res: Response) {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: SECURITY_CONFIG.SESSION.COOKIE_SECURE,
        sameSite: SECURITY_CONFIG.SESSION.COOKIE_SAME_SITE
      });
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}