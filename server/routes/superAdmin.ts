import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { SubscriptionPlan, AdminProfile, AdminSubscription, UserActivity, SystemSettings, AdminNotification } from '../database/superAdminSchema.js';
import { getWebSocketService } from '../services/websocketService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { validateClientQuota, checkUserPlanLimits } from '../utils/planValidation.js';
import { PLATFORMS } from '../services/scrapers/index.js';
import { AdminNotificationService } from '../services/adminNotificationService';
import {
  extractTaskUploadUrls,
  normalizeRejectionReason,
  normalizeTaskRecord,
  normalizeTaskRows,
  parseTaskAttachmentUrls,
  taskPriorityValues,
  taskStatusValues,
  taskUploadFields,
} from './taskRouteUtils.js';
import {
  ensureBusinessDirectoriesTable,
  getBusinessDirectoryById,
  listBusinessDirectories,
} from '../utils/businessDirectories.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const shopStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/shop');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'shop-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const shopUpload = multer({
  storage: shopStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg','image/jpg','image/png','image/gif','image/webp',
      'video/mp4','video/quicktime','video/x-msvideo','video/x-matroska',
      'application/pdf','application/zip'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const affiliateCommissionSettingsSchema = z.object({
  level2_rate_free: z.coerce.number().min(0).max(100),
  level2_rate_paid: z.coerce.number().min(0).max(100)
});

const OPEN_AI_CONFIGURATION_SETTING_KEY = 'ai.openai_coach_configuration';

const openAiConfigurationSchema = z.object({
  template: z.string().max(50000)
});

const businessDirectorySchema = z.object({
  business_name: z.string().trim().min(1).max(255),
  business_email: z.string().trim().email().max(255),
  business_phone_number: z.string().trim().min(1).max(50),
  business_address: z.string().trim().min(1).max(1000),
});

const businessDirectoryLogoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/business-directories');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'business-directory-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const businessDirectoryLogoUpload = multer({
  storage: businessDirectoryLogoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Invalid logo file type'));
  },
});

async function getAffiliateCommissionSettings(db: any): Promise<{ level2_rate_free: number; level2_rate_paid: number }> {
  const defaults = { level2_rate_free: 2, level2_rate_paid: 5 };
  try {
    const rows = await db.allQuery(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?, ?)`,
      [
        'affiliate.commission_level2_rate_free',
        'affiliate.commission_level2_rate_paid',
        'affiliate.commission_level2_rate'
      ]
    );
    const byKey = new Map<string, string>();
    for (const row of rows || []) {
      if (row?.setting_key && typeof row.setting_value !== 'undefined') {
        byKey.set(row.setting_key, String(row.setting_value));
      }
    }
    const fallbackLevel2 = byKey.has('affiliate.commission_level2_rate') ? Number(byKey.get('affiliate.commission_level2_rate')) : undefined;
    const level2_rate_free = byKey.has('affiliate.commission_level2_rate_free')
      ? Number(byKey.get('affiliate.commission_level2_rate_free'))
      : (typeof fallbackLevel2 === 'number' ? fallbackLevel2 : defaults.level2_rate_free);
    const level2_rate_paid = byKey.has('affiliate.commission_level2_rate_paid')
      ? Number(byKey.get('affiliate.commission_level2_rate_paid'))
      : (typeof fallbackLevel2 === 'number' ? fallbackLevel2 : defaults.level2_rate_paid);
    return {
      level2_rate_free: Number.isFinite(level2_rate_free) ? level2_rate_free : defaults.level2_rate_free,
      level2_rate_paid: Number.isFinite(level2_rate_paid) ? level2_rate_paid : defaults.level2_rate_paid
    };
  } catch {
    return defaults;
  }
}

async function upsertAffiliateCommissionSettings(
  db: any,
  userId: number,
  settings: { level2_rate_free: number; level2_rate_paid: number }
): Promise<void> {
  const rows = [
    {
      key: 'affiliate.commission_level2_rate_free',
      value: String(settings.level2_rate_free),
      description: 'Affiliate level 2 commission rate (%) for FREE affiliates'
    },
    {
      key: 'affiliate.commission_level2_rate_paid',
      value: String(settings.level2_rate_paid),
      description: 'Affiliate level 2 commission rate (%) for PAID affiliates'
    },
  ];
  const dbType = db.getType();
  if (dbType === 'sqlite') {
    for (const row of rows) {
      await db.executeQuery(
        `INSERT INTO system_settings 
         (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
         VALUES (?, ?, 'number', 'billing', ?, 0, ?)
         ON CONFLICT(setting_key) DO UPDATE SET
           setting_value = excluded.setting_value,
           setting_type = excluded.setting_type,
           category = excluded.category,
           description = excluded.description,
           is_public = excluded.is_public,
           updated_by = excluded.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [row.key, row.value, row.description, userId]
      );
    }
    return;
  }
  await db.executeQuery(
    `INSERT INTO system_settings 
     (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
     VALUES (?, ?, 'number', 'billing', ?, 0, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       setting_type = VALUES(setting_type),
       category = VALUES(category),
       description = VALUES(description),
       is_public = VALUES(is_public),
       updated_by = VALUES(updated_by),
       updated_at = NOW()`,
    [rows[0].key, rows[0].value, rows[0].description, userId]
  );
  await db.executeQuery(
    `INSERT INTO system_settings 
     (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
     VALUES (?, ?, 'number', 'billing', ?, 0, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       setting_type = VALUES(setting_type),
       category = VALUES(category),
       description = VALUES(description),
       is_public = VALUES(is_public),
       updated_by = VALUES(updated_by),
       updated_at = NOW()`,
    [rows[1].key, rows[1].value, rows[1].description, userId]
  );
}

async function getOpenAiConfiguration(db: any): Promise<{ template: string }> {
  try {
    const rows = await db.executeQuery(
      'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
      [OPEN_AI_CONFIGURATION_SETTING_KEY]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return {
        template: String((rows[0] as any)?.setting_value || '')
      };
    }
  } catch {
    // Ignore read errors and fall back to an empty template.
  }

  return { template: '' };
}

async function upsertOpenAiConfiguration(db: any, userId: number, template: string): Promise<void> {
  const description = 'Template used to build the OpenAI prompt for AI Coach chats';
  const params = [OPEN_AI_CONFIGURATION_SETTING_KEY, String(template ?? ''), description, userId];

  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO system_settings
       (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
       VALUES (?, ?, 'string', 'features', ?, 0, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         setting_type = excluded.setting_type,
         category = excluded.category,
         description = excluded.description,
         is_public = excluded.is_public,
         updated_by = excluded.updated_by,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
    return;
  }

  await db.executeQuery(
    `INSERT INTO system_settings
     (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
     VALUES (?, ?, 'string', 'features', ?, 0, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       setting_type = VALUES(setting_type),
       category = VALUES(category),
       description = VALUES(description),
       is_public = VALUES(is_public),
       updated_by = VALUES(updated_by),
       updated_at = NOW()`,
    params
  );
}

// Middleware functions - must be defined before use
const requireSuperAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const db = getDatabaseAdapter();
    const user = await db.getQuery(
      "SELECT * FROM users WHERE id = ? AND (role = 'admin' OR role = 'super_admin')",
      [userId]
    );

    if (!user) {
      return res.status(403).json({ success: false, error: 'Super admin access required' });
    }

    // Create a mock admin profile for compatibility
    req.adminProfile = {
      id: user.id,
      user_id: user.id,
      access_level: 'super_admin',
      is_active: true
    };
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
};

// Middleware to check admin access (admin or above)
const requireAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const db = getDatabaseAdapter();
    const user = await db.getQuery(
      "SELECT * FROM users WHERE id = ? AND (role = 'admin' OR role = 'super_admin')",
      [userId]
    );

    if (!user) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Create a mock admin profile for compatibility
    req.adminProfile = {
      id: user.id,
      user_id: user.id,
      access_level: user.role === 'super_admin' ? 'super_admin' : 'admin',
      is_active: true
    };
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
};

// Validation schemas
const createPlanSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  price: z.coerce.number().min(0),
  billing_cycle: z.enum(['monthly', 'yearly', 'lifetime']),
  features: z.array(z.string()),
  page_permissions: z.union([
    z.array(z.string()),
    z.object({
      pages: z.array(z.string()).optional(),
      is_specific: z.boolean().optional(),
      allowed_admin_emails: z.array(z.string()).optional(),
      restricted_to_current_subscribers: z.boolean().optional(),
      allowed_affiliate_ids: z.array(z.number()).optional()
    })
  ]).optional(),
  is_specific: z.boolean().optional(),
  allowed_admin_emails: z.array(z.string()).optional(),
  restricted_to_current_subscribers: z.boolean().optional(),
  allowed_affiliate_ids: z.array(z.number()).optional(),
  assigned_courses: z.array(z.number()).optional(),
  trial_price_id: z.string().optional(),
  stripe_monthly_price_id: z.string().optional(),
  stripe_yearly_price_id: z.string().optional(),
  stripe_product_id: z.string().optional(),
  max_users: z.coerce.number().min(0).optional(),
  max_clients: z.coerce.number().min(0).optional(),
  max_disputes: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().default(0)
});

// Create new support user
router.post('/support-users', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password, department = 'Support', title = 'Support Agent' } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const db = getDatabaseAdapter();
    
    // Check if user already exists
    const existingUser = await db.getQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create support user
    const dbType = db.getType();
    let insertQuery, insertParams;
    
    if (dbType === 'mysql') {
      insertQuery = `INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, 'support', 'active', NOW(), NOW())`;
      insertParams = [first_name, last_name, email, hashedPassword];
    } else {
      insertQuery = `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, 'support', 1, datetime('now'), datetime('now'))`;
      insertParams = [first_name, last_name, email, hashedPassword];
    }

    const result = await db.executeQuery(insertQuery, insertParams);
    
    try {
      const titleMsg = 'Support User Added';
      const msg = `Support user ${email} added by ${(req as any)?.user?.email || 'system'} (IP: ${req.ip})`;
      await AdminNotificationService.broadcastToAllAdmins(
        titleMsg,
        msg,
        'success',
        'medium',
        '/admin/users',
        'View Users'
      );
    } catch (notifyErr) {
    }
    res.json({
      success: true,
      message: 'Support user created successfully',
      data: {
        id: result.lastID || result.insertId,
        first_name,
        last_name,
        email,
        role: 'support',
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error creating support user:', error);
    res.status(500).json({ success: false, error: 'Failed to create support user' });
  }
});

// Update support user
router.put('/support-users/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { first_name, last_name, email, department, title } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, error: 'First name, last name, and email are required' });
    }

    const db = getDatabaseAdapter();
    
    // Check if user exists and is a support user
    const existingUser = await db.getQuery('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Support user not found' });
    }
    
    if (existingUser.role !== 'support') {
      return res.status(400).json({ success: false, error: 'User is not a support user' });
    }

    // Check if email is already taken by another user
    const emailCheck = await db.getQuery('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (emailCheck) {
      return res.status(400).json({ success: false, error: 'Email is already taken by another user' });
    }

    // Update user
    const dbType = db.getType();
    let updateQuery;
    
    if (dbType === 'mysql') {
      updateQuery = `UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = NOW() WHERE id = ?`;
    } else {
      updateQuery = `UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = datetime('now') WHERE id = ?`;
    }

    await db.executeQuery(updateQuery, [first_name, last_name, email, userId]);
    
    res.json({
      success: true,
      message: 'Support user updated successfully',
      data: {
        id: userId,
        first_name,
        last_name,
        email,
        role: 'support'
      }
    });
  } catch (error) {
    console.error('Error updating support user:', error);
    res.status(500).json({ success: false, error: 'Failed to update support user' });
  }
});

// Change support user password
router.put('/support-users/:id/password', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const db = getDatabaseAdapter();
    
    // Check if user exists and is a support user
    const existingUser = await db.getQuery('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Support user not found' });
    }
    
    if (existingUser.role !== 'support') {
      return res.status(400).json({ success: false, error: 'User is not a support user' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    const dbType = db.getType();
    let updateQuery;
    
    if (dbType === 'mysql') {
      updateQuery = `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`;
    } else {
      updateQuery = `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`;
    }

    await db.executeQuery(updateQuery, [hashedPassword, userId]);
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// Delete support user
router.delete('/support-users/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const db = getDatabaseAdapter();
    
    // Check if user exists and is a support user
    const existingUser = await db.getQuery('SELECT id, role, email, first_name, last_name FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Support user not found' });
    }
    
    if (existingUser.role !== 'support') {
      return res.status(400).json({ success: false, error: 'User is not a support user' });
    }

    // Delete user
    await db.executeQuery('DELETE FROM users WHERE id = ?', [userId]);
    
    try {
      const titleMsg = 'Support User Deleted';
      const nameOrEmail = existingUser.email || `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() || `ID ${userId}`;
      const msg = `Support user ${nameOrEmail} deleted by ${(req as any)?.user?.email || 'system'} (IP: ${req.ip})`;
      await AdminNotificationService.broadcastToAllAdmins(
        titleMsg,
        msg,
        'warning',
        'medium',
        '/admin/users',
        'View Users'
      );
    } catch (notifyErr) {
    }
    res.json({
      success: true,
      message: 'Support user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting support user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete support user' });
  }
});

// Login as specific support user (for super admin)
router.post('/support-users/:id/login', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Login as support user endpoint called with ID:', req.params.id);
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request path:', req.path);
    console.log('🔍 Full URL:', req.url);
    
    const userId = parseInt(req.params.id);

    const db = getDatabaseAdapter();
    
    // Get the specific support user
    const supportUser = await db.getQuery('SELECT * FROM users WHERE id = ? AND role = "support"', [userId]);
    
    if (!supportUser) {
      console.log('❌ Support user not found for ID:', userId);
      return res.status(404).json({ error: 'Support user not found' });
    }

    // Check if user is active
    const dbType = db.getType();
    const isActive = dbType === 'mysql' ? supportUser.status === 'active' : supportUser.is_active === 1;
    
    if (!isActive) {
      console.log('❌ Support user account is deactivated for ID:', userId);
      return res.status(403).json({ error: 'Support user account is deactivated' });
    }

    // Generate token for the support user
    const token = jwt.sign(
      { 
        userId: supportUser.id, 
        email: supportUser.email, 
        role: supportUser.role 
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development',
      { expiresIn: '24h' }
    );

    // Update last login
    const updateQuery = dbType === 'mysql' 
      ? 'UPDATE users SET last_login = NOW() WHERE id = ?'
      : 'UPDATE users SET last_login = datetime("now") WHERE id = ?';
    
    await db.executeQuery(updateQuery, [supportUser.id]);

    // Return support user data (without password)
    const supportData = {
      id: supportUser.id,
      email: supportUser.email,
      first_name: supportUser.first_name,
      last_name: supportUser.last_name,
      role: supportUser.role,
      last_login: new Date().toISOString(),
    };

  console.log('✅ Login as support user successful for ID:', userId);
  res.json({
    message: 'Login as support user successful',
    token,
    user: supportData
  });
} catch (error) {
  console.error('❌ Error logging in as support user:', error);
  res.status(500).json({ error: 'Failed to login as support user' });
}
});

const updatePlanSchema = createPlanSchema.partial();

const createAdminProfileSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string(),
  permissions: z.array(z.string()),
  accessLevel: z.enum(['full', 'limited', 'read-only']),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional()
});

const updateAdminProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  accessLevel: z.enum(['full', 'limited', 'read-only']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional()
});

const parseAdminPermissions = (permissions: unknown): string[] => {
  if (Array.isArray(permissions)) {
    return permissions.filter((permission): permission is string => typeof permission === 'string');
  }

  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return parsed.filter((permission): permission is string => typeof permission === 'string');
      }

      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { permissions?: unknown }).permissions)) {
        return (parsed as { permissions: unknown[] }).permissions.filter((permission): permission is string => typeof permission === 'string');
      }
    } catch {
      return [];
    }
  }

  return [];
};

const mapAdminUiAccessLevelToDb = (accessLevel?: 'full' | 'limited' | 'read-only'): 'admin' | 'manager' | 'support' => {
  switch (accessLevel) {
    case 'limited':
      return 'manager';
    case 'read-only':
      return 'support';
    case 'full':
    default:
      return 'admin';
  }
};

const getWriteResultRowCount = (result: any): number => {
  const count = Number(result?.affectedRows ?? result?.changes ?? 0);
  return Number.isFinite(count) ? count : 0;
};



const createAdminSubscriptionSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  plan_id: z.coerce.number().int().positive(),
  plan_name: z.string().min(1).optional(),
  plan_type: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
  status: z
    .enum(['active', 'inactive', 'cancelled', 'expired', 'pending', 'canceled', 'past_due', 'unpaid', 'incomplete'])
    .default('pending'),
  current_period_start: z.coerce.date().optional(),
  current_period_end: z.coerce.date().optional(),
  cancel_at_period_end: z.coerce.boolean().optional(),
  stripe_subscription_id: z.string().optional(),
  stripe_customer_id: z.string().optional()
});

const updateAdminSubscriptionSchema = createAdminSubscriptionSchema.partial().omit({ user_id: true, plan_id: true });

const systemSettingSchema = z.object({
  setting_key: z.string().min(1).max(255),
  setting_value: z.string(),
  setting_type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category: z.enum(['general', 'security', 'billing', 'notifications', 'features']).default('general'),
  description: z.string().optional(),
  is_public: z.boolean().default(false)
});

// Routes start here

// SUBSCRIPTION PLANS ROUTES

// Get all subscription plans
router.get('/plans', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, is_active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const requesterRole = String((req as any)?.user?.role || '').toLowerCase();

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (sp.name LIKE ? OR sp.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (is_active !== undefined) {
      whereClause += ' AND sp.is_active = ?';
      params.push(is_active === 'true');
    } else if (requesterRole !== 'super_admin') {
      whereClause += ' AND sp.is_active = ?';
      params.push(true);
    }

    const db = getDatabaseAdapter();
    console.log('🔎 Building admin list query', { whereClause, paramsLength: params.length, page: Number(page), limit: Number(limit), offset });
    
    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM subscription_plans sp ${whereClause}`,
      params
    );

    // Get plans with pagination
    const safeLimit = Math.max(1, Math.min(100, Number(limit)));
    const safeOffset = Math.max(0, offset);
    const plans = await db.allQuery(
      `SELECT sp.*, u1.first_name as created_by_name, u1.last_name as created_by_lastname,
              u2.first_name as updated_by_name, u2.last_name as updated_by_lastname
       FROM subscription_plans sp
       LEFT JOIN users u1 ON sp.created_by = u1.id
       LEFT JOIN users u2 ON sp.updated_by = u2.id
       ${whereClause}
       ORDER BY sp.sort_order ASC, sp.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    // Parse features/page permissions and filter restricted plans for admin role
    const plansWithFeatures = await Promise.all(plans.map(async (plan) => {
      const assignedCourses = await db.allQuery(
        'SELECT course_id FROM plan_course_associations WHERE plan_id = ?',
        [plan.id]
      );
      const parsedFeatures = (() => {
        try {
          if (Array.isArray((plan as any).features)) return (plan as any).features;
          return plan.features ? JSON.parse(plan.features) : [];
        } catch {
          return [];
        }
      })();
      let parsedPerm: any = [];
      try {
        parsedPerm = plan.page_permissions ? JSON.parse(plan.page_permissions) : [];
      } catch {}
      const permPages = Array.isArray(parsedPerm) ? parsedPerm : Array.isArray(parsedPerm?.pages) ? parsedPerm.pages : [];
      const isSpecific = Array.isArray(parsedPerm) ? false : !!parsedPerm?.is_specific;
      const allowedEmails = Array.isArray(parsedPerm) ? [] : Array.isArray(parsedPerm?.allowed_admin_emails) ? parsedPerm.allowed_admin_emails : [];
      const restrictedToSubscribers = Array.isArray(parsedPerm) ? false : !!parsedPerm?.restricted_to_current_subscribers;
      const allowedAffiliateIdsRaw = Array.isArray(parsedPerm) ? [] : Array.isArray(parsedPerm?.allowed_affiliate_ids) ? parsedPerm.allowed_affiliate_ids : [];
      const allowedAffiliateIds = Array.isArray(allowedAffiliateIdsRaw)
        ? allowedAffiliateIdsRaw.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
        : [];
      return {
        ...plan,
        features: parsedFeatures,
        page_permissions: permPages,
        is_specific: isSpecific,
        allowed_admin_emails: allowedEmails,
        restricted_to_current_subscribers: restrictedToSubscribers,
        allowed_affiliate_ids: allowedAffiliateIds,
        assigned_courses: assignedCourses.map((row: any) => row.course_id)
      };
    }));

    const requesterEmail = String((req as any)?.user?.email || '');
    let activePlanIds: number[] = [];
    let viewerAffiliateId: number | null = null;
    let hasPlanHistory = false;
    if (requesterRole !== 'super_admin') {
      try {
        const db2 = getDatabaseAdapter();
        const userId = Number((req as any)?.user?.id);
        if (!isNaN(userId) && userId > 0) {
          try {
            const refRow: any = await db2.getQuery(
              `SELECT affiliate_id 
               FROM affiliate_referrals 
               WHERE referred_user_id = ? 
               ORDER BY created_at ASC 
               LIMIT 1`,
              [userId]
            );
            if (refRow && refRow.affiliate_id) {
              const parsed = Number(refRow.affiliate_id);
              if (!Number.isNaN(parsed)) viewerAffiliateId = parsed;
            }
          } catch {}
          const rows = await db2.allQuery(
            `SELECT asub.plan_id 
             FROM admin_subscriptions asub
             JOIN admin_profiles ap ON ap.id = asub.admin_id
             WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active'`,
            [userId]
          );
          const rowsDirect = await db2.allQuery(
            `SELECT plan_id FROM admin_subscriptions WHERE admin_id = ? AND LOWER(TRIM(status)) = 'active'`,
            [userId]
          );
          const rowsSubs = await db2.allQuery(
            `SELECT sp.id as plan_id
             FROM subscriptions s
             LEFT JOIN subscription_plans sp ON sp.name = s.plan_name
             WHERE s.user_id = ? AND LOWER(TRIM(s.status)) = 'active'`,
            [userId]
          );
          const historyRows = await db2.allQuery(
            `SELECT asub.id
             FROM admin_subscriptions asub
             JOIN admin_profiles ap ON ap.id = asub.admin_id
             WHERE ap.user_id = ?
             LIMIT 1`,
            [userId]
          );
          const historyRowsDirect = await db2.allQuery(
            `SELECT id FROM admin_subscriptions WHERE admin_id = ? LIMIT 1`,
            [userId]
          );
          const historyRowsSubs = await db2.allQuery(
            `SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1`,
            [userId]
          );
          const idsA = Array.isArray(rows) ? rows.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
          const idsB = Array.isArray(rowsDirect) ? rowsDirect.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
          const idsC = Array.isArray(rowsSubs) ? rowsSubs.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
          activePlanIds = Array.from(new Set([...idsA, ...idsB, ...idsC]));
          hasPlanHistory =
            (Array.isArray(historyRows) && historyRows.length > 0) ||
            (Array.isArray(historyRowsDirect) && historyRowsDirect.length > 0) ||
            (Array.isArray(historyRowsSubs) && historyRowsSubs.length > 0);
        }
      } catch {}
    }

    const hasAffiliateExclusiveVisibility =
      requesterRole !== 'super_admin' &&
      viewerAffiliateId !== null &&
      !hasPlanHistory &&
      plansWithFeatures.some((plan: any) =>
        Array.isArray(plan.allowed_affiliate_ids) && plan.allowed_affiliate_ids.includes(viewerAffiliateId)
      );

    const filteredPlans = requesterRole === 'super_admin'
      ? plansWithFeatures
      : plansWithFeatures.filter(p => {
          const planId = Number((p as any).id);
          const hasThisPlan = Number.isFinite(planId) && activePlanIds.includes(planId);
          if (hasThisPlan) return true;

          const allowedBySpecific =
            !p.is_specific || (p.allowed_admin_emails && p.allowed_admin_emails.includes(requesterEmail));
          const allowedBySubscriberRestriction = !p.restricted_to_current_subscribers;
          const planAllowedAffiliateIds = Array.isArray((p as any).allowed_affiliate_ids)
            ? (p as any).allowed_affiliate_ids
            : [];
          const allowedByAffiliateRestriction =
            planAllowedAffiliateIds.length === 0 ||
            (viewerAffiliateId !== null && planAllowedAffiliateIds.includes(viewerAffiliateId));

          if (hasAffiliateExclusiveVisibility) {
            return (
              allowedBySpecific &&
              allowedBySubscriberRestriction &&
              viewerAffiliateId !== null &&
              planAllowedAffiliateIds.includes(viewerAffiliateId)
            );
          }

          return allowedBySpecific && allowedBySubscriberRestriction && allowedByAffiliateRestriction;
        });

    res.json({
      success: true,
      data: filteredPlans,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: requesterRole === 'super_admin' ? (countResult?.total || 0) : filteredPlans.length,
        pages:
          requesterRole === 'super_admin'
            ? Math.ceil((countResult?.total || 0) / Number(limit))
            : Math.ceil(filteredPlans.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription plans' });
  }
});

// Get single subscription plan
router.get('/plans/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
    
    const db = getDatabaseAdapter();
    const plan = await db.getQuery(
      `SELECT sp.*, u1.first_name as created_by_name, u1.last_name as created_by_lastname,
              u2.first_name as updated_by_name, u2.last_name as updated_by_lastname
       FROM subscription_plans sp
       LEFT JOIN users u1 ON sp.created_by = u1.id
       LEFT JOIN users u2 ON sp.updated_by = u2.id
       WHERE sp.id = ?`,
      [planId]
    );

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Subscription plan not found' });
    }

    let permObj: any = [];
    try { permObj = plan.page_permissions ? JSON.parse(plan.page_permissions) : []; } catch {}
    const isRestricted = !Array.isArray(permObj) && !!permObj?.restricted_to_current_subscribers;
    if (isRestricted) {
      try {
        const userId = Number((req as any)?.user?.id);
        if (!isNaN(userId) && userId > 0) {
          let row = await db.getQuery(
            `SELECT asub.id 
             FROM admin_subscriptions asub
             JOIN admin_profiles ap ON ap.id = asub.admin_id
             WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active' 
             LIMIT 1`,
            [userId]
          );
          if (!row) {
            row = await db.getQuery(
              `SELECT id FROM admin_subscriptions WHERE admin_id = ? AND LOWER(TRIM(status)) = 'active' LIMIT 1`,
              [userId]
            );
          }
          if (!row) {
            const rowSub = await db.getQuery(
              `SELECT s.id 
               FROM subscriptions s
               WHERE s.user_id = ? AND LOWER(TRIM(s.status)) = 'active'
               LIMIT 1`,
              [userId]
            );
            if (rowSub) row = rowSub;
          }
          const hasAnyActiveSubscription = !!row;
          if (!hasAnyActiveSubscription) {
            return res.status(404).json({ success: false, error: 'Subscription plan not found' });
          }
        }
      } catch {}
    }

    res.json({
      success: true,
      data: {
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : [],
        page_permissions: plan.page_permissions ? JSON.parse(plan.page_permissions) : []
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription plan' });
  }
});

router.get('/shop/products', authenticateToken, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const products = await db.allQuery(
      `SELECT id, name, description, price, thumbnail_url, stripe_billing_link, created_at, updated_at FROM shop_products ORDER BY created_at DESC`
    );
    const result: any[] = [];
    for (const p of products) {
      const files = await db.allQuery(
        `SELECT id, url, type, source, created_at FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`,
        [p.id]
      );
      result.push({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        thumbnail_url: p.thumbnail_url || null,
        stripe_billing_link: p.stripe_billing_link || null,
        files: files.map((f: any) => ({
          id: f.id,
          url: f.url,
          type: f.type,
          source: f.source
        })),
        created_at: p.created_at,
        updated_at: p.updated_at
      });
    }
    res.json({ products: result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch products' });
  }
});

const shopFileSchema = z.object({
  url: z.string().min(1),
  type: z.enum(['image','video','pdf','zip','other']),
  source: z.enum(['upload','link'])
});

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number(),
  thumbnail_url: z.string().nullable().optional(),
  stripe_billing_link: z.string().url().nullish(),
  files: z.array(shopFileSchema).optional()
});

router.post('/shop/products', authenticateToken, requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const validated = createProductSchema.parse(req.body);
    const userId = req.user?.id || 1;
    const insertPrice = typeof validated.price === 'number' ? validated.price : 0;
    const insertDesc = typeof validated.description === 'string' ? validated.description : '';
    const insert = await db.executeQuery(
      `INSERT INTO shop_products (name, description, price, thumbnail_url, stripe_billing_link, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [validated.name, insertDesc, insertPrice, validated.thumbnail_url || null, validated.stripe_billing_link || null, userId, userId]
    );
    const productId = insert.insertId || insert.lastID;
    if (Array.isArray(validated.files) && validated.files.length > 0) {
      for (const f of validated.files.slice(0, 5)) {
        await db.executeQuery(
          `INSERT INTO shop_product_files (product_id, url, type, source) VALUES (?, ?, ?, ?)`,
          [productId, f.url, f.type, f.source]
        );
      }
    }
    const product = await db.getQuery(
      `SELECT id, name, description, price, thumbnail_url, stripe_billing_link, created_at, updated_at FROM shop_products WHERE id = ?`,
      [productId]
    );
    const files = await db.allQuery(
      `SELECT id, url, type, source, created_at FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`,
      [productId]
    );
    res.status(201).json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        thumbnail_url: product.thumbnail_url || null,
        stripe_billing_link: product.stripe_billing_link || null,
        files: files.map((f: any) => ({ id: f.id, url: f.url, type: f.type, source: f.source })),
        created_at: product.created_at,
        updated_at: product.updated_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create product' });
  }
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.coerce.number().optional(),
  thumbnail_url: z.string().nullable().optional(),
  stripe_billing_link: z.string().url().nullish(),
  files: z.array(shopFileSchema).optional()
});

router.put('/shop/products/:id', authenticateToken, requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const id = parseInt(req.params.id);
    const validated = updateProductSchema.parse(req.body);
    const fields: string[] = [];
    const values: any[] = [];
    if (validated.name !== undefined) { fields.push('name = ?'); values.push(validated.name); }
    if (validated.description !== undefined) { fields.push('description = ?'); values.push(validated.description); }
    if (validated.price !== undefined) { fields.push('price = ?'); values.push(validated.price); }
    if (validated.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); values.push(validated.thumbnail_url); }
    if (validated.stripe_billing_link !== undefined) { fields.push('stripe_billing_link = ?'); values.push(validated.stripe_billing_link); }
    const hasFieldUpdates = fields.length > 0;
    const userId = req.user?.id || 1;
    if (hasFieldUpdates) {
      values.push(userId, id);
      await db.executeQuery(
        `UPDATE shop_products SET ${fields.join(', ')}, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    }
    if (validated.files !== undefined) {
      await db.executeQuery(`DELETE FROM shop_product_files WHERE product_id = ?`, [id]);
      for (const f of (validated.files || []).slice(0, 5)) {
        await db.executeQuery(
          `INSERT INTO shop_product_files (product_id, url, type, source) VALUES (?, ?, ?, ?)`,
          [id, f.url, f.type, f.source]
        );
      }
    }
    const product = await db.getQuery(`SELECT id, name, description, price, thumbnail_url, stripe_billing_link, created_at, updated_at FROM shop_products WHERE id = ?`, [id]);
    const files = await db.allQuery(`SELECT id, url, type, source, created_at FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`, [id]);
    res.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        thumbnail_url: product.thumbnail_url || null,
        stripe_billing_link: product.stripe_billing_link || null,
        files: files.map((f: any) => ({ id: f.id, url: f.url, type: f.type, source: f.source })),
        created_at: product.created_at,
        updated_at: product.updated_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update product' });
  }
});

router.delete('/shop/products/:id', authenticateToken, requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const id = parseInt(req.params.id);
    await db.executeQuery(`DELETE FROM shop_products WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to delete product' });
  }
});

router.post('/shop/uploads', authenticateToken, requireSuperAdmin, shopUpload.array('files', 5), async (req: any, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const urls = files.map((f) => `/uploads/shop/${f.filename}`);
    res.json({ urls });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to upload files' });
  }
});

router.get('/shop/url-meta', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const schema = z.object({ url: z.string().url() });
    const { url } = schema.parse(req.query);
    const resp = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = String(resp.data || '');
    const $ = cheerio.load(html);
    let image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
    if (!image) {
      const firstImg = $('img').first().attr('src') || '';
      image = firstImg || '';
    }
    if (image) {
      try {
        const resolved = new URL(image, url).href;
        return res.json({ image: resolved });
      } catch {
        return res.json({ image });
      }
    }
    res.json({ image: null });
  } catch (error: any) {
    res.status(200).json({ image: null });
  }
});
// Create subscription plan
router.post('/plans', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const planData = createPlanSchema.parse(req.body);

    const db = getDatabaseAdapter();
    const permObj = (() => {
      const basePages = Array.isArray(planData.page_permissions) ? planData.page_permissions : (planData.page_permissions as any)?.pages || [];
      const isSpecific = typeof planData.is_specific === 'boolean' ? planData.is_specific : (planData.page_permissions as any)?.is_specific || false;
      const allowedEmails = Array.isArray(planData.allowed_admin_emails) ? planData.allowed_admin_emails : (planData.page_permissions as any)?.allowed_admin_emails || [];
      const restrictedToSubscribers = typeof (planData as any).restricted_to_current_subscribers === 'boolean'
        ? (planData as any).restricted_to_current_subscribers
        : (planData.page_permissions as any)?.restricted_to_current_subscribers || false;
      const allowedAffiliateIds = Array.isArray((planData as any).allowed_affiliate_ids)
        ? (planData as any).allowed_affiliate_ids
        : (planData.page_permissions as any)?.allowed_affiliate_ids || [];
      return {
        pages: basePages,
        is_specific: !!isSpecific,
        allowed_admin_emails: allowedEmails,
        restricted_to_current_subscribers: !!restrictedToSubscribers,
        allowed_affiliate_ids: Array.isArray(allowedAffiliateIds) ? allowedAffiliateIds : []
      };
    })();

    const result = await db.executeQuery(
      `INSERT INTO subscription_plans (name, description, price, billing_cycle, features, page_permissions, trial_price_id, stripe_monthly_price_id, stripe_yearly_price_id, stripe_product_id, max_users, max_clients, max_disputes, is_active, sort_order, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planData.name,
        planData.description || null,
        planData.price,
        planData.billing_cycle,
        JSON.stringify(planData.features || []),
        JSON.stringify(permObj),
        planData.trial_price_id || null,
        planData.stripe_monthly_price_id || null,
        planData.stripe_yearly_price_id || null,
        planData.stripe_product_id || null,
        planData.max_users ?? null,
        planData.max_clients ?? null,
        planData.max_disputes ?? null,
        planData.is_active,
        planData.sort_order,
        userId,
        userId
      ]
    );

    const planId = result.insertId;

    // Handle course assignments
    if (planData.assigned_courses && planData.assigned_courses.length > 0) {
      const courseAssignments = planData.assigned_courses.map(courseId => [
        planId,
        courseId,
        userId
      ]);

      await db.executeQuery(
        `INSERT INTO plan_course_associations (plan_id, course_id, created_by) VALUES ${courseAssignments.map(() => '(?, ?, ?)').join(', ')}`,
        courseAssignments.flat()
      );
    }

    // Fetch the created plan with course assignments
    const createdPlan = await db.getQuery(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );

    // Get assigned courses
    const assignedCourses = await db.allQuery(
      'SELECT course_id FROM plan_course_associations WHERE plan_id = ?',
      [planId]
    );

    let parsedPermCreated: any = [];
    try { parsedPermCreated = createdPlan.page_permissions ? JSON.parse(createdPlan.page_permissions) : []; } catch {}
    const planResponse = {
      ...createdPlan,
      features: createdPlan.features ? JSON.parse(createdPlan.features) : [],
      page_permissions: Array.isArray(parsedPermCreated) ? parsedPermCreated : (parsedPermCreated?.pages || []),
      is_specific: Array.isArray(parsedPermCreated) ? false : !!parsedPermCreated?.is_specific,
      restricted_to_current_subscribers: Array.isArray(parsedPermCreated) ? false : !!parsedPermCreated?.restricted_to_current_subscribers,
      allowed_admin_emails: Array.isArray(parsedPermCreated) ? [] : (parsedPermCreated?.allowed_admin_emails || []),
      assigned_courses: assignedCourses.map((row: any) => row.course_id)
    };

    // Broadcast plan creation to connected clients
    const websocketService = getWebSocketService();
    if (websocketService) {
      websocketService.broadcastPlanUpdate({
        action: 'created',
        plan: planResponse
      });
    }

    res.status(201).json({
      success: true,
      data: planResponse
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan data',
        details: error.errors
      });
    }

    res.status(500).json({ success: false, error: 'Failed to create subscription plan' });
  }
});

// Update subscription plan
router.put('/plans/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const planData = updatePlanSchema.parse(req.body);

    // Check if plan exists
    const db = getDatabaseAdapter();
    const existingPlan = await db.getQuery(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );

    if (!existingPlan) {
      return res.status(404).json({ success: false, error: 'Subscription plan not found' });
    }

    // Handle course assignments separately
    if (planData.assigned_courses !== undefined) {
      // Remove existing course assignments
      await db.executeQuery(
        'DELETE FROM plan_course_associations WHERE plan_id = ?',
        [planId]
      );

      // Add new course assignments
      if (planData.assigned_courses.length > 0) {
        const courseAssignments = planData.assigned_courses.map(courseId => [
          planId,
          courseId,
          userId
        ]);

        await db.executeQuery(
          `INSERT INTO plan_course_associations (plan_id, course_id, created_by) VALUES ${courseAssignments.map(() => '(?, ?, ?)').join(', ')}`,
          courseAssignments.flat()
        );
      }
    }

    // Build dynamic update query (exclude assigned_courses as it's handled separately)
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(planData).forEach(([key, value]) => {
      if (value !== undefined 
        && key !== 'assigned_courses' 
        && key !== 'is_specific' 
        && key !== 'allowed_admin_emails'
        && key !== 'restricted_to_current_subscribers'
        && key !== 'allowed_affiliate_ids') {
        if (key === 'features') {
          updateFields.push(`${key} = ?`);
          updateValues.push(JSON.stringify(value));
        } else if (key !== 'page_permissions') {
          updateFields.push(`${key} = ?`);
          if (['trial_price_id', 'stripe_monthly_price_id', 'stripe_yearly_price_id', 'stripe_product_id'].includes(key)) {
            updateValues.push(value || null);
          } else {
            updateValues.push(value);
          }
        }
      }
    });

    if (planData.page_permissions !== undefined || planData.is_specific !== undefined || planData.allowed_admin_emails !== undefined || (planData as any).restricted_to_current_subscribers !== undefined || (planData as any).allowed_affiliate_ids !== undefined) {
      let currentPerm: any = {};
      try {
        const parsed = existingPlan.page_permissions ? JSON.parse(existingPlan.page_permissions) : [];
        if (Array.isArray(parsed)) currentPerm = { pages: parsed };
        else if (parsed && typeof parsed === 'object') currentPerm = parsed;
      } catch { currentPerm = {}; }

      const incoming: any = planData.page_permissions;
      const nextPerm = {
        pages: Array.isArray(incoming) ? incoming : (incoming?.pages ?? currentPerm.pages ?? []),
        is_specific: typeof planData.is_specific === 'boolean' ? planData.is_specific : (incoming?.is_specific ?? currentPerm.is_specific ?? false),
        allowed_admin_emails: Array.isArray(planData.allowed_admin_emails) ? planData.allowed_admin_emails : (incoming?.allowed_admin_emails ?? currentPerm.allowed_admin_emails ?? []),
        restricted_to_current_subscribers: typeof (planData as any).restricted_to_current_subscribers === 'boolean'
          ? (planData as any).restricted_to_current_subscribers
          : (incoming?.restricted_to_current_subscribers ?? currentPerm.restricted_to_current_subscribers ?? false),
        allowed_affiliate_ids: Array.isArray((planData as any).allowed_affiliate_ids)
          ? (planData as any).allowed_affiliate_ids
          : (incoming?.allowed_affiliate_ids ?? currentPerm.allowed_affiliate_ids ?? [])
      };
      updateFields.push('page_permissions = ?');
      updateValues.push(JSON.stringify(nextPerm));
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_by = ?');
      updateValues.push(userId);

      await db.executeQuery(
        `UPDATE subscription_plans SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...updateValues, planId]
      );
    }

    // Fetch updated plan with course assignments
    const updatedPlan = await db.getQuery(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );

    // Get assigned courses
    const assignedCourses = await db.allQuery(
      'SELECT course_id FROM plan_course_associations WHERE plan_id = ?',
      [planId]
    );

    const planResponse = {
      ...updatedPlan,
      features: JSON.parse(updatedPlan.features),
      page_permissions: updatedPlan.page_permissions ? JSON.parse(updatedPlan.page_permissions) : [],
      restricted_to_current_subscribers: (() => { try { const p = updatedPlan.page_permissions ? JSON.parse(updatedPlan.page_permissions) : []; return Array.isArray(p) ? false : !!p?.restricted_to_current_subscribers; } catch { return false; } })(),
      assigned_courses: assignedCourses.map(row => row.course_id)
    };

    // Broadcast plan update to connected clients
    const websocketService = getWebSocketService();
    if (websocketService) {
      websocketService.broadcastPlanUpdate({
        action: 'updated',
        plan: planResponse
      });
    }

    res.json({
      success: true,
      data: planResponse
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan data',
        details: error.errors
      });
    }

    res.status(500).json({ success: false, error: 'Failed to update subscription plan' });
  }
});

// Delete subscription plan
router.delete('/plans/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);

    // Check if plan exists
    const db = getDatabaseAdapter();
    const existingPlan = await db.getQuery(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );

    if (!existingPlan) {
      return res.status(404).json({ success: false, error: 'Subscription plan not found' });
    }

    // Check if plan is being used by any subscriptions
    const subscriptionCount = await db.getQuery(
      'SELECT COUNT(*) as count FROM admin_subscriptions WHERE plan_id = ?',
      [planId]
    );

    if (subscriptionCount && subscriptionCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete plan that is currently being used by subscriptions'
      });
    }

    await db.executeQuery('DELETE FROM subscription_plans WHERE id = ?', [planId]);

    res.json({ success: true, message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ success: false, error: 'Failed to delete subscription plan' });
  }
});

// ADMIN PROFILE ROUTES

// Get all support users
router.get('/support-users', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, is_active } = req.query;
    console.log('🔍 Support Users API called with params:', { page, limit, search, is_active });
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 10));
    const safeOffset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE u.role = "support"';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (is_active !== undefined) {
      const db = getDatabaseAdapter();
      const dbType = db.getType();
      if (dbType === 'mysql') {
        whereClause += ' AND u.status = ?';
        params.push(is_active === 'true' ? 'active' : 'inactive');
      } else {
        whereClause += ' AND u.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }
    }

    const db = getDatabaseAdapter();
    
    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    console.log('📈 Admins count query result', { total: countResult?.total || 0 });

    // Get support users (handle both MySQL and SQLite schemas)
    const dbType = db.getType();
    const statusColumn = dbType === 'mysql' ? 'u.status' : 'CASE WHEN u.is_active = 1 THEN "active" ELSE "inactive" END';
    
    const supportUsers = await db.allQuery(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, ${statusColumn} as status,
              u.last_login, u.created_at, u.updated_at,
              'Support Team' as department, 'Support Agent' as title
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ${limitNum} OFFSET ${safeOffset}`,
      params
    );

    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    console.log(`📊 Found ${supportUsers.length} support users out of ${total} total`);

    res.json({
      success: true,
      data: supportUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching support users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch support users' });
  }
});

router.get('/tasks', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const tasks = await db.allQuery(
      `SELECT t.*,
              creator.first_name as created_by_first_name,
              creator.last_name as created_by_last_name,
              creator.email as created_by_email,
              updater.first_name as updated_by_first_name,
              updater.last_name as updated_by_last_name,
              updater.email as updated_by_email
       FROM project_tasks t
       LEFT JOIN users creator ON t.created_by = creator.id
       LEFT JOIN users updater ON t.updated_by = updater.id
       ORDER BY t.created_at DESC`
    );
     res.json({ success: true, data: normalizeTaskRows(tasks) });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project tasks' });
  }
});

router.post('/tasks', authenticateToken, requireSuperAdmin, taskUploadFields, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const status = String(req.body?.status || '').trim();
    const priority = String(req.body?.priority || '').trim();
    const rejectionReason = normalizeRejectionReason(req.body?.rejection_reason);
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }
    if (status && !taskStatusValues.has(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }
    if (priority && !taskPriorityValues.has(priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority value' });
    }
    const db = getDatabaseAdapter();
    const normalizedStatus = status || 'pending';
    const normalizedPriority = priority || 'normal';
    if (normalizedStatus === 'rejected' && !rejectionReason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required when rejecting a task' });
    }
    const attachmentUrls = extractTaskUploadUrls(req.files);
    const screenshotUrl = attachmentUrls[0] || null;
    const result = await db.executeQuery(
      `INSERT INTO project_tasks (title, description, screenshot_url, attachment_urls, rejection_reason, status, priority, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        screenshotUrl,
        attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null,
        normalizedStatus === 'rejected' ? rejectionReason : null,
        normalizedStatus,
        normalizedPriority,
        userId,
        userId,
      ]
    );
    const dbType = db.getType();
    const taskId = dbType === 'mysql' ? (result as any)?.insertId : (result as any)?.lastID;
    const task = await db.getQuery(
      `SELECT t.*,
              creator.first_name as created_by_first_name,
              creator.last_name as created_by_last_name,
              creator.email as created_by_email,
              updater.first_name as updated_by_first_name,
              updater.last_name as updated_by_last_name,
              updater.email as updated_by_email
       FROM project_tasks t
       LEFT JOIN users creator ON t.created_by = creator.id
       LEFT JOIN users updater ON t.updated_by = updater.id
       WHERE t.id = ?`,
      [taskId]
    );
    res.json({ success: true, data: normalizeTaskRecord(task) });
  } catch (error) {
    console.error('Error creating project task:', error);
    res.status(500).json({ success: false, error: 'Failed to create project task' });
  }
});

router.put('/tasks/:id', authenticateToken, requireSuperAdmin, taskUploadFields, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task id' });
    }
    const db = getDatabaseAdapter();
    const currentTaskRecord = await db.getQuery(`SELECT * FROM project_tasks WHERE id = ?`, [taskId]);
    const currentTask = normalizeTaskRecord(currentTaskRecord);
    if (!currentTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const title = req.body?.title;
    const description = req.body?.description;
    const status = req.body?.status;
    const priority = req.body?.priority;
    const rejectionReason = req.body?.rejection_reason;
    const uploadedUrls = extractTaskUploadUrls(req.files);
    const updates: string[] = [];
    const params: any[] = [];
    if (typeof title !== 'undefined') {
      const safeTitle = String(title).trim();
      if (!safeTitle) {
        return res.status(400).json({ success: false, error: 'Title cannot be empty' });
      }
      updates.push('title = ?');
      params.push(safeTitle);
    }
    if (typeof description !== 'undefined') {
      const safeDescription = String(description).trim();
      if (!safeDescription) {
        return res.status(400).json({ success: false, error: 'Description cannot be empty' });
      }
      updates.push('description = ?');
      params.push(safeDescription);
    }
    if (typeof status !== 'undefined') {
      const safeStatus = String(status).trim();
      if (!taskStatusValues.has(safeStatus)) {
        return res.status(400).json({ success: false, error: 'Invalid status value' });
      }
      updates.push('status = ?');
      params.push(safeStatus);
    }
    if (typeof priority !== 'undefined') {
      const safePriority = String(priority).trim();
      if (!taskPriorityValues.has(safePriority)) {
        return res.status(400).json({ success: false, error: 'Invalid priority value' });
      }
      updates.push('priority = ?');
      params.push(safePriority);
    }

    const nextStatus = typeof status !== 'undefined' ? String(status).trim() : currentTask.status;
    const hasRejectionReasonInput = typeof rejectionReason !== 'undefined';
    let nextRejectionReason = hasRejectionReasonInput
      ? normalizeRejectionReason(rejectionReason)
      : currentTask.rejection_reason;

    if (nextStatus === 'rejected' && !nextRejectionReason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required when rejecting a task' });
    }
    if (nextStatus !== 'rejected' && (hasRejectionReasonInput || typeof status !== 'undefined')) {
      nextRejectionReason = null;
    }

    if ((hasRejectionReasonInput || typeof status !== 'undefined') && nextRejectionReason !== currentTask.rejection_reason) {
      updates.push('rejection_reason = ?');
      params.push(nextRejectionReason);
    }

    if (uploadedUrls.length > 0) {
      const attachmentUrls = Array.from(new Set([
        ...parseTaskAttachmentUrls(currentTask.attachment_urls, currentTask.screenshot_url),
        ...uploadedUrls,
      ]));
      updates.push('screenshot_url = ?');
      params.push(attachmentUrls[0] || null);
      updates.push('attachment_urls = ?');
      params.push(JSON.stringify(attachmentUrls));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    const dbType = db.getType();
    updates.push('updated_by = ?');
    params.push(userId);
    updates.push(dbType === 'mysql' ? 'updated_at = NOW()' : 'updated_at = CURRENT_TIMESTAMP');
    params.push(taskId);
    await db.executeQuery(
      `UPDATE project_tasks SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const task = await db.getQuery(
      `SELECT t.*,
              creator.first_name as created_by_first_name,
              creator.last_name as created_by_last_name,
              creator.email as created_by_email,
              updater.first_name as updated_by_first_name,
              updater.last_name as updated_by_last_name,
              updater.email as updated_by_email
       FROM project_tasks t
       LEFT JOIN users creator ON t.created_by = creator.id
       LEFT JOIN users updater ON t.updated_by = updater.id
       WHERE t.id = ?`,
      [taskId]
    );
    res.json({ success: true, data: normalizeTaskRecord(task) });
  } catch (error) {
    console.error('Error updating project task:', error);
    res.status(500).json({ success: false, error: 'Failed to update project task' });
  }
});

router.delete('/tasks/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task id' });
    }
    const db = getDatabaseAdapter();
    await db.executeQuery('DELETE FROM project_tasks WHERE id = ?', [taskId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project task:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project task' });
  }
});

// Get all admin profiles
router.get('/admins', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, is_active, access_level } = req.query;
    console.log('🔍 Admin API called with params:', { page, limit, search, is_active, access_level });
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "WHERE (u.role = 'admin' OR u.role = 'super_admin')";
    const params: any[] = [];

    // Handle role/access_level filtering
    if (access_level && access_level !== 'all') {
      if (access_level === 'super_admin') {
        whereClause = "WHERE u.role = 'super_admin'";
      } else if (access_level === 'admin') {
        whereClause = "WHERE u.role = 'admin'";
      }
    }

    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (is_active !== undefined) {
      const db = getDatabaseAdapter();
      const dbType = db.getType();
      if (dbType === 'mysql') {
        whereClause += ' AND u.status = ?';
        params.push(is_active === 'true' ? 'active' : 'inactive');
      } else {
        whereClause += ' AND u.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }
    }

    const db = getDatabaseAdapter();
    
    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );

    // Get admin users (handle both MySQL and SQLite schemas)
    const dbType = db.getType();
    const statusColumn = dbType === 'mysql' ? 'u.status' : 'CASE WHEN u.is_active = 1 THEN "active" ELSE "inactive" END';
    let hasSubscriptions = false;
    let hasSubscriptionPlans = false;
    try {
      if (dbType === 'mysql') {
        const subs = await db.allQuery('SHOW TABLES LIKE "subscriptions"');
        const plans = await db.allQuery('SHOW TABLES LIKE "subscription_plans"');
        hasSubscriptions = Array.isArray(subs) && subs.length > 0;
        hasSubscriptionPlans = Array.isArray(plans) && plans.length > 0;
      } else {
        const subs = await db.getQuery('SELECT name FROM sqlite_master WHERE type="table" AND name="subscriptions"');
        const plans = await db.getQuery('SELECT name FROM sqlite_master WHERE type="table" AND name="subscription_plans"');
        hasSubscriptions = !!subs;
        hasSubscriptionPlans = !!plans;
      }
    } catch {}
    
    const isAll = String(limit).toLowerCase() === 'all' || (Number(limit) <= 0);
    const totalAdmins = Number(countResult?.total || 0);
    const safeLimitAdmins = isAll ? (totalAdmins || 10000) : Math.max(1, Math.min(100, Number(limit)));
    const safeOffsetAdmins = isAll ? 0 : Math.max(0, offset);
    const limitClause = isAll ? '' : `LIMIT ${safeLimitAdmins} OFFSET ${safeOffsetAdmins}`;
    let admins: any[] = [];
    try {
      const extras: string[] = [];
      extras.push('(SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id) AS clients_count');
      if (hasSubscriptions) {
        extras.push(`(SELECT s.plan_name FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1) AS plan_name`);
        extras.push(`(SELECT s.plan_type FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1) AS plan_type`);
        extras.push(`(SELECT s.current_period_end FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1) AS next_billing_date`);
      }
      if (hasSubscriptions && hasSubscriptionPlans) {
        extras.push(`(SELECT sp.price FROM subscription_plans sp JOIN subscriptions s2 ON sp.name = s2.plan_name AND sp.billing_cycle = s2.plan_type WHERE s2.user_id = u.id AND s2.status = 'active' ORDER BY s2.created_at DESC LIMIT 1) AS plan_price`);
        extras.push(`(SELECT spm.price FROM subscription_plans spm JOIN subscriptions s2 ON spm.name = s2.plan_name WHERE s2.user_id = u.id AND s2.status = 'active' AND spm.billing_cycle = 'monthly' ORDER BY s2.created_at DESC LIMIT 1) AS plan_monthly_price`);
      }
      const selectExtras = extras.length ? `, ${extras.join(', ')}` : '';
      const query = `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, ${statusColumn} as status,
                u.last_login, u.created_at, u.updated_at,
                u.role as access_level, 'General' as department, 1 as is_active,
                CASE WHEN u.role = 'super_admin' THEN 'Super Administrator' ELSE 'Admin User' END as title,
                '{}' as permissions${selectExtras}
         FROM users u
         ${whereClause}
         ORDER BY u.created_at DESC
         ${limitClause}`;
      admins = await db.allQuery(query, params);
      console.log('📋 Admins list fetched', { count: Array.isArray(admins) ? admins.length : 0 });
    } catch (listErr: any) {
      // Fallback for environments missing optional columns
      const msg: string = listErr?.sqlMessage || listErr?.message || '';
      console.error('⚠️ Admins list query error', { message: msg, code: listErr?.code });
      try {
        const diagDb = getDatabaseAdapter();
        const diagType = diagDb.getType();
        let userColumns: string[] = [];
        if (diagType === 'mysql') {
          const rows = await diagDb.allQuery('SHOW COLUMNS FROM users');
          userColumns = Array.isArray(rows) ? rows.map((r: any) => String(r.Field || r.COLUMN_NAME || '').toLowerCase()) : [];
        } else {
          const rows = await diagDb.allQuery("PRAGMA table_info('users')");
          userColumns = Array.isArray(rows) ? rows.map((r: any) => String(r.name || '').toLowerCase()) : [];
        }
        const requiredCols = ['id','first_name','last_name','email','role','status','last_login','created_at','updated_at','is_active'];
        const present = requiredCols.filter(c => userColumns.includes(c));
        const missing = requiredCols.filter(c => !userColumns.includes(c));
        console.log('🔬 Users table columns', { present, missing, total: userColumns.length });
        console.log('🧪 Admins query diagnostic', { whereClause, paramsLength: Array.isArray(params) ? params.length : 0, safeLimitAdmins, safeOffsetAdmins });
        // If any of the key optional columns are missing, prefer fallback immediately
        if (missing.length > 0 && !msg.includes('Unknown column')) {
          const extras: string[] = [];
          extras.push('(SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id) AS clients_count');
          if (hasSubscriptions) {
            extras.push(`(SELECT s.current_period_end FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1) AS next_billing_date`);
          }
          if (hasSubscriptions && hasSubscriptionPlans) {
            extras.push(`(SELECT sp.price FROM subscription_plans sp JOIN subscriptions s2 ON sp.name = s2.plan_name AND sp.billing_cycle = s2.plan_type WHERE s2.user_id = u.id AND s2.status = 'active' ORDER BY s2.created_at DESC LIMIT 1) AS plan_price`);
            extras.push(`(SELECT spm.price FROM subscription_plans spm JOIN subscriptions s2 ON spm.name = s2.plan_name WHERE s2.user_id = u.id AND s2.status = 'active' AND spm.billing_cycle = 'monthly' ORDER BY s2.created_at DESC LIMIT 1) AS plan_monthly_price`);
          }
          const selectExtras = extras.length ? `, ${extras.join(', ')}` : '';
          const q = `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role,
                    ${statusColumn} as status,
                    u.created_at,
                    u.role as access_level,
                    'General' as department,
                    1 as is_active,
                    CASE WHEN u.role = 'super_admin' THEN 'Super Administrator' ELSE 'Admin User' END as title,
                    '{}' as permissions${selectExtras}
             FROM users u
             ${whereClause}
             ORDER BY u.created_at DESC
             ${limitClause}`;
          admins = await diagDb.allQuery(q, Array.isArray(params) ? params : []);
          console.log('📋 Admins diagnostic fallback list fetched', { count: Array.isArray(admins) ? admins.length : 0 });
          // Continue without throwing
        } else {
          // Keep original behavior below
        }
      } catch (diagErr: any) {
        console.error('🛠️ Admins diagnostic failed', { message: diagErr?.message, code: diagErr?.code });
      }
      if (msg.includes('Unknown column') || listErr?.code === 'ER_BAD_FIELD_ERROR') {
        const extras: string[] = [];
        extras.push('(SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id) AS clients_count');
        if (hasSubscriptions) {
          extras.push(`(SELECT s.current_period_end FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1) AS next_billing_date`);
        }
        if (hasSubscriptions && hasSubscriptionPlans) {
          extras.push(`(SELECT sp.price FROM subscription_plans sp JOIN subscriptions s2 ON sp.name = s2.plan_name AND sp.billing_cycle = s2.plan_type WHERE s2.user_id = u.id AND s2.status = 'active' ORDER BY s2.created_at DESC LIMIT 1) AS plan_price`);
          extras.push(`(SELECT spm.price FROM subscription_plans spm JOIN subscriptions s2 ON spm.name = s2.plan_name WHERE s2.user_id = u.id AND s2.status = 'active' AND spm.billing_cycle = 'monthly' ORDER BY s2.created_at DESC LIMIT 1) AS plan_monthly_price`);
        }
        const selectExtras = extras.length ? `, ${extras.join(', ')}` : '';
        const qq = `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role,
                  ${statusColumn} as status,
                  u.created_at,
                  u.role as access_level,
                  'General' as department,
                  1 as is_active,
                  CASE WHEN u.role = 'super_admin' THEN 'Super Administrator' ELSE 'Admin User' END as title,
                  '{}' as permissions${selectExtras}
           FROM users u
           ${whereClause}
           ORDER BY u.created_at DESC
           ${limitClause}`;
        admins = await db.allQuery(qq, params);
        console.log('📋 Admins fallback list fetched', { count: Array.isArray(admins) ? admins.length : 0 });
      } else {
        throw listErr;
      }
    }

    let profilesByUserId = new Map<number, any>();

    if (Array.isArray(admins) && admins.length > 0) {
      try {
        const adminIds = admins
          .map((admin: any) => Number(admin.id))
          .filter((adminId) => Number.isFinite(adminId));

        if (adminIds.length > 0) {
          const placeholders = adminIds.map(() => '?').join(', ');
          const profileRows = await db.allQuery(
            `SELECT user_id, permissions, access_level, department, title, phone, emergency_contact, notes, is_active
             FROM admin_profiles
             WHERE user_id IN (${placeholders})`,
            adminIds
          );

          profilesByUserId = new Map(
            (Array.isArray(profileRows) ? profileRows : []).map((profile: any) => [Number(profile.user_id), profile])
          );
        }
      } catch (profileError) {
        console.warn('⚠️ Failed to hydrate admin profile permissions for admin list:', profileError);
      }
    }

    const adminsWithPermissions = admins.map((admin: any) => {
      const profile = profilesByUserId.get(Number(admin.id));

      return {
        ...admin,
        access_level: profile?.access_level || admin.access_level,
        department: profile?.department || admin.department,
        title: profile?.title || admin.title,
        phone: profile?.phone || admin.phone,
        emergency_contact: profile?.emergency_contact || admin.emergency_contact,
        notes: profile?.notes || admin.notes,
        is_active: profile?.is_active ?? admin.is_active,
        permissions: parseAdminPermissions(profile?.permissions ?? admin.permissions)
      };
    });

    res.json({
      success: true,
      data: adminsWithPermissions,
      pagination: {
        page: Number(page),
        limit: isAll ? (countResult?.total || 0) : Number(limit),
        total: countResult?.total || 0,
        pages: isAll ? 1 : Math.ceil((countResult?.total || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin profiles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin profiles' });
  }
});

// Get single admin profile
router.get('/admins/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(req.params.id);
    
    const db = getDatabaseAdapter();
    const dbType = db.getType();
    const statusColumn = dbType === 'mysql' ? 'u.status' : 'CASE WHEN u.is_active = 1 THEN "active" ELSE "inactive" END as status';
    
    let admin;
        const queryWithAudit = `SELECT u.*, u.role as access_level, 'General' as department,
        CASE WHEN u.role = 'super_admin' THEN 'Super Administrator' ELSE 'Admin User' END as title, '{}' as permissions, 1 as is_active,
              u.created_at as user_created_at,
              u1.first_name as created_by_name, u1.last_name as created_by_lastname,
              u2.first_name as updated_by_name, u2.last_name as updated_by_lastname
       FROM users u
       LEFT JOIN users u1 ON u.created_by = u1.id
       LEFT JOIN users u2 ON u.updated_by = u2.id
      WHERE u.id = ? AND (u.role = 'admin' OR u.role = 'super_admin')`;
        const queryWithoutAudit = `SELECT u.*, u.role as access_level, 'General' as department,
        CASE WHEN u.role = 'super_admin' THEN 'Super Administrator' ELSE 'Admin User' END as title, '{}' as permissions, 1 as is_active,
              u.created_at as user_created_at
       FROM users u
      WHERE u.id = ? AND (u.role = 'admin' OR u.role = 'super_admin')`;

    try {
      admin = await db.getQuery(queryWithAudit, [adminId]);
    } catch (selectErr: any) {
      const msg: string = selectErr?.sqlMessage || selectErr?.message || '';
      const code: string = selectErr?.code || '';
      if (code === 'ER_BAD_FIELD_ERROR' || msg.includes("Unknown column 'created_by'")) {
        console.warn('⚠️  users.created_by/updated_by missing; fetching admin without audit joins');
        admin = await db.getQuery(queryWithoutAudit, [adminId]);
      } else {
        throw selectErr;
      }
    }

    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin profile not found' });
    }

    let adminProfile = null;
    try {
      adminProfile = await db.getQuery(
        `SELECT permissions, access_level, department, title, phone, emergency_contact, notes, is_active
         FROM admin_profiles
         WHERE user_id = ?`,
        [adminId]
      );
    } catch (profileError) {
      console.warn('⚠️ Failed to hydrate admin profile details:', profileError);
    }

    res.json({
      success: true,
      data: {
        ...admin,
        access_level: adminProfile?.access_level || admin.access_level,
        department: adminProfile?.department || admin.department,
        title: adminProfile?.title || admin.title,
        phone: adminProfile?.phone || admin.phone,
        emergency_contact: adminProfile?.emergency_contact || admin.emergency_contact,
        notes: adminProfile?.notes || admin.notes,
        is_active: adminProfile?.is_active ?? admin.is_active,
        permissions: parseAdminPermissions(adminProfile?.permissions ?? admin.permissions)
      }
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin profile' });
  }
});

router.get('/admins/:id/agreements', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    if (!Number.isFinite(adminId)) {
      return res.status(400).json({ success: false, error: 'Invalid admin id' });
    }

    const db = getDatabaseAdapter();
    const dbType = db.getType();

    const adminUser = await db.getQuery(
      `SELECT id FROM users WHERE id = ? AND (role = 'admin' OR role = 'super_admin')`,
      [adminId]
    );

    if (!adminUser) {
      return res.status(404).json({ success: false, error: 'Admin profile not found' });
    }

    const rows = dbType === 'mysql'
      ? await db.allQuery(
          `SELECT
             c.id AS contract_id,
             c.title,
             c.body,
             c.status,
             c.created_at,
             c.signed_at AS contract_signed_at,
             t.name AS template_name,
             t.content AS content,
             cs.id AS signature_id,
             cs.signature_data,
             cs.ip_address,
             cs.signed_at AS signature_signed_at
           FROM contracts c
           LEFT JOIN contract_templates t ON c.template_id = t.id
           LEFT JOIN contract_signatures cs ON cs.id = (
             SELECT cs2.id
             FROM contract_signatures cs2
             WHERE cs2.contract_id = c.id
               AND cs2.signer_type = 'user'
               AND cs2.signer_user_id = ?
             ORDER BY cs2.signed_at DESC, cs2.id DESC
             LIMIT 1
           )
           WHERE c.user_id = ?
           ORDER BY COALESCE(cs.signed_at, c.signed_at, c.created_at) DESC, c.id DESC`,
          [adminId, adminId]
        )
      : await db.allQuery(
          `SELECT
             c.id AS contract_id,
             c.title,
             c.status,
             c.created_at,
             c.signed_at AS contract_signed_at,
             t.name AS template_name,
             COALESCE(t.content_html, t.content_text, '') AS content,
             cs.id AS signature_id,
             cs.signature_text,
             cs.signature_image_url,
             cs.ip_address,
             cs.signed_at AS signature_signed_at
           FROM contracts c
           LEFT JOIN contract_templates t ON c.template_id = t.id
           LEFT JOIN contract_signatures cs ON cs.id = (
             SELECT cs2.id
             FROM contract_signatures cs2
             WHERE cs2.contract_id = c.id
               AND cs2.signer_type = 'admin'
               AND cs2.signer_id = ?
             ORDER BY cs2.signed_at DESC, cs2.id DESC
             LIMIT 1
           )
           WHERE c.admin_id = ?
           ORDER BY COALESCE(cs.signed_at, c.signed_at, c.created_at) DESC, c.id DESC`,
          [adminId, adminId]
        );

    const agreements = (rows || []).map((row: any) => {
      let signatureText = row.signature_text ?? null;
      let signatureImageUrl = row.signature_image_url ?? null;

      if (dbType === 'mysql') {
        try {
          const parsed = row.signature_data ? JSON.parse(row.signature_data) : {};
          signatureText = parsed?.signature_text ?? null;
          signatureImageUrl = parsed?.signature_image_url ?? null;
        } catch {
          signatureText = null;
          signatureImageUrl = null;
        }
      }

      const content = String(row.content ?? row.body ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const normalizedStatus = row.status === 'sent'
        ? 'pending_signature'
        : row.status === 'cancelled'
          ? 'void'
          : row.status;

      return {
        id: row.contract_id,
        title: row.title || row.template_name || `Agreement #${row.contract_id}`,
        content,
        status: normalizedStatus,
        created_at: row.created_at ?? null,
        signed_at: row.signature_signed_at ?? row.contract_signed_at ?? null,
        signature_id: row.signature_id ?? null,
        signature_text: signatureText,
        signature_image_url: signatureImageUrl,
        ip_address: row.ip_address ?? null,
      };
    });

    res.json({ success: true, data: agreements });
  } catch (error) {
    console.error('Error fetching admin agreements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin agreements' });
  }
});

router.get('/admins/:id/tsm-elite-agreements', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    if (!Number.isFinite(adminId)) {
      return res.status(400).json({ success: false, error: 'Invalid admin id' });
    }

    const db = getDatabaseAdapter();
    const adminUser = await db.getQuery(
      `SELECT id FROM users WHERE id = ? AND (role = 'admin' OR role = 'super_admin')`,
      [adminId]
    );

    if (!adminUser) {
      return res.status(404).json({ success: false, error: 'Admin profile not found' });
    }

    const rows = await db.allQuery(
      `SELECT
         t.id AS template_id,
         t.name,
         t.description,
         t.content_html,
         t.content_text,
         t.status AS template_status,
         t.created_at,
         t.updated_at,
         s.id AS signature_id,
         s.signature_text,
         s.signature_image_url,
         s.ip_address,
         s.user_agent,
         s.signed_at
       FROM tsm_elite t
       LEFT JOIN tsm_elite_signatures s ON s.id = (
         SELECT s2.id
         FROM tsm_elite_signatures s2
         WHERE s2.template_id = t.id AND s2.admin_id = ?
         ORDER BY s2.signed_at DESC, s2.id DESC
         LIMIT 1
       )
       ORDER BY COALESCE(s.signed_at, t.updated_at, t.created_at) DESC, t.id DESC`,
      [adminId]
    );

    const agreements = (rows || []).map((row: any) => {
      const content = String(row.content_html ?? row.content_text ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const normalizedStatus = row.signature_image_url
        ? 'signed'
        : row.template_status === 'active'
          ? 'pending_signature'
          : row.template_status;

      return {
        id: row.template_id,
        title: row.name || 'The Capsol Elite Agreement',
        description: row.description ?? null,
        content,
        status: normalizedStatus,
        created_at: row.created_at ?? null,
        signed_at: row.signed_at ?? null,
        signature_id: row.signature_id ?? null,
        signature_image_url: row.signature_image_url ?? null,
        ip_address: row.ip_address ?? null,
        history_type: 'score-machine-elite'
      };
    });

    res.json({ success: true, data: agreements });
  } catch (error) {
    console.error('Error fetching admin The Capsol Elite agreements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin The Capsol Elite agreements' });
  }
});

router.get('/admins/:id/agreement.pdf', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(req.params.id);
    const db = getDatabaseAdapter();
    const dbType = db.getType();
    const agreementType = String(req.query.type || 'admin-contracts');
    const contractId = req.query.contractId ? parseInt(String(req.query.contractId), 10) : null;
    const templateId = req.query.templateId ? parseInt(String(req.query.templateId), 10) : null;

    const adminUser = await db.getQuery(
      `SELECT id, first_name, last_name, email FROM users WHERE id = ? AND (role = 'admin' OR role = 'super_admin')`,
      [adminId]
    );
    if (!adminUser) {
      return res.status(404).json({ success: false, error: 'Admin profile not found' });
    }

    if (agreementType === 'score-machine-elite') {
      const template = templateId
        ? await db.getQuery(
            `SELECT id, name, description, content_html, content_text, status, created_at, updated_at
             FROM tsm_elite
             WHERE id = ?
             LIMIT 1`,
            [templateId]
          )
        : await db.getQuery(
            `SELECT id, name, description, content_html, content_text, status, created_at, updated_at
             FROM tsm_elite
             ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
             LIMIT 1`
          );

      if (!template) {
        return res.status(404).json({ success: false, error: 'No The Capsol Elite agreement found' });
      }

      const signatureRow = await db.getQuery(
        `SELECT id, signature_text, signature_image_url, ip_address, signed_at
         FROM tsm_elite_signatures
         WHERE admin_id = ? AND template_id = ?
         ORDER BY signed_at DESC, id DESC
         LIMIT 1`,
        [adminId, template.id]
      );

      const contentText = String(template.content_html ?? template.content_text ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const signatureImageUrl = signatureRow?.signature_image_url ?? null;
      const signatureIp = signatureRow?.ip_address ?? null;
      const signatureSignedAt = signatureRow?.signed_at ?? null;
      const templateStatus = signatureImageUrl
        ? 'signed'
        : template.status === 'active'
          ? 'pending_signature'
          : template.status;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="admin-${adminId}-score-machine-elite-agreement.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      const adminName = [adminUser.first_name, adminUser.last_name].filter(Boolean).join(' ').trim();

      doc.fontSize(20).text('The Capsol Elite Agreement', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Admin: ${adminName || adminUser.email || `#${adminId}`}`);
      if (adminUser.email) doc.text(`Email: ${adminUser.email}`);
      doc.text(`Template: ${template.name || 'The Capsol Elite Agreement'}`);
      doc.text(`Status: ${templateStatus}`);
      if (template.created_at) doc.text(`Created: ${new Date(template.created_at).toISOString()}`);
      if (signatureSignedAt) doc.text(`Signed At: ${new Date(signatureSignedAt).toISOString()}`);
      if (signatureIp) doc.text(`IP: ${signatureIp}`);
      doc.moveDown(1);

      doc.fontSize(11).text(contentText || '(No agreement content found)', { align: 'left' });
      doc.moveDown(1);

      doc.fontSize(14).text('Signature');
      doc.moveDown(0.5);
      doc.fontSize(11);
      if (signatureImageUrl) {
        const match = String(signatureImageUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match?.[2]) {
          const buf = Buffer.from(match[2], 'base64');
          const y = doc.y;
          doc.image(buf, doc.x, y, { fit: [300, 120] });
          doc.moveDown(6);
        } else {
          doc.text('Saved signature image could not be rendered.');
        }
      } else {
        doc.text('No signature on file.');
      }

      doc.end();
      return;
    }

    let contract: any = null;
    if (dbType === 'mysql') {
      contract = contractId
        ? await db.getQuery(
            `SELECT c.*, t.content AS template_content
             FROM contracts c
             LEFT JOIN contract_templates t ON c.template_id = t.id
             WHERE c.user_id = ? AND c.id = ?
             LIMIT 1`,
            [adminId, contractId]
          )
        : await db.getQuery(
            `SELECT c.*, t.content AS template_content
             FROM contracts c
             LEFT JOIN contract_templates t ON c.template_id = t.id
             WHERE c.user_id = ?
             ORDER BY c.created_at DESC
             LIMIT 1`,
            [adminId]
          );
    } else {
      contract = contractId
        ? await db.getQuery(
            `SELECT c.*, t.content_text AS template_content_text, t.content_html AS template_content_html
             FROM contracts c
             LEFT JOIN contract_templates t ON c.template_id = t.id
             WHERE c.admin_id = ? AND c.id = ?
             LIMIT 1`,
            [adminId, contractId]
          )
        : await db.getQuery(
            `SELECT c.*, t.content_text AS template_content_text, t.content_html AS template_content_html
             FROM contracts c
             LEFT JOIN contract_templates t ON c.template_id = t.id
             WHERE c.admin_id = ?
             ORDER BY c.created_at DESC
             LIMIT 1`,
            [adminId]
          );
    }

    if (!contract) {
      return res.status(404).json({ success: false, error: 'No contract found for admin' });
    }

    // If agreementId is provided, fetch that agreement's content
    let contentText = '';
    const agreementId = req.query.agreementId ? parseInt(String(req.query.agreementId)) : null;
    if (agreementId) {
      const agreement = await db.getQuery(
        `SELECT content FROM contract_agreements WHERE id = ?`,
        [agreementId]
      );
      if (agreement && agreement.content) {
        contentText = String(agreement.content)
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<li>/gi, '• ')
          .replace(/<[^>]*>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    }
    if (!contentText) {
      const contentRaw =
        dbType === 'mysql'
          ? (contract.template_content ?? contract.body ?? '')
          : (contract.template_content_html ?? contract.template_content_text ?? contract.body ?? '');
      contentText = String(contentRaw || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    const signatureRow = dbType === 'mysql'
      ? await db.getQuery(
          `SELECT * FROM contract_signatures
           WHERE contract_id = ? AND signer_type = 'user' AND signer_user_id = ?
           ORDER BY signed_at DESC, id DESC
           LIMIT 1`,
          [contract.id, adminId]
        )
      : await db.getQuery(
          `SELECT * FROM contract_signatures
           WHERE contract_id = ? AND signer_type = 'admin' AND signer_id = ?
           ORDER BY signed_at DESC, id DESC
           LIMIT 1`,
          [contract.id, adminId]
        );

    let signatureText: string | null = null;
    let signatureImageUrl: string | null = null;
    let signatureIp: string | null = null;
    let signatureSignedAt: string | null = null;

    if (signatureRow) {
      signatureIp = signatureRow.ip_address ?? null;
      signatureSignedAt = signatureRow.signed_at ?? null;
      if (dbType === 'mysql') {
        try {
          const parsed = signatureRow.signature_data ? JSON.parse(signatureRow.signature_data) : {};
          signatureText = parsed?.signature_text ?? null;
          signatureImageUrl = parsed?.signature_image_url ?? null;
        } catch {
          signatureText = null;
          signatureImageUrl = null;
        }
      } else {
        signatureText = signatureRow.signature_text ?? null;
        signatureImageUrl = signatureRow.signature_image_url ?? null;
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="admin-${adminId}-agreement.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const adminName = [adminUser.first_name, adminUser.last_name].filter(Boolean).join(' ').trim();

    doc.fontSize(20).text('Admin Agreement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Admin: ${adminName || adminUser.email || `#${adminId}`}`);
    if (adminUser.email) doc.text(`Email: ${adminUser.email}`);
    doc.text(`Contract Title: ${contract.title || 'Admin Onboarding Agreement'}`);
    doc.text(`Status: ${contract.status || ''}`);
    if (contract.created_at) doc.text(`Created: ${new Date(contract.created_at).toISOString()}`);
    if (contract.signed_at) doc.text(`Contract Signed At: ${new Date(contract.signed_at).toISOString()}`);
    if (signatureSignedAt) doc.text(`Signature Signed At: ${new Date(signatureSignedAt).toISOString()}`);
    if (signatureIp) doc.text(`IP: ${signatureIp}`);
    doc.moveDown(1);

    // Render agreement body from DB content (contract_templates/contract_agreements)
    doc.fontSize(11).text(contentText || '(No agreement content found)', { align: 'left' });
    doc.moveDown(1);

    doc.fontSize(14).text('Signature');
    doc.moveDown(0.5);
    doc.fontSize(11);
    if (signatureText) doc.text(`Typed Signature: ${signatureText}`);
    if (signatureImageUrl) {
      const match = String(signatureImageUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match?.[2]) {
        const buf = Buffer.from(match[2], 'base64');
        const y = doc.y;
        doc.image(buf, doc.x, y, { fit: [300, 120] });
        doc.moveDown(6);
      } else {
        doc.text(`Signature Image URL: ${signatureImageUrl}`);
      }
    }
    if (!signatureText && !signatureImageUrl) {
      doc.text('No signature on file.');
    }

    doc.end();
  } catch (error: any) {
    console.error('Error generating admin agreement PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to generate agreement PDF' });
  }
});

const DEFAULT_TEMPLATE_NAME = 'THE CAPSOL MASTER SOFTWARE & SERVICES AGREEMENT';
const DEFAULT_TEMPLATE_DESCRIPTION = 'Default master agreement template';
const DEFAULT_TEMPLATE_CONTENT = `<h1>THE CAPSOL MASTER SOFTWARE & SERVICES AGREEMENT</h1>
<p>This Master Software &amp; Services Agreement (this “Agreement”) is a binding legal contract entered into by and between ADR Wealth Advisors LLC, doing business as The Capsol (hereinafter referred to as the “Company”), and the individual or legal entity that (a) creates a user account on the Platform, (b) executes or accepts this Agreement in connection with the use of the Platform or Services, or (c) otherwise accesses, interacts with, or utilizes any functionality, component, or feature of The Capsol software platform.</p>
<p>This Agreement shall be effective as of the date on which User signifies assent by clicking an acceptance button, checking an acknowledgment box, executing an electronic or handwritten signature, or otherwise performing any affirmative act evidencing acceptance of this Agreement, including by accessing or using the Platform or any portion thereof (the “Effective Date”).</p>
<h2>RECITALS</h2>
<p>A. The Company has conceived, designed, engineered, developed, authored, and currently owns and operates a proprietary and confidential suite of integrated software systems, databases, source and object code, proprietary algorithms, models, user interfaces, dashboards, application-programming interfaces (“APIs”), analytic engines, data integrations, documentation, and related technological and functional assets (collectively referred to as the “Platform,” and marketed as “The Capsol”).</p>
<p>B. The Platform presently integrates, and is expressly designed to integrate and interoperate in the future, with a variety of third-party credit-data providers, financial-information repositories, and ancillary data-aggregation services (including, without limitation, MyFreeScoreNow®, MyScoreIQ®, IdentityIQ®, and any successor, replacement, licensed, or proprietary data providers collectively referred to herein as the “Third-Party Data Providers”).</p>
<p>C. The User desires to obtain access to and utilize the Platform and the Services for the User’s own legitimate internal purposes and, in consideration of such access, expressly agrees to be bound by all terms, conditions, restrictions, and limitations set forth in this Agreement.</p>
<h2>ARTICLE I — GRANT OF LICENSE; SCOPE OF SERVICES; ACCESS; THIRD-PARTY SOURCES</h2>`;

router.get('/contract-templates/default', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user.id;

    let template = await db.getQuery(
      `SELECT id, name, description, content FROM contract_templates WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (!template) {
      const insertResult = await db.executeQuery(
        `INSERT INTO contract_templates (user_id, name, description, content, is_active, created_by, updated_by)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [userId, DEFAULT_TEMPLATE_NAME, DEFAULT_TEMPLATE_DESCRIPTION, DEFAULT_TEMPLATE_CONTENT, userId, userId]
      );
      const insertedId = (insertResult as any)?.insertId ?? (insertResult as any)?.lastID ?? null;
      template = await db.getQuery(
        `SELECT id, name, description, content FROM contract_templates WHERE id = ?`,
        [insertedId]
      );
      if (!template) {
        template = {
          id: insertedId,
          name: DEFAULT_TEMPLATE_NAME,
          description: DEFAULT_TEMPLATE_DESCRIPTION,
          content: DEFAULT_TEMPLATE_CONTENT
        } as any;
      }
    }

    return res.json({ success: true, data: template });
  } catch (error: any) {
    console.error('Error fetching default contract template:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch default template' });
  }
});

router.put('/contract-templates/default', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user.id;
    const { name, content, description } = req.body as { name?: string; content?: string; description?: string };

    let template = await db.getQuery(
      `SELECT id FROM contract_templates WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (!template) {
      const insertResult = await db.executeQuery(
        `INSERT INTO contract_templates (user_id, name, description, content, is_active, created_by, updated_by)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [userId, name || DEFAULT_TEMPLATE_NAME, description || DEFAULT_TEMPLATE_DESCRIPTION, content || DEFAULT_TEMPLATE_CONTENT, userId, userId]
      );
      const insertedId = (insertResult as any)?.insertId ?? (insertResult as any)?.lastID ?? null;
      template = { id: insertedId } as any;
    }

    const fields: string[] = [];
    const params: any[] = [];
    if (typeof name !== 'undefined') {
      fields.push('name = ?');
      params.push(name);
    }
    if (typeof description !== 'undefined') {
      fields.push('description = ?');
      params.push(description);
    }
    if (typeof content !== 'undefined') {
      fields.push('content = ?');
      params.push(content);
    }
    if (fields.length > 0) {
      fields.push('updated_by = ?');
      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);
      params.push(template.id);
      await db.executeQuery(
        `UPDATE contract_templates SET ${fields.join(', ')} WHERE id = ?`,
        params
      );
    }

    const updated = await db.getQuery(
      `SELECT id, name, description, content FROM contract_templates WHERE id = ?`,
      [template.id]
    );

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating default contract template:', error);
    return res.status(500).json({ success: false, error: 'Failed to update default template' });
  }
});

// Create admin profile
router.post('/admins', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔵 POST /admins - Request body:', JSON.stringify(req.body, null, 2));
    const userId = (req as any).user.id;
    const adminData = createAdminProfileSchema.parse(req.body);
    console.log('🔵 POST /admins - Parsed admin data:', JSON.stringify(adminData, null, 2));

    const db = getDatabaseAdapter();
    
    // Check if email already exists
    const existingUser = await db.getQuery(
      'SELECT * FROM users WHERE email = ?',
      [adminData.email]
    );

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Split name into first and last name
    const nameParts = adminData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Normalize status for MySQL enum compatibility (use 'inactive' for 'suspended')
    const normalizedStatus = adminData.status === 'suspended' ? 'inactive' : adminData.status;

    // Create new user with admin role, with safe fallback if audit columns are missing
    let result;
    try {
      result = await db.executeQuery(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, 'admin', ?, ?, ?)`,
        [firstName, lastName, adminData.email, hashedPassword, normalizedStatus, userId, userId]
      );
    } catch (insertErr: any) {
      // Fallback for MySQL databases missing audit columns
      const msg: string = insertErr?.sqlMessage || insertErr?.message || '';
      const code: string = insertErr?.code || '';
      if (code === 'ER_BAD_FIELD_ERROR' || msg.includes("Unknown column 'created_by'")) {
        console.warn('⚠️  users.created_by/updated_by missing; inserting without audit columns');
        result = await db.executeQuery(
          `INSERT INTO users (first_name, last_name, email, password_hash, role, status)
           VALUES (?, ?, ?, ?, 'admin', ?)`,
          [firstName, lastName, adminData.email, hashedPassword, normalizedStatus]
        );
      } else {
        throw insertErr;
      }
    }

    const newUserId = result.insertId;

    // Auto-create affiliate profile for this new admin with same email and password
    try {
      // Check if an affiliate with this email already exists
      const existingAffiliate = await db.getQuery(
        'SELECT id, admin_id FROM affiliates WHERE email = ?',
        [adminData.email]
      );

      if (!existingAffiliate) {
        const dbType = db.getType();
        const emailVerifiedValue = dbType === 'mysql' ? true : 1;

        // Minimal insert to avoid unknown column issues across adapters
        await db.executeQuery(
          `INSERT INTO affiliates (
             admin_id, email, password_hash, first_name, last_name,
             commission_rate, status, email_verified
           ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
          [
            newUserId,
            adminData.email,
            hashedPassword,
            firstName,
            lastName,
            10.0,
            emailVerifiedValue
          ]
        );
        console.log('🟢 Auto-created affiliate profile for admin ID:', newUserId);
      } else {
        // Sync existing affiliate to this admin and ensure password matches
        const dbType = db.getType();
        const emailVerifiedValue = dbType === 'mysql' ? true : 1;
        await db.executeQuery(
          `UPDATE affiliates 
             SET admin_id = ?, password_hash = ?, status = 'active', email_verified = ?
           WHERE id = ?`,
          [newUserId, hashedPassword, emailVerifiedValue, (existingAffiliate as any).id]
        );
        console.log('🟢 Updated existing affiliate to link admin and sync password. Admin ID:', newUserId);
      }
    } catch (affiliateError) {
      console.error('⚠️ Failed to auto-create/update affiliate profile for new admin:', affiliateError);
      // Continue without failing the admin creation
    }

    // Create admin profile entry if admin_profiles table exists
    try {
      await db.executeQuery(
        `INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, phone, emergency_contact, notes, is_active, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          JSON.stringify(adminData.permissions),
          mapAdminUiAccessLevelToDb(adminData.accessLevel),
          adminData.department || 'General',
          adminData.title || 'Admin User',
          adminData.phone || null,
          adminData.emergency_contact || null,
          adminData.notes || null,
          adminData.status === 'active' ? 1 : 0,
          userId,
          userId
        ]
      );
    } catch (profileError) {
      console.log('Admin profiles table may not exist, skipping profile creation');
    }

    // Fetch the created user
    const createdAdmin = await db.getQuery(
      `SELECT u.*, 
              COALESCE(ap.access_level, 'admin') as access_level,
              COALESCE(ap.department, 'General') as department,
              COALESCE(ap.title, 'Admin User') as title,
              COALESCE(ap.permissions, '[]') as permissions,
              CASE WHEN u.status = 'active' THEN 1 ELSE 0 END as is_active
       FROM users u
       LEFT JOIN admin_profiles ap ON u.id = ap.user_id
       WHERE u.id = ?`,
      [newUserId]
    );

    // Remove sensitive data
    const { password_hash, ...sanitizedAdmin } = createdAdmin;

    try {
      const titleMsg = 'Admin User Added';
      const msg = `Admin ${adminData.email} added by ${(req as any)?.user?.email || 'system'} (IP: ${req.ip})`;
      await AdminNotificationService.broadcastToAllAdmins(
        titleMsg,
        msg,
        'success',
        'high',
        '/admin/users',
        'View Admins'
      );
    } catch (notifyErr) {
    }
    console.log('🟢 POST /admins - Admin created successfully with ID:', newUserId);
    res.status(201).json({
      success: true,
      data: {
        ...sanitizedAdmin,
        permissions: typeof createdAdmin.permissions === 'string' ? JSON.parse(createdAdmin.permissions) : createdAdmin.permissions
      }
    });
  } catch (error) {
    console.error('🔴 POST /admins - Error creating admin profile:', error);
    
    if (error instanceof z.ZodError) {
      console.error('🔴 POST /admins - Validation error:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid admin data',
        details: error.errors
      });
    }

    res.status(500).json({ success: false, error: 'Failed to create admin profile' });
  }
});

// Update admin profile
router.put('/admins/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔵 PUT /admins/:id - Request body:', JSON.stringify(req.body, null, 2));
    const adminId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const adminData = updateAdminProfileSchema.parse(req.body);
    console.log('🔵 PUT /admins/:id - Parsed admin data:', JSON.stringify(adminData, null, 2));

    const db = getDatabaseAdapter();
    
    // Check if user exists and is admin
    const existingAdmin = await db.getQuery(
      "SELECT * FROM users WHERE id = ? AND role = 'admin'",
      [adminId]
    );

    if (!existingAdmin) {
      return res.status(404).json({ success: false, error: 'Admin user not found' });
    }

    // Check if email is being updated and if it already exists
    if (adminData.email && adminData.email !== existingAdmin.email) {
      const existingUser = await db.getQuery(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        [adminData.email, adminId]
      );

      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      }
    }

    // Prepare user table updates
    const userUpdates = [];
    const userValues = [];

    if (adminData.name) {
      const nameParts = adminData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      userUpdates.push('first_name = ?', 'last_name = ?');
      userValues.push(firstName, lastName);
    }

    if (adminData.email) {
      userUpdates.push('email = ?');
      userValues.push(adminData.email);
    }

    if (adminData.password) {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      userUpdates.push('password_hash = ?');
      userValues.push(hashedPassword);
    }

    if (adminData.status) {
      const normalizedStatus = adminData.status === 'suspended' ? 'inactive' : adminData.status;
      userUpdates.push('status = ?');
      userValues.push(normalizedStatus);
    }

    if (adminData.role) {
      userUpdates.push('role = ?');
      userValues.push(adminData.role);
    }

    // Update users table if there are changes
    if (userUpdates.length > 0) {
      const updatesWithAudit = [...userUpdates, 'updated_by = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const valuesWithAudit = [...userValues, userId, adminId];
      
      try {
        await db.executeQuery(
          `UPDATE users SET ${updatesWithAudit.join(', ')} WHERE id = ?`,
          valuesWithAudit
        );
      } catch (updateErr: any) {
        const msg: string = updateErr?.sqlMessage || updateErr?.message || '';
        const code: string = updateErr?.code || '';
        if (code === 'ER_BAD_FIELD_ERROR' || msg.includes("Unknown column 'updated_by'")) {
          console.warn('⚠️  users.updated_by missing; updating without audit column');
          const updatesWithoutAudit = [...userUpdates, 'updated_at = CURRENT_TIMESTAMP'];
          const valuesWithoutAudit = [...userValues, adminId];
          await db.executeQuery(
            `UPDATE users SET ${updatesWithoutAudit.join(', ')} WHERE id = ?`,
            valuesWithoutAudit
          );
        } else {
          throw updateErr;
        }
      }
    }

    // Update admin_profiles table if it exists
    try {
      const profileUpdates = [];
      const profileValues = [];
      const normalizedPermissions = parseAdminPermissions(adminData.permissions);
      const mappedAccessLevel = mapAdminUiAccessLevelToDb(adminData.accessLevel);
      const profileIsActive = adminData.status === undefined
        ? existingAdmin.status === 'active' ? 1 : 0
        : adminData.status === 'active' ? 1 : 0;

      if (adminData.permissions) {
        profileUpdates.push('permissions = ?');
        profileValues.push(JSON.stringify(normalizedPermissions));
      }

      if (adminData.accessLevel) {
        profileUpdates.push('access_level = ?');
        profileValues.push(mappedAccessLevel);
      }

      if (adminData.department) {
        profileUpdates.push('department = ?');
        profileValues.push(adminData.department);
      }

      if (adminData.title) {
        profileUpdates.push('title = ?');
        profileValues.push(adminData.title);
      }

      if (adminData.phone) {
        profileUpdates.push('phone = ?');
        profileValues.push(adminData.phone);
      }

      if (adminData.emergency_contact) {
        profileUpdates.push('emergency_contact = ?');
        profileValues.push(adminData.emergency_contact);
      }

      if (adminData.notes) {
        profileUpdates.push('notes = ?');
        profileValues.push(adminData.notes);
      }

      if (adminData.status) {
        profileUpdates.push('is_active = ?');
        profileValues.push(adminData.status === 'active' ? 1 : 0);
      }

      if (profileUpdates.length > 0) {
        const profileUpdatesWithAudit = [...profileUpdates, 'updated_by = ?', 'updated_at = CURRENT_TIMESTAMP'];
        const profileValuesWithAudit = [...profileValues, userId, adminId];
        let profileUpdateResult;
        
        try {
          profileUpdateResult = await db.executeQuery(
            `UPDATE admin_profiles SET ${profileUpdatesWithAudit.join(', ')} WHERE user_id = ?`,
            profileValuesWithAudit
          );
        } catch (profileUpdateErr: any) {
          const msg: string = profileUpdateErr?.sqlMessage || profileUpdateErr?.message || '';
          const code: string = profileUpdateErr?.code || '';
          if (code === 'ER_BAD_FIELD_ERROR' || msg.includes("Unknown column 'updated_by'")) {
            console.warn('⚠️  admin_profiles.updated_by missing; updating without audit column');
            const profileUpdatesWithoutAudit = [...profileUpdates, 'updated_at = CURRENT_TIMESTAMP'];
            const profileValuesWithoutAudit = [...profileValues, adminId];
            profileUpdateResult = await db.executeQuery(
              `UPDATE admin_profiles SET ${profileUpdatesWithoutAudit.join(', ')} WHERE user_id = ?`,
              profileValuesWithoutAudit
            );
          } else {
            throw profileUpdateErr;
          }
        }

        if (getWriteResultRowCount(profileUpdateResult) === 0) {
          const defaultProfileValues = [
            adminId,
            JSON.stringify(normalizedPermissions),
            mappedAccessLevel,
            adminData.department || 'General',
            adminData.title || 'Admin User',
            adminData.phone ?? existingAdmin.phone ?? null,
            adminData.emergency_contact || null,
            adminData.notes || null,
            profileIsActive,
            userId,
            userId
          ];

          try {
            await db.executeQuery(
              `INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, phone, emergency_contact, notes, is_active, created_by, updated_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              defaultProfileValues
            );
          } catch (profileInsertErr: any) {
            const msg: string = profileInsertErr?.sqlMessage || profileInsertErr?.message || '';
            const code: string = profileInsertErr?.code || '';

            if (
              code === 'ER_BAD_FIELD_ERROR' ||
              msg.includes("Unknown column 'created_by'") ||
              msg.includes("Unknown column 'updated_by'")
            ) {
              await db.executeQuery(
                `INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, phone, emergency_contact, notes, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [
                  adminId,
                  JSON.stringify(normalizedPermissions),
                  mappedAccessLevel,
                  adminData.department || 'General',
                  adminData.title || 'Admin User',
                  adminData.phone ?? existingAdmin.phone ?? null,
                  adminData.emergency_contact || null,
                  adminData.notes || null,
                  profileIsActive
                ]
              );
            } else {
              throw profileInsertErr;
            }
          }
        }
      }
    } catch (profileError) {
      console.log('Admin profiles table may not exist, skipping profile update');
    }

    // Fetch updated admin user
    const updatedAdmin = await db.getQuery(
      `SELECT u.*, 
              COALESCE(ap.access_level, 'admin') as access_level,
              COALESCE(ap.department, 'General') as department,
              COALESCE(ap.title, 'Admin User') as title,
              COALESCE(ap.permissions, '[]') as permissions,
              CASE WHEN u.status = 'active' THEN 1 ELSE 0 END as is_active
       FROM users u
       LEFT JOIN admin_profiles ap ON u.id = ap.user_id
       WHERE u.id = ?`,
      [adminId]
    );

    // Remove sensitive data
    const { password_hash, ...sanitizedAdmin } = updatedAdmin;

    console.log('🟢 PUT /admins/:id - Admin updated successfully with ID:', adminId);
    res.json({
      success: true,
      data: {
        ...sanitizedAdmin,
        permissions: typeof updatedAdmin.permissions === 'string' ? JSON.parse(updatedAdmin.permissions) : updatedAdmin.permissions
      }
    });
  } catch (error) {
    console.error('🔴 PUT /admins/:id - Error updating admin profile:', error);
    
    if (error instanceof z.ZodError) {
      console.error('🔴 PUT /admins/:id - Validation error:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid admin data',
        details: error.errors
      });
    }

    res.status(500).json({ success: false, error: 'Failed to update admin profile' });
  }
});

// Delete admin profile
router.delete('/admins/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(req.params.id);
    const currentUserId = (req as any).user.id;

    const db = getDatabaseAdapter();
    
    // Check if user exists and is admin
    const existingAdmin = await db.getQuery(
      "SELECT * FROM users WHERE id = ? AND role = 'admin'",
      [adminId]
    );

    if (!existingAdmin) {
      return res.status(404).json({ success: false, error: 'Admin user not found' });
    }

    // Prevent self-deletion
    if (existingAdmin.id === currentUserId) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own admin profile' });
    }

    // Change user role from admin to user instead of deleting
    await db.executeQuery("UPDATE users SET role = 'user', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [currentUserId, adminId]);

    try {
      const titleMsg = 'Admin User Deleted';
      const nameOrEmail = existingAdmin.email || `${existingAdmin.first_name || ''} ${existingAdmin.last_name || ''}`.trim() || `ID ${adminId}`;
      const msg = `Admin ${nameOrEmail} deleted by ${(req as any)?.user?.email || 'system'} (IP: ${req.ip})`;
      await AdminNotificationService.broadcastToAllAdmins(
        titleMsg,
        msg,
        'warning',
        'high',
        '/admin/users',
        'View Admins'
      );
    } catch (notifyErr) {
    }
    res.json({ success: true, message: 'Admin profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin profile:', error);
    res.status(500).json({ success: false, error: 'Failed to delete admin profile' });
  }
});

// USER MANAGEMENT ROUTES

router.get('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, role, status, created_from, created_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (created_from) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(created_from);
    }

    if (created_to) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(created_to);
    }

    const db = getDatabaseAdapter();
    
    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    // Get users with additional stats
    const safeLimitUsers = Math.max(1, Math.min(100, Number(limit)));
    const safeOffsetUsers = Math.max(0, offset);
    const users = await db.allQuery(
      `SELECT u.*, 
              (SELECT COUNT(*) FROM clients WHERE user_id = u.id) as client_count,
              (SELECT COUNT(*) FROM disputes d JOIN clients c ON d.client_id = c.id WHERE c.user_id = u.id) as dispute_count,
              CASE WHEN u.role = 'admin' THEN 'admin' ELSE NULL END as access_level,
              CASE WHEN u.role = 'admin' THEN 'General' ELSE NULL END as department,
              CASE WHEN u.role = 'admin' THEN 'Admin User' ELSE NULL END as title
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ${safeLimitUsers} OFFSET ${safeOffsetUsers}`,
      params
    );

    // Remove sensitive data
    const sanitizedUsers = users.map(user => {
      const { password_hash, ...sanitizedUser } = user;
      return sanitizedUser;
    });

    res.json({
      success: true,
      data: sanitizedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }
    const db = getDatabaseAdapter();
    const user = await db.getQuery('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const { password_hash, ...sanitized } = user;
    res.json({ success: true, data: sanitized });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Get user activity logs
router.get('/users/:id/activity', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, limit = 20, activity_type, resource_type, date_from, date_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (activity_type) {
      whereClause += ' AND activity_type = ?';
      params.push(activity_type);
    }

    if (resource_type) {
      whereClause += ' AND resource_type = ?';
      params.push(resource_type);
    }

    if (date_from) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    const db = getDatabaseAdapter();
    
    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM user_activities ${whereClause}`,
      params
    );

    // Get activity logs
    const activities = await db.allQuery(
      `SELECT * FROM user_activities ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user activity' });
  }
});

// Update user status
router.patch('/users/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    const currentUserId = (req as any).user.id;

    if (!['active', 'inactive', 'locked', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Prevent self-status change
    if (userId === currentUserId) {
      return res.status(400).json({ success: false, error: 'Cannot change your own status' });
    }

    const db = getDatabaseAdapter();
    
    // Check if user exists
    const user = await db.getQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await db.executeQuery(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, userId]
    );

    // Log the activity
    await db.executeQuery(
      `INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id, description)
       VALUES (?, 'update', 'user', ?, ?)`,
      [currentUserId, userId, `Changed user status to ${status}`]
    );

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

// SUBSCRIPTION MANAGEMENT ROUTES

// Get all admin subscriptions
router.get('/subscriptions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, plan_id, status, expires_from, expires_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR asub.plan_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (plan_id) {
      whereClause += ' AND asub.plan_name = ?';
      params.push(plan_id);
    }

    if (status) {
      whereClause += ' AND asub.status = ?';
      params.push(status);
    }

    if (expires_from) {
      whereClause += ' AND DATE(asub.current_period_end) >= ?';
      params.push(expires_from);
    }

    if (expires_to) {
      whereClause += ' AND DATE(asub.current_period_end) <= ?';
      params.push(expires_to);
    }

    const db = getDatabaseAdapter();
    
    // Add admin filter if provided
    if (req.query.admin) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const adminTerm = `%${req.query.admin}%`;
      params.push(adminTerm, adminTerm, adminTerm);
    }

    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM subscriptions asub
       JOIN users u ON asub.user_id = u.id
       ${whereClause}`,
      params
    );

    // Sanitize pagination and inline LIMIT/OFFSET (MySQL doesn't allow placeholders)
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 10));
    const safeOffset = (pageNum - 1) * limitNum;

    // Get subscriptions with user and plan info
    const subscriptions = await db.allQuery(
      `SELECT asub.*, u.first_name, u.last_name, u.email,
              asub.plan_name, asub.plan_type
       FROM subscriptions asub
       JOIN users u ON asub.user_id = u.id
       ${whereClause}
       ORDER BY asub.created_at DESC
       LIMIT ${limitNum} OFFSET ${safeOffset}`,
      params
    );

    // Return subscriptions as-is since we don't have features in the subscriptions table
    const subscriptionsWithFeatures = subscriptions;

    res.json({
      success: true,
      data: subscriptionsWithFeatures,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

// Get upcoming renewals (must be before /subscriptions/:id route)
router.get('/subscriptions/upcoming-renewals', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, days = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 10));
    const safeDays = Math.max(0, parseInt(String(days), 10) || 30);
    const safeOffset = (pageNum - 1) * limitNum;
    
    const db = getDatabaseAdapter();
    
    console.log('Fetching upcoming renewals with params:', { page: pageNum, limit: limitNum, days: safeDays, offset: safeOffset });
    
    // First, let's check if subscriptions table exists and has data
    const tableCheck = await db.allQuery('SHOW TABLES LIKE "subscriptions"');
    console.log('Subscriptions table exists:', tableCheck.length > 0);
    
    if (tableCheck.length === 0) {
      // Table doesn't exist, return empty result
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0
        }
      });
    }
    
    // Check if there are any subscriptions at all
    const allSubscriptions = await db.allQuery('SELECT COUNT(*) as count FROM subscriptions');
    console.log('Total subscriptions in database:', allSubscriptions[0]?.count || 0);
    
    // Get subscriptions that are due for renewal within the specified days
    const renewals = await db.allQuery(
      `SELECT s.*, u.first_name, u.last_name, u.email,
              DATEDIFF(s.current_period_end, NOW()) as days_until_renewal
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active' 
         AND s.current_period_end >= NOW()
         AND s.current_period_end <= DATE_ADD(NOW(), INTERVAL ? DAY)
         AND (s.cancel_at_period_end = 0 OR s.cancel_at_period_end IS NULL)
       ORDER BY s.current_period_end ASC
       LIMIT ${limitNum} OFFSET ${safeOffset}`,
      [safeDays]
    );

    console.log('Found renewals:', renewals.length);

    // Get total count for pagination
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM subscriptions s
       WHERE s.status = 'active' 
         AND s.current_period_end >= NOW()
         AND s.current_period_end <= DATE_ADD(NOW(), INTERVAL ? DAY)
         AND (s.cancel_at_period_end = 0 OR s.cancel_at_period_end IS NULL)`,
      [safeDays]
    );

    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: renewals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming renewals:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch upcoming renewals', details: error.message });
  }
});

// Get recent cancellations (must be before /subscriptions/:id to avoid route conflict)
router.get('/subscriptions/recent-cancellations', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, days = 30, search } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 10));
    const safeDays = Math.max(0, parseInt(String(days), 10) || 30);
    const safeOffset = (pageNum - 1) * limitNum;
    const params: any[] = [safeDays];
    let searchClause = '';
    if (search) {
      const searchTerm = `%${String(search).trim()}%`;
      searchClause = `
           AND (
             u.first_name LIKE ?
             OR u.last_name LIKE ?
             OR u.email LIKE ?
             OR COALESCE(u.phone, '') LIKE ?
             OR COALESCE(s.cancellation_reason_text, '') LIKE ?
             OR COALESCE(s.cancellation_reason_code, '') LIKE ?
           )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    console.log('Fetching recent cancellations with params:', { page: pageNum, limit: limitNum, days: safeDays, offset: safeOffset });
    
    const db = getDatabaseAdapter();
    
    try {
      // Get recently cancelled subscriptions within the specified days
      const cancellations = await db.allQuery(
        `SELECT s.*, u.first_name, u.last_name, u.email, u.phone,
                COALESCE(s.cancellation_requested_at, s.updated_at) as cancellation_date,
                DATEDIFF(NOW(), COALESCE(s.cancellation_requested_at, s.updated_at)) as days_since_cancellation
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         WHERE s.cancel_at_period_end = 1
           AND COALESCE(s.cancellation_requested_at, s.updated_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)
           ${searchClause}
         ORDER BY COALESCE(s.cancellation_requested_at, s.updated_at) DESC
         LIMIT ${limitNum} OFFSET ${safeOffset}`,
        params
      );

      console.log('Found cancellations:', cancellations ? cancellations.length : 'null/undefined');
      console.log('Cancellations data:', JSON.stringify(cancellations, null, 2));

      // Get total count for pagination
      const countResult = await db.getQuery(
        `SELECT COUNT(*) as total FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         WHERE s.cancel_at_period_end = 1
           AND COALESCE(s.cancellation_requested_at, s.updated_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)
           ${searchClause}`,
        params
      );

      console.log('Count result:', JSON.stringify(countResult, null, 2));

      const total = countResult?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      console.log('Returning cancellations response:', { total, totalPages, dataCount: cancellations ? cancellations.length : 0 });

      res.json({
        success: true,
        data: cancellations || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      });
    } catch (queryError) {
      console.error('Query error in recent cancellations:', queryError);
      throw queryError;
    }
  } catch (error) {
    console.error('Error fetching recent cancellations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent cancellations' });
  }
});

// Get single subscription
router.get('/subscriptions/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    
    const db = getDatabaseAdapter();
    const subscription = await db.getQuery(
      `SELECT asub.*, u.first_name, u.last_name, u.email,
              asub.plan_name, asub.plan_type
       FROM subscriptions asub
       JOIN users u ON asub.user_id = u.id
       WHERE asub.id = ?`,
      [subscriptionId]
    );

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

// Create admin subscription
router.post('/subscriptions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const subscriptionData = createAdminSubscriptionSchema.parse(req.body);

    const db = getDatabaseAdapter();
    
    // Check if user exists
    const user = await db.getQuery(
      'SELECT * FROM users WHERE id = ?',
      [subscriptionData.user_id]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if plan exists
    const plan = await db.getQuery(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = true',
      [subscriptionData.plan_id]
    );

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Subscription plan not found or inactive' });
    }

    // Check for existing active subscription
    const existingSubscription = await db.getQuery(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [subscriptionData.user_id]
    );

    if (existingSubscription) {
      return res.status(400).json({ success: false, error: 'User already has an active subscription' });
    }

    const result = await db.executeQuery(
      `INSERT INTO subscriptions (user_id, plan_name, plan_type, status, current_period_start, current_period_end, cancel_at_period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subscriptionData.user_id,
        subscriptionData.plan_name || plan.name || 'Professional',
        subscriptionData.plan_type || 'monthly',
        subscriptionData.status,
        subscriptionData.current_period_start || new Date(),
        subscriptionData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subscriptionData.cancel_at_period_end ?? false
      ]
    );

    const subscriptionId = result.insertId;

    // Fetch the created subscription
    const createdSubscription = await db.getQuery(
      `SELECT asub.*, u.first_name, u.last_name, u.email
       FROM subscriptions asub
       JOIN users u ON asub.user_id = u.id
       WHERE asub.id = ?`,
      [subscriptionId]
    );

    res.status(201).json({
      success: true,
      data: createdSubscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data',
        details: error.errors
      });
    }

    res.status(500).json({ success: false, error: 'Failed to create subscription' });
  }
});

// Update subscription
router.put('/subscriptions/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const subscriptionData = updateAdminSubscriptionSchema.parse(req.body);

    const db = getDatabaseAdapter();
    
    // Check if subscription exists
    const existingSubscription = await db.getQuery(
      'SELECT * FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );

    if (!existingSubscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    // Skip plan validation since we're using plan_name directly

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(subscriptionData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    await db.executeQuery(
      `UPDATE subscriptions SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...updateValues, subscriptionId]
    );

    // Fetch updated subscription
    const updatedSubscription = await db.getQuery(
      `SELECT asub.*, u.first_name, u.last_name, u.email
       FROM subscriptions asub
       JOIN users u ON asub.user_id = u.id
       WHERE asub.id = ?`,
      [subscriptionId]
    );

    res.json({
      success: true,
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data',
        details: error.errors
      });
    }

    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

// Cancel subscription
router.patch('/subscriptions/:id/cancel', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const { reason } = req.body;

    const db = getDatabaseAdapter();
    
    // Check if subscription exists
    const existingSubscription = await db.getQuery(
      'SELECT * FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );

    if (!existingSubscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    if (existingSubscription.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Subscription is already cancelled' });
    }

    await db.executeQuery(
      `UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [subscriptionId]
    );

    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Renew subscription
router.patch('/subscriptions/:id/renew', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const { expires_at } = req.body;

    if (!expires_at) {
      return res.status(400).json({ success: false, error: 'New expiration date is required' });
    }

    const db = getDatabaseAdapter();
    
    // Check if subscription exists
    const existingSubscription = await db.getQuery(
      'SELECT * FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );

    if (!existingSubscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    await db.executeQuery(
      `UPDATE subscriptions SET status = 'active', current_period_end = ?, cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [expires_at, subscriptionId]
    );

    res.json({ success: true, message: 'Subscription renewed successfully' });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to renew subscription' });
  }
});

// Get subscription analytics
router.get('/analytics/subscriptions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    
    // Get total subscriptions count
    const totalResult = await db.getQuery(
      `SELECT COUNT(*) as count FROM subscriptions`
    );
    const totalSubscriptions = totalResult?.count || 0;

    // Get subscription status counts
    const statusCounts = await db.allQuery(
      `SELECT status, COUNT(*) as count FROM subscriptions GROUP BY status`
    );

    // Extract specific status counts
    const activeSubscriptions = statusCounts.find(s => s.status === 'active')?.count || 0;
    const cancelledSubscriptions = statusCounts.find(s => s.status === 'cancelled')?.count || 0;
    const expiredSubscriptions = statusCounts.find(s => s.status === 'expired')?.count || 0;

    // Get monthly revenue (active subscriptions) - simplified since we don't have price in subscriptions table
    const revenueResult = await db.getQuery(
      `SELECT COUNT(*) * 29.99 as total_revenue
       FROM subscriptions
       WHERE status = 'active' AND plan_type = 'monthly'`
    );
    const monthlyRevenue = revenueResult?.total_revenue || 0;

    // Calculate renewal rate (active vs total)
    const renewalRate = totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0;
    
    // Calculate churn rate (cancelled vs total)
    const churnRate = totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0;

    // Calculate average lifetime (simplified - days between start and end for completed subscriptions)
    const lifetimeResult = await db.getQuery(
      `SELECT AVG(DATEDIFF(COALESCE(current_period_end, NOW()), current_period_start)) as avg_days
       FROM subscriptions
       WHERE current_period_start IS NOT NULL`
    );
    const averageLifetime = Math.round(lifetimeResult?.avg_days || 0);

    res.json({
      success: true,
      data: {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        monthlyRevenue,
        renewalRate,
        churnRate,
        averageLifetime
      }
    });
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription analytics' });
  }
});

// Stripe Revenue (platform-wide)
router.get('/analytics/stripe-revenue', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const cfg = await db.getQuery('SELECT stripe_secret_key FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1');
    const secret = (cfg && cfg.stripe_secret_key) ? String(cfg.stripe_secret_key) : process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }
    const stripe = new Stripe(secret);

    const { from, to, group_by } = req.query as any;
    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(String(to)) : new Date();
    const groupBy: 'day' | 'month' = (String(group_by || 'day') === 'month') ? 'month' : 'day';

    const fromUnix = Math.floor(fromDate.getTime() / 1000);
    const toUnix = Math.floor(toDate.getTime() / 1000);

    const getBucketKey = (date: Date) => (
      groupBy === 'month'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10)
    );

    const bucketDates: Array<{ key: string; start: Date; end: Date }> = [];
    const cursor = new Date(fromDate);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= toDate) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      if (groupBy === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }

      bucketDates.push({ key: getBucketKey(start), start, end });

      if (groupBy === 'month') {
        cursor.setMonth(cursor.getMonth() + 1, 1);
      } else {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const metricSeriesMap = new Map<string, {
      date: string;
      grossVolume: number;
      netVolume: number;
      newCustomers: number;
      activeSubscribers: number;
      mrr: number;
      failedPayments: number;
      refundedVolume: number;
    }>();

    const getMetricPoint = (key: string) => {
      const existing = metricSeriesMap.get(key);
      if (existing) {
        return existing;
      }

      const next = {
        date: key,
        grossVolume: 0,
        netVolume: 0,
        newCustomers: 0,
        activeSubscribers: 0,
        mrr: 0,
        failedPayments: 0,
        refundedVolume: 0,
      };
      metricSeriesMap.set(key, next);
      return next;
    };

    bucketDates.forEach(({ key }) => {
      getMetricPoint(key);
    });

    let startingAfter: string | undefined = undefined;
    let hasMore = true;
    let totalRevenue = 0;
    let grossVolume = 0;
    let failedPayments = 0;
    const seriesMap = new Map<string, number>();
    const failedPaymentList: Array<{
      id: string;
      date: string;
      amount: number;
      currency: string;
      email: string | null;
      customerName: string | null;
      status: string;
    }> = [];
    const customerSpendMap = new Map<string, {
      customerKey: string;
      email: string | null;
      customerName: string | null;
      totalSpend: number;
      paymentCount: number;
      currency: string;
    }>();

    while (hasMore) {
      const list = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: fromUnix, lte: toUnix },
        expand: ['data.latest_charge', 'data.customer'],
        ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      for (const pi of list.data) {
        const charge = pi.latest_charge && typeof pi.latest_charge !== 'string'
          ? pi.latest_charge
          : null;
        const customer = pi.customer && typeof pi.customer !== 'string' && !('deleted' in pi.customer)
          ? pi.customer
          : null;
        const email = pi.receipt_email || charge?.billing_details?.email || customer?.email || null;
        const customerName = charge?.billing_details?.name || customer?.name || null;
        const customerKey = String(customer?.id || email || pi.id);

        if (pi.status === 'succeeded') {
          const amount = typeof pi.amount === 'number' ? Number(pi.amount) / 100 : 0;
          totalRevenue += amount;
          grossVolume += amount;
          const dt = new Date(pi.created * 1000);
          const key = getBucketKey(dt);
          seriesMap.set(key, (seriesMap.get(key) || 0) + amount);
          getMetricPoint(key).grossVolume += amount;

          const existingCustomer = customerSpendMap.get(customerKey) || {
            customerKey,
            email,
            customerName,
            totalSpend: 0,
            paymentCount: 0,
            currency: String(pi.currency || 'usd').toUpperCase(),
          };
          existingCustomer.totalSpend += amount;
          existingCustomer.paymentCount += 1;
          existingCustomer.email = existingCustomer.email || email;
          existingCustomer.customerName = existingCustomer.customerName || customerName;
          customerSpendMap.set(customerKey, existingCustomer);
        } else if (pi.last_payment_error || pi.status === 'canceled') {
          failedPayments += 1;
          const failedDate = new Date(pi.created * 1000);
          const failedKey = getBucketKey(failedDate);
          getMetricPoint(failedKey).failedPayments += 1;
          failedPaymentList.push({
            id: pi.id,
            date: failedDate.toISOString(),
            amount: typeof pi.amount === 'number' ? Number(pi.amount) / 100 : 0,
            currency: String(pi.currency || 'usd').toUpperCase(),
            email,
            customerName,
            status: String(pi.status || 'failed'),
          });
        }
      }
      hasMore = list.has_more;
      if (hasMore && list.data.length > 0) {
        startingAfter = list.data[list.data.length - 1].id;
      }
    }

    const series = Array.from(seriesMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Previous period revenue for growth comparison (same length as current range)
    const rangeDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const prevFromUnix = Math.floor(prevFromDate.getTime() / 1000);
    const prevToUnix = Math.floor(prevToDate.getTime() / 1000);

    let prevStartingAfter: string | undefined = undefined;
    let prevHasMore = true;
    let previousRevenue = 0;
    while (prevHasMore) {
      const list = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: prevFromUnix, lte: prevToUnix },
        ...(prevStartingAfter ? { starting_after: prevStartingAfter } : {})
      });
      for (const pi of list.data) {
        if (pi.status === 'succeeded') {
          const amount = typeof pi.amount === 'number' ? Number(pi.amount) / 100 : 0;
          previousRevenue += amount;
        }
      }
      prevHasMore = list.has_more;
      if (prevHasMore && list.data.length > 0) {
        prevStartingAfter = list.data[list.data.length - 1].id;
      }
    }

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    let refundedVolume = 0;
    let refundStartingAfter: string | undefined = undefined;
    let refundsHasMore = true;

    while (refundsHasMore) {
      const refunds = await stripe.refunds.list({
        limit: 100,
        created: { gte: fromUnix, lte: toUnix },
        ...(refundStartingAfter ? { starting_after: refundStartingAfter } : {}),
      });

      for (const refund of refunds.data) {
        const amount = typeof refund.amount === 'number' ? Number(refund.amount) / 100 : 0;
        refundedVolume += amount;
        const refundDate = new Date(refund.created * 1000);
        const refundKey = getBucketKey(refundDate);
        getMetricPoint(refundKey).refundedVolume += amount;
      }

      refundsHasMore = refunds.has_more;
      if (refundsHasMore && refunds.data.length > 0) {
        refundStartingAfter = refunds.data[refunds.data.length - 1].id;
      }
    }

    let newCustomers = 0;
    let customerStartingAfter: string | undefined = undefined;
    let customersHasMore = true;

    while (customersHasMore) {
      const customers = await stripe.customers.list({
        limit: 100,
        created: { gte: fromUnix, lte: toUnix },
        ...(customerStartingAfter ? { starting_after: customerStartingAfter } : {}),
      });

      for (const customer of customers.data) {
        if ((customer as any).deleted) {
          continue;
        }
        newCustomers += 1;
        const customerDate = new Date(customer.created * 1000);
        const customerKey = getBucketKey(customerDate);
        getMetricPoint(customerKey).newCustomers += 1;
      }

      customersHasMore = customers.has_more;
      if (customersHasMore && customers.data.length > 0) {
        customerStartingAfter = customers.data[customers.data.length - 1].id;
      }
    }

    let activeSubscribers = 0;
    let mrr = 0;
    let subscriptionStartingAfter: string | undefined = undefined;
    let subscriptionsHasMore = true;
    const allSubscriptions: any[] = [];

    while (subscriptionsHasMore) {
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: 'all',
        expand: ['data.items.data.price'],
        ...(subscriptionStartingAfter ? { starting_after: subscriptionStartingAfter } : {}),
      });

      allSubscriptions.push(...subscriptions.data);

      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          continue;
        }

        activeSubscribers += 1;

        for (const item of subscription.items.data) {
          const quantity = Number(item.quantity || 1);
          const unitAmount = typeof item.price?.unit_amount === 'number' ? Number(item.price.unit_amount) / 100 : 0;
          const recurring = item.price?.recurring;

          if (!recurring || !unitAmount) {
            continue;
          }

          const intervalCount = Number(recurring.interval_count || 1);
          let monthlyAmount = unitAmount * quantity;

          if (recurring.interval === 'year') {
            monthlyAmount = (unitAmount * quantity) / (12 * intervalCount);
          } else if (recurring.interval === 'week') {
            monthlyAmount = ((unitAmount * quantity) * 52) / (12 * intervalCount);
          } else if (recurring.interval === 'day') {
            monthlyAmount = ((unitAmount * quantity) * 365) / (12 * intervalCount);
          } else {
            monthlyAmount = (unitAmount * quantity) / intervalCount;
          }

          mrr += monthlyAmount;
        }
      }

      subscriptionsHasMore = subscriptions.has_more;
      if (subscriptionsHasMore && subscriptions.data.length > 0) {
        subscriptionStartingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    for (const subscription of allSubscriptions) {
      const subscriptionAny = subscription as any;
      const createdAt = typeof subscriptionAny.created === 'number'
        ? subscriptionAny.created * 1000
        : null;
      const endedAt = typeof subscriptionAny.ended_at === 'number'
        ? subscriptionAny.ended_at * 1000
        : typeof subscriptionAny.canceled_at === 'number'
          ? subscriptionAny.canceled_at * 1000
          : typeof subscriptionAny.current_period_end === 'number' && subscriptionAny.status === 'canceled'
            ? subscriptionAny.current_period_end * 1000
            : null;

      let monthlyAmount = 0;
      for (const item of subscription.items?.data || []) {
        const quantity = Number(item.quantity || 1);
        const unitAmount = typeof item.price?.unit_amount === 'number' ? Number(item.price.unit_amount) / 100 : 0;
        const recurring = item.price?.recurring;

        if (!recurring || !unitAmount) {
          continue;
        }

        const intervalCount = Number(recurring.interval_count || 1);
        if (recurring.interval === 'year') {
          monthlyAmount += (unitAmount * quantity) / (12 * intervalCount);
        } else if (recurring.interval === 'week') {
          monthlyAmount += ((unitAmount * quantity) * 52) / (12 * intervalCount);
        } else if (recurring.interval === 'day') {
          monthlyAmount += ((unitAmount * quantity) * 365) / (12 * intervalCount);
        } else {
          monthlyAmount += (unitAmount * quantity) / intervalCount;
        }
      }

      if (!createdAt || !monthlyAmount) {
        continue;
      }

      for (const bucket of bucketDates) {
        const bucketStart = bucket.start.getTime();
        const bucketEnd = bucket.end.getTime();
        const isActiveInBucket = createdAt <= bucketEnd && (!endedAt || endedAt >= bucketStart);

        if (!isActiveInBucket) {
          continue;
        }

        const metricPoint = getMetricPoint(bucket.key);
        metricPoint.activeSubscribers += 1;
        metricPoint.mrr += monthlyAmount;
      }
    }

    const topCustomers = Array.from(customerSpendMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5)
      .map((customer) => ({
        customerKey: customer.customerKey,
        email: customer.email,
        customerName: customer.customerName,
        totalSpend: Math.round(customer.totalSpend * 100) / 100,
        paymentCount: customer.paymentCount,
        currency: customer.currency,
      }));

    const netVolume = grossVolume - refundedVolume;
    const summarySeries = bucketDates
      .map(({ key }) => {
        const point = getMetricPoint(key);
        return {
          date: key,
          grossVolume: Math.round(point.grossVolume * 100) / 100,
          netVolume: Math.round((point.grossVolume - point.refundedVolume) * 100) / 100,
          newCustomers: point.newCustomers,
          activeSubscribers: point.activeSubscribers,
          mrr: Math.round(point.mrr * 100) / 100,
          failedPayments: point.failedPayments,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    failedPaymentList.sort((a, b) => b.date.localeCompare(a.date));

    return res.json({
      success: true,
      data: {
        totalRevenue,
        revenueGrowth,
        summary: {
          grossVolume: Math.round(grossVolume * 100) / 100,
          mrr: Math.round(mrr * 100) / 100,
          netVolume: Math.round(netVolume * 100) / 100,
          failedPayments,
          newCustomers,
          activeSubscribers,
          summarySeries,
          failedPaymentList: failedPaymentList.slice(0, 10),
          topCustomers,
        },
        series,
        group_by: groupBy,
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching Stripe revenue:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe revenue' });
  }
});

// Stripe Payments time series (detailed)
router.get('/analytics/stripe-payments', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const cfg = await db.getQuery('SELECT stripe_secret_key FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1');
    const secret = (cfg && cfg.stripe_secret_key) ? String(cfg.stripe_secret_key) : process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }
    const stripe = new Stripe(secret);

    const { from, to } = req.query as any;
    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(String(to)) : new Date();
    const fromUnix = Math.floor(fromDate.getTime() / 1000);
    const toUnix = Math.floor(toDate.getTime() / 1000);

    let startingAfter: string | undefined = undefined;
    let hasMore = true;
    const payments: Array<{
      date: string;
      amount: number;
      currency: string;
      id: string;
      email: string | null;
      customerName: string | null;
    }> = [];

    while (hasMore) {
      const list = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: fromUnix, lte: toUnix },
        expand: ['data.latest_charge', 'data.customer'],
        ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      for (const pi of list.data) {
        if (pi.status === 'succeeded') {
          const amount = typeof pi.amount === 'number' ? Number(pi.amount) / 100 : 0;
          const charge = pi.latest_charge && typeof pi.latest_charge !== 'string'
            ? pi.latest_charge
            : null;
          const customer = pi.customer && typeof pi.customer !== 'string' && !('deleted' in pi.customer)
            ? pi.customer
            : null;
          const email = pi.receipt_email || charge?.billing_details?.email || customer?.email || null;
          const customerName = charge?.billing_details?.name || customer?.name || null;
          payments.push({
            date: new Date(pi.created * 1000).toISOString().slice(0, 10),
            amount,
            currency: (pi.currency || 'usd').toUpperCase(),
            id: pi.id,
            email,
            customerName,
          });
        }
      }
      hasMore = list.has_more;
      if (hasMore && list.data.length > 0) {
        startingAfter = list.data[list.data.length - 1].id;
      }
    }

    payments.sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      data: payments,
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    });
  } catch (error) {
    console.error('Error fetching Stripe payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe payments' });
  }
});

// Stripe Configuration Management

// Get current Stripe configuration
router.get('/stripe-config', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const config = await db.getQuery(
      'SELECT * FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    if (config) {
      res.json({
        success: true,
        config: {
          stripe_publishable_key: config.stripe_publishable_key,
          webhook_endpoint_secret: config.webhook_endpoint_secret,
          is_active: config.is_active
        }
      });
    } else {
      res.json({ success: true, config: null });
    }
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe configuration' });
  }
});

// Alternative route path for frontend compatibility
router.get('/stripe/config', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    
    const config = await db.getQuery(
      'SELECT * FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    // Don't send secret keys to frontend, only show if they exist
    const safeConfig = config ? {
      id: config.id,
      stripe_publishable_key: config.stripe_publishable_key,
      has_secret_key: !!config.stripe_secret_key,
      has_webhook_secret: !!config.webhook_endpoint_secret,
      is_active: config.is_active,
      created_at: config.created_at,
      updated_at: config.updated_at
    } : null;
    
    res.json({
      success: true,
      config: safeConfig
    });
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe configuration' });
  }
});

// Affiliate Commission Settings
router.get('/affiliate-commission-settings', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const settings = await getAffiliateCommissionSettings(db);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching affiliate commission settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch affiliate commission settings' });
  }
});

router.post('/affiliate-commission-settings', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = affiliateCommissionSettingsSchema.parse(req.body);
    const userId = (req as any).user?.id;
    const db = getDatabaseAdapter();
    await upsertAffiliateCommissionSettings(db, userId, parsed);
    res.json({ success: true, settings: parsed });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid affiliate commission settings' });
    }
    console.error('Error updating affiliate commission settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update affiliate commission settings' });
  }
});

router.get('/open-ai-configuration', authenticateToken, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const configuration = await getOpenAiConfiguration(db);
    res.json({ success: true, configuration });
  } catch (error) {
    console.error('Error fetching Open AI configuration:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Open AI configuration' });
  }
});

router.post('/open-ai-configuration', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = openAiConfigurationSchema.parse(req.body);
    const userId = (req as any).user?.id;
    const db = getDatabaseAdapter();
    await upsertOpenAiConfiguration(db, userId, parsed.template);
    res.json({ success: true, configuration: parsed });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid Open AI configuration' });
    }
    console.error('Error updating Open AI configuration:', error);
    res.status(500).json({ success: false, error: 'Failed to update Open AI configuration' });
  }
});

router.get('/business-directories', authenticateToken, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const directories = await listBusinessDirectories(db);
    res.json({ success: true, directories });
  } catch (error) {
    console.error('Error fetching business directories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch business directories' });
  }
});

router.post('/business-directories', authenticateToken, requireSuperAdmin, businessDirectoryLogoUpload.single('logo'), async (req: Request, res: Response) => {
  try {
    const parsed = businessDirectorySchema.parse(req.body);
    const userId = Number((req as any).user?.id || 0) || null;
    const logoUrl = (req as any).file ? `/uploads/business-directories/${(req as any).file.filename}` : null;
    const db = getDatabaseAdapter();

    await ensureBusinessDirectoriesTable(db);

    const insertResult = await db.executeQuery(
      `INSERT INTO business_directories
       (business_name, business_email, business_phone_number, business_address, logo_url, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.business_name,
        parsed.business_email,
        parsed.business_phone_number,
        parsed.business_address,
        logoUrl,
        userId,
        userId,
      ],
    );

    const insertedId = Number((insertResult as any)?.insertId ?? (insertResult as any)?.lastID ?? 0);
    const createdDirectory = insertedId
      ? await getBusinessDirectoryById(db, insertedId)
      : (await listBusinessDirectories(db))[0] || null;

    res.status(201).json({ success: true, directory: createdDirectory });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid business directory payload' });
    }
    console.error('Error creating business directory:', error);
    res.status(500).json({ success: false, error: 'Failed to create business directory' });
  }
});

router.put('/business-directories/:id', authenticateToken, requireSuperAdmin, businessDirectoryLogoUpload.single('logo'), async (req: Request, res: Response) => {
  try {
    const directoryId = Number(req.params.id);
    if (!Number.isInteger(directoryId) || directoryId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid business directory id' });
    }

    const parsed = businessDirectorySchema.parse(req.body);
    const db = getDatabaseAdapter();
    await ensureBusinessDirectoriesTable(db);

    const existingDirectory = await getBusinessDirectoryById(db, directoryId);
    if (!existingDirectory) {
      return res.status(404).json({ success: false, error: 'Business directory not found' });
    }

    const removeLogo = String(req.body?.remove_logo ?? '').toLowerCase() === 'true';
    const nextLogoUrl = (req as any).file
      ? `/uploads/business-directories/${(req as any).file.filename}`
      : (removeLogo ? null : existingDirectory.logo_url);
    const userId = Number((req as any).user?.id || 0) || null;
    const updatedAtSql = db.getType() === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';

    await db.executeQuery(
      `UPDATE business_directories
       SET business_name = ?,
           business_email = ?,
           business_phone_number = ?,
           business_address = ?,
           logo_url = ?,
           updated_by = ?,
           updated_at = ${updatedAtSql}
       WHERE id = ?`,
      [
        parsed.business_name,
        parsed.business_email,
        parsed.business_phone_number,
        parsed.business_address,
        nextLogoUrl,
        userId,
        directoryId,
      ],
    );

    const updatedDirectory = await getBusinessDirectoryById(db, directoryId);
    res.json({ success: true, directory: updatedDirectory });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid business directory payload' });
    }
    console.error('Error updating business directory:', error);
    res.status(500).json({ success: false, error: 'Failed to update business directory' });
  }
});

router.delete('/business-directories/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const directoryId = Number(req.params.id);
    if (!Number.isInteger(directoryId) || directoryId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid business directory id' });
    }

    const db = getDatabaseAdapter();
    await ensureBusinessDirectoriesTable(db);

    const existingDirectory = await getBusinessDirectoryById(db, directoryId);
    if (!existingDirectory) {
      return res.status(404).json({ success: false, error: 'Business directory not found' });
    }

    await db.executeQuery('DELETE FROM business_directories WHERE id = ?', [directoryId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting business directory:', error);
    res.status(500).json({ success: false, error: 'Failed to delete business directory' });
  }
});

router.post('/admins/import-csv', authenticateToken, requireSuperAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const currentUserId = (req as any).user?.id;
    const file = (req as any).file;
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }
    const text = file.buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV must have header and at least one row' });
    }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('📥 CSV import received', { rows: lines.length - 1, header });
    function parseRow(line: string): string[] {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(v => v.trim());
    }
    function get(row: Record<string,string>, key: string): string {
      const k = key.toLowerCase();
      return row[k] ?? '';
    }
    function getAny(row: Record<string,string>, keys: string[]): string {
      for (const key of keys) {
        const val = get(row, key);
        if (val && String(val).trim().length > 0) return val;
      }
      return '';
    }
    const rows: Record<string,string>[] = lines.slice(1).map(line => {
      const values = parseRow(line);
      const obj: Record<string,string> = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = values[i] ?? '';
      return obj;
    });
    const results: any[] = [];

    // Load subscription plans (MySQL) for plan validation, price defaults, and permissions
    let planMap: Record<string, { id: number; name: string; billing_cycle: string; price: number; page_permissions?: string | null }> = {};
    try {
      const planRows = await db.executeQuery('SELECT id, name, billing_cycle, price, page_permissions FROM subscription_plans');
      if (Array.isArray(planRows)) {
        for (const p of planRows) {
          const key = String(p.name || '').toLowerCase();
          planMap[key] = { id: p.id, name: p.name, billing_cycle: p.billing_cycle, price: Number(p.price), page_permissions: p.page_permissions ?? null };
        }
      }
    } catch {}
    for (const row of rows) {
      try {
      const companyName = get(row, 'company name');
      const phone = get(row, 'phone');
      const email = get(row, 'email');
      const activeVal = get(row, 'active');
      const createdAtCsv = get(row, 'created');
      const lastLoginCsv = get(row, 'last login');
      const lastPaymentCsv = get(row, 'last payment');
      const stripeSubId = getAny(row, ['stripe_subscription_id','subscription_id','stripe_subscription']);
      const stripeCustomerId = getAny(row, ['stripe_customer_id','customer_id','stripe_customer']);
      const invoiceId = getAny(row, ['invoice id','invoice_id','invoice']);
      const paymentIntentId = getAny(row, [
        'payment id (payment intent id)',
        'payment id',
        'payment intent id',
        'payment_intent_id',
        'payment intent'
      ]);
      const planName = getAny(row, ['plan name','plan','subscription plan']);
      const planPrice = getAny(row, ['plan price','amount','price']);
      const adminCode = get(row, 'admin code');
      if (!email) {
        results.push({ email, status: 'skipped', reason: 'missing email' });
        continue;
      }
      const status = /^(active|yes|true|1)$/i.test(activeVal) ? 'active' : 'inactive';
      console.log('➡️ CSV row start', { email, status, planName, stripeCustomerId, stripeSubId, createdAtCsv, lastPaymentCsv });
      const passwordHash = adminCode ? await bcrypt.hash(adminCode, 10) : await bcrypt.hash('ChangeMe123!', 10);
      let userRow = await db.getQuery('SELECT * FROM users WHERE email = ?', [email]);
      let userId: number;
      if (userRow) {
        if (db.getType() === 'mysql') {
          await db.executeQuery('UPDATE users SET company_name = ?, phone = ?, role = ?, status = ?, last_login = ?, stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [companyName || null, phone || null, 'admin', status, lastLoginCsv || null, stripeCustomerId || null, userRow.id]);
        } else {
          const isActiveInt = status === 'active' ? 1 : 0;
          await db.executeQuery('UPDATE users SET company_name = ?, phone = ?, role = ?, is_active = ?, last_login = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [companyName || null, phone || null, 'admin', isActiveInt, lastLoginCsv || null, userRow.id]);
        }
        userId = userRow.id;
        const needNameUpdate = !((userRow?.first_name || '').trim()) || !((userRow?.last_name || '').trim());
        if (needNameUpdate) {
          const np = (companyName || '').trim().split(' ');
          const fn = np[0] || '';
          const ln = np.slice(1).join(' ') || '';
          await db.executeQuery('UPDATE users SET first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [fn, ln, userRow.id]);
        }
        console.log('👤 Updated existing user as admin', { userId, email });
      } else {
        const nameParts = (companyName || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        if (db.getType() === 'mysql') {
          const ins = await db.executeQuery('INSERT INTO users (email, password_hash, first_name, last_name, company_name, phone, role, status, stripe_customer_id, created_at, updated_at, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [email, passwordHash, firstName, lastName, companyName || null, phone || null, 'admin', status, stripeCustomerId || null, createdAtCsv || new Date(), new Date(), false]);
          userId = ins.insertId || ins?.lastID || 0;
        } else {
          const isActiveInt = status === 'active' ? 1 : 0;
          const ins = await db.executeQuery('INSERT INTO users (email, password_hash, first_name, last_name, company_name, phone, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [email, passwordHash, firstName, lastName, companyName || null, phone || null, 'admin', isActiveInt, createdAtCsv || new Date(), new Date()]);
          userId = ins.insertId || ins?.lastID || 0;
        }
        console.log('👤 Created new admin user', { userId, email });
      }
      try {
        const existingAffiliate = await db.getQuery('SELECT id FROM affiliates WHERE email = ? LIMIT 1', [email]);
        const defaultFirst = (userRow?.first_name || '').trim() || ((companyName || '').trim().split(' ')[0] || '');
        const defaultLast = (userRow?.last_name || '').trim() || ((companyName || '').trim().split(' ').slice(1).join(' ') || '');
        if (existingAffiliate) {
          await db.executeQuery('UPDATE affiliates SET admin_id = ?, first_name = ?, last_name = ?, company_name = ?, status = ?, plan_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId, defaultFirst, defaultLast, companyName || null, 'active', 'free', existingAffiliate.id]);
        } else {
          await db.executeQuery('INSERT INTO affiliates (admin_id, email, password_hash, first_name, last_name, company_name, plan_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [userId, email, passwordHash, defaultFirst, defaultLast, companyName || null, 'free', 'active']);
        }
        console.log('🤝 Affiliate upserted', { userId, email });
      } catch {}
      try {
        const existingProfile = await db.getQuery('SELECT id FROM admin_profiles WHERE user_id = ? LIMIT 1', [userId]);
        const isActiveInt = status === 'active' ? 1 : 0;
        const accessLevel = 'admin';
        let permissionsArr: string[] = [];
        // Derive permissions from plan page_permissions if available
        try {
          const pKey = String(planName || '').toLowerCase();
          const planInfo = planMap[pKey];
          if (planInfo && planInfo.page_permissions) {
            const raw = planInfo.page_permissions;
            if (typeof raw === 'string') {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) permissionsArr = parsed as string[];
              else if (parsed && Array.isArray((parsed as any).permissions)) permissionsArr = (parsed as any).permissions;
            }
          }
        } catch {}
        const permissionsJson = JSON.stringify(permissionsArr);
        if (existingProfile) {
          try {
            await db.executeQuery(
              'UPDATE admin_profiles SET permissions = ?, access_level = ?, department = ?, title = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
              [permissionsJson, accessLevel, 'General', 'Admin User', isActiveInt, currentUserId, userId]
            );
          } catch {
            await db.executeQuery(
              'UPDATE admin_profiles SET permissions = ?, access_level = ?, department = ?, title = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
              [permissionsJson, accessLevel, 'General', 'Admin User', isActiveInt, userId]
            );
          }
          console.log('🧩 Admin profile updated', { userId, department: 'General', title: 'Admin User' });
        } else {
          try {
            await db.executeQuery(
              'INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, is_active, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [userId, permissionsJson, accessLevel, 'General', 'Admin User', isActiveInt, currentUserId, currentUserId]
            );
          } catch {
            await db.executeQuery(
              'INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [userId, permissionsJson, accessLevel, 'General', 'Admin User', isActiveInt]
            );
          }
          console.log('🧩 Admin profile created', { userId, department: 'General', title: 'Admin User' });
        }
      } catch {}
      // Plan determination via DB first, fallback to heuristics
      let planType = 'monthly';
      let planPriceNum = planPrice ? parseFloat(planPrice) : undefined;
      const planKey = String(planName || '').toLowerCase();
      if (planKey && planMap[planKey]) {
        const p = planMap[planKey];
        planType = p.billing_cycle === 'yearly' ? 'yearly' : p.billing_cycle === 'lifetime' ? 'lifetime' : 'monthly';
        if (planPriceNum == null || isNaN(planPriceNum)) planPriceNum = Number(p.price) || 0;
      } else {
        if (/year/i.test(planName)) planType = 'yearly';
      }

      // Normalize CSV date values to valid Date objects for MySQL
      function parseCsvDate(val: any): Date | null {
        if (!val) return null;
        if (val instanceof Date) return val;
        const s = String(val).trim();
        if (!s) return null;
        // Try common formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
        // Prefer ISO-parse; if fails, manually rearrange
        let d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        // Handle MM/DD/YYYY
        const mdY = s.match(/^([0-1]?\d)\/[0-3]?\d\/(\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
        if (mdY) {
          const mm = mdY[1].padStart(2, '0');
          const dd = s.split('/')[1].padStart(2, '0');
          const yyyy = mdY[2];
          const time = mdY[3] || '00:00:00';
          d = new Date(`${yyyy}-${mm}-${dd} ${time}`);
          if (!isNaN(d.getTime())) return d;
        }
        // Handle DD-MM-YYYY
        const dMY = s.match(/^([0-3]?\d)[- ]([0-1]?\d)[- ](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
        if (dMY) {
          const dd = dMY[1].padStart(2, '0');
          const mm = dMY[2].padStart(2, '0');
          const yyyy = dMY[3];
          const time = dMY[4] || '00:00:00';
          d = new Date(`${yyyy}-${mm}-${dd} ${time}`);
          if (!isNaN(d.getTime())) return d;
        }
        return null;
      }
      try {
        const subExisting = await db.getQuery('SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1', [userId]);
        const startDateObj = parseCsvDate(lastPaymentCsv) || parseCsvDate(createdAtCsv) || new Date();
        const startMs = startDateObj.getTime();
        const endDateObj = planType === 'yearly'
          ? new Date(startMs + 365 * 24 * 60 * 60 * 1000)
          : new Date(startMs + 30 * 24 * 60 * 60 * 1000);
        if (subExisting) {
          await db.executeQuery(
            'UPDATE subscriptions SET stripe_subscription_id = ?, stripe_customer_id = ?, plan_name = ?, plan_type = ?, current_period_start = ?, current_period_end = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [
              stripeSubId || null,
              stripeCustomerId || null,
              planName || null,
              planType,
              startDateObj,
              endDateObj,
              'active',
              userId
            ]
          );
          console.log('📦 Subscription updated', { userId, planType, start: startDateObj, end: endDateObj });
        } else {
          await db.executeQuery(
            'INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan_name, plan_type, current_period_start, current_period_end, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [
              userId,
              stripeSubId || null,
              stripeCustomerId || null,
              planName || null,
              planType,
              startDateObj,
              endDateObj,
              'active'
            ]
          );
          console.log('📦 Subscription created', { userId, planType, start: startDateObj, end: endDateObj });
        }
      } catch {}
      try {
        if (paymentIntentId || planPriceNum != null) {
          const existingTxn = paymentIntentId ? await db.getQuery('SELECT id FROM billing_transactions WHERE stripe_payment_intent_id = ? LIMIT 1', [paymentIntentId]) : null;
          const amountNum = planPriceNum != null ? planPriceNum : 0;
          if (!existingTxn) {
            await db.executeQuery('INSERT INTO billing_transactions (user_id, stripe_payment_intent_id, stripe_customer_id, amount, currency, status, payment_method, plan_name, plan_type, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [userId, null, stripeCustomerId || null, amountNum || 0, 'USD', 'succeeded', 'stripe', planName || null, planType, JSON.stringify({ invoice_id: invoiceId || null, company_name: companyName || null }), lastPaymentCsv || new Date()]);
            console.log('💳 Billing transaction inserted', { userId, amount: amountNum || 0, intent: paymentIntentId || null });
          }
        }
      } catch {}
      results.push({ email, status: 'imported', user_id: userId });
      console.log('✅ CSV row processed', { email, userId });
      } catch (e: any) {
        results.push({ email: get(row, 'email'), status: 'error', error: e?.message || 'row failed' });
        console.error('❌ CSV row error', { email: get(row, 'email'), error: e?.message });
      }
    }
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to import CSV' });
  }
});

router.post('/clients/import-csv', authenticateToken, requireSuperAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const currentUserId = (req as any).user?.id;
    const file = (req as any).file;
    const adminIdRaw = (req as any).body?.admin_id ?? (req as any).body?.adminId;
    const adminId = parseInt(String(adminIdRaw || ''), 10);
    if (!adminId || isNaN(adminId)) {
      return res.status(400).json({ success: false, error: 'admin_id is required' });
    }
    const adminUser = await db.getQuery('SELECT * FROM users WHERE id = ? AND role = ?', [adminId, 'admin']);
    if (!adminUser) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }
    const text = file.buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV must have header and at least one row' });
    }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    function parseRow(line: string): string[] {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(v => v.trim());
    }
    function get(row: Record<string,string>, key: string): string {
      const k = key.toLowerCase();
      return row[k] ?? '';
    }
    function getAny(row: Record<string,string>, keys: string[]): string {
      for (const key of keys) {
        const val = get(row, key);
        if (val && String(val).trim().length > 0) return val;
      }
      return '';
    }
    function normalizeDate(val: string): string | null {
      if (!val) return null;
      const s = String(val).trim();
      if (!s) return null;
      const iso = new Date(s);
      if (!isNaN(iso.getTime())) {
        const y = iso.getFullYear();
        const m = String(iso.getMonth() + 1).padStart(2, '0');
        const d = String(iso.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const mdY = s.match(/^([0-1]?\d)\/([0-3]?\d)\/(\d{4})$/);
      if (mdY) {
        const mm = mdY[1].padStart(2, '0');
        const dd = mdY[2].padStart(2, '0');
        const yyyy = mdY[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      const dMY = s.match(/^([0-3]?\d)[- ]([0-1]?\d)[- ](\d{4})$/);
      if (dMY) {
        const dd = dMY[1].padStart(2, '0');
        const mm = dMY[2].padStart(2, '0');
        const yyyy = dMY[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    }
    const rows: Record<string,string>[] = lines.slice(1).map(line => {
      const values = parseRow(line);
      const obj: Record<string,string> = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = values[i] ?? '';
      return obj;
    });
    const schema = z.object({
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      email: z.string().email().max(255).transform(v => v.toLowerCase()),
      phone: z.string().optional(),
      date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      status: z.enum(['active','inactive','pending']).default('active'),
      experian_score: z.coerce.number().int().min(300).max(850).optional(),
      equifax_score: z.coerce.number().int().min(300).max(850).optional(),
      transunion_score: z.coerce.number().int().min(300).max(850).optional(),
      platform: z.string().optional(),
      platform_email: z.string().email().optional(),
      platform_password: z.string().optional()
    });
    const results: any[] = [];
    for (const row of rows) {
      try {
        const email = getAny(row, ['email']);
        const fn = getAny(row, ['first_name','first name','firstname']);
        const ln = getAny(row, ['last_name','last name','lastname']);
        let nameCombined = getAny(row, ['name','full name']);
        let firstName = fn;
        let lastName = ln;
        if ((!firstName || !lastName) && nameCombined) {
          const parts = nameCombined.trim().split(/\s+/);
          firstName = firstName || parts[0] || '';
          lastName = lastName || parts.slice(1).join(' ') || '';
        }
        const phone = getAny(row, ['phone','phone number']);
        const dobRaw = getAny(row, ['date_of_birth','date of birth','dob']);
        const dob = normalizeDate(dobRaw || '');
        const address = getAny(row, ['address']);
        const city = getAny(row, ['city']);
        const state = getAny(row, ['state']);
        const zip = getAny(row, ['zip','zip_code','postal code']);
        const statusRaw = getAny(row, ['status','client status']);
        const status = /^(inactive|pending)$/i.test(statusRaw) ? statusRaw.toLowerCase() : 'active';
        const expScore = getAny(row, ['experian_score','experian score']);
        const eqScore = getAny(row, ['equifax_score','equifax score']);
        const tuScore = getAny(row, ['transunion_score','transunion score','trans union score']);
        let platform = (getAny(row, ['platform']) || 'myfreescorenow').toLowerCase().trim();
        if (!Object.values(PLATFORMS).includes(platform)) platform = 'myfreescorenow';
        const platformEmail = getAny(row, ['platform_email','platform email']);
        const platformPassword = getAny(row, ['platform_password','platform password']);
        if (!email) {
          results.push({ email: '', status: 'skipped', reason: 'missing email' });
          continue;
        }
        if (!firstName || !lastName) {
          results.push({ email, status: 'skipped', reason: 'missing name' });
          continue;
        }
        const validated = schema.parse({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || undefined,
          date_of_birth: dob || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zip_code: zip || undefined,
          status,
          experian_score: expScore || undefined,
          equifax_score: eqScore || undefined,
          transunion_score: tuScore || undefined,
          platform: platform,
          platform_email: platformEmail || undefined,
          platform_password: platformPassword || undefined
        });
        const quota = await validateClientQuota(adminId);
        if (!quota.canAdd) {
          results.push({ email, status: 'skipped', reason: 'quota_exceeded' });
          continue;
        }
        const dup = await db.getQuery('SELECT id FROM clients WHERE email = ? AND user_id = ? LIMIT 1', [validated.email, adminId]);
        if (dup) {
          results.push({ email, status: 'skipped', reason: 'duplicate' });
          continue;
        }
        const toInt = (v: any): number | null => {
          if (v === undefined || v === null || v === '') return null;
          const n = parseInt(String(v), 10);
          return isNaN(n) ? null : n;
        };
        const expInt = toInt(validated.experian_score);
        const eqInt = toInt(validated.equifax_score);
        const tuInt = toInt(validated.transunion_score);
        const creditScoreInt = [expInt, eqInt, tuInt].filter((x) => typeof x === 'number') as number[];
        const maxCredit = creditScoreInt.length ? Math.max(...creditScoreInt) : null;

        const ins = await db.executeQuery(
          `INSERT INTO clients (
            user_id, first_name, last_name, email, phone, date_of_birth,
            employment_status, annual_income, ssn_last_four, address, city, state, zip_code, status,
            experian_score, equifax_score, transunion_score, credit_score, platform, platform_email, platform_password, fundable_status, created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            adminId,
            validated.first_name,
            validated.last_name,
            validated.email,
            validated.phone || null,
            validated.date_of_birth || null,
            null,
            null,
            null,
            validated.address || null,
            validated.city || null,
            validated.state || null,
            validated.zip_code || null,
            validated.status,
            expInt,
            eqInt,
            tuInt,
            maxCredit,
            validated.platform || null,
            validated.platform_email || null,
            validated.platform_password || null,
            null,
            currentUserId,
            currentUserId
          ]
        );
        const clientId = ins.insertId || ins?.lastID || 0;
        results.push({ email, status: 'imported', client_id: clientId });
      } catch (e: any) {
        results.push({ email: getAny(row, ['email']), status: 'error', error: e?.message || 'row failed' });
      }
    }
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to import CSV' });
  }
});

router.post('/credit-reports/upload', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const currentUserId = (req as any).user?.id;
    const body = (req as any).body || {};

    const adminIdRaw = body.admin_id ?? body.adminId;
    const clientIdRaw = body.client_id ?? body.clientId;
    const platform = String(body.platform || '').toLowerCase();
    const reportJson = body.report_json ?? body.reportJson ?? body.data;
    const experianScoreRaw = body.experian_score ?? body.experianScore;
    const equifaxScoreRaw = body.equifax_score ?? body.equifaxScore;
    const transunionScoreRaw = body.transunion_score ?? body.transunionScore;
    const creditScoreRaw = body.credit_score ?? body.creditScore;
    const reportDateRaw = body.report_date ?? body.reportDate;
    const notesRaw = body.notes;

    const adminId = parseInt(String(adminIdRaw || ''), 10);
    const clientId = parseInt(String(clientIdRaw || ''), 10);

    if (!adminId || isNaN(adminId)) {
      return res.status(400).json({ success: false, error: 'admin_id is required' });
    }
    if (!clientId || isNaN(clientId)) {
      return res.status(400).json({ success: false, error: 'client_id is required' });
    }
    if (!platform) {
      return res.status(400).json({ success: false, error: 'platform is required' });
    }
    if (!Object.values(PLATFORMS).includes(platform)) {
      return res.status(400).json({ success: false, error: 'Unsupported platform' });
    }
    if (!reportJson) {
      return res.status(400).json({ success: false, error: 'report_json is required' });
    }

    const adminUser = await db.getQuery('SELECT id, role FROM users WHERE id = ? AND role = ?', [adminId, 'admin']);
    if (!adminUser) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    const client = await db.getQuery('SELECT id, user_id, first_name, last_name FROM clients WHERE id = ? AND user_id = ?', [clientId, adminId]);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found for the selected admin' });
    }

    let parsedData: any;
    try {
      parsedData = typeof reportJson === 'string' ? JSON.parse(reportJson) : reportJson;
    } catch (e: any) {
      return res.status(400).json({ success: false, error: 'Invalid JSON data' });
    }

    const toInt = (v: any): number | null => {
      if (v === undefined || v === null || v === '') return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    const experianScore = toInt(experianScoreRaw);
    const equifaxScore = toInt(equifaxScoreRaw);
    const transunionScore = toInt(transunionScoreRaw);
    let creditScore = toInt(creditScoreRaw);
    if (!creditScore) {
      const vals = [experianScore, equifaxScore, transunionScore].filter((x) => typeof x === 'number') as number[];
      creditScore = vals.length ? Math.max(...vals) : null;
    }

    let reportDate: any = null;
    if (reportDateRaw) {
      const d = new Date(String(reportDateRaw));
      if (!isNaN(d.getTime())) reportDate = d.toISOString().slice(0, 19).replace('T', ' ');
    }

    let notes = typeof notesRaw === 'string' ? notesRaw : undefined;

    const fs = await import('fs');
    const path = await import('path');
    const outputDir = path.join(process.cwd(), 'scraper-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeClient = String(clientId);
    const fileName = `manual-${platform}-client-${safeClient}-${timeStamp}.json`;
    const filePathAbs = path.join(outputDir, fileName);
    const filePathRel = path.join('scraper-output', fileName);

    const filePayload = {
      platform,
      client_id: clientId,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      reportData: parsedData
    };

    fs.writeFileSync(filePathAbs, JSON.stringify(filePayload, null, 2), 'utf8');

    const dbUtil = await import('../database/dbConnection.js');
    const historyData = {
      client_id: clientId,
      platform,
      report_path: filePathRel,
      status: 'completed',
      credit_score: creditScore || null,
      experian_score: experianScore || null,
      equifax_score: equifaxScore || null,
      transunion_score: transunionScore || null,
      report_date: reportDate || null,
      notes: notes || null
    };

    const result = await dbUtil.saveCreditReport(historyData);

    res.json({
      success: true,
      message: 'Credit report uploaded successfully',
      data: {
        report_path: filePathRel,
        id: result.insertId || result.lastID || null,
        scores: {
          credit_score: creditScore,
          experian_score: experianScore,
          equifax_score: equifaxScore,
          transunion_score: transunionScore
        }
      }
    });
  } catch (error: any) {
    console.error('Error uploading credit report:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to upload credit report' });
  }
});

// Update Stripe configuration
router.post('/stripe-config', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { stripe_publishable_key, stripe_secret_key, webhook_endpoint_secret } = req.body;
    
    if (!stripe_publishable_key || !stripe_secret_key) {
      return res.status(400).json({ success: false, error: 'Publishable key and secret key are required' });
    }
    
    // Validate that the keys look correct
    if (!stripe_publishable_key.startsWith('pk_')) {
      return res.status(400).json({ success: false, error: 'Invalid publishable key format' });
    }
    
    if (!stripe_secret_key.startsWith('sk_')) {
      return res.status(400).json({ success: false, error: 'Invalid secret key format' });
    }
    
    const db = getDatabaseAdapter();
    
    // Deactivate existing configurations
    await db.executeQuery(
      'UPDATE stripe_config SET is_active = FALSE WHERE is_active = TRUE'
    );
    
    // Insert new configuration
    await db.executeQuery(
      `INSERT INTO stripe_config 
       (stripe_publishable_key, stripe_secret_key, webhook_endpoint_secret, is_active, created_by, updated_by)
       VALUES (?, ?, ?, TRUE, ?, ?)`,
      [stripe_publishable_key, stripe_secret_key, webhook_endpoint_secret || null, (req as any).user.id, (req as any).user.id]
    );
    
    res.json({
      success: true,
      message: 'Stripe configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating Stripe config:', error);
    res.status(500).json({ success: false, error: 'Failed to update Stripe configuration' });
  }
});

// Update individual Stripe configuration setting (PUT route for frontend compatibility)
router.put('/stripe/config', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { setting_key, setting_value } = req.body;
    
    if (!setting_key || !setting_value) {
      return res.status(400).json({ success: false, error: 'Setting key and value are required' });
    }
    
    const db = getDatabaseAdapter();
    
    // Get current configuration
    const currentConfig = await db.getQuery(
      'SELECT * FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    if (!currentConfig) {
      return res.status(404).json({ success: false, error: 'No active Stripe configuration found' });
    }
    
    // Prepare update data based on setting_key
    let updateData: any = {
      updated_by: (req as any).user.id,
      updated_at: new Date().toISOString()
    };
    
    switch (setting_key) {
      case 'publishable_key':
        if (!setting_value.startsWith('pk_')) {
          return res.status(400).json({ success: false, error: 'Invalid publishable key format' });
        }
        updateData.stripe_publishable_key = setting_value;
        break;
      case 'secret_key':
        if (!setting_value.startsWith('sk_')) {
          return res.status(400).json({ success: false, error: 'Invalid secret key format' });
        }
        updateData.stripe_secret_key = setting_value;
        break;
      case 'webhook_secret':
        updateData.webhook_endpoint_secret = setting_value;
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid setting key' });
    }
    
    // Update the configuration
    await db.executeQuery(
      `UPDATE stripe_config SET 
       stripe_publishable_key = COALESCE(?, stripe_publishable_key),
       stripe_secret_key = COALESCE(?, stripe_secret_key),
       webhook_endpoint_secret = COALESCE(?, webhook_endpoint_secret),
       updated_by = ?, 
       updated_at = NOW()
       WHERE id = ?`,
      [
        updateData.stripe_publishable_key || null,
        updateData.stripe_secret_key || null,
        updateData.webhook_endpoint_secret || null,
        updateData.updated_by,
        currentConfig.id
      ]
    );
    
    res.json({
      success: true,
      message: 'Stripe configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating Stripe config:', error);
    res.status(500).json({ success: false, error: 'Failed to update Stripe configuration' });
  }
});

// Get all billing transactions (super admin view)
router.get('/billing-transactions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, user_id } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const safeOffset = (pageNum - 1) * limitNum;
    
    const db = getDatabaseAdapter();
    
    let query = `
      SELECT bt.*, u.email, u.first_name, u.last_name
      FROM billing_transactions bt
      LEFT JOIN users u ON bt.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      query += ' AND bt.status = ?';
      params.push(status);
    }
    
    if (user_id) {
      query += ' AND bt.user_id = ?';
      params.push(user_id);
    }
    
    query += ` ORDER BY bt.created_at DESC LIMIT ${limitNum} OFFSET ${safeOffset}`;
    
    const transactions = await db.allQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM billing_transactions WHERE 1=1';
    const countParams: any[] = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (user_id) {
      countQuery += ' AND user_id = ?';
      countParams.push(user_id);
    }
    
    const countResult = await db.getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    res.json({
      success: true,
      transactions: transactions || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching billing transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch billing transactions' });
  }
});

// Alternative route path for frontend compatibility - billing transactions
router.get('/billing/transactions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, user_id, status, include_stripe } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const safeOffset = (pageNum - 1) * limitNum;
    
    const db = getDatabaseAdapter();
    
    let query = `
      SELECT bt.*, u.email, u.first_name, u.last_name
      FROM billing_transactions bt
      LEFT JOIN users u ON bt.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (user_id) {
      query += ' AND bt.user_id = ?';
      params.push(user_id);
    }
    
    if (status) {
      query += ' AND bt.status = ?';
      params.push(status);
    }
    
    query += ` ORDER BY bt.created_at DESC LIMIT ${limitNum} OFFSET ${safeOffset}`;
    
    let transactions = await db.allQuery(query, params);

    const includeStripe = String(include_stripe || '').toLowerCase() === '1' || String(include_stripe || '').toLowerCase() === 'true';
    if (includeStripe) {
      let stripe: Stripe | null = null;
      try {
        const cfg = await db.getQuery('SELECT stripe_secret_key FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1');
        const secret = (cfg && cfg.stripe_secret_key) ? String(cfg.stripe_secret_key) : process.env.STRIPE_SECRET_KEY || '';
        if (secret) {
          stripe = new Stripe(secret);
        }
      } catch {}
      if (stripe) {
        const enriched: any[] = [];
        for (const t of Array.isArray(transactions) ? transactions : []) {
          let stripe_invoice_id: string | null = null;
          let stripe_payment_method_type: string | null = null;
          let stripe_payment_method_brand: string | null = null;
          let stripe_payment_method_last4: string | null = null;
          let stripe_fee_amount: number | null = null;
          const piId = t.stripe_payment_intent_id;
          try {
            if (piId) {
              const pi = await stripe.paymentIntents.retrieve(String(piId), { expand: ['payment_method'] });
              const pm = pi.payment_method as Stripe.PaymentMethod | null;
              if (pm) {
                stripe_payment_method_type = pm.type || null;
                if (pm.type === 'card' && pm.card) {
                  stripe_payment_method_brand = pm.card.brand || null;
                  stripe_payment_method_last4 = pm.card.last4 || null;
                }
              }
              const chId = typeof pi.latest_charge === 'string' ? pi.latest_charge : null;
              if (chId) {
                const ch = await stripe.charges.retrieve(chId);
                const inv = ch.invoice;
                stripe_invoice_id = typeof inv === 'string' ? inv : null;
                const btId = typeof ch.balance_transaction === 'string' ? ch.balance_transaction : null;
                if (btId) {
                  const bt = await stripe.balanceTransactions.retrieve(btId);
                  const fee = typeof bt.fee === 'number' ? bt.fee : null;
                  stripe_fee_amount = fee != null ? Number(fee) / 100 : null;
                }
              }
            }
          } catch {}
          enriched.push({
            ...t,
            stripe_invoice_id,
            stripe_payment_method_type,
            stripe_payment_method_brand,
            stripe_payment_method_last4,
            stripe_fee_amount
          });
        }
        transactions = enriched;
      }
    }
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM billing_transactions WHERE 1=1';
    const countParams: any[] = [];
    
    if (user_id) {
      countQuery += ' AND user_id = ?';
      countParams.push(user_id);
    }
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const countResult = await db.getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    res.json({
      success: true,
      transactions: transactions || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching billing transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch billing transactions' });
  }
});

// Live Stripe transactions for a specific user/customer (no DB transactions)
router.get('/billing/stripe/transactions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id, stripe_customer_id, limit = 50 } = req.query as any;
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));

    const db = getDatabaseAdapter();
    let customerId = String(stripe_customer_id || '');
    let user: any = null;
    if (!customerId) {
      if (!user_id) {
        return res.status(400).json({ success: false, error: 'user_id or stripe_customer_id is required' });
      }
      user = await db.getQuery('SELECT id, email, first_name, last_name, stripe_customer_id FROM users WHERE id = ? LIMIT 1', [user_id]);
      if (!user || !user.stripe_customer_id) {
        // Try affiliates fallback
        const aff = await db.getQuery('SELECT id, email, first_name, last_name, stripe_customer_id FROM affiliates WHERE id = ? LIMIT 1', [user_id]);
        if (aff && aff.stripe_customer_id) {
          user = aff;
          customerId = String(aff.stripe_customer_id);
        }
      } else {
        customerId = String(user.stripe_customer_id);
      }
    }

    if (!customerId) {
      return res.status(404).json({ success: false, error: 'Stripe customer not found for user' });
    }

    // Initialize Stripe from DB config or environment
    let stripe: Stripe | null = null;
    try {
      const cfg = await db.getQuery('SELECT stripe_secret_key FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1');
      const secret = (cfg && cfg.stripe_secret_key) ? String(cfg.stripe_secret_key) : process.env.STRIPE_SECRET_KEY || '';
      if (secret) {
        stripe = new Stripe(secret);
      }
    } catch {}
    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    // Fetch live data from Stripe
    const transactions: any[] = [];
    const piList = await stripe.paymentIntents.list({ customer: customerId, limit: limitNum });
    for (const pi of piList.data) {
      let pmType: string | null = null;
      let pmBrand: string | null = null;
      let pmLast4: string | null = null;
      let invoiceId: string | null = null;
      let feeAmount: number | null = null;

      try {
        const piFull = await stripe.paymentIntents.retrieve(pi.id, { expand: ['payment_method'] });
        const pm = piFull.payment_method as Stripe.PaymentMethod | null;
        if (pm) {
          pmType = pm.type || null;
          if (pm.type === 'card' && pm.card) {
            pmBrand = pm.card.brand || null;
            pmLast4 = pm.card.last4 || null;
          }
        }
        const chId = typeof piFull.latest_charge === 'string' ? piFull.latest_charge : null;
        if (chId) {
          const ch = await stripe.charges.retrieve(chId);
          const inv = ch.invoice;
          invoiceId = typeof inv === 'string' ? inv : null;
          const btId = typeof ch.balance_transaction === 'string' ? ch.balance_transaction : null;
          if (btId) {
            const bt = await stripe.balanceTransactions.retrieve(btId);
            const fee = typeof bt.fee === 'number' ? bt.fee : null;
            feeAmount = fee != null ? Number(fee) / 100 : null;
          }
        }
      } catch {}

      transactions.push({
        source: 'payment_intent',
        stripe_payment_intent_id: pi.id,
        stripe_invoice_id: invoiceId,
        amount: typeof pi.amount === 'number' ? Number(pi.amount) / 100 : null,
        currency: (pi.currency || 'usd').toUpperCase(),
        status: pi.status || 'unknown',
        stripe_payment_method_type: pmType,
        stripe_payment_method_brand: pmBrand,
        stripe_payment_method_last4: pmLast4,
        stripe_fee_amount: feeAmount,
        created_at: new Date(pi.created * 1000).toISOString(),
        description: pi.description || null,
        email: user?.email || null,
        first_name: user?.first_name || null,
        last_name: user?.last_name || null
      });
    }

    const invList = await stripe.invoices.list({ customer: customerId, limit: limitNum });
    const piIndex = new Map<string, number>();
    transactions.forEach((t, idx) => {
      if (t.stripe_payment_intent_id) piIndex.set(String(t.stripe_payment_intent_id), idx);
    });
    for (const inv of invList.data) {
      const piId = typeof inv.payment_intent === 'string' ? inv.payment_intent : null;
      const createdIso = new Date((inv.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
      if (piId && piIndex.has(piId)) {
        const idx = piIndex.get(piId)!;
        transactions[idx].stripe_invoice_id = inv.id;
      } else {
        transactions.push({
          source: 'invoice',
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id: piId,
          amount: typeof inv.total === 'number' ? Number(inv.total) / 100 : null,
          currency: (inv.currency || 'usd').toUpperCase(),
          status: inv.status || 'unknown',
          stripe_payment_method_type: null,
          stripe_payment_method_brand: null,
          stripe_payment_method_last4: null,
          stripe_fee_amount: null,
          created_at: createdIso,
          description: inv.description || null,
          email: user?.email || null,
          first_name: user?.first_name || null,
          last_name: user?.last_name || null
        });
      }
    }

    // Sort by created_at desc
    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ success: true, transactions, pagination: { limit: limitNum, total: transactions.length } });
  } catch (error) {
    console.error('Error fetching Stripe live transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe live transactions' });
  }
});

// Alternative route path for frontend compatibility - billing subscriptions
router.get('/billing/subscriptions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, plan_type } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const safeOffset = (pageNum - 1) * limitNum;
    
    const db = getDatabaseAdapter();
    
    let query = `
      SELECT s.*, u.email, u.first_name, u.last_name
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    
    if (plan_type) {
      query += ' AND s.plan_type = ?';
      params.push(plan_type);
    }
    
    query += ` ORDER BY s.created_at DESC LIMIT ${limitNum} OFFSET ${safeOffset}`;
    
    const subscriptions = await db.allQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM subscriptions WHERE 1=1';
    const countParams: any[] = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (plan_type) {
      countQuery += ' AND plan_type = ?';
      countParams.push(plan_type);
    }
    
    const countResult = await db.getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    res.json({
      success: true,
      subscriptions: subscriptions || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

// Get all subscriptions (super admin view)
router.get('/user-subscriptions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, plan_type } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const safeOffset = (pageNum - 1) * limitNum;
    
    const db = getDatabaseAdapter();
    
    let query = `
      SELECT s.*, u.email, u.first_name, u.last_name
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    
    if (plan_type) {
      query += ' AND s.plan_type = ?';
      params.push(plan_type);
    }
    
    query += ` ORDER BY s.created_at DESC LIMIT ${limitNum} OFFSET ${safeOffset}`;
    
    const subscriptions = await db.allQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM subscriptions WHERE 1=1';
    const countParams: any[] = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (plan_type) {
      countQuery += ' AND plan_type = ?';
      countParams.push(plan_type);
    }
    
    const countResult = await db.getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    res.json({
      success: true,
      subscriptions: subscriptions || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

// Update subscription status (super admin)
router.put('/user-subscription/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancel_at_period_end } = req.body;
    
    const validStatuses = ['active', 'canceled', 'past_due', 'unpaid'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const db = getDatabaseAdapter();
    
    let query = 'UPDATE subscriptions SET';
    const params: any[] = [];
    const updates: string[] = [];
    
    if (status) {
      updates.push(' status = ?');
      params.push(status);
    }
    
    if (typeof cancel_at_period_end === 'boolean') {
      updates.push(' cancel_at_period_end = ?');
      params.push(cancel_at_period_end);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid updates provided' });
    }
    
    query += updates.join(',') + ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(id);
    
    await db.executeQuery(query, params);
    
    res.json({
      success: true,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

// Get all clients across all admins
// Get client statistics from all admins
router.get('/client-statistics', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    
    // Get aggregated client statistics from all admins
    const statsQuery = `
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN c.credit_score IS NOT NULL AND c.credit_score > 650 THEN 1 END) as fundable_clients,
        COUNT(CASE WHEN c.credit_score IS NULL OR c.credit_score <= 650 THEN 1 END) as not_fundable_clients,
        COUNT(CASE WHEN 
          c.credit_score IS NOT NULL AND 
          c.ssn_last_four IS NOT NULL AND 
          c.date_of_birth IS NOT NULL AND 
          c.address IS NOT NULL AND 
          c.employment_status IS NOT NULL 
        THEN 1 END) as ready_clients,
        COUNT(CASE WHEN 
          c.credit_score IS NULL OR 
          c.ssn_last_four IS NULL OR 
          c.date_of_birth IS NULL OR 
          c.address IS NULL OR 
          c.employment_status IS NULL 
        THEN 1 END) as not_ready_clients
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE u.role IN ('admin', 'super_admin')
    `;
    
    const statsResult = await db.executeQuery(statsQuery);
    const stats = statsResult[0];
    
    // Get statistics by admin
    const adminStatsQuery = `
      SELECT 
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        u.email as admin_email,
        ap.title as admin_title,
        ap.department as admin_department,
        COUNT(c.id) as total_clients,
        COUNT(CASE WHEN c.credit_score IS NOT NULL AND c.credit_score > 650 THEN 1 END) as fundable_clients,
        COUNT(CASE WHEN c.credit_score IS NULL OR c.credit_score <= 650 THEN 1 END) as not_fundable_clients,
        COUNT(CASE WHEN 
          c.credit_score IS NOT NULL AND 
          c.ssn_last_four IS NOT NULL AND 
          c.date_of_birth IS NOT NULL AND 
          c.address IS NOT NULL AND 
          c.employment_status IS NOT NULL 
        THEN 1 END) as ready_clients,
        COUNT(CASE WHEN 
          c.credit_score IS NULL OR 
          c.ssn_last_four IS NULL OR 
          c.date_of_birth IS NULL OR 
          c.address IS NULL OR 
          c.employment_status IS NULL 
        THEN 1 END) as not_ready_clients
      FROM users u
      LEFT JOIN admin_profiles ap ON u.id = ap.user_id
      LEFT JOIN clients c ON u.id = c.user_id
      WHERE u.role IN ('admin', 'super_admin')
      GROUP BY u.id, u.first_name, u.last_name, u.email, ap.title, ap.department
      ORDER BY total_clients DESC
    `;
    
    const adminStats = await db.executeQuery(adminStatsQuery);
    
    res.json({
      success: true,
      data: {
        overall: {
          total: stats.total_clients || 0,
          ready: stats.ready_clients || 0,
          notReady: stats.not_ready_clients || 0,
          fundable: stats.fundable_clients || 0,
          notFundable: stats.not_fundable_clients || 0
        },
        byAdmin: adminStats
      }
    });
  } catch (error) {
    console.error('Error fetching client statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client statistics' });
  }
});

router.get('/clients', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    
    const page = parseInt(req.query.page as string) || 1;
    const rawLimit = String(req.query.limit || '');
    const isAll = rawLimit.toLowerCase() === 'all' || (parseInt(rawLimit, 10) <= 0);
    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(rawLimit, 10) || 15));
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const admin = req.query.admin as string || '';
    const userIdFilter = req.query.user_id as string || '';
    const offset = (pageNum - 1) * limitNum;
    
    let whereConditions = [];
    let params = [];
    
    if (search) {
      whereConditions.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    if (status) {
      whereConditions.push('c.status = ?');
      params.push(status);
    }
    
    if (admin) {
      whereConditions.push('CONCAT(u.first_name, " ", u.last_name) = ?');
      params.push(admin);
    }
    if (userIdFilter) {
      whereConditions.push('c.user_id = ?');
      params.push(userIdFilter);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN admin_profiles ap ON u.id = ap.user_id
      ${whereClause}
    `;
    
    const countResult = await db.executeQuery(countQuery, params);
    const total = countResult[0].total;
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        c.*, 
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        u.email as admin_email,
        ap.title as admin_title,
        ap.department as admin_department
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN admin_profiles ap ON u.id = ap.user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      ${isAll ? '' : `LIMIT ${limitNum} OFFSET ${offset}`}
    `;
    
    const clients = await db.executeQuery(dataQuery, params);
    
    res.json({
      success: true,
      data: clients,
      pagination: {
        page: pageNum,
        limit: isAll ? total : limitNum,
        total,
        totalPages: isAll ? 1 : Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

// Sales Analytics Endpoints
router.get('/analytics/sales-chat', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const { from, to } = req.query as any;
    const toDate = to ? new Date(String(to)) : new Date();
    const fromDate = from ? new Date(String(from)) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = fromDate.toISOString().slice(0, 19).replace('T', ' ');
    const toStr = toDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // Get chat statistics across all users (using existing chat_messages table)
    const chatStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_messages,
        COUNT(DISTINCT sender_id) as active_users,
        0 as avg_response_time
      FROM chat_messages 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const chatStats = await db.executeQuery(chatStatsQuery, [fromStr, toStr]);
    
    // Get top performing support agents (using existing users and chat_messages)
    const topAgentsQuery = `
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(cm.id) as messages_sent,
        0 as avg_response_time,
        COUNT(DISTINCT cm.receiver_id) as clients_helped
      FROM users u
      JOIN chat_messages cm ON u.id = cm.sender_id
      WHERE u.role IN ('support', 'admin') AND cm.created_at >= ? AND cm.created_at <= ?
      GROUP BY u.id
      ORDER BY messages_sent DESC
      LIMIT 10
    `;
    
    const topAgents = await db.executeQuery(topAgentsQuery, [fromStr, toStr]);
    
    // Get conversion metrics (using existing subscriptions table)
    const conversionQuery = `
      SELECT 
        COUNT(DISTINCT cm.sender_id) as total_chat_users,
        COUNT(DISTINCT s.user_id) as converted_users,
        CASE 
          WHEN COUNT(DISTINCT cm.sender_id) > 0 
          THEN (COUNT(DISTINCT s.user_id) / COUNT(DISTINCT cm.sender_id)) * 100 
          ELSE 0 
        END as conversion_rate
      FROM chat_messages cm
      LEFT JOIN subscriptions s ON cm.sender_id = s.user_id 
        AND s.created_at >= cm.created_at 
        AND s.created_at <= DATE_ADD(cm.created_at, INTERVAL 7 DAY)
      WHERE cm.created_at >= ? AND cm.created_at <= ?
    `;
    
    const conversionStats = await db.executeQuery(conversionQuery, [fromStr, toStr]);
    
    res.json({
      success: true,
      data: {
        chatStats: chatStats || [],
        topAgents: topAgents || [],
        conversionStats: conversionStats[0] || { total_chat_users: 0, converted_users: 0, conversion_rate: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching sales chat analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales chat analytics' });
  }
});

router.get('/analytics/report-pulling', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const { from, to } = req.query as any;
    const toDate = to ? new Date(String(to)) : new Date();
    const fromDate = from ? new Date(String(from)) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = fromDate.toISOString().slice(0, 19).replace('T', ' ');
    const toStr = toDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // Get report pulling statistics (using existing credit_reports table)
    const reportStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_reports,
        COUNT(DISTINCT client_id) as unique_users,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_reports,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_reports,
        0 as avg_processing_time
      FROM credit_reports 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const reportStats = await db.executeQuery(reportStatsQuery, [fromStr, toStr]);
    
    // Get bureau-wise statistics (using existing bureau column)
    const bureauStatsQuery = `
      SELECT 
        bureau as bureau_name,
        COUNT(*) as total_pulls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_pulls,
        0 as avg_processing_time,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_pulls
      FROM credit_reports 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY bureau
      ORDER BY total_pulls DESC
    `;
    
    const bureauStats = await db.executeQuery(bureauStatsQuery, [fromStr, toStr]);
    
    // Get user activity for report pulling (using existing clients and credit_reports)
    const userActivityQuery = `
      SELECT 
        c.first_name,
        c.last_name,
        c.email,
        COUNT(cr.id) as reports_pulled,
        MAX(cr.created_at) as last_report_date,
        0 as avg_processing_time
      FROM clients c
      JOIN credit_reports cr ON c.id = cr.client_id
      WHERE cr.created_at >= ? AND cr.created_at <= ?
      GROUP BY c.id
      ORDER BY reports_pulled DESC
      LIMIT 20
    `;
    
    const userActivity = await db.executeQuery(userActivityQuery, [fromStr, toStr]);
    
    // Get error analysis (simplified since we don't have error_type column)
    const errorAnalysisQuery = `
      SELECT 
        'general_error' as error_type,
        COUNT(*) as error_count,
        (COUNT(*) / (SELECT COUNT(*) FROM credit_reports WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))) * 100 as error_percentage
      FROM credit_reports 
      WHERE status = 'error' AND created_at >= ? AND created_at <= ?
    `;
    
    const errorAnalysis = await db.executeQuery(errorAnalysisQuery, [fromStr, toStr]);
    
    res.json({
      success: true,
      data: {
        reportStats: reportStats || [],
        bureauStats: bureauStats || [],
        userActivity: userActivity || [],
        errorAnalysis: errorAnalysis || []
      }
    });
  } catch (error) {
    console.error('Error fetching report pulling analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report pulling analytics' });
  }
});

// Error Analysis Endpoint
router.get('/analytics/error-analysis', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const { from, to } = req.query as any;
    const toDate = to ? new Date(String(to)) : new Date();
    const fromDate = from ? new Date(String(from)) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = fromDate.toISOString().slice(0, 19).replace('T', ' ');
    const toStr = toDate.toISOString().slice(0, 19).replace('T', ' ');
    const dbType = db.getType();
    const activityCol = dbType === 'mysql' ? '`type`' : 'activity_type';
    const metadataCol = dbType === 'mysql' ? '`metadata`' : 'metadata';
    const metadataIsError = dbType === 'mysql'
      ? `(${metadataCol} IS NOT NULL AND (JSON_EXTRACT(${metadataCol}, '$.is_error') = true OR CAST(${metadataCol} AS CHAR) LIKE '%"is_error":true%'))`
      : `(metadata IS NOT NULL AND metadata LIKE '%"is_error":true%')`;
    const ipSelect = dbType === 'mysql'
      ? `JSON_UNQUOTE(JSON_EXTRACT(${metadataCol}, '$.ip_address'))`
      : `ip_address`;
    const uaSelect = dbType === 'mysql'
      ? `JSON_UNQUOTE(JSON_EXTRACT(${metadataCol}, '$.user_agent'))`
      : `user_agent`;
    const errorsQuery = `
      SELECT 
        id,
        user_id,
        ${activityCol} as activity,
        description,
        ${metadataCol} as metadata,
        ${ipSelect} as ip_address,
        ${uaSelect} as user_agent,
        created_at
      FROM activities
      WHERE created_at >= ? AND created_at <= ?
        AND (
          description = 'server_error'
          OR ${metadataIsError}
        )
      ORDER BY created_at DESC
      LIMIT 200
    `;
    const rows = await db.executeQuery(errorsQuery, [fromStr, toStr]);
    
    const recentErrors = [];
    const byTask: Record<string, { count: number; last_occurrence: string }> = {};
    const byUser: Record<string, number> = {};
    
    for (const row of rows || []) {
      let meta: any = {};
      try {
        if (row.metadata && typeof row.metadata === 'string') {
          meta = JSON.parse(row.metadata);
        } else if (row.metadata && typeof row.metadata === 'object') {
          meta = row.metadata;
        } else {
          meta = {};
        }
      } catch {
        meta = {};
      }
      const task = meta?.task || 'general';
      const message = meta?.message || row.description || 'server_error';
      
      if (!byTask[task]) byTask[task] = { count: 0, last_occurrence: row.created_at };
      byTask[task].count += 1;
      if (new Date(row.created_at).getTime() > new Date(byTask[task].last_occurrence).getTime()) {
        byTask[task].last_occurrence = row.created_at;
      }
      const uid = String(row.user_id || 'unknown');
      byUser[uid] = (byUser[uid] || 0) + 1;
      
      recentErrors.push({
        id: row.id,
        user_id: row.user_id || null,
        activity: row.activity,
        task,
        message,
        url: meta?.url || null,
        method: meta?.method || null,
        status: meta?.status || null,
        ip_address: row.ip_address || meta?.ip_address || null,
        user_agent: row.user_agent || meta?.user_agent || null,
        created_at: row.created_at
      });
    }
    
    const taskSummary = Object.entries(byTask).map(([task, info]) => ({
      task,
      count: info.count,
      last_occurrence: info.last_occurrence
    })).sort((a, b) => b.count - a.count);
    
    const topUsers = Object.entries(byUser)
      .filter(([uid]) => uid !== 'unknown')
      .map(([uid, count]) => ({ user_id: uid, error_count: count }))
      .sort((a, b) => b.error_count - a.error_count)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        total_errors: rows?.length || 0,
        by_task: taskSummary,
        top_users: topUsers,
        recent_errors: recentErrors
      }
    });
  } catch (error) {
    console.error('Error fetching error analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch error analysis' });
  }
});

router.get('/analytics/recent-alerts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    
    // Get recent alerts from existing tables (tickets and billing_transactions)
    const alertsQuery = `
      SELECT 
        'support' as type,
        title,
        description as message,
        priority as severity,
        created_at,
        status,
        customer_id as user_id
      FROM tickets 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      
      UNION ALL
      
      SELECT 
        'payment' as type,
        CONCAT('Payment ', status) as title,
        CONCAT('Amount: $', amount, ' - ', payment_method) as message,
        CASE WHEN status = 'failed' THEN 'high' ELSE 'medium' END as severity,
        created_at,
        status,
        user_id
      FROM billing_transactions 
      WHERE status IN ('failed', 'canceled') 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const alerts = await db.executeQuery(alertsQuery);
    
    // Get alert summary statistics
    const alertSummaryQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN severity IN ('high', 'urgent') THEN 1 ELSE 0 END) as critical_alerts,
        SUM(CASE WHEN status IN ('open', 'pending') THEN 1 ELSE 0 END) as unresolved_alerts,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as alerts_24h
      FROM (
        SELECT priority as severity, status, created_at FROM tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT 'medium' as severity, status, created_at FROM billing_transactions WHERE status IN ('failed', 'canceled') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ) as all_alerts
    `;
    
    const alertSummary = await db.executeQuery(alertSummaryQuery);
    
    res.json({
      success: true,
      data: {
        alerts: alerts || [],
        summary: alertSummary[0] || { total_alerts: 0, critical_alerts: 0, unresolved_alerts: 0, alerts_24h: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent alerts' });
  }
});

// INVITATION MANAGEMENT ROUTES

// Get recent invitations
router.get('/invitations', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 10));
    const safeOffset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (type && type !== 'all') {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const db = getDatabaseAdapter();
    
    // Get total count
    const countResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM invitations ${whereClause}`,
      params
    );

    // Get invitations with pagination
    const invitations = await db.allQuery(
      `SELECT i.*, u.first_name as sent_by_name, u.last_name as sent_by_lastname
       FROM invitations i
       LEFT JOIN users u ON i.sent_by = u.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ${limitNum} OFFSET ${safeOffset}`,
      params
    );

    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: invitations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invitations' });
  }
});

// Send individual invitation
router.post('/invitations/send', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { email, type, name, meetingLink, bulkRecipients } = req.body;
    const userId = req.user?.id;

    if (!email || !type) {
      return res.status(400).json({ success: false, error: 'Email and type are required' });
    }

    const db = getDatabaseAdapter();
    
    // Handle bulk recipients for meeting invitations
    if (type === 'meeting' && bulkRecipients && bulkRecipients.length > 0) {
      const results = [];
      const errors = [];

      // Get recipient lists based on bulk options
      const recipientEmails = [];
      
      if (bulkRecipients.includes('all_admins')) {
        const admins = await db.getQuery("SELECT email, name FROM users WHERE role = 'admin'", []);
        if (Array.isArray(admins)) {
          recipientEmails.push(...admins.map(admin => ({ email: admin.email, name: admin.name })));
        } else if (admins) {
          recipientEmails.push({ email: admins.email, name: admins.name });
        }
      }
      
      if (bulkRecipients.includes('support_team')) {
        const supportTeam = await db.getQuery('SELECT email, name FROM users WHERE role = "support"', []);
        if (Array.isArray(supportTeam)) {
          recipientEmails.push(...supportTeam.map(user => ({ email: user.email, name: user.name })));
        } else if (supportTeam) {
          recipientEmails.push({ email: supportTeam.email, name: supportTeam.name });
        }
      }
      
      if (bulkRecipients.includes('all_clients')) {
        const clients = await db.getQuery('SELECT email, name FROM users WHERE role = "client"', []);
        if (Array.isArray(clients)) {
          recipientEmails.push(...clients.map(client => ({ email: client.email, name: client.name })));
        } else if (clients) {
          recipientEmails.push({ email: clients.email, name: clients.name });
        }
      }

      // Remove duplicates and add the original email if provided
      const uniqueEmails = new Map();
      if (email) {
        uniqueEmails.set(email, { email, name });
      }
      recipientEmails.forEach(recipient => {
        uniqueEmails.set(recipient.email, recipient);
      });

      // Send invitations to all recipients
      for (const [recipientEmail, recipientData] of uniqueEmails) {
        try {
          // Check if invitation already exists
          const existingInvitation = await db.getQuery(
            'SELECT * FROM invitations WHERE email = ? AND status IN ("sent", "pending")',
            [recipientEmail]
          );

          if (existingInvitation) {
            errors.push({ email: recipientEmail, error: 'Active invitation already exists' });
            continue;
          }

          // Generate invitation token
          const invitationToken = jwt.sign(
            { email: recipientEmail, type, invitedBy: userId },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development',
            { expiresIn: '7d' }
          );

          // Get the inviter's name for the email
          let inviterName = 'System Administrator';
          try {
            const inviter = await db.getQuery('SELECT name, email FROM users WHERE id = ?', [userId]);
            if (inviter) {
              inviterName = inviter.name || inviter.email || 'System Administrator';
            }
          } catch (error) {
            console.log('Could not fetch inviter details, using default');
          }

          // Send invitation email
          const { emailService } = await import('../services/emailService');
          const emailSent = await emailService.sendInvitationEmail({
            email: recipientEmail,
            name: recipientData.name,
            type: type as 'admin' | 'client' | 'affiliate' | 'meeting',
            token: invitationToken,
            invitedBy: inviterName,
            meetingLink
          });

          if (!emailSent) {
            errors.push({ email: recipientEmail, error: 'Failed to send invitation email' });
            continue;
          }

          // Create invitation record
          const invitationId = await db.executeQuery(
            `INSERT INTO invitations (email, name, type, token, meeting_link, status, sent_by, created_at, expires_at)
             VALUES (?, ?, ?, ?, ?, 'sent', ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
            [recipientEmail, recipientData.name || null, type, invitationToken, meetingLink || null, userId]
          );

          results.push({
            id: invitationId,
            email: recipientEmail,
            name: recipientData.name || null,
            type,
            status: 'sent'
          });

          console.log(`📧 Meeting invitation sent successfully to ${recipientEmail}`);
        } catch (error) {
          console.error(`Error sending invitation to ${recipientEmail}:`, error);
          errors.push({ email: recipientEmail, error: 'Failed to send invitation' });
        }
      }

      return res.json({
        success: true,
        data: {
          sent: results,
          failed: errors,
          summary: {
            sent: results.length,
            failed: errors.length
          }
        },
        message: `Meeting invitations sent to ${results.length} recipients`
      });
    }
    
    // Handle single invitation (original logic)
    // Check if invitation already exists for this email
    const existingInvitation = await db.getQuery(
      'SELECT * FROM invitations WHERE email = ? AND status IN ("sent", "pending")',
      [email]
    );

    if (existingInvitation) {
      return res.status(400).json({ 
        success: false, 
        error: 'An active invitation already exists for this email' 
      });
    }

    // Generate invitation token
    const invitationToken = jwt.sign(
      { email, type, invitedBy: userId },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development',
      { expiresIn: '7d' }
    );

    // Get the inviter's name for the email
    let inviterName = 'System Administrator';
    try {
      const inviter = await db.getQuery('SELECT name, email FROM users WHERE id = ?', [userId]);
      if (inviter) {
        inviterName = inviter.name || inviter.email || 'System Administrator';
      }
    } catch (error) {
      console.log('Could not fetch inviter details, using default');
    }

    // Send invitation email
    const { emailService } = await import('../services/emailService');
    const emailSent = await emailService.sendInvitationEmail({
      email,
      name,
      type: type as 'admin' | 'client' | 'affiliate' | 'meeting',
      token: invitationToken,
      invitedBy: inviterName,
      meetingLink
    });

    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send invitation email. Please check email configuration.' 
      });
    }

    // Create invitation record
    const invitationId = await db.executeQuery(
      `INSERT INTO invitations (email, name, type, token, meeting_link, status, sent_by, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'sent', ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [email, name || null, type, invitationToken, meetingLink || null, userId]
    );

    console.log(`📧 Invitation email sent successfully to ${email} (${type})`);

    const newInvitation = {
      id: invitationId,
      email,
      name: name || null,
      type,
      status: 'sent',
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: newInvitation,
      message: `Invitation sent to ${email}`
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

// Send bulk invitations via CSV
router.post('/invitations/bulk', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { invitations } = req.body; // Array of { email, name?, type }
    const userId = req.user?.id;

    if (!Array.isArray(invitations) || invitations.length === 0) {
      return res.status(400).json({ success: false, error: 'Invitations array is required' });
    }

    const db = getDatabaseAdapter();
    const results = [];
    const errors = [];

    for (const invitation of invitations) {
      try {
        const { email, type, name } = invitation;

        if (!email || !type) {
          errors.push({ email: email || 'unknown', error: 'Email and type are required' });
          continue;
        }

        // Check if invitation already exists
        const existingInvitation = await db.getQuery(
          'SELECT * FROM invitations WHERE email = ? AND status IN ("sent", "pending")',
          [email]
        );

        if (existingInvitation) {
          errors.push({ email, error: 'Active invitation already exists' });
          continue;
        }

        // Generate invitation token
        const invitationToken = jwt.sign(
          { email, type, invitedBy: userId },
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development',
          { expiresIn: '7d' }
        );

        // Get the inviter's name for the email (only once for bulk)
        let inviterName = 'System Administrator';
        if (results.length === 0) { // Only fetch once for the first invitation
          try {
            const inviter = await db.getQuery('SELECT name, email FROM users WHERE id = ?', [userId]);
            if (inviter) {
              inviterName = inviter.name || inviter.email || 'System Administrator';
            }
          } catch (error) {
            console.log('Could not fetch inviter details, using default');
          }
        }

        // Send invitation email
        const { emailService } = await import('../services/emailService');
        const emailSent = await emailService.sendInvitationEmail({
          email,
          name,
          type: type as 'admin' | 'client' | 'affiliate' | 'meeting',
          token: invitationToken,
          invitedBy: inviterName
        });

        if (!emailSent) {
          errors.push({ email, error: 'Failed to send invitation email' });
          continue;
        }

        // Create invitation record
        const invitationId = await db.executeQuery(
          `INSERT INTO invitations (email, name, type, token, status, sent_by, created_at, expires_at)
           VALUES (?, ?, ?, ?, 'sent', ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
          [email, name || null, type, invitationToken, userId]
        );

        results.push({
          id: invitationId,
          email,
          name: name || null,
          type,
          status: 'sent'
        });

        console.log(`📧 Bulk invitation email sent successfully to ${email} (${type})`);
      } catch (error) {
        console.error(`Error sending invitation to ${invitation.email}:`, error);
        errors.push({ email: invitation.email, error: 'Failed to send invitation' });
      }
    }

    res.json({
      success: true,
      data: {
        sent: results,
        errors: errors,
        summary: {
          total: invitations.length,
          sent: results.length,
          failed: errors.length
        }
      },
      message: `Sent ${results.length} invitations, ${errors.length} failed`
    });
  } catch (error) {
    console.error('Error sending bulk invitations:', error);
    res.status(500).json({ success: false, error: 'Failed to send bulk invitations' });
  }
});

export default router;
router.post('/affiliates/import-csv', authenticateToken, requireSuperAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const currentUserId = (req as any).user?.id;
    const file = (req as any).file;
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }
    const text = file.buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV must have header and at least one row' });
    }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    function parseRow(line: string): string[] {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(v => v.trim());
    }
    function get(row: Record<string,string>, key: string): string { const k = key.toLowerCase(); return row[k] ?? ''; }
    function getAny(row: Record<string,string>, keys: string[]): string { for (const key of keys) { const val = get(row, key); if (val && String(val).trim().length > 0) return val; } return ''; }
    const rows: Record<string,string>[] = lines.slice(1).map(line => { const values = parseRow(line); const obj: Record<string,string> = {}; for (let i = 0; i < header.length; i++) obj[header[i]] = values[i] ?? ''; return obj; });
    const results: any[] = [];

    let hasReferralPurchaseAmount = true;
    try {
      if (db.getType() === 'mysql') {
        const cols = await db.allQuery('SHOW COLUMNS FROM affiliate_referrals');
        const names = Array.isArray(cols) ? cols.map((c: any) => String(c.Field || '').toLowerCase()) : [];
        hasReferralPurchaseAmount = names.includes('purchase_amount');
      } else {
        const cols = await db.allQuery("PRAGMA table_info('affiliate_referrals')");
        const names = Array.isArray(cols) ? cols.map((c: any) => String(c.name || '').toLowerCase()) : [];
        hasReferralPurchaseAmount = names.includes('purchase_amount');
      }
    } catch {}
    for (const row of rows) {
      try {
        const referBy = getAny(row, ['refer by','referred by','affiliate email']).toLowerCase();
        const fullName = getAny(row, ['full name','name']);
        const email = getAny(row, ['email','customer email']).toLowerCase();
        const payStatusRaw = getAny(row, ['pay status','paid status','payment status']);
        const invoiceId = getAny(row, ['last paid invoice id','invoice id']).trim();
        const invoiceAmountRaw = getAny(row, ['invoice amount','amount']).trim();
        const activeStatusRaw = getAny(row, ['active status','status']).trim();
        const isPaid = /^(paid|succeeded|complete|success|yes|true|1)$/i.test(payStatusRaw);
        const isActive = /^(active|yes|true|1)$/i.test(activeStatusRaw);
        const amount = invoiceAmountRaw ? Number(String(invoiceAmountRaw).replace(/[^0-9.\-]/g, '')) : 0;
        const nameParts = (fullName || '').trim().split(' ').filter(Boolean);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        let affiliateId: number | null = null;
        if (referBy) {
          const aff = await db.getQuery('SELECT id, commission_rate FROM affiliates WHERE email = ? LIMIT 1', [referBy]);
          if (aff && aff.id) affiliateId = Number(aff.id);
        }
        let userRow = email ? await db.getQuery('SELECT * FROM users WHERE email = ? LIMIT 1', [email]) : null;
        let userId: number | null = userRow?.id || null;
        if (!userId && email) {
          const status = isActive ? 'active' : 'inactive';
          const ins = await db.executeQuery('INSERT INTO users (email, password_hash, first_name, last_name, role, status, created_at, updated_at, must_change_password) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)', [email, await bcrypt.hash('ChangeMe123!', 10), firstName, lastName, 'admin', status, false]);
          userId = ins.insertId || ins?.lastID || 0;
          const isActiveInt = isActive ? 1 : 0;
          try {
            await db.executeQuery('INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, is_active, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [userId, JSON.stringify([]), 'admin', 'General', 'Admin User', isActiveInt, currentUserId, currentUserId]);
          } catch {
            await db.executeQuery('INSERT INTO admin_profiles (user_id, permissions, access_level, department, title, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [userId, JSON.stringify([]), 'admin', 'General', 'Admin User', isActiveInt]);
          }
        }
        if (affiliateId && userId) {
          let rate = 0;
          try {
            const affInfo0 = await db.getQuery('SELECT commission_rate FROM affiliates WHERE id = ? LIMIT 1', [affiliateId]);
            rate = affInfo0?.commission_rate ? Number(affInfo0.commission_rate) : 0;
          } catch {}
          const commissionAmountNum = isPaid ? Number(((amount || 0) * rate) / 100) : 0;
          let referralId: number | null = null;
          if (isPaid && invoiceId) {
            const existingRef = await db.getQuery('SELECT id FROM affiliate_referrals WHERE affiliate_id = ? AND referred_user_id = ? AND transaction_id = ? LIMIT 1', [affiliateId, userId, invoiceId]);
            if (existingRef && existingRef.id) {
              referralId = Number(existingRef.id);
              if (hasReferralPurchaseAmount) {
                await db.executeQuery('UPDATE affiliate_referrals SET purchase_amount = ?, commission_amount = ?, commission_rate = ?, status = ?, conversion_date = NOW(), payment_date = NOW(), updated_at = NOW() WHERE id = ?', [amount || 0, commissionAmountNum, rate, 'paid', referralId]);
              } else {
                await db.executeQuery('UPDATE affiliate_referrals SET commission_amount = ?, commission_rate = ?, status = ?, conversion_date = NOW(), payment_date = NOW(), updated_at = NOW() WHERE id = ?', [commissionAmountNum, rate, 'paid', referralId]);
              }
            } else {
              if (hasReferralPurchaseAmount) {
                const insRef = await db.executeQuery('INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, purchase_amount, commission_amount, commission_rate, transaction_id, status, referral_date, conversion_date, payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW(), NOW())', [affiliateId, userId, amount || 0, commissionAmountNum, rate, invoiceId, 'paid']);
                referralId = insRef.insertId || insRef?.lastID || 0;
              } else {
                const insRef = await db.executeQuery('INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, transaction_id, status, referral_date, conversion_date, payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW(), NOW())', [affiliateId, userId, commissionAmountNum, rate, invoiceId, 'paid']);
                referralId = insRef.insertId || insRef?.lastID || 0;
              }
            }
          } else {
            const pendingRef = await db.getQuery('SELECT id FROM affiliate_referrals WHERE affiliate_id = ? AND referred_user_id = ? AND (transaction_id IS NULL OR transaction_id = \'\') ORDER BY created_at ASC LIMIT 1', [affiliateId, userId]);
            if (pendingRef && pendingRef.id) {
              referralId = Number(pendingRef.id);
              if (hasReferralPurchaseAmount) {
                await db.executeQuery('UPDATE affiliate_referrals SET purchase_amount = ?, commission_amount = ?, commission_rate = ?, status = ?, updated_at = NOW() WHERE id = ?', [0, 0, rate, 'pending', referralId]);
              } else {
                await db.executeQuery('UPDATE affiliate_referrals SET commission_amount = ?, commission_rate = ?, status = ?, updated_at = NOW() WHERE id = ?', [0, rate, 'pending', referralId]);
              }
            } else {
              if (hasReferralPurchaseAmount) {
                const insRef = await db.executeQuery('INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, purchase_amount, commission_amount, commission_rate, status, referral_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())', [affiliateId, userId, 0, 0, rate, 'pending']);
                referralId = insRef.insertId || insRef?.lastID || 0;
              } else {
                const insRef = await db.executeQuery('INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, status, referral_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())', [affiliateId, userId, 0, rate, 'pending']);
                referralId = insRef.insertId || insRef?.lastID || 0;
              }
            }
          }
          const commissionAmount = isPaid ? String(commissionAmountNum.toFixed(2)) : '0';
          const productName = 'Subscription';
          const statusVal = isPaid ? 'paid' : 'pending';
          if (referralId) {
            const existingComm = await db.getQuery('SELECT id FROM affiliate_commissions WHERE referral_id = ? LIMIT 1', [referralId]);
            if (existingComm && existingComm.id) {
              await db.executeQuery('UPDATE affiliate_commissions SET order_value = ?, commission_rate = ?, commission_amount = ?, status = ?, product = ?, payment_date = ?, updated_at = NOW() WHERE id = ?', [amount || 0, rate, commissionAmount, statusVal, productName, isPaid ? new Date() : null, existingComm.id]);
            } else {
              await db.executeQuery('INSERT INTO affiliate_commissions (affiliate_id, referral_id, customer_id, customer_name, customer_email, order_value, commission_rate, commission_amount, status, tier, product, order_date, payment_date, tracking_code, commission_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, NOW(), NOW())', [affiliateId, referralId, userId, fullName || `${firstName} ${lastName}`.trim(), email, amount || 0, rate, commissionAmount, statusVal, 'Bronze', productName, isPaid ? new Date() : null, invoiceId || null, 'signup']);
            }
          }
        }
        results.push({ email, status: isPaid ? 'paid' : 'pending' });
      } catch (e: any) {
        results.push({ email: get(row, 'email'), status: 'error', error: e?.message || 'row failed' });
      }
    }
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to import CSV' });
  }
});
