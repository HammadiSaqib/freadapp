import { executeQuery, executeTransaction } from './mysqlConfig.js';
import * as bcrypt from 'bcryptjs';
import { ENV_CONFIG } from '../config/environment.js';

// Super Admin Database Schema Interfaces
export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'lifetime';
  features: string; // JSON string of features array
  page_permissions?: string; // JSON string of page permissions array
  stripe_monthly_price_id?: string;
  stripe_yearly_price_id?: string;
  stripe_product_id?: string;
  max_users?: number;
  max_clients?: number;
  max_disputes?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface AdminProfile {
  id: number;
  user_id: number;
  permissions: string; // JSON string of permissions array
  access_level: 'super_admin' | 'admin' | 'manager' | 'support';
  department?: string;
  title?: string;
  phone?: string;
  emergency_contact?: string;
  notes?: string;
  is_active: boolean;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface AdminSubscription {
  id: number;
  admin_id: number;
  plan_id: number;
  status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  payment_method?: string;
  billing_address?: string;
  last_payment_date?: string;
  next_payment_date?: string;
  payment_amount?: number;
  currency: string;
  trial_end_date?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface UserActivity {
  id: number;
  user_id: number;
  activity_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';
  resource_type?: string; // e.g., 'client', 'dispute', 'user', 'plan'
  resource_id?: number;
  description: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  metadata?: string; // JSON string for additional data
  created_at: string;
}

export interface SystemSettings {
  id: number;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'security' | 'billing' | 'notifications' | 'features';
  description?: string;
  is_public: boolean; // Whether setting can be viewed by non-super-admins
  created_at: string;
  updated_at: string;
  updated_by: number;
}

export interface AdminNotification {
  id: number;
  recipient_id: number;
  sender_id?: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_at: string;
}

// Create Super Admin Tables
export async function createSuperAdminTables(): Promise<void> {
  console.log('📋 Creating Super Admin tables...');
  
  const tables = [
    // Subscription Plans table
    `CREATE TABLE IF NOT EXISTS subscription_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      billing_cycle ENUM('monthly', 'yearly', 'lifetime') NOT NULL DEFAULT 'monthly',
      features JSON NOT NULL,
      page_permissions JSON DEFAULT NULL,
      stripe_monthly_price_id VARCHAR(255) DEFAULT NULL,
      stripe_yearly_price_id VARCHAR(255) DEFAULT NULL,
      stripe_product_id VARCHAR(255) DEFAULT NULL,
      max_users INT DEFAULT NULL,
      max_clients INT DEFAULT NULL,
      max_disputes INT DEFAULT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_name (name),
      INDEX idx_billing_cycle (billing_cycle),
      INDEX idx_is_active (is_active),
      INDEX idx_sort_order (sort_order),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Admin Profiles table
    `CREATE TABLE IF NOT EXISTS admin_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      permissions JSON NOT NULL,
      access_level ENUM('super_admin', 'admin', 'manager', 'support') NOT NULL DEFAULT 'admin',
      department VARCHAR(100),
      title VARCHAR(100),
      phone VARCHAR(20),
      emergency_contact VARCHAR(255),
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_activity_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_access_level (access_level),
      INDEX idx_department (department),
      INDEX idx_is_active (is_active),
      INDEX idx_last_activity_at (last_activity_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Admin Subscriptions table
    `CREATE TABLE IF NOT EXISTS admin_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      plan_id INT NOT NULL,
      status ENUM('active', 'inactive', 'cancelled', 'expired', 'pending') NOT NULL DEFAULT 'pending',
      start_date DATE NOT NULL,
      end_date DATE,
      auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
      payment_method VARCHAR(50),
      billing_address TEXT,
      last_payment_date DATE,
      next_payment_date DATE,
      payment_amount DECIMAL(10,2),
      currency CHAR(3) NOT NULL DEFAULT 'USD',
      trial_end_date DATE,
      cancellation_reason TEXT,
      cancelled_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_admin_id (admin_id),
      INDEX idx_plan_id (plan_id),
      INDEX idx_status (status),
      INDEX idx_start_date (start_date),
      INDEX idx_end_date (end_date),
      INDEX idx_next_payment_date (next_payment_date),
      FOREIGN KEY (admin_id) REFERENCES admin_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Plan Course Associations table
    `CREATE TABLE IF NOT EXISTS plan_course_associations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      course_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      INDEX idx_plan_id (plan_id),
      INDEX idx_course_id (course_id),
      UNIQUE KEY unique_plan_course (plan_id, course_id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // User Activity table (enhanced activity tracking)
    `CREATE TABLE IF NOT EXISTS user_activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      activity_type ENUM('login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import') NOT NULL,
      resource_type VARCHAR(50),
      resource_id INT,
      description TEXT NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      session_id VARCHAR(255),
      metadata JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_activity_type (activity_type),
      INDEX idx_resource_type (resource_type),
      INDEX idx_resource_id (resource_id),
      INDEX idx_created_at (created_at),
      INDEX idx_ip_address (ip_address),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // System Settings table
    `CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(255) NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      setting_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
      category ENUM('general', 'security', 'billing', 'notifications', 'features') NOT NULL DEFAULT 'general',
      description TEXT,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT NOT NULL,
      INDEX idx_setting_key (setting_key),
      INDEX idx_category (category),
      INDEX idx_is_public (is_public),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Admin Notifications table
    `CREATE TABLE IF NOT EXISTS admin_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_id INT NOT NULL,
      sender_id INT,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('info', 'warning', 'error', 'success', 'system') NOT NULL DEFAULT 'info',
      priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at DATETIME,
      action_url VARCHAR(500),
      action_text VARCHAR(100),
      expires_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recipient_id (recipient_id),
      INDEX idx_sender_id (sender_id),
      INDEX idx_type (type),
      INDEX idx_priority (priority),
      INDEX idx_is_read (is_read),
      INDEX idx_created_at (created_at),
      INDEX idx_expires_at (expires_at),
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Invitations table
    `CREATE TABLE IF NOT EXISTS invitations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      type ENUM('admin', 'client', 'affiliate', 'meeting') NOT NULL,
      token TEXT NOT NULL,
      meeting_link TEXT,
      status ENUM('sent', 'pending', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'sent',
      sent_by INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      expires_at DATETIME,
      INDEX idx_invitations_email (email),
      INDEX idx_invitations_status (status),
      INDEX idx_invitations_type (type),
      FOREIGN KEY (sent_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS shop_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      thumbnail_url TEXT,
      stripe_billing_link TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_shop_products_name (name),
      INDEX idx_shop_products_price (price),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS shop_product_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      url TEXT NOT NULL,
      type ENUM('image','video','pdf','zip','other') NOT NULL DEFAULT 'other',
      source ENUM('upload','link') NOT NULL DEFAULT 'upload',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_shop_product_files_product_id (product_id),
      INDEX idx_shop_product_files_type (type),
      FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS shop_purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      purchaser_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      cookie_id VARCHAR(255) NOT NULL,
      status ENUM('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
      stripe_session_id VARCHAR(255),
      stripe_payment_intent_id VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_shop_purchases_product_id (product_id),
      INDEX idx_shop_purchases_email (email),
      INDEX idx_shop_purchases_cookie (cookie_id),
      INDEX idx_shop_purchases_status (status),
      FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS shop_verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(16) NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_shop_verification_purchase (purchase_id),
      INDEX idx_shop_verification_email (email),
      INDEX idx_shop_verification_code (code),
      FOREIGN KEY (purchase_id) REFERENCES shop_purchases(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];
  
  // Execute table creation in transaction
  await executeTransaction(async (connection) => {
    for (const tableSQL of tables) {
      await connection.execute(tableSQL);
    }

    // Apply column migrations for subscription_plans to support Stripe Price/Product IDs
    try {
      const [cols] = await connection.execute<any[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'subscription_plans' 
           AND COLUMN_NAME IN ('stripe_monthly_price_id','stripe_yearly_price_id','stripe_product_id')`
      );
      const existing = new Set((cols as any[]).map((c: any) => c.COLUMN_NAME));
      const alters: string[] = [];
      if (!existing.has('stripe_monthly_price_id')) {
        alters.push('ADD COLUMN stripe_monthly_price_id VARCHAR(255) DEFAULT NULL');
      }
      if (!existing.has('stripe_yearly_price_id')) {
        alters.push('ADD COLUMN stripe_yearly_price_id VARCHAR(255) DEFAULT NULL');
      }
      if (!existing.has('stripe_product_id')) {
        alters.push('ADD COLUMN stripe_product_id VARCHAR(255) DEFAULT NULL');
      }
      if (alters.length) {
        await connection.execute(`ALTER TABLE subscription_plans ${alters.join(', ')}`);
      }
    } catch (e) {
      console.warn('⚠️ Subscription plan column migration skipped or failed:', e);
    }

    try {
      const [cols] = await connection.execute<any[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'shop_products' 
           AND COLUMN_NAME IN ('stripe_billing_link')`
      );
      const existing = new Set((cols as any[]).map((c: any) => c.COLUMN_NAME));
      if (!existing.has('stripe_billing_link')) {
        await connection.execute(`ALTER TABLE shop_products ADD COLUMN stripe_billing_link TEXT`);
      }
    } catch (e) {
      console.warn('⚠️ Shop products column migration skipped or failed:', e);
    }
  });
  
  console.log('✅ Super Admin tables created successfully');
}

// Seed Super Admin data
export async function seedSuperAdminData(): Promise<void> {
  try {
    console.log('🌱 Seeding Super Admin data...');
    
    await executeTransaction(async (connection) => {
      // Create default subscription plans
      const plans = [
        {
          name: 'Starter',
          description: 'Perfect for small credit repair businesses',
          price: 29.99,
          billing_cycle: 'monthly',
          features: JSON.stringify([
            'Up to 50 clients',
            'Basic dispute management',
            'Email support',
            'Standard reporting'
          ]),
          max_users: 2,
          max_clients: 50,
          max_disputes: 500,
          sort_order: 1
        },
        {
          name: 'Professional',
          description: 'For growing credit repair businesses',
          price: 79.99,
          billing_cycle: 'monthly',
          features: JSON.stringify([
            'Up to 200 clients',
            'Advanced dispute management',
            'Priority support',
            'Advanced reporting',
            'API access',
            'White-label options'
          ]),
          max_users: 5,
          max_clients: 200,
          max_disputes: 2000,
          sort_order: 2
        },
        {
          name: 'Enterprise',
          description: 'For large credit repair organizations',
          price: 199.99,
          billing_cycle: 'monthly',
          features: JSON.stringify([
            'Unlimited clients',
            'Full feature access',
            '24/7 phone support',
            'Custom reporting',
            'Full API access',
            'Custom integrations',
            'Dedicated account manager'
          ]),
          max_users: null,
          max_clients: null,
          max_disputes: null,
          sort_order: 3
        }
      ];
      
      for (const plan of plans) {
        await connection.execute(
          `INSERT IGNORE INTO subscription_plans (name, description, price, billing_cycle, features, max_users, max_clients, max_disputes, sort_order, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [plan.name, plan.description, plan.price, plan.billing_cycle, plan.features, plan.max_users, plan.max_clients, plan.max_disputes, plan.sort_order]
        );
      }
      
      // Create super admin profile for demo user
      const superAdminPermissions = JSON.stringify([
        'users.create', 'users.read', 'users.update', 'users.delete',
        'plans.create', 'plans.read', 'plans.update', 'plans.delete',
        'subscriptions.create', 'subscriptions.read', 'subscriptions.update', 'subscriptions.delete',
        'admins.create', 'admins.read', 'admins.update', 'admins.delete',
        'system.settings', 'system.logs', 'system.backup', 'system.maintenance',
        'analytics.view', 'analytics.export',
        'notifications.send', 'notifications.manage'
      ]);
      
      await connection.execute(
        `INSERT IGNORE INTO admin_profiles (user_id, permissions, access_level, department, title, is_active, created_by, updated_by)
         VALUES (1, ?, 'super_admin', 'Administration', 'Super Administrator', TRUE, 1, 1)`,
        [superAdminPermissions]
      );
      
      // Create default system settings
      const settings = [
        { key: 'app.name', value: 'CreditRepair Pro', type: 'string', category: 'general', description: 'Application name', is_public: true },
        { key: 'app.version', value: '1.0.0', type: 'string', category: 'general', description: 'Application version', is_public: true },
        { key: 'security.session_timeout', value: '3600', type: 'number', category: 'security', description: 'Session timeout in seconds', is_public: false },
        { key: 'security.max_login_attempts', value: '5', type: 'number', category: 'security', description: 'Maximum login attempts before lockout', is_public: false },
        { key: 'billing.currency', value: 'USD', type: 'string', category: 'billing', description: 'Default currency', is_public: true },
        { key: 'affiliate.commission_level2_rate_free', value: '2', type: 'number', category: 'billing', description: 'Affiliate level 2 commission rate (%) for FREE affiliates', is_public: false },
        { key: 'affiliate.commission_level2_rate_paid', value: '5', type: 'number', category: 'billing', description: 'Affiliate level 2 commission rate (%) for PAID affiliates', is_public: false },
        { key: 'notifications.email_enabled', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable email notifications', is_public: false },
        { key: 'features.community_enabled', value: 'true', type: 'boolean', category: 'features', description: 'Enable community features', is_public: true },
        { key: 'features.calendar_enabled', value: 'true', type: 'boolean', category: 'features', description: 'Enable calendar features', is_public: true }
      ];
      
      for (const setting of settings) {
        await connection.execute(
          `INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [setting.key, setting.value, setting.type, setting.category, setting.description, setting.is_public]
        );
      }
    });
    
    console.log('✅ Super Admin data seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed Super Admin data:', error);
    throw error;
  }
}

// Initialize Super Admin database
export async function initializeSuperAdminDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing Super Admin database extensions...');
    
    await createSuperAdminTables();
    
    // Check if super admin data already exists
    const [planCount] = await executeQuery<any[]>('SELECT COUNT(*) as count FROM subscription_plans');
    
    if (!planCount || planCount.count === 0) {
      if (ENV_CONFIG.SEED_DEMO_DATA) {
        await seedSuperAdminData();
      } else {
        console.log('🌱 Super Admin seeding disabled by env; leaving tables empty.');
      }
    } else {
      console.log('📊 Super Admin data already exists, skipping seed...');
    }
    
    console.log('✅ Super Admin database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Super Admin database:', error);
    throw error;
  }
}
