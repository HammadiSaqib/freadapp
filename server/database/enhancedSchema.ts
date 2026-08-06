import sqlite3 from 'sqlite3';
import * as bcrypt from 'bcryptjs';
import { SECURITY_CONFIG } from '../config/security.js';

// Database connection
let db: sqlite3.Database;

// Enhanced interfaces with validation and audit fields
export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'locked' | 'pending';
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until?: string;
  last_login?: string;
  last_login_ip?: string;
  last_login_user_agent?: string;
  password_changed_at: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface Client {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  ssn_last_four?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  status: 'active' | 'inactive' | 'pending';
  credit_score?: number;
  target_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface CreditReport {
  id: number;
  client_id: number;
  bureau: 'experian' | 'equifax' | 'transunion';
  report_date: string;
  credit_score?: number;
  report_data?: string; // JSON string
  status: 'pending' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface Dispute {
  id: number;
  client_id: number;
  bureau: 'experian' | 'equifax' | 'transunion';
  account_name: string;
  account_number?: string;
  dispute_reason: string;
  dispute_type: 'inaccurate' | 'incomplete' | 'unverifiable' | 'fraudulent' | 'other';
  status: 'draft' | 'submitted' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  filed_date?: string;
  response_date?: string;
  expected_resolution_date?: string;
  result?: string;
  notes?: string;
  documents?: string; // JSON array of document paths
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface Activity {
  id: number;
  user_id?: number;
  client_id?: number;
  dispute_id?: number;
  activity_type: 'login' | 'logout' | 'client_created' | 'client_updated' | 'dispute_filed' | 'dispute_updated' | 'report_generated' | 'password_changed' | 'profile_updated' | 'other';
  description: string;
  metadata?: string; // JSON string for additional data
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  created_by?: number;
}

export interface Analytics {
  id: number;
  user_id: number;
  metric_name: string;
  metric_value: number;
  metric_type: 'count' | 'percentage' | 'score' | 'currency' | 'other';
  period_start: string;
  period_end: string;
  metadata?: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: string; // JSON string
  new_values?: string; // JSON string
  changed_by?: number;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Enhanced database initialization
export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbPath = process.env.DATABASE_PATH || './database.sqlite';
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Enable foreign keys and WAL mode for better performance
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = 1000');
        db.run('PRAGMA temp_store = memory');
        
        createTables()
          .then(() => seedDatabase())
          .then(() => {
            console.log('Database initialized successfully');
            resolve();
          })
          .catch(reject);
      });
    });
  });
}

// Enhanced table creation with better constraints and indexes
async function createTables(): Promise<void> {
  const tables = [
    // Users table with enhanced security fields
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company_name TEXT,
      credit_repair_url TEXT,
      onboarding_slug TEXT,
      intake_redirect_url TEXT,
      intake_logo_url TEXT,
      intake_primary_color TEXT,
      intake_company_name TEXT,
      intake_website_url TEXT,
      intake_email TEXT,
      intake_phone_number TEXT,
      funding_override_enabled BOOLEAN NOT NULL DEFAULT 0,
      funding_override_signature_text TEXT,
      funding_override_signed_at DATETIME,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked', 'pending')),
      email_verified BOOLEAN NOT NULL DEFAULT 0,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until DATETIME,
      last_login DATETIME,
      last_login_ip TEXT,
      last_login_user_agent TEXT,
      password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      updated_by INTEGER,
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )`,
    
    // Clients table with enhanced validation
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT,
      date_of_birth DATE,
      ssn_last_four TEXT CHECK (length(ssn_last_four) = 4 AND ssn_last_four GLOB '[0-9][0-9][0-9][0-9]'),
      address TEXT,
      city TEXT,
      state TEXT CHECK (length(state) = 2),
      zip_code TEXT CHECK (length(zip_code) >= 5),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
      experian_score INTEGER CHECK (experian_score >= 300 AND experian_score <= 850),
      equifax_score INTEGER CHECK (equifax_score >= 300 AND equifax_score <= 850),
      transunion_score INTEGER CHECK (transunion_score >= 300 AND transunion_score <= 850),
      credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
      target_score INTEGER CHECK (target_score >= 300 AND target_score <= 850),
      notes TEXT,
      platform TEXT,
      platform_email TEXT,
      platform_password TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )`,
    
    // Credit reports table
    `CREATE TABLE IF NOT EXISTS credit_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
      report_date DATE NOT NULL,
      credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
      report_data TEXT, -- JSON string
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id),
      UNIQUE(client_id, bureau, report_date)
    )`,
    
    // Enhanced disputes table
    `CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
      account_name TEXT NOT NULL,
      account_number TEXT,
      dispute_reason TEXT NOT NULL,
      dispute_type TEXT NOT NULL CHECK (dispute_type IN ('inaccurate', 'incomplete', 'unverifiable', 'fraudulent', 'other')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_progress', 'resolved', 'rejected')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      filed_date DATE,
      response_date DATE,
      expected_resolution_date DATE,
      result TEXT,
      notes TEXT,
      documents TEXT, -- JSON array
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )`,
    
    // Enhanced activities table for audit trail
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      client_id INTEGER,
      dispute_id INTEGER,
      activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'client_created', 'client_updated', 'dispute_filed', 'dispute_updated', 'report_generated', 'password_changed', 'profile_updated', 'other')),
      description TEXT NOT NULL,
      metadata TEXT, -- JSON string
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL,
      FOREIGN KEY (dispute_id) REFERENCES disputes (id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`,
    
    // Analytics table
    `CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metric_type TEXT NOT NULL CHECK (metric_type IN ('count', 'percentage', 'score', 'currency', 'other')),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      metadata TEXT, -- JSON string
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,
    
    // Audit log table for tracking all changes
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
      old_values TEXT, -- JSON string
      new_values TEXT, -- JSON string
      changed_by INTEGER,
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (changed_by) REFERENCES users (id)
    )`
  ];
  
  // Create indexes for better performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users (status)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_onboarding_slug ON users (onboarding_slug)',
    'CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email)',
    'CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status)',
    'CREATE INDEX IF NOT EXISTS idx_credit_reports_client_id ON credit_reports (client_id)',
    'CREATE INDEX IF NOT EXISTS idx_credit_reports_bureau ON credit_reports (bureau)',
    'CREATE INDEX IF NOT EXISTS idx_credit_reports_date ON credit_reports (report_date)',
    'CREATE INDEX IF NOT EXISTS idx_disputes_client_id ON disputes (client_id)',
    'CREATE INDEX IF NOT EXISTS idx_disputes_bureau ON disputes (bureau)',
    'CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status)',
    'CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes (priority)',
    'CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities (client_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_dispute_id ON activities (dispute_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_type ON activities (activity_type)',
    'CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics (metric_name)',
    'CREATE INDEX IF NOT EXISTS idx_analytics_period ON analytics (period_start, period_end)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs (table_name, record_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs (changed_by)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs (changed_at)'
  ];
  
  // Create triggers for automatic updated_at timestamps
  const triggers = [
    `CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
     AFTER UPDATE ON users 
     BEGIN 
       UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`,
    
    `CREATE TRIGGER IF NOT EXISTS update_clients_timestamp 
     AFTER UPDATE ON clients 
     BEGIN 
       UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`,
    
    `CREATE TRIGGER IF NOT EXISTS update_credit_reports_timestamp 
     AFTER UPDATE ON credit_reports 
     BEGIN 
       UPDATE credit_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`,
    
    `CREATE TRIGGER IF NOT EXISTS update_disputes_timestamp 
     AFTER UPDATE ON disputes 
     BEGIN 
       UPDATE disputes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`,
    
    `CREATE TRIGGER IF NOT EXISTS update_analytics_timestamp 
     AFTER UPDATE ON analytics 
     BEGIN 
       UPDATE analytics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`
  ];
  
  // Execute all table creation statements
  for (const table of tables) {
    await runQuery(table);
  }
  
  // Create indexes
  for (const index of indexes) {
    await runQuery(index);
  }
  
  // Create triggers
  for (const trigger of triggers) {
    await runQuery(trigger);
  }
  
  console.log('All tables, indexes, and triggers created successfully');
}

// Enhanced seeding with better demo data
async function seedDatabase(): Promise<void> {
  try {
    // Check if database is already seeded
    const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', ['demo@creditrepairpro.com']);
    
    if (existingUser) {
      console.log('Database already seeded');
      return;
    }
    
    console.log('Seeding database with demo data...');
    
    // Create demo admin user
    const hashedPassword = await bcrypt.hash('demo123', SECURITY_CONFIG.PASSWORD.BCRYPT_ROUNDS);
    
    const adminUserId = await runQuery(
      `INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, status, email_verified, password_changed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'demo@creditrepairpro.com',
        hashedPassword,
        'Demo',
        'Admin',
        'Score Machine',
        'admin',
        'active',
        1,
        new Date().toISOString()
      ]
    );
    
    // Create demo regular user
    const regularUserPassword = await bcrypt.hash('user123', SECURITY_CONFIG.PASSWORD.BCRYPT_ROUNDS);
    
    const regularUserId = await runQuery(
      `INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, status, email_verified, password_changed_at, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'user@creditrepairpro.com',
        regularUserPassword,
        'Demo',
        'User',
        'My Credit Repair',
        'user',
        'active',
        1,
        new Date().toISOString(),
        adminUserId
      ]
    );
    
    // Create demo clients for admin user
    const client1Id = await runQuery(
      `INSERT INTO clients (user_id, first_name, last_name, email, phone, date_of_birth, ssn_last_four, address, city, state, zip_code, status, credit_score, target_score, notes, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        'John',
        'Smith',
        'john.smith@example.com',
        '(555) 123-4567',
        '1985-03-15',
        '1234',
        '123 Main St',
        'Anytown',
        'CA',
        '90210',
        'active',
        580,
        720,
        'Initial consultation completed. Focus on removing old collections.',
        adminUserId,
        adminUserId
      ]
    );
    
    const client2Id = await runQuery(
      `INSERT INTO clients (user_id, first_name, last_name, email, phone, date_of_birth, ssn_last_four, address, city, state, zip_code, status, credit_score, target_score, notes, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        'Sarah',
        'Johnson',
        'sarah.johnson@example.com',
        '(555) 987-6543',
        '1990-07-22',
        '5678',
        '456 Oak Ave',
        'Springfield',
        'TX',
        '75001',
        'active',
        620,
        750,
        'Recent bankruptcy discharge. Working on rebuilding credit.',
        adminUserId,
        adminUserId
      ]
    );
    
    // Create demo disputes
    const dispute1Id = await runQuery(
      `INSERT INTO disputes (client_id, bureau, account_name, account_number, dispute_reason, dispute_type, status, priority, filed_date, expected_resolution_date, notes, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client1Id,
        'experian',
        'ABC Collections',
        'ACC123456',
        'Account was paid in full but still showing as unpaid',
        'inaccurate',
        'submitted',
        'high',
        '2024-01-15',
        '2024-02-15',
        'Client provided proof of payment. Waiting for bureau response.',
        adminUserId,
        adminUserId
      ]
    );
    
    const dispute2Id = await runQuery(
      `INSERT INTO disputes (client_id, bureau, account_name, dispute_reason, dispute_type, status, priority, filed_date, response_date, result, notes, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client2Id,
        'equifax',
        'XYZ Credit Card',
        'Account does not belong to client',
        'fraudulent',
        'resolved',
        'high',
        '2024-01-10',
        '2024-02-05',
        'Account successfully removed from credit report',
        'Identity theft case. Account removed after investigation.',
        adminUserId,
        adminUserId
      ]
    );
    
    // Create demo activities
    await runQuery(
      `INSERT INTO activities (user_id, client_id, activity_type, description, ip_address, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        client1Id,
        'client_created',
        'New client John Smith added to the system',
        '127.0.0.1',
        adminUserId
      ]
    );
    
    await runQuery(
      `INSERT INTO activities (user_id, dispute_id, activity_type, description, ip_address, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        dispute1Id,
        'dispute_filed',
        'Dispute filed with Experian for ABC Collections account',
        '127.0.0.1',
        adminUserId
      ]
    );
    
    // Create demo analytics
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    await runQuery(
      `INSERT INTO analytics (user_id, metric_name, metric_value, metric_type, period_start, period_end) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        'total_clients',
        2,
        'count',
        lastMonth.toISOString().split('T')[0],
        thisMonth.toISOString().split('T')[0]
      ]
    );
    
    await runQuery(
      `INSERT INTO analytics (user_id, metric_name, metric_value, metric_type, period_start, period_end) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminUserId,
        'dispute_success_rate',
        75.5,
        'percentage',
        lastMonth.toISOString().split('T')[0],
        thisMonth.toISOString().split('T')[0]
      ]
    );
    
    console.log('Database seeded successfully with demo data');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Enhanced database helper functions with better error handling
export function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Database run error:', err.message, 'SQL:', sql, 'Params:', params);
        reject(err);
      } else {
        resolve(this.lastID || this.changes);
      }
    });
  });
}

export function getQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database get error:', err.message, 'SQL:', sql, 'Params:', params);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function allQuery(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database all error:', err.message, 'SQL:', sql, 'Params:', params);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Transaction helper
export function runTransaction(queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const results: any[] = [];
      let completed = 0;
      
      const executeNext = (index: number) => {
        if (index >= queries.length) {
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Transaction commit error:', err.message);
              reject(err);
            } else {
              resolve(results);
            }
          });
          return;
        }
        
        const { sql, params = [] } = queries[index];
        
        db.run(sql, params, function(err) {
          if (err) {
            console.error('Transaction query error:', err.message, 'SQL:', sql);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          results.push(this.lastID || this.changes);
          executeNext(index + 1);
        });
      };
      
      executeNext(0);
    });
  });
}

// Activity logging helper
export async function logActivity(
  activityType: string,
  description: string,
  userId?: number,
  clientId?: number,
  disputeId?: number,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await runQuery(
      `INSERT INTO activities (user_id, client_id, dispute_id, activity_type, description, metadata, ip_address, user_agent, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        clientId || null,
        disputeId || null,
        activityType,
        description,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress || null,
        userAgent || null,
        userId || null
      ]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
}

// Audit logging helper
export async function logAudit(
  tableName: string,
  recordId: number,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldValues?: any,
  newValues?: any,
  changedBy?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await runQuery(
      `INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tableName,
        recordId,
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        changedBy || null,
        ipAddress || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw error to avoid breaking main functionality
  }
}

// Database cleanup and maintenance
export async function performMaintenance(): Promise<void> {
  try {
    console.log('Starting database maintenance...');
    
    // Clean up old activities (keep last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    await runQuery(
      'DELETE FROM activities WHERE created_at < ? AND activity_type NOT IN ("login", "logout")',
      [ninetyDaysAgo.toISOString()]
    );
    
    // Clean up old audit logs (keep last 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    await runQuery(
      'DELETE FROM audit_logs WHERE changed_at < ?',
      [oneYearAgo.toISOString()]
    );
    
    // Vacuum database to reclaim space
    await runQuery('VACUUM');
    
    // Analyze tables for query optimization
    await runQuery('ANALYZE');
    
    console.log('Database maintenance completed successfully');
    
  } catch (error) {
    console.error('Error during database maintenance:', error);
    throw error;
  }
}

// Get database connection (for advanced operations)
export function getDatabase(): sqlite3.Database {
  return db;
}

// Close database connection
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
