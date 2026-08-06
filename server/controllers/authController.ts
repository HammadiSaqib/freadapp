import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { getQuery, runQuery } from '../database/databaseAdapter.js';
import { ENV_CONFIG } from '../config/environment.js';
import { emailService } from '../services/emailService.js';
import { syncGhlAdminSignup } from '../services/ghlService.js';
import { syncGhlAdminLifecycleTagsInBackground } from '../services/ghlAdminLifecycleService.js';
import { extractLoginInfo } from '../utils/loginUtils.js';
import { getScoreMachinePortalAccessStatus } from '../utils/scoreMachineEliteAccess.js';
import { ensureKycSchema } from '../utils/kyc.js';

const JWT_SECRET: Secret = ENV_CONFIG.JWT_SECRET;
const googleOAuthClient = new OAuth2Client();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const googleLoginSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
  referral_affiliate_id: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company_name: z.string().nullable().optional(),
  role: z.enum(['user', 'admin', 'support', 'super_admin', 'funding_manager']).default('admin'),
  plan_id: z.number().positive().optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  referral_affiliate_id: z.string().optional(),
  referral_affiliate_name: z.string().optional(),
  referral_commission_rate: z.number().min(0).max(100).optional(),
});

const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'New password must be at least 6 characters').optional(),
  credit_repair_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  onboarding_slug: z.string().optional(),
  intake_redirect_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  intake_logo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  intake_primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional().or(z.literal('')),
  intake_company_name: z.string().optional(),
  intake_website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  intake_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  intake_phone_number: z.string().optional(),
  nmi_merchant_id: z.string().optional(),
  nmi_public_key: z.string().optional(),
  nmi_api_key: z.string().optional(),
  nmi_username: z.string().optional(),
  nmi_password: z.string().optional(),
  nmi_test_mode: z.boolean().optional(),
  nmi_gateway_logo: z.string().url().optional().or(z.literal('')),
  notify_client_after_report_pull: z.boolean().optional(),
  funding_override_enabled: z.boolean().optional(),
  funding_override_signature_text: z.string().optional()
});

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  }
}

function syncAdminSignupToGhlInBackground(params: {
  userId?: number | string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  role?: string | null;
  registrationData?: Record<string, any> | null;
}) {
  const role = String(params.role || 'admin').toLowerCase();
  if (role !== 'admin') {
    return;
  }

  void syncGhlAdminSignup(params)
    .then((result) => {
      if (!result?.skipped) {
        console.log('GHL admin signup synced:', {
          userId: params.userId || null,
          email: params.email || null,
          contactId: result?.contactId || null
        });
      }
    })
    .catch((error: any) => {
      console.error('GHL admin signup sync failed:', error?.response?.data || error?.message || error);
    });
}

// Helper functions
export function generateToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const expiresIn = (ENV_CONFIG.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function generateRefreshToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh'
  };

  const expiresIn = (ENV_CONFIG.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'];

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyRefreshToken(token: string): any {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded?.type !== 'refresh') throw new Error('Invalid token type');
  return decoded;
}

export function verifyTokenHelper(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function getUserByEmail(email: string): Promise<any | null> {
  const user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
  return user || null;
}

export async function getUserById(id: number): Promise<any> {
  const user = await getQuery('SELECT * FROM users WHERE id = ?', [id]);
  return user;
}

export async function createUser(userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  role?: string;
  plan_id?: number;
  billing_cycle?: string;
  referral_affiliate_id?: string;
  referral_affiliate_name?: string;
  referral_commission_rate?: number;
  isPasswordHashed?: boolean;
}): Promise<any> {
  await ensureKycSchema();
  const hashedPassword = userData.isPasswordHashed ? userData.password : hashPassword(userData.password);
  const role = userData.role || 'admin';
  
  const result = await runQuery(`
    INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, kyc_required, kyc_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    userData.email,
    hashedPassword,
    userData.first_name,
    userData.last_name,
    userData.company_name || null,
    role,
    0,
    'not_started',
  ]);
  
  // Use insertId for MySQL, lastID for SQLite
  const insertedId = result.insertId || result.lastID;
  
  // Note: Subscription and affiliate profile creation will be handled in the dashboard
  // after the admin completes payment and setup process
  console.log(`✅ User created successfully. Subscription and affiliate setup will be handled in dashboard.`);
  
  const newUser = await getUserById(insertedId);
  syncAdminSignupToGhlInBackground({
    userId: insertedId,
    email: userData.email,
    phone: userData.phone || null,
    firstName: userData.first_name,
    lastName: userData.last_name,
    companyName: userData.company_name || null,
    role: userData.role || 'admin',
    registrationData: userData
  });

  return newUser;
}

export async function updateUserLastLogin(userId: number): Promise<void> {
  await runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
  syncGhlAdminLifecycleTagsInBackground(userId);
}

// Client helper functions
export async function getClientByPlatformEmail(platformEmail: string): Promise<any | null> {
  const client = await getQuery('SELECT * FROM clients WHERE platform_email = ? AND status = "active"', [platformEmail]);
  return client || null;
}

// Affiliate helper functions
export async function getAffiliateByEmail(email: string): Promise<any | null> {
  const affiliate = await getQuery('SELECT * FROM affiliates WHERE email = ?', [email]);
  return affiliate || null;
}

export async function getAffiliateById(id: number): Promise<any> {
  const affiliate = await getQuery('SELECT * FROM affiliates WHERE id = ?', [id]);
  return affiliate;
}

export async function updateAffiliateLastLogin(affiliateId: number): Promise<void> {
  await runQuery('UPDATE affiliates SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [affiliateId]);
}

export async function createAffiliate(affiliateData: {
  admin_id: number;
  parent_affiliate_id?: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  commission_rate?: number;
  parent_commission_rate?: number;
  created_by?: number;
  isPasswordHashed?: boolean;
}): Promise<any> {
  const hashedPassword = affiliateData.isPasswordHashed ? affiliateData.password : hashPassword(affiliateData.password);
  
  // Determine affiliate level based on parent
  let affiliateLevel = 1;
  if (affiliateData.parent_affiliate_id) {
    const parentAffiliate = await runQuery(
      'SELECT affiliate_level FROM affiliates WHERE id = ?',
      [affiliateData.parent_affiliate_id]
    );
    if (parentAffiliate && parentAffiliate.length > 0) {
      affiliateLevel = parentAffiliate[0].affiliate_level + 1;
    }
  }
  
  const result = await runQuery(`
    INSERT INTO affiliates (admin_id, parent_affiliate_id, email, password_hash, first_name, last_name, company_name, phone, address, city, state, zip_code, commission_rate, parent_commission_rate, affiliate_level, status, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `, [
    affiliateData.admin_id,
    affiliateData.parent_affiliate_id || null,
    affiliateData.email,
    hashedPassword,
    affiliateData.first_name,
    affiliateData.last_name,
    affiliateData.company_name || null,
    affiliateData.phone || null,
    affiliateData.address || null,
    affiliateData.city || null,
    affiliateData.state || null,
    affiliateData.zip_code || null,
    affiliateData.commission_rate || 10.00,
    affiliateData.parent_commission_rate || 5.00,
    affiliateLevel,
    affiliateData.created_by || null,
    affiliateData.created_by || null
  ]);
  
  const insertedId = result.insertId || result.lastID;
  return await getAffiliateById(insertedId);
}

function getGoogleSignInClientIds(): string[] {
  const rawValues = [process.env.GOOGLE_CLIENT_ID, process.env.VITE_GOOGLE_CLIENT_ID]
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(rawValues));
}

function isUserActive(user: any): boolean {
  if (user && user.is_active !== undefined && user.is_active !== null) {
    if (typeof user.is_active === 'boolean') return user.is_active;
    const numeric = Number(user.is_active);
    if (Number.isFinite(numeric)) return numeric === 1;
    return String(user.is_active).toLowerCase() === 'true';
  }

  return String(user?.status || 'active').toLowerCase() === 'active';
}

function buildAuthUserData(user: any) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    company_name: user.company_name,
    role: user.role,
    avatar: user.avatar || null,
    last_login: new Date().toISOString(),
  };
}

// Controller methods
export class AuthController {
  // Funding Manager Login endpoint
  static async fundingManagerLogin(req: Request, res: Response) {
    try {
      console.log('Funding manager login attempt for:', req.body.email);
      
      const { email, password } = loginSchema.parse(req.body);
      
      // Get user from database
      const user = await getUserByEmail(email);
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check if user has funding_manager role
      if (user.role !== 'funding_manager') {
        console.log('User role:', user.role, 'Expected: funding_manager');
        return res.status(403).json({ error: 'Access denied. Funding manager role required.' });
      }
      
      // Verify password
      const isValidPassword = comparePassword(password, user.password_hash);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      await updateUserLastLogin(user.id);
      
      // Generate JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      });
      
      console.log('Funding manager login successful for:', user.email);
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name
        }
      });
      
    } catch (error) {
      console.error('Funding manager login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Super Admin Login endpoint
  static async superAdminLogin(req: Request, res: Response) {
    try {
      console.log('Super Admin login attempt for:', req.body.email);
      
      const { email, password } = loginSchema.parse(req.body);
      
      // Check if user exists
      const user = await getUserByEmail(email);
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid super admin credentials' });
      }
      
      // Check if user has super admin role
      if (user.role !== 'super_admin') {
        console.log('Access denied: User role is', user.role, 'but super_admin required');
        return res.status(403).json({ error: 'Access denied: Super admin privileges required' });
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        return res.status(401).json({ error: 'Super admin account is deactivated' });
      }
      
      // Verify password
      console.log('Comparing password...');
      const passwordMatch = comparePassword(password, user.password_hash);
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid super admin credentials' });
      }
      
      await updateUserLastLogin(user.id);
      try {
        await runQuery(
          `INSERT INTO user_activities (user_id, activity_type, resource_type, description, ip_address, user_agent, session_id)
           VALUES (?, 'login', 'auth', ?, ?, ?, ?)`,
          [
            user.id,
            'Super admin login successful',
            (req as any).ip,
            req.get('User-Agent') || null,
            null
          ]
        );
      } catch {}
      
      // Send admin login notification email
      try {
        const loginInfo = extractLoginInfo(req);
        await emailService.sendAdminLoginNotification({
          adminName: `${user.first_name} ${user.last_name}`,
          email: user.email,
          ipAddress: loginInfo.ipAddress,
          location: loginInfo.location,
          userAgent: loginInfo.userAgent,
          loginTime: loginInfo.loginTime,
          deviceInfo: loginInfo.deviceInfo
        });
        console.log('Super Admin login notification sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send super admin login notification:', emailError);
        // Don't fail the login if email fails
      }
      
      // Generate token with super admin role
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Return user data (without password)
      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        role: user.role,
        last_login: new Date().toISOString(),
      };
      
      console.log('Super Admin login successful for:', email);
      
      res.json({
        message: 'Super Admin login successful',
        token,
        user: userData,
      });
    } catch (error) {
      console.error('Super Admin login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Support Team Login endpoint
  static async supportLogin(req: Request, res: Response) {
    try {
      console.log('Support team login attempt for:', req.body.email);
      
      const { email, password } = loginSchema.parse(req.body);
      
      // Check if user exists
      const user = await getUserByEmail(email);
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid support team credentials' });
      }
      
      // Check if user has support role
      if (user.role !== 'support') {
        console.log('Access denied: User role is', user.role, 'but support required');
        return res.status(403).json({ error: 'Access denied: Support team privileges required' });
      }
      
      // Check if user is active (database stores as 1 for active, 0 for inactive)
      if (!user.is_active || user.is_active === 0) {
        return res.status(401).json({ error: 'Support team account is deactivated' });
      }
      
      // Verify password
      console.log('Comparing password...');
      const passwordMatch = comparePassword(password, user.password_hash);
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid support team credentials' });
      }
      
      // Update last login
      await updateUserLastLogin(user.id);
      
      // Generate token with support role
      const token = generateToken(user);
      
      // Return user data (without password)
      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        role: user.role,
        last_login: new Date().toISOString(),
      };
      
      console.log('Support team login successful for:', email);
      
      res.json({
        success: true,
        message: 'Support team login successful',
        token,
        user: userData,
      });
    } catch (error) {
      console.error('Support team login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Printing Team Login endpoint
  static async printingTeamLogin(req: Request, res: Response) {
    try {
      console.log('Printing team login attempt for:', req.body.email);

      const { email, password } = loginSchema.parse(req.body);

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.role !== 'printing_team') {
        console.log('Access denied: User role is', user.role, 'but printing_team required');
        return res.status(403).json({ error: 'Access denied. Only printing team members can log in here.' });
      }

      if (!user.is_active || user.is_active === 0) {
        return res.status(401).json({ error: 'Printing team account is deactivated' });
      }

      const passwordMatch = comparePassword(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await updateUserLastLogin(user.id);

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      });

      console.log('Printing team login successful for:', email);

      res.json({
        success: true,
        message: 'Printing team login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          last_login: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Printing team login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Affiliate Login endpoint
  static async affiliateLogin(req: Request, res: Response) {
    try {
      console.log('Affiliate login attempt for:', req.body.email);
      
      const { email, password } = loginSchema.parse(req.body);
      
      // Check if affiliate exists in affiliates table
      const affiliate = await getAffiliateByEmail(email);
      console.log('Affiliate found:', affiliate ? 'Yes' : 'No');
      
      if (!affiliate) {
        return res.status(401).json({ error: 'Invalid affiliate credentials' });
      }
      
      // Check if affiliate account is active
      if (affiliate.status !== 'active') {
        console.log('Access denied: Affiliate status is', affiliate.status);
        return res.status(401).json({ error: 'Affiliate account is not active' });
      }
      
      // Verify password
      console.log('Comparing password...');
      const passwordMatch = comparePassword(password, affiliate.password_hash);
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid affiliate credentials' });
      }
      
      // Update last login
      await updateAffiliateLastLogin(affiliate.id);
      
      // Generate token using the same helper as admin/super admin
      const tokenUser = {
        id: affiliate.id,
        email: affiliate.email,
        role: 'affiliate',
        admin_id: affiliate.admin_id
      };
      const token = generateToken(tokenUser);
      
      // Return affiliate data (without password)
      const affiliateData = {
        id: affiliate.id,
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        company_name: affiliate.company_name,
        phone: affiliate.phone,
        admin_id: affiliate.admin_id,
        commission_rate: affiliate.commission_rate,
        total_earnings: affiliate.total_earnings,
        total_referrals: affiliate.total_referrals,
        status: affiliate.status,
        role: 'affiliate',
        last_login: new Date().toISOString(),
      };
      
      console.log('Affiliate login successful for:', email);
      
      res.json({
        message: 'Affiliate login successful',
        token,
        user: affiliateData,
      });
    } catch (error) {
      console.error('Affiliate login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login as Admin endpoint (for super admin)
  static async loginAsAdmin(req: AuthRequest, res: Response) {
    try {
      console.log('Super admin login as admin attempt for admin ID:', req.body.adminId);
      
      const { adminId } = req.body;
      
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }
      
      // Verify the requesting user is a super admin
      const requestingUser = req.user;
      if (!requestingUser || requestingUser.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied: Super admin privileges required' });
      }
      
      // Get the target admin user
      const targetAdmin = await getUserById(adminId);
      console.log('Target admin found:', targetAdmin ? 'Yes' : 'No');
      
      if (!targetAdmin) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Check if target user is an admin
      if (targetAdmin.role !== 'admin') {
        return res.status(400).json({ error: 'Target user is not an admin' });
      }
      
      // Check if target admin is active
      if (!targetAdmin.is_active) {
        return res.status(400).json({ error: 'Target admin account is deactivated' });
      }
      
      // Generate token for the target admin
      const token = generateToken(targetAdmin);
      const refreshToken = generateRefreshToken(targetAdmin);
      
      // Return admin data (without password)
      const adminData = {
        id: targetAdmin.id,
        email: targetAdmin.email,
        first_name: targetAdmin.first_name,
        last_name: targetAdmin.last_name,
        company_name: targetAdmin.company_name,
        role: targetAdmin.role,
        last_login: targetAdmin.last_login,
      };
      
      console.log('Login as admin successful for:', targetAdmin.email);
      
      res.json({
        message: 'Login as admin successful',
        token,
        refresh_token: refreshToken,
        user: adminData,
      });
    } catch (error) {
      console.error('Login as admin error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login as Affiliate endpoint (for super admin)
  static async loginAsAffiliate(req: AuthRequest, res: Response) {
    try {
      const { affiliateId } = req.body;

      if (!affiliateId) {
        return res.status(400).json({ error: 'Affiliate ID is required' });
      }

      // Verify the requesting user is a super admin
      const requestingUser = req.user;
      if (!requestingUser || requestingUser.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied: Super admin privileges required' });
      }

      // Get the target affiliate
      const affiliate = await getAffiliateById(affiliateId);

      if (!affiliate) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }

      // Check if affiliate is active
      if (affiliate.status !== 'active') {
        return res.status(400).json({ error: 'Target affiliate account is not active' });
      }

      // Generate token for the affiliate
      const tokenUser = {
        id: affiliate.id,
        email: affiliate.email,
        role: 'affiliate',
        admin_id: affiliate.admin_id
      };
      const token = generateToken(tokenUser);
      const refreshToken = generateRefreshToken(tokenUser);

      // Return affiliate data (without password)
      const affiliateData = {
        id: affiliate.id,
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        company_name: affiliate.company_name,
        phone: affiliate.phone,
        admin_id: affiliate.admin_id,
        commission_rate: affiliate.commission_rate,
        total_earnings: affiliate.total_earnings,
        total_referrals: affiliate.total_referrals,
        status: affiliate.status,
        role: 'affiliate',
      };

      res.json({
        message: 'Login as affiliate successful',
        token,
        refresh_token: refreshToken,
        user: affiliateData,
      });
    } catch (error) {
      console.error('Login as affiliate error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login as Support endpoint (for super admin)
  static async loginAsSupport(req: AuthRequest, res: Response) {
    try {
      console.log('Super admin login as support attempt');
      
      // Verify the requesting user is a super admin
      const requestingUser = req.user;
      if (!requestingUser || requestingUser.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied: Super admin privileges required' });
      }
      
      // Get the specific support user with ID 6
      const supportUser = await getUserById(6);
      
      if (!supportUser) {
        return res.status(404).json({ error: 'Support user with ID 6 not found' });
      }
      
      // Verify the user has support role
      if (supportUser.role !== 'support') {
        return res.status(403).json({ error: 'User with ID 6 is not a support user' });
      }
      
      // Check if user is active
      if (!supportUser.is_active || supportUser.is_active === 0) {
        return res.status(403).json({ error: 'Support user account is deactivated' });
      }
      
      // Generate token for the support user
      const token = generateToken(supportUser);
      
      // Update last login
      await updateUserLastLogin(supportUser.id);
      
      // Return support user data (without password)
      const supportData = {
        id: supportUser.id,
        email: supportUser.email,
        first_name: supportUser.first_name,
        last_name: supportUser.last_name,
        company_name: supportUser.company_name,
        role: supportUser.role,
        last_login: new Date().toISOString(),
      };
      
      console.log('Login as support successful:', supportUser.email);
      
      res.json({
        message: 'Login as support successful',
        token,
        user: supportData,
      });
    } catch (error) {
      console.error('Login as support error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGoogleAuthConfig(_req: Request, res: Response) {
    const clientIds = getGoogleSignInClientIds();

    res.json({
      enabled: clientIds.length > 0,
      clientId: clientIds[0] || null,
    });
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body. Expected JSON object with Google credential.',
        });
      }

      const parseResult = googleLoginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Validation error',
          details: parseResult.error.errors,
        });
      }

      const clientIds = getGoogleSignInClientIds();
      if (clientIds.length === 0) {
        return res.status(503).json({ error: 'Google sign-in is not configured' });
      }

      const loginTicket = await googleOAuthClient.verifyIdToken({
        idToken: parseResult.data.credential,
        audience: clientIds,
      });
      const payload = loginTicket.getPayload();

      if (!payload?.email || !payload.email_verified) {
        return res.status(401).json({ error: 'Google account email could not be verified' });
      }

      const email = String(payload.email).trim().toLowerCase();
      const googleFirstName = payload.given_name || payload.name?.split(' ')[0] || 'User';
      const googleLastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
      const googleAvatar = payload.picture || null;
      console.log('Google login attempt for:', email);

      let user = await getUserByEmail(email);
      console.log('User found for Google login:', user ? 'Yes' : 'No');

      if (!user) {
        // Auto-register new admin account from Google profile
        console.log('Creating new admin account from Google sign-in for:', email);
        try {
          await ensureKycSchema();
          const { randomBytes } = await import('crypto');
          const randomPassword = randomBytes(32).toString('hex');
          const hashedPassword = hashPassword(randomPassword);

          const insertResult = await runQuery(
            `INSERT INTO users (
              email, password_hash, first_name, last_name, role,
              email_verified, status, avatar, kyc_required, kyc_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'admin', TRUE, 'active', ?, 0, 'not_started', NOW(), NOW())`,
            [email, hashedPassword, googleFirstName, googleLastName, googleAvatar]
          );

          const newUserId = insertResult.insertId || insertResult.lastID;
          user = await getUserById(newUserId);

          if (!user) {
            return res.status(500).json({ error: 'Account was created but could not be retrieved' });
          }

          console.log('New admin account created from Google sign-in, ID:', newUserId);
          syncAdminSignupToGhlInBackground({
            userId: newUserId,
            email,
            phone: null,
            firstName: googleFirstName,
            lastName: googleLastName,
            companyName: null,
            role: 'admin',
            registrationData: {
              auth_provider: 'google',
              avatar: googleAvatar,
              referral_affiliate_id: parseResult.data.referral_affiliate_id || null
            }
          });

          // Handle affiliate referral if provided
          try {
            const providedAffiliateIdRaw = (parseResult.data.referral_affiliate_id || '').toString().trim();
            if (providedAffiliateIdRaw) {
              const affiliateId = parseInt(providedAffiliateIdRaw, 10);
              if (!Number.isNaN(affiliateId)) {
                console.log('Google signup - recording affiliate referral:', { affiliateId, userId: newUserId });

                const affiliate = await getQuery(
                  `SELECT id, status, plan_type, paid_referrals_count FROM affiliates WHERE id = ?`,
                  [affiliateId]
                );

                if (affiliate && affiliate.status !== 'suspended') {
                  await runQuery(
                    `INSERT INTO affiliate_referrals (
                      affiliate_id, referred_user_id, commission_amount, commission_rate, status, referral_date
                    ) VALUES (?, ?, 0, 0, 'pending', NOW())`,
                    [affiliateId, newUserId]
                  );

                  await runQuery(
                    `UPDATE affiliates SET total_referrals = total_referrals + 1, updated_at = NOW() WHERE id = ?`,
                    [affiliateId]
                  );

                  // Update user referral_source
                  await runQuery(
                    `UPDATE users SET referral_source = 'product_link' WHERE id = ?`,
                    [newUserId]
                  );

                  console.log('Referral recorded: affiliate', affiliateId, '-> user', newUserId);

                  // Apply trial plan if affiliate has one
                  try {
                    const trialPlan = await getQuery(
                      `SELECT duration_months, max_clients, max_users FROM affiliates_trial_plans
                       WHERE affiliate_id = ?
                       AND (
                         (status = 'active' AND start_date IS NULL AND end_date IS NULL)
                         OR (status IN ('active', 'scheduled') AND start_date IS NOT NULL AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW()))
                       )
                       ORDER BY created_at DESC
                       LIMIT 1`,
                      [affiliateId]
                    );
                    if (trialPlan) {
                      const { duration_months, max_clients, max_users } = trialPlan;
                      await runQuery(
                        `UPDATE users SET trial_expires_at = DATE_ADD(NOW(), INTERVAL ? MONTH), trial_max_clients = ?, trial_max_users = ? WHERE id = ?`,
                        [duration_months, max_clients ?? null, max_users ?? null, newUserId]
                      );
                      console.log(`Trial plan applied via Google signup: user ${newUserId} gets ${duration_months} month(s) trial via affiliate ${affiliateId}`);
                    }
                  } catch (trialError) {
                    console.error('Failed to apply affiliate trial plan during Google registration:', trialError);
                  }
                } else {
                  console.warn('Affiliate not found or suspended; skipping referral for affiliateId:', affiliateId);
                }
              }
            }
          } catch (referralError) {
            console.error('Failed to record affiliate referral during Google registration:', referralError);
          }
        } catch (createError: any) {
          console.error('Failed to create account from Google sign-in:', createError);
          return res.status(500).json({ error: 'Failed to create account. Please try again.' });
        }
      } else {
        // Existing user — enforce admin/super_admin role
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          return res.status(403).json({
            error: 'Access denied: Only admin accounts can use Google sign-in on this portal.',
          });
        }

        if (!isUserActive(user)) {
          return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Update avatar from Google if user doesn't have one
        if (!user.avatar && googleAvatar) {
          try {
            await runQuery('UPDATE users SET avatar = ? WHERE id = ?', [googleAvatar, user.id]);
            user.avatar = googleAvatar;
          } catch {}
        }

        if (!user.email_verified) {
          try {
            await runQuery('UPDATE users SET email_verified = TRUE WHERE id = ?', [user.id]);
            user.email_verified = true;
          } catch (verificationError) {
            console.warn('Could not update email_verified for Google login:', verificationError);
          }
        }
      }

      await updateUserLastLogin(user.id);

      try {
        await runQuery(
          `INSERT INTO user_activities (user_id, activity_type, resource_type, description, ip_address, user_agent, session_id)
           VALUES (?, 'login', 'auth', ?, ?, ?, ?)`,
          [
            user.id,
            'Google login successful',
            req.ip,
            req.get('User-Agent') || null,
            null,
          ]
        );
      } catch {}

      try {
        const loginInfo = extractLoginInfo(req);
        await emailService.sendAdminLoginNotification({
          adminName: `${user.first_name} ${user.last_name}`,
          email: user.email,
          ipAddress: loginInfo.ipAddress,
          location: loginInfo.location,
          userAgent: loginInfo.userAgent,
          loginTime: loginInfo.loginTime,
          deviceInfo: loginInfo.deviceInfo,
        });
        console.log('Admin Google login notification sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send admin Google login notification:', emailError);
      }

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      const userData = buildAuthUserData(user);

      res.json({
        message: 'Google login successful',
        token,
        refresh_token: refreshToken,
        user: userData,
      });
    } catch (error: any) {
      console.error('Google login error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      const message = String(error?.message || '').toLowerCase();
      if (
        message.includes('token used too late') ||
        message.includes('wrong recipient') ||
        message.includes('invalid token signature') ||
        message.includes('malformed jwt') ||
        message.includes('jwt')
      ) {
        return res.status(401).json({ error: 'Invalid Google sign-in token' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login endpoint
  static async login(req: Request, res: Response) {
    try {
      // Validate request body exists and is an object
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ 
          error: 'Invalid request body. Expected JSON object with email and password.' 
        });
      }

      console.log('Login attempt for:', req.body.email);
      
      // Parse and validate request body with Zod
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: parseResult.error.errors 
        });
      }

      const { email, password } = parseResult.data;
      
      // Check if user exists
      const user = await getUserByEmail(email);
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }
      
      // Verify password
      console.log('Comparing password...');
      const passwordMatch = comparePassword(password, user.password_hash);
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Update last login
      await updateUserLastLogin(user.id);
      if (user.role === 'admin' || user.role === 'super_admin') {
        try {
          await runQuery(
            `INSERT INTO user_activities (user_id, activity_type, resource_type, description, ip_address, user_agent, session_id)
             VALUES (?, 'login', 'auth', ?, ?, ?, ?)`,
            [
              user.id,
              'Login successful',
              (req as any).ip,
              req.get('User-Agent') || null,
              null
            ]
          );
        } catch {}
      }
      
      // Send admin login notification email if user is admin
      if (user.role === 'admin' || user.role === 'super_admin') {
        try {
          const loginInfo = extractLoginInfo(req);
          await emailService.sendAdminLoginNotification({
            adminName: `${user.first_name} ${user.last_name}`,
            email: user.email,
            ipAddress: loginInfo.ipAddress,
            location: loginInfo.location,
            userAgent: loginInfo.userAgent,
            loginTime: loginInfo.loginTime,
            deviceInfo: loginInfo.deviceInfo
          });
          console.log('Admin login notification sent to:', user.email);
        } catch (emailError) {
          console.error('Failed to send admin login notification:', emailError);
          // Don't fail the login if email fails
        }
      }
      
      // Generate token
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Return user data (without password)
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
      
      res.json({
        message: 'Login successful',
        token,
        refresh_token: refreshToken,
        user: userData,
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Register endpoint - send welcome email only; verification code will be sent upon first purchase
  static async register(req: Request, res: Response) {
    try {
      await ensureKycSchema();
      console.log('=== REGISTRATION PROCESS STARTED ===');
      console.log('Registration request body:', JSON.stringify(req.body, null, 2));
      
      const userData = registerSchema.parse(req.body);
      console.log('Parsed user data:', JSON.stringify(userData, null, 2));
      
      // Check if user already exists
      console.log('Checking if user already exists for email:', userData.email);
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser) {
        console.log('User already exists:', existingUser);
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      console.log('No existing user found');

      // Check if email exists in affiliates table
      console.log('Checking if email exists in affiliates table for:', userData.email);
      const existingAffiliate = await getAffiliateByEmail(userData.email);
      if (existingAffiliate) {
        console.log('Email already registered as affiliate:', existingAffiliate);
        return res.status(409).json({ error: 'Email already registered as affiliate' });
      }
      console.log('No existing affiliate found');

      const { executeQuery } = await import('../database/mysqlConfig.js');

      // Create user immediately with email_verified = false
      console.log('Creating user account...');
      const hashedPassword = hashPassword(userData.password);
      const userResult = await executeQuery(
        `INSERT INTO users (
          email, password_hash, first_name, last_name, company_name, role, 
          email_verified, status, account_type, referral_source, kyc_required, kyc_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, FALSE, 'active', ?, ?, 0, 'not_started', NOW(), NOW())`,
        [
          userData.email,
          hashedPassword,
          userData.first_name,
          userData.last_name,
          userData.company_name || null,
          userData.role || 'admin',
          'admin',
          (req.body?.affiliate_id || userData.referral_affiliate_id) ? 'product_link' : null
        ]
      );
      
      const userId = userResult.insertId;
      console.log('User created successfully with ID:', userId);
      syncAdminSignupToGhlInBackground({
        userId,
        email: userData.email,
        phone: req.body?.phone || req.body?.phone_number || null,
        firstName: userData.first_name,
        lastName: userData.last_name,
        companyName: userData.company_name || req.body?.company_name || null,
        role: userData.role || 'admin',
        registrationData: {
          ...req.body,
          user_id: userId,
          account_type: 'admin',
          referral_source: (req.body?.affiliate_id || userData.referral_affiliate_id) ? 'product_link' : null
        }
      });

      // If a referral affiliate ID was provided, create a pending referral record
      try {
        const providedAffiliateIdRaw = (req.body?.affiliate_id || userData.referral_affiliate_id || '').toString().trim();
        if (providedAffiliateIdRaw) {
          const affiliateId = parseInt(providedAffiliateIdRaw, 10);
          if (!Number.isNaN(affiliateId)) {
            console.log('Attempting to record affiliate referral on registration:', {
              affiliateId,
              userId,
              email: userData.email
            });

            // Validate that affiliate exists and is active
            const affiliateRows = await executeQuery(
              `SELECT id, status, plan_type, paid_referrals_count FROM affiliates WHERE id = ?`,
              [affiliateId]
            );

            if (affiliateRows && affiliateRows.length > 0 && affiliateRows[0].status !== 'suspended') {
              // Create a pending referral record (no commission yet)
              await executeQuery(
                `INSERT INTO affiliate_referrals (
                  affiliate_id, referred_user_id, commission_amount, commission_rate, status, referral_date
                ) VALUES (?, ?, 0, 0, 'pending', NOW())`,
                [affiliateId, userId]
              );

              // Increment affiliate's total_referrals
              await executeQuery(
                `UPDATE affiliates SET total_referrals = total_referrals + 1, updated_at = NOW() WHERE id = ?`,
                [affiliateId]
              );

              console.log('Referral recorded: affiliate', affiliateId, '-> user', userId);
            } else {
              console.warn('Affiliate not found or suspended; skipping referral record for affiliateId:', affiliateId);
            }
          } else {
            console.warn('Invalid affiliate ID provided; skipping referral record:', providedAffiliateIdRaw);
          }
        }
      } catch (referralError) {
        console.error('Failed to record affiliate referral during registration:', referralError);
        // Do not fail registration on referral errors
      }

      // Check if there is an active trial plan for the referred affiliate and apply it
      try {
        const providedAffiliateIdForTrial = (req.body?.affiliate_id || userData.referral_affiliate_id || '').toString().trim();
        if (providedAffiliateIdForTrial) {
          const affiliateIdForTrial = parseInt(providedAffiliateIdForTrial, 10);
          if (!Number.isNaN(affiliateIdForTrial)) {
            const trialPlanRows = await executeQuery<any[]>(
              `SELECT duration_months, max_clients, max_users FROM affiliates_trial_plans
               WHERE affiliate_id = ?
               AND (
                 (status = 'active' AND start_date IS NULL AND end_date IS NULL)
                 OR (status IN ('active', 'scheduled') AND start_date IS NOT NULL AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW()))
               )
               ORDER BY created_at DESC
               LIMIT 1`,
              [affiliateIdForTrial]
            );
            if (trialPlanRows && trialPlanRows.length > 0) {
              const { duration_months: durationMonths, max_clients: trialMaxClients, max_users: trialMaxUsers } = trialPlanRows[0];
              await executeQuery(
                `UPDATE users SET trial_expires_at = DATE_ADD(NOW(), INTERVAL ? MONTH), trial_max_clients = ?, trial_max_users = ? WHERE id = ?`,
                [durationMonths, trialMaxClients ?? null, trialMaxUsers ?? null, userId]
              );
              console.log(`Trial plan applied: user ${userId} gets ${durationMonths} month(s) trial (max_clients=${trialMaxClients}, max_users=${trialMaxUsers}) via affiliate ${affiliateIdForTrial}`);
            }
          }
        }
      } catch (trialError) {
        console.error('Failed to apply affiliate trial plan during registration:', trialError);
        // Do not fail registration on trial errors
      }

      // Generate JWT token for immediate login
      const token = generateToken({ 
        id: userId, 
        email: userData.email, 
        role: userData.role || 'admin',
        email_verified: false
      });

      // Update last login
      await updateUserLastLogin(userId);

      // Send welcome email only (no verification code at registration)
      console.log('Sending welcome email to:', userData.email);
      const { emailService } = await import('../services/emailService.js');
      let emailSent = false;
      try {
        emailSent = await emailService.sendWelcomeEmail({
          firstName: userData.first_name,
          email: userData.email,
          userType: (userData.role as 'admin' | 'affiliate' | 'client') || 'admin'
        });
        console.log('Welcome email sent result:', emailSent);
      } catch (emailError) {
        console.error('Failed to send welcome email to:', userData.email, emailError);
        // Don't fail registration if email fails - user is already created
      }

      console.log('=== REGISTRATION PROCESS COMPLETED SUCCESSFULLY ===');
      res.status(200).json({
        success: true,
        message: 'Registration successful! Welcome email sent. A verification code will be sent after your first purchase.',
        data: {
          token,
          user: {
            id: userId,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            company_name: userData.company_name,
            role: userData.role || 'admin',
            email_verified: false
          },
          emailSent: emailSent
        }
      });
    } catch (error) {
      console.error('=== REGISTRATION PROCESS FAILED ===');
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify email and complete registration
  static async verifyEmailAndRegister(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      console.log('🔍 Verification attempt:', { email, code });

      if (!email || !code) {
        console.log('❌ Missing email or code');
        return res.status(400).json({ 
          success: false, 
          message: 'Email and verification code are required' 
        });
      }

      // Import database connection
      const { executeQuery } = await import('../database/mysqlConfig.js');

      // Check if verification code is valid
      console.log('🔍 Checking verification code in database...');
      const verificationRows = await executeQuery(
        `SELECT *, 
         NOW() as current_db_time,
         DATE(expires_at) as expires_date,
         DATE(NOW()) as current_db_date,
         (DATE(expires_at) >= DATE(NOW())) as is_not_expired_by_date
         FROM email_verification_codes 
         WHERE email = ? AND code = ? AND type = 'admin_registration' 
         AND DATE(expires_at) >= DATE(NOW()) AND used = 0`,
        [email, code]
      );

      console.log('📊 Verification query result:', {
        found: verificationRows?.length || 0,
        data: verificationRows
      });

      if (!verificationRows || verificationRows.length === 0) {
        // Let's also check what codes exist for this email
        const allCodes = await executeQuery(
          `SELECT * FROM email_verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 5`,
          [email]
        );
        console.log('📋 All codes for this email:', allCodes);
        
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired verification code' 
        });
      }

      // Get pending registration data
      console.log('🔍 Checking pending registration data...');
      const pendingRows = await executeQuery(
        `SELECT * FROM pending_registrations WHERE email = ? AND DATE(expires_at) >= DATE(NOW())`,
        [email]
      );

      console.log('📊 Pending registration query result:', {
        found: pendingRows?.length || 0,
        data: pendingRows
      });

      if (!pendingRows || pendingRows.length === 0) {
        // Let's also check what pending registrations exist for this email
        const allPending = await executeQuery(
          `SELECT * FROM pending_registrations WHERE email = ?`,
          [email]
        );
        console.log('📋 All pending registrations for this email:', allPending);
        
        return res.status(400).json({ 
          success: false, 
          message: 'Registration data not found or expired' 
        });
      }

      const pendingData = pendingRows[0];
      console.log('✅ Found valid verification code and pending registration');

      // Create user using basic user creation (skip subscription and affiliate creation)
      console.log('👤 Creating user with data:', {
        email: pendingData.email,
        first_name: pendingData.first_name,
        last_name: pendingData.last_name,
        role: pendingData.role
      });
      
      // Create user without subscription or affiliate setup - they'll handle this in dashboard
      const hashedPassword = pendingData.password_hash; // Already hashed
      
      const result = await executeQuery(`
        INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, kyc_required, kyc_status)
        VALUES (?, ?, ?, ?, ?, ?, 0, 'not_started')
      `, [
        pendingData.email,
        hashedPassword,
        pendingData.first_name,
        pendingData.last_name,
        pendingData.company_name || null,
        pendingData.role || 'admin'
      ]);
      
      // Get the created user
      const insertedId = result.insertId;
      const newUser = await getUserById(insertedId);
      syncAdminSignupToGhlInBackground({
        userId: newUser.id,
        email: newUser.email,
        phone: pendingData.phone || null,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        companyName: newUser.company_name || null,
        role: newUser.role || 'admin',
        registrationData: {
          pending_registration_id: pendingData.id || null,
          email: pendingData.email,
          first_name: pendingData.first_name,
          last_name: pendingData.last_name,
          company_name: pendingData.company_name || null,
          role: pendingData.role || 'admin',
          verified_at: new Date().toISOString()
        }
      });

      console.log('✅ User created successfully:', { id: newUser.id, email: newUser.email });
      console.log('💡 User will set up subscription and affiliate profile in dashboard after payment');

      // Mark verification code as used
      console.log('🔄 Marking verification code as used...');
      await executeQuery(
        `UPDATE email_verification_codes 
         SET used = TRUE, used_at = NOW() 
         WHERE email = ? AND code = ? AND type = 'admin_registration'`,
        [email, code]
      );

      // Remove pending registration
      console.log('🗑️ Removing pending registration...');
      await executeQuery(
        `DELETE FROM pending_registrations WHERE email = ?`,
        [email]
      );

      // Send welcome email after successful registration
      try {
        await emailService.sendWelcomeEmail({
          firstName: newUser.first_name,
          email: newUser.email,
          userType: (newUser.role as 'admin' | 'affiliate' | 'client') || 'admin'
        });
        console.log('✅ Welcome email sent to:', newUser.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send welcome email:', emailError);
        // Don't fail the registration if welcome email fails
      }

      // Generate JWT token
      console.log('🔑 Generating JWT token...');
      const token = generateToken(newUser);

      console.log('🎉 Registration completed successfully for:', email);
      res.json({
        success: true,
        message: 'Registration completed successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          company_name: newUser.company_name,
          role: newUser.role
        }
      });

    } catch (error) {
      console.error('💥 Email verification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Get current user profile
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      // Check if user is an affiliate
      if (req.user!.role === 'affiliate') {
        const affiliate = await getAffiliateByEmail(req.user!.email);
        if (!affiliate) {
          return res.status(404).json({ error: 'Affiliate not found' });
        }
        
        const affiliateData = {
          id: affiliate.id,
          email: affiliate.email,
          first_name: affiliate.first_name,
          last_name: affiliate.last_name,
          company_name: affiliate.company_name,
          phone: affiliate.phone,
          address: affiliate.address,
          city: affiliate.city,
          state: affiliate.state,
          zip_code: affiliate.zip_code,
          role: 'affiliate',
          avatar: affiliate.avatar,
          admin_id: affiliate.admin_id,
          plan_type: affiliate.plan_type,
          commission_rate: affiliate.commission_rate,
          total_earnings: affiliate.total_earnings,
          total_referrals: affiliate.total_referrals,
          status: affiliate.status,
          created_at: affiliate.created_at,
          last_login: affiliate.last_login,
          referral_slug: affiliate.referral_slug,
        };
        
        return res.json({ success: true, user: affiliateData });
      }
      
      // Check if user is a client
      if (req.user!.role === 'client') {
        const client = await getClientByPlatformEmail(req.user!.email);
        if (!client) {
          return res.status(404).json({ error: 'Client not found' });
        }
        const dobValue = client.date_of_birth;
        let dobFormatted: string | null = null;
        if (dobValue) {
          try {
            const d = new Date(dobValue);
            if (!isNaN(d.getTime())) {
              dobFormatted = d.toISOString().slice(0, 10);
            } else {
              const s = String(dobValue);
              dobFormatted = s.length >= 10 ? s.slice(0, 10) : s;
            }
          } catch {
            const s = String(dobValue);
            dobFormatted = s.length >= 10 ? s.slice(0, 10) : s;
          }
        }
        
        const clientData = {
          id: client.id,
          email: client.platform_email,
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          zip_code: client.zip_code,
          date_of_birth: dobFormatted,
          role: 'client',
          status: client.status,
          created_at: client.created_at,
          last_login: client.last_login,
        };
        
        return res.json({ success: true, user: clientData });
      }
      
      // Handle regular users (admin, super_admin, support, etc.)
      // Use user ID instead of email to avoid issues when email is changed
      const user = await getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        credit_repair_url: user.credit_repair_url || null,
        onboarding_slug: user.onboarding_slug || null,
        intake_redirect_url: user.intake_redirect_url || null,
        intake_logo_url: user.intake_logo_url || null,
        intake_primary_color: user.intake_primary_color || null,
        intake_company_name: user.intake_company_name || null,
        intake_website_url: user.intake_website_url || null,
        intake_email: user.intake_email || null,
        intake_phone_number: user.intake_phone_number || null,
        funding_override_enabled: user.funding_override_enabled ? true : false,
        funding_override_signature_text: user.funding_override_signature_text || null,
        funding_override_signed_at: user.funding_override_signed_at || null,
        notify_client_after_report_pull: user.notify_client_after_report_pull !== false
          && Number(user.notify_client_after_report_pull ?? 1) !== 0,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        zip_code: user.zip_code,
        role: user.role,
        avatar: user.avatar,
        email_verified: user.email_verified,
        kyc_required: !!user.kyc_required,
        kyc_status: user.kyc_status || 'not_started',
        created_at: user.created_at,
        last_login: user.last_login,
      };

      // Attach admin profile permissions for admin and super_admin users
      if (['admin', 'super_admin'].includes(user.role)) {
        try {
          const adminProfile = await getQuery(
            'SELECT permissions FROM admin_profiles WHERE user_id = ? LIMIT 1',
            [user.id]
          );

          let parsedPermissions: string[] = [];
          if (adminProfile && adminProfile.permissions !== undefined) {
            try {
              const raw = adminProfile.permissions;
              if (typeof raw === 'string') {
                const val = JSON.parse(raw);
                if (Array.isArray(val)) parsedPermissions = val;
                else if (val && Array.isArray(val.permissions)) parsedPermissions = val.permissions;
              } else if (raw && typeof raw === 'object') {
                if (Array.isArray(raw)) parsedPermissions = raw as any;
                else if (Array.isArray(raw.permissions)) parsedPermissions = raw.permissions;
              }
            } catch (permErr) {
              console.warn('Failed to parse admin permissions JSON for profile:', permErr);
            }
          }

          (userData as any).permissions = parsedPermissions;
          (userData as any).is_subscription_exempt = Array.isArray(parsedPermissions) && (
            parsedPermissions.includes('subscription_exempt') || parsedPermissions.includes('no_subscription_required')
          );

          const portalAccess = await getScoreMachinePortalAccessStatus(user.id);
          (userData as any).admin_portal_mode = portalAccess.portalMode;
          (userData as any).has_score_machine_basic_access = portalAccess.hasBasicAccess;
          (userData as any).has_score_machine_elite_access = portalAccess.hasEliteAccess;
          (userData as any).has_direct_score_machine_basic_permission = portalAccess.hasDirectBasicPermission;
          (userData as any).has_direct_score_machine_elite_permission = portalAccess.hasDirectElitePermission;
          (userData as any).has_plan_score_machine_basic_access = portalAccess.hasPlanBasicAccess;
          (userData as any).has_plan_score_machine_elite_access = portalAccess.hasPlanEliteAccess;
        } catch (profileErr) {
          console.warn('Admin profile not found or permissions unavailable:', profileErr);
          (userData as any).permissions = [];
          (userData as any).is_subscription_exempt = false;
          (userData as any).admin_portal_mode = 'standard';
          (userData as any).has_score_machine_basic_access = false;
          (userData as any).has_score_machine_elite_access = false;
          (userData as any).has_direct_score_machine_basic_permission = false;
          (userData as any).has_direct_score_machine_elite_permission = false;
          (userData as any).has_plan_score_machine_basic_access = false;
          (userData as any).has_plan_score_machine_elite_access = false;
        }
      }

      // Include NMI gateway fields for privileged roles only
      if (['admin', 'super_admin', 'funding_manager'].includes(user.role)) {
        (userData as any).nmi_test_mode = !!user.nmi_test_mode;
        (userData as any).nmi_gateway_logo = user.nmi_gateway_logo || null;
        // Intentionally avoid returning sensitive credentials by default
        // If needed later, we can gate-return merchant_id/public_key/api_key/username/password
      }

      res.json({ success: true, user: userData });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user profile
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const profileUpdates = updateProfileSchema.parse(req.body);

      if (profileUpdates.funding_override_enabled === true) {
        const signatureText = (profileUpdates as any).funding_override_signature_text;
        if (!signatureText || !String(signatureText).trim()) {
          return res.status(400).json({ error: 'Signature is required to enable funding override' });
        }
        (profileUpdates as any).funding_override_signature_text = String(signatureText).trim();
        (profileUpdates as any).funding_override_signed_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

      const allowedFields = [
        'first_name', 'last_name', 'email', 'company_name', 'phone', 'address', 'city', 'state', 'zip_code',
        'credit_repair_url', 'onboarding_slug', 'intake_redirect_url', 'intake_logo_url', 'intake_primary_color',
        'intake_company_name', 'intake_website_url', 'intake_email', 'intake_phone_number',
        'nmi_merchant_id', 'nmi_public_key', 'nmi_api_key', 'nmi_username', 'nmi_password', 'nmi_test_mode', 'nmi_gateway_logo',
        'notify_client_after_report_pull',
        'funding_override_enabled', 'funding_override_signature_text', 'funding_override_signed_at'
      ];

      const filteredUpdateData = Object.entries(profileUpdates).filter(([key]) => allowedFields.includes(key));

      if (filteredUpdateData.length > 0) {
        const queryParts = filteredUpdateData.map(([key]) => `${key} = ?`);
        const queryValues = filteredUpdateData.map(([, value]) => value);

        await runQuery(
          `UPDATE users SET ${queryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [...queryValues, req.user!.id]
        );
      }

      const updatedUser = await getUserById(req.user!.id);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found after update' });
      }

      const userData = {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        company_name: updatedUser.company_name,
        credit_repair_url: updatedUser.credit_repair_url,
        onboarding_slug: updatedUser.onboarding_slug || null,
        intake_redirect_url: updatedUser.intake_redirect_url || null,
        intake_logo_url: updatedUser.intake_logo_url || null,
        intake_primary_color: updatedUser.intake_primary_color || null,
        intake_company_name: updatedUser.intake_company_name || null,
        intake_website_url: updatedUser.intake_website_url || null,
        intake_email: updatedUser.intake_email || null,
        intake_phone_number: updatedUser.intake_phone_number || null,
        funding_override_enabled: updatedUser.funding_override_enabled ? true : false,
        funding_override_signature_text: updatedUser.funding_override_signature_text || null,
        funding_override_signed_at: updatedUser.funding_override_signed_at || null,
        notify_client_after_report_pull: updatedUser.notify_client_after_report_pull !== false
          && Number(updatedUser.notify_client_after_report_pull ?? 1) !== 0,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        zip_code: updatedUser.zip_code,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: userData,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if ((error as any)?.code === 'ER_DUP_ENTRY' && String((error as any)?.message || '').includes('uniq_onboarding_slug')) {
        return res.status(409).json({ error: 'Onboarding slug is already in use' });
      }
      if ((error as any)?.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Onboarding slug is already in use' });
      }
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify token endpoint
  static verifyToken(req: AuthRequest, res: Response) {
    // If we reach here, the token is valid (middleware already verified it)
    res.json({ 
      valid: true, 
      user: req.user 
    });
  }

  // Logout endpoint (mainly for clearing client-side token)
  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : '';
      if (token) {
        try {
          const decoded: any = verifyTokenHelper(token);
          if (decoded && (decoded.role === 'admin' || decoded.role === 'super_admin')) {
            await runQuery(
              `INSERT INTO user_activities (user_id, activity_type, resource_type, description, ip_address, user_agent, session_id)
               VALUES (?, 'logout', 'auth', ?, ?, ?, ?)`,
              [
                decoded.id,
                'Logout successful',
                (req as any).ip,
                req.get('User-Agent') || null,
                null
              ]
            );
          }
        } catch {}
      }
    } catch {}
    res.json({ message: 'Logged out successfully' });
  }

  // Forgot password - send verification code
  static async forgotPassword(req: Request, res: Response) {
    try {
      console.log('🔐 Forgot password request received:', req.body);
      const { email } = req.body;
      
      if (!email) {
        console.log('❌ No email provided');
        return res.status(400).json({ error: 'Email is required' });
      }

      console.log('🔍 Looking for user with email:', email);
      // Check if user exists
      const user = await getUserByEmail(email);
      if (!user) {
        console.log('❌ User not found for email:', email);
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If the email exists, a verification code has been sent.' });
      }

      console.log('✅ User found:', { id: user.id, email: user.email, first_name: user.first_name });

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔢 Generated verification code:', verificationCode);
      
      // Store verification code in database with expiration (24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      console.log('⏰ Code expires at:', expiresAt.toISOString());
      
      console.log('💾 Storing verification code in database...');
      await runQuery(
        `INSERT INTO password_reset_codes (user_id, code, expires_at, used) 
         VALUES (?, ?, ?, FALSE) 
         ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), used = FALSE, created_at = CURRENT_TIMESTAMP`,
        [user.id, verificationCode, expiresAt]
      );
      console.log('✅ Verification code stored successfully');

      // Send verification code via email
      console.log('📧 Sending password reset email...');
      const emailSent = await emailService.sendPasswordResetCode(email, verificationCode, user.first_name);
      console.log('📧 Email send result:', emailSent);

      res.json({ message: 'If the email exists, a verification code has been sent.' });
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify reset code
  static async verifyResetCode(req: Request, res: Response) {
    try {
      console.log('🔍 Verify reset code request:', req.body);
      const { email, code } = req.body;
      
      if (!email || !code) {
        console.log('❌ Missing email or code');
        return res.status(400).json({ error: 'Email and verification code are required' });
      }

      console.log('🔍 Looking for user with email:', email);
      // Get user by email
      const user = await getUserByEmail(email);
      if (!user) {
        console.log('❌ User not found for email:', email);
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      console.log('✅ User found:', { id: user.id, email: user.email });

      // Check if code exists and is not expired (using DATE comparison like registration)
      console.log('🔍 Checking reset code in database...');
      const resetCode = await getQuery(
        `SELECT *, 
         NOW() as current_db_time,
         DATE(expires_at) as expires_date,
         DATE(NOW()) as current_db_date,
         (DATE(expires_at) >= DATE(NOW())) as is_not_expired_by_date
         FROM password_reset_codes 
         WHERE user_id = ? AND code = ? AND DATE(expires_at) >= DATE(NOW()) AND used = FALSE`,
        [user.id, code]
      );

      console.log('📊 Reset code query result:', {
        found: resetCode ? 'YES' : 'NO',
        data: resetCode
      });

      if (!resetCode) {
        console.log('❌ Invalid or expired verification code');
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      console.log('✅ Reset code is valid');

      // Generate a temporary token for password reset
      const resetToken = jwt.sign(
        { userId: user.id, codeId: resetCode.id },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      console.log('🎫 Generated reset token');

      res.json({ 
        message: 'Code verified successfully',
        resetToken: resetToken
      });
    } catch (error) {
      console.error('❌ Verify reset code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response) {
    try {
      const { resetToken, newPassword } = req.body;
      
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: 'Reset token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET) as any;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Mark the code as used
      await runQuery(
        `UPDATE password_reset_codes SET used = TRUE WHERE id = ?`,
        [decoded.codeId]
      );

      // Hash new password and update user
      const hashedPassword = hashPassword(newPassword);
      await runQuery(
        `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [hashedPassword, decoded.userId]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Affiliate Forgot password - send verification code
  static async affiliateForgotPassword(req: Request, res: Response) {
    try {
      console.log('🔐 Affiliate forgot password request received:', req.body);
      const { email } = req.body;
      
      if (!email) {
        console.log('❌ No email provided');
        return res.status(400).json({ error: 'Email is required' });
      }

      console.log('🔍 Looking for affiliate with email:', email);
      // Check if affiliate exists
      const affiliate = await getAffiliateByEmail(email);
      if (!affiliate) {
        console.log('❌ Affiliate not found for email:', email);
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If the email exists, a verification code has been sent.' });
      }

      console.log('✅ Affiliate found:', { id: affiliate.id, email: affiliate.email, first_name: affiliate.first_name });

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔢 Generated verification code:', verificationCode);
      
      // Store verification code in database with expiration (24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      console.log('⏰ Code expires at:', expiresAt.toISOString());
      
      console.log('💾 Storing verification code in database...');
      await runQuery(
        `INSERT INTO affiliate_password_reset_codes (affiliate_id, code, expires_at, used) 
         VALUES (?, ?, ?, FALSE) 
         ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), used = FALSE, created_at = CURRENT_TIMESTAMP`,
        [affiliate.id, verificationCode, expiresAt]
      );
      console.log('✅ Verification code stored successfully');

      // Send verification code via email
      console.log('📧 Sending password reset email...');
      const emailSent = await emailService.sendPasswordResetCode(email, verificationCode, affiliate.first_name);
      console.log('📧 Email send result:', emailSent);

      res.json({ message: 'If the email exists, a verification code has been sent.' });
    } catch (error) {
      console.error('❌ Affiliate forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Affiliate Verify reset code
  static async affiliateVerifyResetCode(req: Request, res: Response) {
    try {
      console.log('🔍 Affiliate verify reset code request:', req.body);
      const { email, code } = req.body;
      
      if (!email || !code) {
        console.log('❌ Missing email or code');
        return res.status(400).json({ error: 'Email and verification code are required' });
      }

      console.log('🔍 Looking for affiliate with email:', email);
      // Get affiliate by email
      const affiliate = await getAffiliateByEmail(email);
      if (!affiliate) {
        console.log('❌ Affiliate not found for email:', email);
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      console.log('✅ Affiliate found:', { id: affiliate.id, email: affiliate.email });

      // Check if code exists and is not expired (using DATE comparison like registration)
      console.log('🔍 Checking reset code in database...');
      const resetCode = await getQuery(
        `SELECT *, 
         NOW() as current_db_time,
         DATE(expires_at) as expires_date,
         DATE(NOW()) as current_db_date,
         (DATE(expires_at) >= DATE(NOW())) as is_not_expired_by_date
         FROM affiliate_password_reset_codes 
         WHERE affiliate_id = ? AND code = ? AND DATE(expires_at) >= DATE(NOW()) AND used = FALSE`,
        [affiliate.id, code]
      );

      console.log('📊 Reset code query result:', {
        found: resetCode ? 'YES' : 'NO',
        data: resetCode
      });

      if (!resetCode) {
        console.log('❌ Invalid or expired verification code');
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      console.log('✅ Reset code is valid');

      // Generate a temporary token for password reset
      const resetToken = jwt.sign(
        { affiliateId: affiliate.id, codeId: resetCode.id },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      console.log('🎫 Generated reset token');

      res.json({ 
        message: 'Code verified successfully',
        resetToken: resetToken
      });
    } catch (error) {
      console.error('❌ Affiliate verify reset code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Affiliate Reset password
  static async affiliateResetPassword(req: Request, res: Response) {
    try {
      const { resetToken, newPassword } = req.body;
      
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: 'Reset token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET) as any;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Mark the code as used
      await runQuery(
        `UPDATE affiliate_password_reset_codes SET used = TRUE WHERE id = ?`,
        [decoded.codeId]
      );

      // Hash new password and update affiliate
      const hashedPassword = hashPassword(newPassword);
      await runQuery(
        `UPDATE affiliates SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [hashedPassword, decoded.affiliateId]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Affiliate reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Client Login endpoint
  static async clientLogin(req: Request, res: Response) {
    try {
      console.log('Client login attempt for:', req.body.email);
      
      const { email, password } = loginSchema.parse(req.body);
      
      // Check if client exists using platform_email
      const client = await getClientByPlatformEmail(email);
      console.log('Client found:', client ? 'Yes' : 'No');
      
      if (!client) {
        return res.status(401).json({ error: 'Invalid client credentials' });
      }
      
      // Check if client is active and has paid status
      if (client.status !== 'active') {
        console.log('Access denied: Client status is', client.status, 'but active required');
        return res.status(401).json({ error: 'Client account is not active' });
      }
      
      // Check if client has paid status (if payment_status column exists)
      if (client.payment_status && client.payment_status === 'unpaid') {
        console.log('Access denied: Client payment status is unpaid');
        return res.status(401).json({ error: 'Client account payment is required. Please contact support.' });
      }
      
      // Verify password against platform_password (plain text comparison)
      console.log('Comparing password...');
      const passwordMatch = password === client.platform_password;
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid client credentials' });
      }
      
      // Update last login for client
      await runQuery('UPDATE clients SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [client.id]);
      
      // Generate token with client role - create a user-like object for token generation
      const tokenUser = {
        id: client.id,
        email: client.platform_email,
        role: 'client'
      };
      const token = generateToken(tokenUser);
      const refreshToken = generateRefreshToken(tokenUser);
      
      // Return client data (without password)
      const userData = {
        id: client.id,
        email: client.platform_email,
        first_name: client.first_name,
        last_name: client.last_name,
        phone: client.phone,
        role: 'client',
        last_login: new Date().toISOString(),
      };
      
      console.log('Client login successful for:', email);
      
      res.json({
        success: true,
        message: 'Client login successful',
        token,
        refresh_token: refreshToken,
        user: userData,
      });
    } catch (error) {
      console.error('Client login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const headerToken = req.headers['x-refresh-token'] as string | undefined;
      const bodyToken = (req.body && (req.body as any).refresh_token) as string | undefined;
      const refreshToken = headerToken || bodyToken;
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }
      const decoded = verifyRefreshToken(refreshToken);
      const userId = decoded.id || decoded.userId;
      const email = decoded.email;
      const role = decoded.role;
      if (!userId || !email || !role) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }
      const accessToken = generateToken({ id: userId, email, role });
      return res.json({ token: accessToken });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token expired' });
      }
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  // Verify email for already registered user
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      console.log('🔍 Email verification attempt:', { email, code });

      if (!email || !code) {
        console.log('❌ Missing email or code');
        return res.status(400).json({ 
          success: false, 
          message: 'Email and verification code are required' 
        });
      }

      const { executeQuery } = await import('../database/mysqlConfig.js');

      // Check if verification code is valid
      console.log('🔍 Checking verification code in database...');
      const verificationRows = await executeQuery(
        `SELECT * FROM email_verification_codes 
         WHERE email = ? AND code = ? AND type = 'admin_registration' 
         AND expires_at > NOW() AND used = 0`,
        [email, code]
      );

      if (!verificationRows || verificationRows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired verification code' 
        });
      }

      // Mark verification code as used
      await executeQuery(
        `UPDATE email_verification_codes SET used = 1, used_at = NOW() WHERE id = ?`,
        [verificationRows[0].id]
      );

      // Update user's email_verified status
      await executeQuery(
        `UPDATE users SET email_verified = TRUE WHERE email = ?`,
        [email]
      );

      console.log('✅ Email verified successfully for:', email);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully!'
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Change email address and send new verification code
  static async changeEmail(req: Request, res: Response) {
    try {
      const { oldEmail, newEmail } = req.body;
      console.log('📧 Email change request:', { oldEmail, newEmail });

      if (!oldEmail || !newEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Both old and new email addresses are required' 
        });
      }

      if (oldEmail === newEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'New email must be different from current email' 
        });
      }

      const { executeQuery } = await import('../database/mysqlConfig.js');

      // Check if old email exists and belongs to a user
      const userRows = await executeQuery(
        `SELECT * FROM users WHERE email = ?`,
        [oldEmail]
      );

      if (!userRows || userRows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Check if new email is already taken
      const existingUser = await executeQuery(
        `SELECT * FROM users WHERE email = ?`,
        [newEmail]
      );

      if (existingUser && existingUser.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email address is already in use' 
        });
      }

      // Check if new email exists in affiliates table
      const existingAffiliate = await executeQuery(
        `SELECT * FROM affiliates WHERE email = ?`,
        [newEmail]
      );

      if (existingAffiliate && existingAffiliate.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email address is already registered as affiliate' 
        });
      }

      const user = userRows[0];

      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user's email and set email_verified to false
      await executeQuery(
        `UPDATE users SET email = ?, email_verified = FALSE WHERE email = ?`,
        [newEmail, oldEmail]
      );

      // Store new verification code (compute expires_at in SQL)
      await executeQuery(
        `INSERT INTO email_verification_codes (email, code, type, expires_at)
         VALUES (?, ?, 'admin_registration', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
        [newEmail, verificationCode]
      );

      // Send verification email to new address
      const { emailService } = await import('../services/emailService.js');
      const emailSent = await emailService.sendVerificationCode(newEmail, verificationCode, user.first_name);

      if (!emailSent) {
        // Rollback email change if email fails
        await executeQuery(
          `UPDATE users SET email = ?, email_verified = ? WHERE email = ?`,
          [oldEmail, user.email_verified, newEmail]
        );
        
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send verification email. Email change cancelled.' 
        });
      }

      console.log('✅ Email changed successfully from', oldEmail, 'to', newEmail);

      res.status(200).json({
        success: true,
        message: 'Email address updated successfully. Please verify your new email address.',
        data: {
          newEmail,
          emailSent: true
        }
      });
    } catch (error) {
      console.error('Email change error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  // Resend verification code
  static async resendVerificationCode(req: Request, res: Response) {
    try {
      const { email } = req.body;
      console.log('📧 Resend verification code request for:', email);

      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email address is required' 
        });
      }

      const { executeQuery } = await import('../database/mysqlConfig.js');

      // Check if user exists
      const userRows = await executeQuery(
        `SELECT * FROM users WHERE email = ?`,
        [email]
      );

      if (!userRows || userRows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const user = userRows[0];

      if (user.email_verified) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already verified' 
        });
      }

      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Store new verification code (compute expires_at in SQL)
      await executeQuery(
        `INSERT INTO email_verification_codes (email, code, type, expires_at)
         VALUES (?, ?, 'admin_registration', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
        [email, verificationCode]
      );

      // Send verification email
      const { emailService } = await import('../services/emailService.js');
      const emailSent = await emailService.sendVerificationCode(email, verificationCode, user.first_name);

      if (!emailSent) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send verification email. Please try again.' 
        });
      }

      console.log('✅ Verification code resent successfully to:', email);

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully!',
        data: {
          emailSent: true
        }
      });
    } catch (error) {
      console.error('Resend verification code error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
}
