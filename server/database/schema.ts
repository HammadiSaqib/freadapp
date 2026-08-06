import sqlite3 from "sqlite3";
const { Database } = sqlite3;
import { join } from "path";
import * as bcrypt from "bcryptjs";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  account_type?: "admin" | "affiliate_only";
  referred_by_user_id?: number;
  referral_source?: "product_link" | "affiliate_link";
  role: "admin" | "manager" | "agent" | "funding_manager";
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Client {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  ssn_last_four?: string;
  date_of_birth?: string;
  employment_status?: string;
  annual_income?: number;
  status: "active" | "inactive" | "completed" | "on_hold";
  credit_score?: number;
  previous_credit_score?: number;
  experian_score?: number;
  equifax_score?: number;
  transunion_score?: number;
  fundable_status?: 'fundable' | 'not_fundable';
  fundable_in_tu?: boolean;
  fundable_in_ex?: boolean;
  fundable_in_eq?: boolean;
  notes?: string;
  platform?: string;
  platform_email?: string;
  platform_password?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditReport {
  id: number;
  client_id: number;
  bureau: "experian" | "equifax" | "transunion";
  score: number;
  report_date: string;
  report_data: string; // JSON string
  created_at: string;
}

export interface Dispute {
  id: number;
  client_id: number;
  bureau: "experian" | "equifax" | "transunion";
  account_name: string;
  dispute_reason: string;
  status: "pending" | "investigating" | "verified" | "deleted" | "updated";
  filed_date: string;
  response_date?: string;
  result?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  user_id: number;
  client_id?: number;
  type:
    | "client_added"
    | "dispute_filed"
    | "score_updated"
    | "payment_received"
    | "note_added";
  description: string;
  metadata?: string; // JSON string
  created_at: string;
}

export interface Analytics {
  id: number;
  user_id: number;
  metric_type: "revenue" | "clients" | "disputes" | "success_rate";
  value: number;
  period: "daily" | "weekly" | "monthly";
  date: string;
  created_at: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  points: number;
  featured: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CourseChapter {
  id: number;
  course_id: number;
  title: string;
  content?: string;
  video_url?: string;
  duration: string;
  order_index: number;
  created_at: string;
}

export interface CourseEnrollment {
  id: number;
  user_id: number;
  course_id: number;
  progress: number;
  completed: boolean;
  enrolled_at: string;
  completed_at?: string;
}

// Database connection
let db: Database;

export function initializeDatabase(): Promise<Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const dbPath = join(process.cwd(), "data", "creditrepair.db");
    db = new Database(dbPath, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // Enable foreign keys
        await runQuery("PRAGMA foreign_keys = ON");

        // Create tables
        await createTables();

        // Seed initial data
        await seedDatabase();

        resolve(db);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function to promisify database operations
function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function createTables() {
  // Users table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT,
      address TEXT,
      avatar TEXT,
      credit_repair_url TEXT,
      onboarding_slug TEXT,
      intake_redirect_url TEXT,
      intake_logo_url TEXT,
      intake_primary_color TEXT,
      intake_company_name TEXT,
      intake_website_url TEXT,
      intake_email TEXT,
      intake_phone_number TEXT,
      funding_override_enabled BOOLEAN DEFAULT 0,
      funding_override_signature_text TEXT,
      funding_override_signed_at DATETIME,
      send_dispute_letter_email BOOLEAN DEFAULT 1,
      send_inactivity_email BOOLEAN DEFAULT 1,
      send_report_pull_reminder_email BOOLEAN DEFAULT 1,
      notify_client_after_report_pull BOOLEAN DEFAULT 1,
      account_type TEXT DEFAULT 'admin' CHECK (account_type IN ('admin','affiliate_only')),
      referred_by_user_id INTEGER,
      referral_source TEXT CHECK (referral_source IN ('product_link','affiliate_link')),
      role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent', 'funding_manager')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (referred_by_user_id) REFERENCES users (id)
    )
  `);

  // Backfill column for existing databases (ignore error if already exists)
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN credit_repair_url TEXT`);
  } catch (err) {
    // Column may already exist; ignore errors
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN onboarding_slug TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_redirect_url TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_logo_url TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_primary_color TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_company_name TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_website_url TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_email TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN intake_phone_number TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN funding_override_enabled BOOLEAN DEFAULT 0`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN funding_override_signature_text TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN funding_override_signed_at DATETIME`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN send_dispute_letter_email BOOLEAN DEFAULT 1`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN send_inactivity_email BOOLEAN DEFAULT 1`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN send_report_pull_reminder_email BOOLEAN DEFAULT 1`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN notify_client_after_report_pull BOOLEAN DEFAULT 1`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE tsm_elite_signatures ADD COLUMN signature_image_url TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_onboarding_slug ON users (onboarding_slug)`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'admin'`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN referred_by_user_id INTEGER`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN referral_source TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users (referred_by_user_id)`);
  } catch (err) {
  }
  try {
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_users_referral_source ON users (referral_source)`);
  } catch (err) {
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS admin_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'ghl',
      name TEXT,
      access_token TEXT NOT NULL,
      location_id TEXT,
      integration_hash TEXT NOT NULL UNIQUE,
      outbound_url TEXT,
      business_record_id TEXT,
      custom_field_credit_score TEXT,
      custom_field_experian_score TEXT,
      custom_field_equifax_score TEXT,
      custom_field_transunion_score TEXT,
      custom_field_report_date TEXT,
      field_mappings TEXT,
      is_active BOOLEAN DEFAULT 1,
      verified_at DATETIME,
      last_validation_code INTEGER,
      last_validation_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      updated_by INTEGER,
      FOREIGN KEY (admin_id) REFERENCES users (id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS integration_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integration_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
      event_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success','failed')),
      message TEXT,
      client_id INTEGER,
      response_code INTEGER,
      error_message TEXT,
      data_fields TEXT,
      retry_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (integration_id) REFERENCES admin_integrations (id),
      FOREIGN KEY (admin_id) REFERENCES users (id),
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  for (const statement of [
    `ALTER TABLE admin_integrations ADD COLUMN verified_at DATETIME`,
    `ALTER TABLE admin_integrations ADD COLUMN last_validation_code INTEGER`,
    `ALTER TABLE admin_integrations ADD COLUMN last_validation_error TEXT`,
    `ALTER TABLE integration_activity_logs ADD COLUMN response_code INTEGER`,
    `ALTER TABLE integration_activity_logs ADD COLUMN error_message TEXT`,
    `ALTER TABLE integration_activity_logs ADD COLUMN data_fields TEXT`,
    `ALTER TABLE integration_activity_logs ADD COLUMN retry_status TEXT`
  ]) {
    try {
      await runQuery(statement);
    } catch {}
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS integration_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integration_id INTEGER NOT NULL,
      idempotency_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (integration_id, idempotency_key),
      FOREIGN KEY (integration_id) REFERENCES admin_integrations (id)
    )
  `);

  // Clients table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      ssn_last_four TEXT,
      date_of_birth DATE,
      employment_status TEXT,
      annual_income INTEGER,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'on_hold')),
      experian_score INTEGER,
      equifax_score INTEGER,
      transunion_score INTEGER,
      credit_score INTEGER,
      previous_credit_score INTEGER,
      fundable_status TEXT CHECK (fundable_status IN ('fundable','not_fundable')),
      fundable_in_tu BOOLEAN DEFAULT 0,
      fundable_in_ex BOOLEAN DEFAULT 0,
      fundable_in_eq BOOLEAN DEFAULT 0,
      notes TEXT,
      platform TEXT,
      platform_email TEXT,
      platform_password TEXT,
      created_via TEXT,
      integration_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (integration_id) REFERENCES admin_integrations (id)
    )
  `);

  // Backfill columns for existing databases (ignore error if already exists)
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN fundable_status TEXT CHECK (fundable_status IN ('fundable','not_fundable'))`);
  } catch (err) {
    // Column may already exist; ignore errors
  }

  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN experian_score INTEGER`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN equifax_score INTEGER`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN transunion_score INTEGER`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN fundable_in_tu BOOLEAN DEFAULT 0`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN fundable_in_ex BOOLEAN DEFAULT 0`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN fundable_in_eq BOOLEAN DEFAULT 0`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN platform TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN platform_email TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN platform_password TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN created_via TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE clients ADD COLUMN integration_id INTEGER`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE project_tasks ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'medium', 'priority'))`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE project_tasks ADD COLUMN attachment_urls TEXT`);
  } catch (err) {
  }
  try {
    await runQuery(`ALTER TABLE project_tasks ADD COLUMN rejection_reason TEXT`);
  } catch (err) {
  }
  try {
    const taskColumns = await allQuery(`PRAGMA table_info(project_tasks)`);
    const existing = new Set((taskColumns || []).map((column: any) => column.name));
    const tableSqlRow = await getQuery(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'project_tasks'`);
    const tableSql = String(tableSqlRow?.sql || '');
    if (tableSql && !tableSql.includes("'rejected'")) {
      await runQuery(`ALTER TABLE project_tasks RENAME TO project_tasks_old`);
      await runQuery(`
        CREATE TABLE project_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          screenshot_url TEXT,
          attachment_urls TEXT,
          rejection_reason TEXT,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
          priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'medium', 'priority')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER NOT NULL,
          updated_by INTEGER NOT NULL,
          FOREIGN KEY (created_by) REFERENCES users (id),
          FOREIGN KEY (updated_by) REFERENCES users (id)
        )
      `);
      await runQuery(
        `INSERT INTO project_tasks (
          id,
          title,
          description,
          screenshot_url,
          attachment_urls,
          rejection_reason,
          status,
          priority,
          created_at,
          updated_at,
          created_by,
          updated_by
        )
        SELECT
          id,
          title,
          description,
          screenshot_url,
          ${existing.has('attachment_urls') ? 'attachment_urls' : 'NULL'},
          ${existing.has('rejection_reason') ? 'rejection_reason' : 'NULL'},
          status,
          ${existing.has('priority') ? "COALESCE(priority, 'normal')" : "'normal'"},
          created_at,
          updated_at,
          created_by,
          updated_by
        FROM project_tasks_old`
      );
      await runQuery(`DROP TABLE project_tasks_old`);
    }
  } catch (err) {
  }

  // Credit Reports table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS credit_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
      score INTEGER NOT NULL,
      report_date DATE NOT NULL,
      report_data TEXT, -- JSON data
      json_file_path TEXT, -- Path to JSON file
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  // Disputes table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
      account_name TEXT NOT NULL,
      dispute_reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'investigating', 'verified', 'deleted', 'updated')),
      filed_date DATE NOT NULL,
      response_date DATE,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  // Activities table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client_id INTEGER,
      type TEXT NOT NULL CHECK (type IN ('client_added', 'dispute_filed', 'score_updated', 'payment_received', 'note_added')),
      description TEXT NOT NULL,
      metadata TEXT, -- JSON data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  // Analytics table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'clients', 'disputes', 'success_rate')),
      value REAL NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Courses table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      instructor TEXT NOT NULL,
      duration TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
      points INTEGER DEFAULT 0,
      featured BOOLEAN DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Course Chapters table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS course_chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      video_url TEXT,
      duration TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )
  `);

  // Course Enrollments table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT 0,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
      UNIQUE(user_id, course_id)
    )
  `);

  // Contract Templates table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      content_html TEXT,
      content_text TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users (id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS tsm_elite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      content_html TEXT,
      content_text TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES users (id),
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS tsm_elite_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      signature_text TEXT,
      signature_image_url TEXT,
      ip_address TEXT,
      user_agent TEXT,
      signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES tsm_elite (id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(admin_id, template_id)
    )
  `);

  // Contracts table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      template_id INTEGER,
      admin_id INTEGER NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'pending_signature' CHECK (status IN ('draft', 'pending_signature', 'signed', 'void', 'expired')),
      sent_at DATETIME,
      due_at DATETIME,
      signed_at DATETIME,
      void_reason TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (template_id) REFERENCES contract_templates (id),
      FOREIGN KEY (admin_id) REFERENCES users (id)
    )
  `);

  // Contract Signatures table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS contract_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      signer_type TEXT NOT NULL CHECK (signer_type IN ('client', 'admin')),
      signer_id INTEGER NOT NULL,
      signed_at DATETIME,
      ip_address TEXT,
      user_agent TEXT,
      signature_text TEXT,
      signature_image_url TEXT,
      is_signed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contract_id) REFERENCES contracts (id)
    )
  `);

  // Support tickets table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
      category TEXT NOT NULL,
      assignee_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES users (id),
      FOREIGN KEY (assignee_id) REFERENCES users (id),
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )
  `);

  // Project tasks table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      screenshot_url TEXT,
      attachment_urls TEXT,
      rejection_reason TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'medium', 'priority')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )
  `);

  // Ticket analytics table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS ticket_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      first_response_at DATETIME,
      resolved_at DATETIME,
      response_time_hours REAL,
      resolution_time_hours REAL,
      customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
      escalated BOOLEAN DEFAULT 0,
      escalated_at DATETIME,
      sla_response_met BOOLEAN DEFAULT 0,
      sla_resolution_met BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
      UNIQUE(ticket_id)
    )
  `);

  // Testimonials table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Support metrics table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS support_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_date DATE NOT NULL,
      total_tickets INTEGER DEFAULT 0,
      resolved_tickets INTEGER DEFAULT 0,
      avg_response_time_hours REAL DEFAULT 0.00,
      avg_resolution_time_hours REAL DEFAULT 0.00,
      customer_satisfaction_avg REAL DEFAULT 0.00,
      first_response_sla_met INTEGER DEFAULT 0,
      resolution_sla_met INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metric_date)
    )
  `);

  // Agent performance table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS agent_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      performance_date DATE NOT NULL,
      tickets_assigned INTEGER DEFAULT 0,
      tickets_resolved INTEGER DEFAULT 0,
      avg_response_time_hours REAL DEFAULT 0.00,
      avg_resolution_time_hours REAL DEFAULT 0.00,
      customer_satisfaction_avg REAL DEFAULT 0.00,
      efficiency_score REAL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES users (id),
      UNIQUE(agent_id, performance_date)
    )
  `);

  // Create indexes
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_credit_reports_client_id ON credit_reports(client_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_disputes_client_id ON disputes(client_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_course_chapters_course_id ON course_chapters(course_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id)
  `);
  // Contracts-related indexes
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contract_templates_admin_id ON contract_templates(admin_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tsm_elite_admin_id ON tsm_elite(admin_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tsm_elite_status ON tsm_elite(status)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tsm_elite_signatures_template_id ON tsm_elite_signatures(template_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tsm_elite_signatures_admin_id ON tsm_elite_signatures(admin_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON contracts(template_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract_id ON contract_signatures(contract_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contract_signatures_signer_type ON contract_signatures(signer_type)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_contract_signatures_is_signed ON contract_signatures(is_signed)
  `);
  
  // Support table indexes
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_ticket_analytics_ticket_id ON ticket_analytics(ticket_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_support_metrics_date ON support_metrics(metric_date)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id)
  `);
  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance(performance_date)
  `);
}

async function seedDatabase() {
  // Check if data already exists
  const userCount = await getQuery("SELECT COUNT(*) as count FROM users");

  if (userCount && userCount.count > 0) {
    console.log("Database already seeded, skipping...");
    return; // Already seeded
  }

  console.log("Seeding database with demo user...");

  // Insert demo user using bcrypt hash
  // Demo password is "demo123"
  const demoPasswordHash = bcrypt.hashSync("demo123", 10);

  console.log("Demo password hash:", demoPasswordHash);

  await runQuery(
    `
    INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [
      "demo@creditrepairpro.com",
      demoPasswordHash,
      "John",
      "Doe",
      "The Score Machine",
      "admin",
      1,
    ],
  );

  console.log("Demo user created successfully!");

  // Insert demo clients with comprehensive data
  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "Sarah",
      "Johnson",
      "sarah.johnson@email.com",
      "(555) 123-4567",
      "123 Main St, Springfield, IL",
      "employed",
      65000,
      "active",
      650,
      580,
      "Medical collections affecting score",
    ],
  );

  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "Michael",
      "Chen",
      "m.chen@email.com",
      "(555) 234-5678",
      "456 Oak Ave, Portland, OR",
      "self-employed",
      55000,
      "active",
      580,
      560,
      "Small business owner, improving credit",
    ],
  );

  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "Emma",
      "Davis",
      "emma.davis@email.com",
      "(555) 345-6789",
      "789 Pine Rd, Denver, CO",
      "employed",
      75000,
      "active",
      720,
      680,
      "Excellent progress, almost to target score",
    ],
  );

  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "Robert",
      "Wilson",
      "r.wilson@email.com",
      "(555) 456-7890",
      "321 Elm St, Austin, TX",
      "employed",
      85000,
      "completed",
      780,
      630,
      "Successfully completed credit repair program",
    ],
  );

  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "Lisa",
      "Rodriguez",
      "lisa.r@email.com",
      "(555) 567-8901",
      "654 Maple Dr, Miami, FL",
      "employed",
      62000,
      "active",
      685,
      620,
      "Making steady progress on disputes",
    ],
  );

  // Add more demo clients for better demonstration
  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "James",
      "Thompson",
      "james.thompson@email.com",
      "(555) 678-9012",
      "987 Cedar Ln, Seattle, WA",
      "employed",
      70000,
      "active",
      595,
      545,
      "New client, multiple disputes filed",
    ],
  );

  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "Maria",
      "Garcia",
      "maria.garcia@email.com",
      "(555) 789-0123",
      "147 Birch Ave, Phoenix, AZ",
      "self-employed",
      48000,
      "active",
      615,
      585,
      "Freelance designer, improving steadily",
    ],
  );

  await runQuery(
    `
    INSERT INTO clients (user_id, first_name, last_name, email, phone, address, employment_status, annual_income, status, credit_score, previous_credit_score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "David",
      "Lee",
      "david.lee@email.com",
      "(555) 890-1234",
      "258 Willow St, Boston, MA",
      "employed",
      95000,
      "on_hold",
      740,
      690,
      "Temporary hold due to documentation review",
    ],
  );

  // Insert demo disputes
  await runQuery(
    `
    INSERT INTO disputes (client_id, bureau, account_name, dispute_reason, status, filed_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "experian",
      "ABC Medical",
      "Not mine - never had services",
      "investigating",
      "2024-01-15",
    ],
  );

  await runQuery(
    `
    INSERT INTO disputes (client_id, bureau, account_name, dispute_reason, status, filed_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      "equifax",
      "Old Credit Card",
      "Paid in full - should be removed",
      "pending",
      "2024-01-20",
    ],
  );

  await runQuery(
    `
    INSERT INTO disputes (client_id, bureau, account_name, dispute_reason, status, filed_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      2,
      "transunion",
      "Collection Account",
      "Duplicate listing",
      "verified",
      "2024-01-18",
    ],
  );

  // Insert demo activities
  await runQuery(
    `
    INSERT INTO activities (user_id, client_id, type, description)
    VALUES (?, ?, ?, ?)
  `,
    [
      1,
      1,
      "dispute_filed",
      "Dispute submitted for Collection Account - ABC Medical",
    ],
  );

  await runQuery(
    `
    INSERT INTO activities (user_id, client_id, type, description)
    VALUES (?, ?, ?, ?)
  `,
    [1, 3, "score_updated", "Credit score increased from 680 to 720"],
  );

  await runQuery(
    `
    INSERT INTO activities (user_id, client_id, type, description)
    VALUES (?, ?, ?, ?)
  `,
    [1, 2, "client_added", "New client onboarded"],
  );

  // Insert demo support tickets
  await runQuery(
    `
    INSERT INTO tickets (title, description, customer_id, priority, status, category, assignee_id, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      "Credit report not updating",
      "My credit report hasn't been updated in 30 days despite recent payments",
      1,
      "high",
      "open",
      "Credit Reports",
      1,
      1,
      1,
    ],
  );

  await runQuery(
    `
    INSERT INTO tickets (title, description, customer_id, priority, status, category, assignee_id, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      "Dispute status inquiry",
      "Can you provide an update on my dispute filed last month?",
      1,
      "medium",
      "in_progress",
      "Disputes",
      1,
      1,
      1,
    ],
  );

  await runQuery(
    `
    INSERT INTO tickets (title, description, customer_id, priority, status, category, assignee_id, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      "Account access issues",
      "Unable to log into my account, password reset not working",
      1,
      "urgent",
      "resolved",
      "Technical Support",
      1,
      1,
      1,
    ],
  );

  // Insert demo ticket analytics
  await runQuery(
    `
    INSERT INTO ticket_analytics (ticket_id, first_response_at, resolved_at, response_time_hours, resolution_time_hours, customer_satisfaction_rating, sla_response_met, sla_resolution_met)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      3,
      "2024-01-15 10:30:00",
      "2024-01-15 14:45:00",
      2.5,
      4.25,
      5,
      1,
      1,
    ],
  );

  // Insert demo support metrics
  const today = new Date().toISOString().split('T')[0];
  await runQuery(
    `
    INSERT INTO support_metrics (metric_date, total_tickets, resolved_tickets, avg_response_time_hours, avg_resolution_time_hours, customer_satisfaction_avg, first_response_sla_met, resolution_sla_met)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      today,
      15,
      12,
      2.5,
      18.5,
      4.3,
      13,
      10,
    ],
  );

  // Insert demo agent performance
  await runQuery(
    `
    INSERT INTO agent_performance (agent_id, performance_date, tickets_assigned, tickets_resolved, avg_response_time_hours, avg_resolution_time_hours, customer_satisfaction_avg, efficiency_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      1,
      today,
      15,
      12,
      2.5,
      18.5,
      4.3,
      85.5,
    ],
  );
}

export function getDatabase(): Database {
  return db;
}

// Export helper functions for use in routes
export { runQuery, getQuery, allQuery };
