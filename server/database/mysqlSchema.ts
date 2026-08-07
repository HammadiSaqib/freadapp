import { 
  initializeMySQLPool, 
  executeQuery, 
  executeTransaction, 
  createDatabaseIfNotExists,
  getMySQLPool
} from './mysqlConfig.js';
import bcrypt from 'bcryptjs';
import { SecurityLogger } from '../utils/securityLogger.js';
import { initializeSuperAdminDatabase } from './superAdminSchema.js';
import { seedAffiliateData } from './seedAffiliateData.js';
import { ENV_CONFIG } from '../config/environment.js';
import { getForeignKeyCleanupSql, isRecoverableForeignKeyError } from './foreignKeyUtils.js';

const securityLogger = new SecurityLogger();

async function repairTableIdAutoIncrement(tableName: string): Promise<boolean> {
  const columns = await executeQuery(
    `SELECT COLUMN_NAME, COLUMN_KEY, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [tableName]
  );
  const idColumn = (columns as any[]).find((column: any) => column.COLUMN_NAME === 'id');

  if (!idColumn) {
    console.warn(`⚠️  ${tableName}.id column is missing; unable to repair AUTO_INCREMENT automatically`);
    return false;
  }

  if (String(idColumn.EXTRA || '').toLowerCase().includes('auto_increment')) {
    return true;
  }

  const primaryIndexes = await executeQuery(`SHOW INDEX FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`);
  const hasPrimaryKey = Array.isArray(primaryIndexes) && primaryIndexes.length > 0;
  const idIsPrimary = String(idColumn.COLUMN_KEY || '').toUpperCase() === 'PRI';

  if (!hasPrimaryKey) {
    await executeQuery(`ALTER TABLE \`${tableName}\` ADD PRIMARY KEY (id)`);
  } else if (!idIsPrimary) {
    console.warn(`⚠️  ${tableName}.id is not AUTO_INCREMENT and another primary key exists`);
    return false;
  }

  await executeQuery(`ALTER TABLE \`${tableName}\` MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT`);
  console.log(`✅ Repaired ${tableName}.id AUTO_INCREMENT`);
  return true;
}

async function repairClientsIdAutoIncrement(): Promise<boolean> {
  return repairTableIdAutoIncrement('clients');
}

// Enhanced interfaces (same as SQLite version but optimized for MySQL)
export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  credit_repair_url?: string;
  role: 'user' | 'admin' | 'support' | 'super_admin' | 'funding_manager';
  status: 'active' | 'inactive' | 'locked' | 'pending';
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until?: string;
  last_login?: string;
  last_login_ip?: string;
  last_login_user_agent?: string;
  password_changed_at: string;
  must_change_password: boolean;
  avatar?: string;
  // NMI / Funding gateway settings (per-user)
  nmi_merchant_id?: string;
  nmi_public_key?: string;
  nmi_api_key?: string;
  nmi_username?: string;
  nmi_password?: string; // consider storing securely/encrypted
  nmi_test_mode?: boolean;
  nmi_gateway_logo?: string;
  funding_override_enabled?: boolean;
  funding_override_signature_text?: string | null;
  funding_override_signed_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

// Employee record linking a user account to its parent admin
export interface Employee {
  id: number;
  admin_id: number;
  user_id: number;
  status: 'active' | 'inactive' | 'locked' | 'pending';
  created_at: string;
  updated_at: string;
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
  payment_status: 'paid' | 'unpaid';
  experian_score?: number;
  equifax_score?: number;
  transunion_score?: number;
  credit_score?: number;
  target_score?: number;
  notes?: string;
  platform?: string;
  platform_email?: string;
  platform_password?: string;
  created_via?: string;
  integration_id?: number;
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
  report_data?: string;
  status: 'pending' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface DebtPayoffPlan {
  id: number;
  client_id: number;
  account_id: string;
  account_name: string;
  target_utilization: number;
  payoff_timeline_months: number;
  payment_date: number;
  reminder_enabled: boolean;
  track_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: number;
  client_id: number;
  bureau: 'experian' | 'equifax' | 'transunion';
  account_name: string;
  dispute_reason: string;
  status: 'pending' | 'investigating' | 'verified' | 'deleted' | 'updated';
  filed_date: string;
  response_date?: string;
  result?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface Activity {
  id: number;
  user_id: number;
  client_id?: number;
  type: 'client_added' | 'dispute_filed' | 'score_updated' | 'payment_received' | 'note_added';
  description: string;
  metadata?: string;
  created_at: string;
}

export interface Analytics {
  id: number;
  user_id: number;
  metric_type: 'revenue' | 'clients' | 'disputes' | 'success_rate';
  value: number;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  created_at: string;
}

export interface BillingTransaction {
  id: number;
  user_id: number;
  stripe_payment_intent_id?: string;
  stripe_customer_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  payment_method: 'stripe' | 'manual';
  plan_name?: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  description?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  plan_name: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  cancellation_reason_code?: 'affordability' | 'guidance' | 'other' | null;
  cancellation_reason_text?: string | null;
  cancellation_guidance_choice?: 'join_class_now' | 'not_now' | 'still_cancel' | null;
  cancellation_guidance_updated_at?: string | null;
  cancellation_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Invoice interface for billing/invoicing
export interface Invoice {
  id: number;
  invoice_number: string;
  user_id: number;
  client_id?: number;
  recipient_name?: string;
  recipient_email?: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  tax_rate?: number;
  line_items?: string; // JSON string
  notes?: string;
  issued_date: string;
  due_date?: string;
  paid_at?: string;
  payment_provider?: 'nmi' | 'stripe' | 'manual';
  payment_transaction_id?: string;
  public_token: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface StripeConfig {
  id: number;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  webhook_endpoint_secret?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: string;
  new_values?: string;
  changed_by?: number;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Community Feed Interfaces
export interface CommunityPost {
  id: number;
  user_id: number;
  content: string;
  media_urls?: string;
  media_type?: 'image' | 'video' | 'document';
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  parent_comment_id?: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostLike {
  id: number;
  post_id: number;
  user_id: number;
  created_at: string;
}

export interface CommentLike {
  id: number;
  comment_id: number;
  user_id: number;
  created_at: string;
}

export interface PostReaction {
  id: number;
  post_id: number;
  user_id: number;
  reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
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

// Support Analytics Interfaces
export interface SupportMetrics {
  id: number;
  metric_date: string;
  total_tickets: number;
  resolved_tickets: number;
  avg_response_time_hours: number;
  avg_resolution_time_hours: number;
  customer_satisfaction_avg: number;
  first_response_sla_met: number;
  resolution_sla_met: number;
  created_at: string;
  updated_at: string;
}

export interface AgentPerformance {
  id: number;
  agent_id: number;
  performance_date: string;
  tickets_assigned: number;
  tickets_resolved: number;
  avg_response_time_hours: number;
  avg_resolution_time_hours: number;
  customer_satisfaction_avg: number;
  efficiency_score: number;
  created_at: string;
  updated_at: string;
}

export interface TicketAnalytics {
  id: number;
  ticket_id: number;
  first_response_at?: string;
  resolved_at?: string;
  response_time_hours?: number;
  resolution_time_hours?: number;
  customer_satisfaction_rating?: number;
  escalated: boolean;
  escalated_at?: string;
  sla_response_met: boolean;
  sla_resolution_met: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  type: 'webinar' | 'workshop' | 'office_hours' | 'exam' | 'meetup' | 'deadline' | 'meeting' | 'physical_event' | 'report_pull' | 'other';
  instructor?: string;
  location?: string;
  is_virtual: boolean;
  is_physical?: boolean;
  attendees: number;
  max_attendees?: number;
  meeting_link?: string;
  visible_to_admins?: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  registered_at: string;
  attended?: boolean;
  attended_at?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  customer_id: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  category: string;
  assignee_id?: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface ProjectTask {
  id: number;
  title: string;
  description: string;
  screenshot_url?: string | null;
  attachment_urls?: string | null;
  rejection_reason?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: 'normal' | 'medium' | 'priority';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  content: string;
  author_id: number;
  author_type: 'customer' | 'support';
  created_at: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  ticket_reference_id?: number;
  is_read: boolean;
  created_at: string;
}

// Initialize MySQL database with proper schema
export async function initializeMySQLDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing MySQL database...');
    
    // Initialize connection pool
    await initializeMySQLPool();
    
    // Create database if it doesn't exist
    const databaseName = process.env.MYSQL_DATABASE || 'creditrepair_db';
    await createDatabaseIfNotExists(databaseName);
    
    await createMySQLTables();

    try {
      await repairTableIdAutoIncrement('users');
    } catch (error: any) {
      console.log('⚠️  Error repairing users.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairClientsIdAutoIncrement();
    } catch (error: any) {
      console.log('⚠️  Error repairing clients.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('user_activities');
    } catch (error: any) {
      console.log('⚠️  Error repairing user_activities.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('activities');
    } catch (error: any) {
      console.log('⚠️  Error repairing activities.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('dispute_letter_history');
    } catch (error: any) {
      console.log('Error repairing dispute_letter_history.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('disputes');
    } catch (error: any) {
      console.log('Error repairing disputes.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('admin_profiles');
    } catch (error: any) {
      console.log('Error repairing admin_profiles.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('subscription_plans');
    } catch (error: any) {
      console.log('Error repairing subscription_plans.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('contract_signatures');
    } catch (error: any) {
      console.log('Error repairing contract_signatures.id AUTO_INCREMENT:', error.message);
    }

    try {
      await repairTableIdAutoIncrement('billing_transactions');
    } catch (error: any) {
      console.log('Error repairing billing_transactions.id AUTO_INCREMENT:', error.message);
    }

    try {
      const cols = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'`
      );
      const existing = new Set((cols as any[]).map((r: any) => r.COLUMN_NAME));
      const alters: string[] = [];
      if (!existing.has('experian_score')) alters.push('ADD COLUMN experian_score INT NULL');
      if (!existing.has('equifax_score')) alters.push('ADD COLUMN equifax_score INT NULL');
      if (!existing.has('transunion_score')) alters.push('ADD COLUMN transunion_score INT NULL');
      if (!existing.has('fundable_status')) alters.push("ADD COLUMN fundable_status ENUM('fundable','not_fundable') NULL");
      if (!existing.has('fundable_in_tu')) alters.push('ADD COLUMN fundable_in_tu BOOLEAN NOT NULL DEFAULT FALSE');
      if (!existing.has('fundable_in_ex')) alters.push('ADD COLUMN fundable_in_ex BOOLEAN NOT NULL DEFAULT FALSE');
      if (!existing.has('fundable_in_eq')) alters.push('ADD COLUMN fundable_in_eq BOOLEAN NOT NULL DEFAULT FALSE');
      if (!existing.has('street_number_and_name')) alters.push('ADD COLUMN street_number_and_name TEXT NULL');
      if (!existing.has('platform')) alters.push('ADD COLUMN platform VARCHAR(50) NULL');
      if (!existing.has('platform_email')) alters.push('ADD COLUMN platform_email VARCHAR(255) NULL');
      if (!existing.has('platform_password')) alters.push('ADD COLUMN platform_password VARCHAR(255) NULL');
      if (!existing.has('created_via')) alters.push('ADD COLUMN created_via VARCHAR(20) NULL');
      if (!existing.has('integration_id')) alters.push('ADD COLUMN integration_id INT NULL');
      if (!existing.has('payment_status')) alters.push("ADD COLUMN payment_status ENUM('paid','unpaid') NOT NULL DEFAULT 'paid'");
      if (!existing.has('credit_score')) alters.push('ADD COLUMN credit_score INT NULL');
      if (!existing.has('previous_credit_score')) alters.push('ADD COLUMN previous_credit_score INT NULL');
      if (!existing.has('target_score')) alters.push('ADD COLUMN target_score INT NULL');
      if (!existing.has('dl_or_id_card')) alters.push('ADD COLUMN dl_or_id_card TEXT NULL');
      if (!existing.has('poa')) alters.push('ADD COLUMN poa TEXT NULL');
      if (!existing.has('ssc')) alters.push('ADD COLUMN ssc TEXT NULL');
      if (!existing.has('other_documents')) alters.push('ADD COLUMN other_documents JSON NULL');
      if (alters.length) {
        await executeQuery(`ALTER TABLE clients ${alters.join(', ')}`);
      }
      if (!existing.has('street_number_and_name') && existing.has('address')) {
        await executeQuery(`
          UPDATE clients
          SET street_number_and_name = COALESCE(street_number_and_name, address)
          WHERE address IS NOT NULL AND address != ''
        `);
      }
      try {
        await executeQuery(
          `ALTER TABLE clients MODIFY COLUMN platform ENUM('myfreescorenow','identityiq','smartcredit','myscoreiq','transunion','experian','equifax','creditkarma','other') NULL`
        );
        console.log('✅ Updated clients.platform ENUM to include new values');
      } catch (error: any) {
        console.log('ℹ️  clients.platform column already updated or conversion not needed');
      }
    } catch (e) {
    }

    try {
      const integrationColumns = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_integrations'`
      );
      const existingIntegrationColumns = new Set((integrationColumns as any[]).map((row: any) => row.COLUMN_NAME));
      const integrationAlters: string[] = [];
      if (!existingIntegrationColumns.has('verified_at')) integrationAlters.push('ADD COLUMN verified_at DATETIME NULL');
      if (!existingIntegrationColumns.has('last_validation_code')) integrationAlters.push('ADD COLUMN last_validation_code INT NULL');
      if (!existingIntegrationColumns.has('last_validation_error')) integrationAlters.push('ADD COLUMN last_validation_error TEXT NULL');
      if (integrationAlters.length) {
        await executeQuery(`ALTER TABLE admin_integrations ${integrationAlters.join(', ')}`);
      }

      const logColumns = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'integration_activity_logs'`
      );
      const existingLogColumns = new Set((logColumns as any[]).map((row: any) => row.COLUMN_NAME));
      const logAlters: string[] = [];
      if (!existingLogColumns.has('response_code')) logAlters.push('ADD COLUMN response_code INT NULL');
      if (!existingLogColumns.has('error_message')) logAlters.push('ADD COLUMN error_message TEXT NULL');
      if (!existingLogColumns.has('data_fields')) logAlters.push('ADD COLUMN data_fields JSON NULL');
      if (!existingLogColumns.has('retry_status')) logAlters.push('ADD COLUMN retry_status VARCHAR(100) NULL');
      if (logAlters.length) {
        await executeQuery(`ALTER TABLE integration_activity_logs ${logAlters.join(', ')}`);
      }
    } catch (e) {
      console.error('Failed to update GoHighLevel integration schema:', e);
    }

    try {
      const cols = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'disputes'`
      );
      const existing = new Set((cols as any[]).map((r: any) => r.COLUMN_NAME));
      const alters: string[] = [];
      const hadFiledDate = existing.has('filed_date');
      const hadResponseDate = existing.has('response_date');
      const hadCreatedBy = existing.has('created_by');
      const hadUpdatedBy = existing.has('updated_by');

      if (!hadFiledDate) alters.push('ADD COLUMN filed_date DATE NULL');
      if (!hadResponseDate) alters.push('ADD COLUMN response_date DATE NULL');
      if (!existing.has('account_number')) alters.push('ADD COLUMN account_number VARCHAR(50) NULL');
      if (!existing.has('dispute_type')) alters.push("ADD COLUMN dispute_type ENUM('inaccurate', 'incomplete', 'unverifiable', 'fraudulent', 'other') NOT NULL DEFAULT 'inaccurate'");
      if (!existing.has('priority')) alters.push("ADD COLUMN priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium'");
      if (!existing.has('expected_resolution_date')) alters.push('ADD COLUMN expected_resolution_date DATE NULL');
      if (!existing.has('result')) alters.push('ADD COLUMN result TEXT NULL');
      if (!existing.has('notes')) alters.push('ADD COLUMN notes TEXT NULL');
      if (!existing.has('documents')) alters.push('ADD COLUMN documents JSON NULL');
      if (!hadCreatedBy) alters.push('ADD COLUMN created_by INT NULL');
      if (!hadUpdatedBy) alters.push('ADD COLUMN updated_by INT NULL');

      if (alters.length) {
        await executeQuery(`ALTER TABLE disputes ${alters.join(', ')}`);
      }

      // Older installations used a different status set and required filed_date.
      // Keep legacy values readable while accepting the enhanced dispute workflow.
      await executeQuery(`
        ALTER TABLE disputes
          MODIFY COLUMN status ENUM(
            'draft', 'submitted', 'in_progress', 'resolved', 'rejected',
            'pending', 'investigating', 'verified', 'deleted', 'updated'
          ) NOT NULL DEFAULT 'draft',
          MODIFY COLUMN filed_date DATE NULL
      `);

      if (!hadFiledDate) {
        if (existing.has('date_submitted')) {
          await executeQuery(`
            UPDATE disputes
            SET filed_date = COALESCE(filed_date, date_submitted, DATE(created_at), CURDATE())
            WHERE filed_date IS NULL
          `);
        } else {
          await executeQuery(`
            UPDATE disputes
            SET filed_date = COALESCE(filed_date, DATE(created_at), CURDATE())
            WHERE filed_date IS NULL
          `);
        }
      }

      if (!hadResponseDate && existing.has('date_resolved')) {
        await executeQuery(`
          UPDATE disputes
          SET response_date = COALESCE(response_date, date_resolved)
          WHERE response_date IS NULL AND date_resolved IS NOT NULL
        `);
      }

      if (!hadCreatedBy || !hadUpdatedBy) {
        await executeQuery(`
          UPDATE disputes d
          INNER JOIN clients c ON c.id = d.client_id
          SET
            d.created_by = COALESCE(d.created_by, c.user_id),
            d.updated_by = COALESCE(d.updated_by, c.user_id)
          WHERE d.created_by IS NULL OR d.updated_by IS NULL
        `);
      }
    } catch (e) {
      console.error('Failed to update disputes schema:', e);
    }
    
    try {
      const cols = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates'`
      );
      const existing = new Set((cols as any[]).map((r: any) => r.COLUMN_NAME));
      const alters: string[] = [];
      if (!existing.has('logo_url')) alters.push('ADD COLUMN logo_url VARCHAR(500)');
      if (!existing.has('partner_monitoring_link')) alters.push('ADD COLUMN partner_monitoring_link VARCHAR(512) NULL');
      if (!existing.has('credit_repair_link')) alters.push('ADD COLUMN credit_repair_link VARCHAR(512) NULL');
      if (alters.length) {
        await executeQuery(`ALTER TABLE affiliates ${alters.join(', ')}`);
      }
    } catch (e) {
    }

    try {
      const cols = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'billing_transactions'`
      );
      const existing = new Set((cols as any[]).map((r: any) => r.COLUMN_NAME));
      if (!existing.has('thank_you_email_sent_at')) {
        await executeQuery(`ALTER TABLE billing_transactions ADD COLUMN thank_you_email_sent_at DATETIME NULL`);
        console.log('✅ Added thank_you_email_sent_at to billing_transactions');
      }
    } catch (e) {
      console.error('Failed to update billing_transactions schema:', e);
    }

    try {
      const cols = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'`
      );
      const existing = new Set((cols as any[]).map((r: any) => r.COLUMN_NAME));
      if (!existing.has('last_payment_reminder_sent_at')) {
        await executeQuery(`ALTER TABLE subscriptions ADD COLUMN last_payment_reminder_sent_at DATETIME NULL`);
        console.log('✅ Added last_payment_reminder_sent_at to subscriptions');
      }
      if (!existing.has('cancellation_reason_code')) {
        await executeQuery(`ALTER TABLE subscriptions ADD COLUMN cancellation_reason_code VARCHAR(32) NULL`);
        console.log('✅ Added cancellation_reason_code to subscriptions');
      }
      if (!existing.has('cancellation_reason_text')) {
        await executeQuery(`ALTER TABLE subscriptions ADD COLUMN cancellation_reason_text TEXT NULL`);
        console.log('✅ Added cancellation_reason_text to subscriptions');
      }
      if (!existing.has('cancellation_guidance_choice')) {
        await executeQuery(`ALTER TABLE subscriptions ADD COLUMN cancellation_guidance_choice VARCHAR(32) NULL`);
        console.log('✅ Added cancellation_guidance_choice to subscriptions');
      }
      if (!existing.has('cancellation_guidance_updated_at')) {
        await executeQuery(`ALTER TABLE subscriptions ADD COLUMN cancellation_guidance_updated_at DATETIME NULL`);
        console.log('✅ Added cancellation_guidance_updated_at to subscriptions');
      }
      if (!existing.has('cancellation_requested_at')) {
        await executeQuery(`ALTER TABLE subscriptions ADD COLUMN cancellation_requested_at DATETIME NULL`);
        console.log('✅ Added cancellation_requested_at to subscriptions');
      }
    } catch (e) {
      console.error('Failed to update subscriptions schema:', e);
    }

    try {
      const cols = await executeQuery(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_tasks'`
      );
      const existing = new Set((cols as any[]).map((r: any) => r.COLUMN_NAME));
      if (!existing.has('priority')) {
        await executeQuery(`ALTER TABLE project_tasks ADD COLUMN priority ENUM('normal', 'medium', 'priority') NOT NULL DEFAULT 'normal'`);
      }
      if (!existing.has('attachment_urls')) {
        await executeQuery(`ALTER TABLE project_tasks ADD COLUMN attachment_urls TEXT NULL`);
      }
      if (!existing.has('rejection_reason')) {
        await executeQuery(`ALTER TABLE project_tasks ADD COLUMN rejection_reason TEXT NULL`);
      }
      await executeQuery(
        `ALTER TABLE project_tasks MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'rejected') NOT NULL DEFAULT 'pending'`
      );
    } catch (e) {
    }
    
    // Seed database with initial data (optional)
    if (ENV_CONFIG.SEED_DEMO_DATA) {
      await seedMySQLDatabase();
    } else {
      console.log('🌱 Demo data seeding disabled by env; skipping.');
    }
    
    // Initialize super admin database
    await initializeSuperAdminDatabase();
    
    console.log('✅ MySQL database initialized successfully');
    
    await securityLogger.logSecurityEvent({
      level: 2, // INFO
      eventType: 'DATA_ACCESS' as any,
      ip: 'system',
      userAgent: 'database',
      message: 'MySQL database initialized successfully',
      metadata: { database: databaseName }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize MySQL database:', error);
    
    await securityLogger.logSecurityEvent({
      level: 0, // ERROR
      eventType: 'SECURITY_VIOLATION' as any,
      ip: 'system',
      userAgent: 'database',
      message: `Failed to initialize MySQL database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error: error instanceof Error ? error.stack : String(error) }
    });
    
    throw error;
  }
}

// Create all MySQL tables with proper constraints and indexes
async function createMySQLTables(): Promise<void> {
  console.log('📋 Creating MySQL tables...');

  // CREATE TABLE IF NOT EXISTS does not repair legacy/imported definitions.
  // Restore missing id keys before creating any new foreign keys that reference
  // those tables. Fresh databases have no rows here and use the definitions below.
  const legacyTablesMissingIdKey = await executeQuery(
    `SELECT c.TABLE_NAME
       FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE()
        AND c.COLUMN_NAME = 'id'
        AND c.TABLE_NAME IN (
          'users', 'clients', 'admin_integrations', 'community_posts',
          'integration_activity_logs',
          'calendar_events', 'affiliates', 'affiliate_referrals',
          'blog_categories', 'blog_posts', 'blog_tags', 'cards',
          'contract_templates', 'courses', 'disputes'
        )
        AND (
          LOWER(COALESCE(c.EXTRA, '')) NOT LIKE '%auto_increment%'
          OR NOT EXISTS (
            SELECT 1
              FROM INFORMATION_SCHEMA.STATISTICS s
             WHERE s.TABLE_SCHEMA = c.TABLE_SCHEMA
               AND s.TABLE_NAME = c.TABLE_NAME
               AND s.COLUMN_NAME = c.COLUMN_NAME
               AND s.NON_UNIQUE = 0
          )
        )
      ORDER BY c.TABLE_NAME`
  );
  for (const row of legacyTablesMissingIdKey as Array<{ TABLE_NAME: string }>) {
    await repairTableIdAutoIncrement(row.TABLE_NAME);
  }

  const tables = [
    // Users table with enhanced security features
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      company_name VARCHAR(255),
      phone VARCHAR(20) NULL,
      address TEXT NULL,
      city VARCHAR(100) NULL,
      state VARCHAR(50) NULL,
      zip_code VARCHAR(10) NULL,
      role ENUM('user', 'admin', 'support', 'super_admin', 'funding_manager') NOT NULL DEFAULT 'user',
      account_type ENUM('admin','affiliate_only') NOT NULL DEFAULT 'admin',
      referred_by_user_id INT NULL,
      referral_source ENUM('product_link','affiliate_link') NULL,
      status ENUM('active', 'inactive', 'locked', 'pending') NOT NULL DEFAULT 'active',
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until DATETIME NULL,
      last_login DATETIME NULL,
      last_login_ip VARCHAR(45),
      last_login_user_agent TEXT,
    password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    avatar VARCHAR(500) NULL,
    stripe_customer_id VARCHAR(255) NULL,
    credit_repair_url VARCHAR(500) NULL,
    onboarding_slug VARCHAR(190) NULL,
    intake_redirect_url VARCHAR(1000) NULL,
    intake_logo_url VARCHAR(1000) NULL,
    intake_primary_color VARCHAR(7) NULL,
    intake_company_name VARCHAR(255) NULL,
    intake_website_url VARCHAR(1000) NULL,
    intake_email VARCHAR(255) NULL,
    intake_phone_number VARCHAR(50) NULL,
    nmi_merchant_id VARCHAR(255) NULL,
    nmi_public_key VARCHAR(500) NULL,
    nmi_api_key VARCHAR(500) NULL,
    nmi_username VARCHAR(255) NULL,
    nmi_password VARCHAR(255) NULL,
    nmi_test_mode BOOLEAN NOT NULL DEFAULT FALSE,
    nmi_gateway_logo VARCHAR(500) NULL,
      funding_override_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      funding_override_signature_text TEXT NULL,
      funding_override_signed_at DATETIME NULL,
      send_dispute_letter_email BOOLEAN NOT NULL DEFAULT TRUE,
      send_inactivity_email BOOLEAN NOT NULL DEFAULT TRUE,
      send_report_pull_reminder_email BOOLEAN NOT NULL DEFAULT TRUE,
      notify_client_after_report_pull BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      INDEX idx_email (email),
      INDEX idx_referred_by_user_id (referred_by_user_id),
      INDEX idx_referral_source (referral_source),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      INDEX idx_stripe_customer_id (stripe_customer_id),
      UNIQUE KEY uniq_onboarding_slug (onboarding_slug),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (referred_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Employees table: links an employee user to their parent admin
    `CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('active', 'inactive', 'locked', 'pending') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_employee_user (user_id),
      INDEX idx_admin_id (admin_id),
      INDEX idx_user_id (user_id),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS admin_integrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      provider ENUM('ghl') NOT NULL DEFAULT 'ghl',
      name VARCHAR(255) NULL,
      access_token VARCHAR(500) NOT NULL,
      location_id VARCHAR(255) NULL,
      integration_hash VARCHAR(255) NOT NULL,
      outbound_url VARCHAR(500) NULL,
      business_record_id VARCHAR(255) NULL,
      custom_field_credit_score VARCHAR(255) NULL,
      custom_field_experian_score VARCHAR(255) NULL,
      custom_field_equifax_score VARCHAR(255) NULL,
      custom_field_transunion_score VARCHAR(255) NULL,
      custom_field_report_date VARCHAR(255) NULL,
      field_mappings JSON NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      verified_at DATETIME NULL,
      last_validation_code INT NULL,
      last_validation_error TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      UNIQUE KEY uniq_integration_hash (integration_hash),
      INDEX idx_admin_id (admin_id),
      INDEX idx_provider (provider),
      INDEX idx_is_active (is_active),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS integration_activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      integration_id INT NOT NULL,
      admin_id INT NOT NULL,
      direction ENUM('inbound','outbound') NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      status ENUM('success','failed') NOT NULL,
      message TEXT NULL,
      client_id INT NULL,
      response_code INT NULL,
      error_message TEXT NULL,
      data_fields JSON NULL,
      retry_status VARCHAR(100) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_integration_id (integration_id),
      INDEX idx_admin_id (admin_id),
      INDEX idx_direction (direction),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (integration_id) REFERENCES admin_integrations(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS integration_webhook_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      integration_id INT NOT NULL,
      idempotency_key VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_integration_event (integration_id, idempotency_key),
      INDEX idx_integration_id (integration_id),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (integration_id) REFERENCES admin_integrations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support team members table
    `CREATE TABLE IF NOT EXISTS support_team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(100) NOT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      permissions JSON NOT NULL,
      avatar VARCHAR(500) NULL,
      phone VARCHAR(20) NULL,
      department VARCHAR(100) NULL,
      hire_date DATE NULL,
      last_active DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_status (status),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support notification settings table
    `CREATE TABLE IF NOT EXISTS support_notification_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
      new_ticket_alerts BOOLEAN NOT NULL DEFAULT TRUE,
      ticket_updates BOOLEAN NOT NULL DEFAULT TRUE,
      escalation_alerts BOOLEAN NOT NULL DEFAULT TRUE,
      daily_reports BOOLEAN NOT NULL DEFAULT FALSE,
      weekly_reports BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support working hours table
    `CREATE TABLE IF NOT EXISTS support_working_hours (
      id INT AUTO_INCREMENT PRIMARY KEY,
      day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_day (day_of_week)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support general settings table
    `CREATE TABLE IF NOT EXISTS support_general_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      support_email VARCHAR(255) NOT NULL,
      timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      auto_assignment BOOLEAN NOT NULL DEFAULT TRUE,
      ticket_auto_close_days INT NOT NULL DEFAULT 30,
      max_tickets_per_agent INT NOT NULL DEFAULT 50,
      response_time_target INT NOT NULL DEFAULT 24,
      resolution_time_target INT NOT NULL DEFAULT 72,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Password reset codes table
    `CREATE TABLE IF NOT EXISTS password_reset_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_code (code),
      INDEX idx_expires_at (expires_at),
      UNIQUE KEY unique_user_active_code (user_id, used),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Affiliate password reset codes table
    `CREATE TABLE IF NOT EXISTS affiliate_password_reset_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      affiliate_id INT NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_affiliate_id (affiliate_id),
      INDEX idx_code (code),
      INDEX idx_expires_at (expires_at),
      UNIQUE KEY unique_affiliate_active_code (affiliate_id, used),
      FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      date_of_birth DATE,
      ssn_last_four CHAR(4) CHECK (ssn_last_four REGEXP '^[0-9]{4}$'),
      address TEXT,
      street_number_and_name TEXT,
      city VARCHAR(100),
      state CHAR(2) CHECK (LENGTH(state) = 2),
      zip_code VARCHAR(10) CHECK (LENGTH(zip_code) >= 5),
      status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
      experian_score INT,
      equifax_score INT,
      transunion_score INT,
      payment_status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'paid',
      credit_score INT CHECK (credit_score >= 300 AND credit_score <= 850),
      previous_credit_score INT CHECK (previous_credit_score >= 300 AND previous_credit_score <= 850),
      target_score INT CHECK (target_score >= 300 AND target_score <= 850),
      fundable_status ENUM('fundable','not_fundable'),
      fundable_in_tu BOOLEAN NOT NULL DEFAULT FALSE,
      fundable_in_ex BOOLEAN NOT NULL DEFAULT FALSE,
      fundable_in_eq BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      dl_or_id_card TEXT,
      poa TEXT,
      ssc TEXT,
      other_documents JSON,
      platform ENUM('myfreescorenow','identityiq','smartcredit','myscoreiq','transunion','experian','equifax','creditkarma','other'),
      platform_email VARCHAR(255),
      platform_password VARCHAR(255),
      created_via VARCHAR(20) NULL,
      integration_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_email (email),
      INDEX idx_status (status),
      INDEX idx_payment_status (payment_status),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (integration_id) REFERENCES admin_integrations(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Credit reports table
    `CREATE TABLE IF NOT EXISTS credit_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      bureau ENUM('experian', 'equifax', 'transunion') NOT NULL,
      report_date DATE NOT NULL,
      credit_score INT CHECK (credit_score >= 300 AND credit_score <= 850),
      report_data JSON,
      status ENUM('pending', 'completed', 'error') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_client_id (client_id),
      INDEX idx_bureau (bureau),
      INDEX idx_report_date (report_date),
      INDEX idx_status (status),
      UNIQUE KEY unique_client_bureau_date (client_id, bureau, report_date),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Disputes table
    `CREATE TABLE IF NOT EXISTS disputes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      bureau ENUM('experian', 'equifax', 'transunion') NOT NULL,
      account_name VARCHAR(255) NOT NULL,
      account_number VARCHAR(50),
      dispute_reason TEXT NOT NULL,
      dispute_type ENUM('inaccurate', 'incomplete', 'unverifiable', 'fraudulent', 'other') NOT NULL DEFAULT 'inaccurate',
      status ENUM('draft', 'submitted', 'in_progress', 'resolved', 'rejected', 'pending', 'investigating', 'verified', 'deleted', 'updated') NOT NULL DEFAULT 'draft',
      priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
      filed_date DATE,
      response_date DATE,
      expected_resolution_date DATE,
      result TEXT,
      notes TEXT,
      documents JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_client_id (client_id),
      INDEX idx_bureau (bureau),
      INDEX idx_status (status),
      INDEX idx_filed_date (filed_date),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS dispute_letter_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      client_id INT NULL,
      dispute_id INT NULL,
      bureaus JSON NULL,
      negative_item_types JSON NULL,
      dispute_round INT NOT NULL DEFAULT 1,
      templates_used JSON NULL,
      template_count INT NOT NULL DEFAULT 0,
      template_source VARCHAR(100) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dispute_letter_history_user_id (user_id),
      INDEX idx_dispute_letter_history_client_id (client_id),
      INDEX idx_dispute_letter_history_dispute_id (dispute_id),
      INDEX idx_dispute_letter_history_round (dispute_round),
      INDEX idx_dispute_letter_history_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Activities table
    `CREATE TABLE IF NOT EXISTS activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      client_id INT,
      type ENUM('client_added', 'dispute_filed', 'score_updated', 'payment_received', 'note_added') NOT NULL,
      description TEXT NOT NULL,
      metadata JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_client_id (client_id),
      INDEX idx_type (type),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Debt Payoff Plans table
    `CREATE TABLE IF NOT EXISTS debt_payoff_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      account_id VARCHAR(255) NOT NULL,
      account_name VARCHAR(255) NOT NULL,
      target_utilization DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      payoff_timeline_months INT NOT NULL DEFAULT 12,
      payment_date INT NOT NULL DEFAULT 1,
      reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      track_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client_id (client_id),
      INDEX idx_account_id (account_id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Analytics table
    `CREATE TABLE IF NOT EXISTS analytics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      metric_type ENUM('revenue', 'clients', 'disputes', 'success_rate') NOT NULL,
      value DECIMAL(10,2) NOT NULL,
      period ENUM('daily', 'weekly', 'monthly') NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_metric_type (metric_type),
      INDEX idx_period (period),
      INDEX idx_date (date),
      UNIQUE KEY unique_user_metric_period_date (user_id, metric_type, period, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Audit log table for security tracking
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(64) NOT NULL,
      record_id INT NOT NULL,
      action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
      old_values JSON,
      new_values JSON,
      changed_by INT,
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45),
      user_agent TEXT,
      INDEX idx_table_name (table_name),
      INDEX idx_record_id (record_id),
      INDEX idx_action (action),
      INDEX idx_changed_by (changed_by),
      INDEX idx_changed_at (changed_at),
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Community Posts table
    `CREATE TABLE IF NOT EXISTS community_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      media_urls JSON,
      media_type ENUM('image', 'video', 'document'),
      likes_count INT NOT NULL DEFAULT 0,
      comments_count INT NOT NULL DEFAULT 0,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at),
      INDEX idx_is_pinned (is_pinned),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Post Comments table
    `CREATE TABLE IF NOT EXISTS post_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      parent_comment_id INT,
      likes_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id),
      INDEX idx_parent_comment_id (parent_comment_id),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Post Likes table
    `CREATE TABLE IF NOT EXISTS post_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id),
      UNIQUE KEY unique_post_user_like (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Comment Likes table
    `CREATE TABLE IF NOT EXISTS comment_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      comment_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_comment_id (comment_id),
      INDEX idx_user_id (user_id),
      UNIQUE KEY unique_comment_user_like (comment_id, user_id),
      FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Post Reactions table
    `CREATE TABLE IF NOT EXISTS post_reactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id),
      INDEX idx_reaction_type (reaction_type),
      UNIQUE KEY unique_post_user_reaction (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Post Shares table
    `CREATE TABLE IF NOT EXISTS post_shares (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      platform ENUM('facebook', 'twitter', 'linkedin', 'email', 'copy') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id),
      INDEX idx_platform (platform),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Groups table
    `CREATE TABLE IF NOT EXISTS \`groups\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      privacy ENUM('public', 'private', 'secret') NOT NULL DEFAULT 'public',
      created_by INT NOT NULL,
      member_count INT NOT NULL DEFAULT 1,
      post_count INT NOT NULL DEFAULT 0,
      avatar_url VARCHAR(500),
      cover_url VARCHAR(500),
      settings JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_created_by (created_by),
      INDEX idx_privacy (privacy),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Group Members table
    `CREATE TABLE IF NOT EXISTS group_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      role ENUM('admin', 'moderator', 'member') NOT NULL DEFAULT 'member',
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      invited_by INT,
      INDEX idx_group_id (group_id),
      INDEX idx_user_id (user_id),
      INDEX idx_role (role),
      UNIQUE KEY unique_group_user (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Group Posts table
    `CREATE TABLE IF NOT EXISTS group_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      media_urls JSON,
      media_type ENUM('image', 'video', 'document'),
      likes_count INT NOT NULL DEFAULT 0,
      comments_count INT NOT NULL DEFAULT 0,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_group_id (group_id),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at),
      INDEX idx_is_pinned (is_pinned),
      FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Feature Requests table (admin-only)
    `CREATE TABLE IF NOT EXISTS feature_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_url VARCHAR(500) NULL,
      status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
      votes_count INT NOT NULL DEFAULT 0,
      comments_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Feature Request Votes table
    `CREATE TABLE IF NOT EXISTS feature_request_votes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_request_id (request_id),
      INDEX idx_user_id (user_id),
      UNIQUE KEY unique_request_user_vote (request_id, user_id),
      FOREIGN KEY (request_id) REFERENCES feature_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Feature Request Comments table
    `CREATE TABLE IF NOT EXISTS feature_request_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_request_id (request_id),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (request_id) REFERENCES feature_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Courses table
    `CREATE TABLE IF NOT EXISTS courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      instructor VARCHAR(255) NOT NULL,
      duration VARCHAR(100) NOT NULL,
      difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
      points INT NOT NULL DEFAULT 0,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_difficulty (difficulty),
      INDEX idx_featured (featured),
      INDEX idx_created_by (created_by),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Course Chapters table
    `CREATE TABLE IF NOT EXISTS course_chapters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      video_url VARCHAR(500),
      duration VARCHAR(100) NOT NULL,
      order_index INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_order_index (order_index),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Course Enrollments table
    `CREATE TABLE IF NOT EXISTS course_enrollments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_id INT NOT NULL,
      progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_course_id (course_id),
      INDEX idx_completed (completed),
      UNIQUE KEY unique_user_course (user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Calendar Events table
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      time TIME,
      duration VARCHAR(100) NOT NULL DEFAULT '1h',
      type ENUM('webinar', 'workshop', 'office_hours', 'exam', 'meetup', 'deadline', 'meeting', 'physical_event', 'report_pull', 'other') NOT NULL,
      instructor VARCHAR(255),
      location VARCHAR(500),
      is_virtual BOOLEAN DEFAULT FALSE,
      is_physical BOOLEAN DEFAULT FALSE,
      attendees INT NOT NULL DEFAULT 0,
      max_attendees INT,
      meeting_link VARCHAR(500),
      visible_to_admins BOOLEAN DEFAULT FALSE,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_date (date),
      INDEX idx_type (type),
      INDEX idx_is_virtual (is_virtual),
      INDEX idx_visible_to_admins (visible_to_admins),
      INDEX idx_created_by (created_by),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Event Registrations table
    `CREATE TABLE IF NOT EXISTS event_registrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      user_id INT NOT NULL,
      registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attended BOOLEAN DEFAULT NULL,
      attended_at DATETIME NULL,
      INDEX idx_event_id (event_id),
      INDEX idx_user_id (user_id),
      INDEX idx_registered_at (registered_at),
      UNIQUE KEY unique_event_user (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Contract Templates table
    `CREATE TABLE IF NOT EXISTS contract_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_is_active (is_active),
      INDEX idx_name (name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS tsm_elite (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      content_html LONGTEXT,
      content_text LONGTEXT,
      status ENUM('draft', 'active') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_admin_id (admin_id),
      INDEX idx_status (status),
      INDEX idx_name (name),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS tsm_elite_signatures (
      id INT AUTO_INCREMENT PRIMARY KEY,
      template_id INT NOT NULL,
      admin_id INT NOT NULL,
      signature_text TEXT NULL,
      signature_image_url TEXT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_admin_template (admin_id, template_id),
      INDEX idx_template_id (template_id),
      INDEX idx_admin_id (admin_id),
      FOREIGN KEY (template_id) REFERENCES tsm_elite(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Contracts table
    `CREATE TABLE IF NOT EXISTS contracts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      client_id INT NULL,
      template_id INT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      status ENUM('draft', 'sent', 'signed', 'cancelled') NOT NULL DEFAULT 'draft',
      effective_date DATE NULL,
      expiration_date DATE NULL,
      sent_at DATETIME NULL,
      signed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_client_id (client_id),
      INDEX idx_status (status),
      INDEX idx_template_id (template_id),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Contract Signatures table
    `CREATE TABLE IF NOT EXISTS contract_signatures (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contract_id INT NOT NULL,
      signer_type ENUM('client', 'user') NOT NULL,
      signer_user_id INT NULL,
      signer_client_id INT NULL,
      signer_name VARCHAR(255),
      signer_email VARCHAR(255),
      signature_data TEXT,
      ip_address VARCHAR(45),
      signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contract_id (contract_id),
      INDEX idx_signed_at (signed_at),
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
      FOREIGN KEY (signer_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (signer_client_id) REFERENCES clients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Billing transactions table
    `CREATE TABLE IF NOT EXISTS billing_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      stripe_payment_intent_id VARCHAR(255),
      stripe_customer_id VARCHAR(255),
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      status ENUM('pending', 'succeeded', 'failed', 'canceled', 'refunded') NOT NULL DEFAULT 'pending',
      payment_method ENUM('stripe', 'manual') NOT NULL DEFAULT 'stripe',
      plan_name VARCHAR(100),
      plan_type ENUM('monthly', 'yearly', 'lifetime', 'course') NOT NULL,
      description TEXT,
      metadata JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_stripe_payment_intent (stripe_payment_intent_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Subscriptions table
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      stripe_subscription_id VARCHAR(255),
      stripe_customer_id VARCHAR(255),
      plan_name VARCHAR(100) NOT NULL,
      plan_type ENUM('monthly', 'yearly', 'lifetime') NOT NULL,
      status ENUM('active', 'canceled', 'past_due', 'unpaid', 'incomplete') NOT NULL DEFAULT 'active',
      current_period_start DATETIME,
      current_period_end DATETIME,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      cancellation_reason_code VARCHAR(32) NULL,
      cancellation_reason_text TEXT NULL,
      cancellation_guidance_choice VARCHAR(32) NULL,
      cancellation_guidance_updated_at DATETIME NULL,
      cancellation_requested_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_stripe_subscription (stripe_subscription_id),
      INDEX idx_status (status),
      INDEX idx_cancellation_guidance_choice (cancellation_guidance_choice),
      INDEX idx_cancellation_requested_at (cancellation_requested_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Invoices table
    `CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      client_id INT NULL,
      recipient_name VARCHAR(255),
      recipient_email VARCHAR(255),
      status ENUM('draft','sent','paid','partial','overdue','cancelled') NOT NULL DEFAULT 'sent',
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      balance_due DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tax_rate DECIMAL(5,2) DEFAULT 0.00,
      line_items JSON,
      notes TEXT,
      issued_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NULL,
      paid_at DATETIME NULL,
      payment_provider ENUM('nmi','stripe','manual') DEFAULT NULL,
      payment_transaction_id VARCHAR(255),
      public_token VARCHAR(64) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_client_id (client_id),
      INDEX idx_status (status),
      INDEX idx_due_date (due_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support tickets table
    `CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      customer_id INT NOT NULL,
      priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
      status ENUM('open', 'in_progress', 'pending', 'resolved', 'closed') NOT NULL DEFAULT 'open',
      category VARCHAR(100) NOT NULL,
      assignee_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_customer_id (customer_id),
      INDEX idx_assignee_id (assignee_id),
      INDEX idx_status (status),
      INDEX idx_priority (priority),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Project tasks table
    `CREATE TABLE IF NOT EXISTS project_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      screenshot_url VARCHAR(500) NULL,
      attachment_urls TEXT NULL,
      rejection_reason TEXT NULL,
      status ENUM('pending', 'in_progress', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
      priority ENUM('normal', 'medium', 'priority') NOT NULL DEFAULT 'normal',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_status (status),
      INDEX idx_created_by (created_by),
      INDEX idx_updated_by (updated_by),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Ticket messages table
    `CREATE TABLE IF NOT EXISTS ticket_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      content TEXT NOT NULL,
      author_id INT NOT NULL,
      author_type ENUM('customer', 'support') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ticket_id (ticket_id),
      INDEX idx_author_id (author_id),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Chat messages table for live chat functionality
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      ticket_reference_id INT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sender_id (sender_id),
      INDEX idx_receiver_id (receiver_id),
      INDEX idx_ticket_reference_id (ticket_reference_id),
      INDEX idx_created_at (created_at),
      INDEX idx_is_read (is_read),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (ticket_reference_id) REFERENCES tickets(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // GPT chat history table for Carmela Credit Coach
    `CREATE TABLE IF NOT EXISTS gpt_chat_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      user_gmail VARCHAR(255) NOT NULL,
      chat LONGTEXT NOT NULL,
      chat_type ENUM('user', 'assistant', 'system') NOT NULL,
      time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gpt_chat_history_user_id (user_id),
      INDEX idx_gpt_chat_history_chat_type (chat_type),
      INDEX idx_gpt_chat_history_time (time),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Knowledge base articles table
    `CREATE TABLE IF NOT EXISTS knowledge_articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      tags JSON,
      author_id INT NOT NULL,
      status ENUM('published', 'draft', 'archived') NOT NULL DEFAULT 'draft',
      views INT NOT NULL DEFAULT 0,
      likes INT NOT NULL DEFAULT 0,
      dislikes INT NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_status (status),
      INDEX idx_featured (featured),
      INDEX idx_author (author_id),
      INDEX idx_created_at (created_at),
      FULLTEXT idx_search (title, content),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // FAQs table
    `CREATE TABLE IF NOT EXISTS faqs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question VARCHAR(1000) NOT NULL,
      answer TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      views INT NOT NULL DEFAULT 0,
      helpful INT NOT NULL DEFAULT 0,
      not_helpful INT NOT NULL DEFAULT 0,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_status (status),
      INDEX idx_order (order_index),
      FULLTEXT idx_search (question, answer)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Article interactions table
    `CREATE TABLE IF NOT EXISTS article_interactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      article_id INT NOT NULL,
      user_id INT,
      interaction_type ENUM('view', 'like', 'dislike', 'rating') NOT NULL,
      rating_value TINYINT NULL CHECK (rating_value BETWEEN 1 AND 5),
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_article (article_id),
      INDEX idx_user (user_id),
      INDEX idx_type (interaction_type),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (article_id) REFERENCES knowledge_articles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY unique_user_article_interaction (article_id, user_id, interaction_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // FAQ interactions table
    `CREATE TABLE IF NOT EXISTS faq_interactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      faq_id INT NOT NULL,
      user_id INT,
      interaction_type ENUM('view', 'helpful', 'not_helpful') NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_faq (faq_id),
      INDEX idx_user (user_id),
      INDEX idx_type (interaction_type),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (faq_id) REFERENCES faqs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY unique_user_faq_interaction (faq_id, user_id, interaction_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support analytics table for tracking metrics
    `CREATE TABLE IF NOT EXISTS support_metrics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      metric_date DATE NOT NULL,
      total_tickets INT NOT NULL DEFAULT 0,
      resolved_tickets INT NOT NULL DEFAULT 0,
      avg_response_time_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      avg_resolution_time_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      customer_satisfaction_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      first_response_sla_met INT NOT NULL DEFAULT 0,
      resolution_sla_met INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_metric_date (metric_date),
      UNIQUE KEY unique_metric_date (metric_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Agent performance tracking table
    `CREATE TABLE IF NOT EXISTS agent_performance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agent_id INT NOT NULL,
      performance_date DATE NOT NULL,
      tickets_assigned INT NOT NULL DEFAULT 0,
      tickets_resolved INT NOT NULL DEFAULT 0,
      avg_response_time_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      avg_resolution_time_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      customer_satisfaction_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      efficiency_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_agent_id (agent_id),
      INDEX idx_performance_date (performance_date),
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_agent_date (agent_id, performance_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Ticket analytics for detailed tracking
    `CREATE TABLE IF NOT EXISTS ticket_analytics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      first_response_at DATETIME NULL,
      resolved_at DATETIME NULL,
      response_time_hours DECIMAL(5,2) NULL,
      resolution_time_hours DECIMAL(5,2) NULL,
      customer_satisfaction_rating TINYINT NULL CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
      escalated BOOLEAN NOT NULL DEFAULT FALSE,
      escalated_at DATETIME NULL,
      sla_response_met BOOLEAN NOT NULL DEFAULT FALSE,
      sla_resolution_met BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ticket_id (ticket_id),
      INDEX idx_first_response (first_response_at),
      INDEX idx_resolved_at (resolved_at),
      INDEX idx_satisfaction (customer_satisfaction_rating),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      UNIQUE KEY unique_ticket_analytics (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Stripe configuration table (for super admin)
    `CREATE TABLE IF NOT EXISTS stripe_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stripe_publishable_key VARCHAR(500) NOT NULL,
      stripe_secret_key VARCHAR(500) NOT NULL,
      webhook_endpoint_secret VARCHAR(500),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Affiliates table - separate from users table for affiliate management
    `CREATE TABLE IF NOT EXISTS affiliates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      parent_affiliate_id INT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      company_name VARCHAR(255),
      phone VARCHAR(20),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(50),
      zip_code VARCHAR(10),
      avatar VARCHAR(500),
      logo_url VARCHAR(500),
      partner_monitoring_link VARCHAR(512) NULL,
      credit_repair_link VARCHAR(512) NULL,
      plan_type ENUM('free', 'paid_partner') NOT NULL DEFAULT 'free',
      paid_referrals_count INT NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      parent_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
      total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_referrals INT NOT NULL DEFAULT 0,
      affiliate_level INT NOT NULL DEFAULT 1,
      status ENUM('active', 'inactive', 'pending', 'suspended') NOT NULL DEFAULT 'pending',
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until DATETIME NULL,
      last_login DATETIME NULL,
      last_login_ip VARCHAR(45),
      last_login_user_agent TEXT,
      password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      INDEX idx_admin_id (admin_id),
      INDEX idx_parent_affiliate_id (parent_affiliate_id),
      INDEX idx_email (email),
      INDEX idx_status (status),
      INDEX idx_affiliate_level (affiliate_level),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Email verification codes table for affiliate registration
    `CREATE TABLE IF NOT EXISTS email_verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      type ENUM('affiliate_registration', 'password_reset', 'email_change', 'admin_registration') NOT NULL DEFAULT 'affiliate_registration',
      expires_at DATETIME NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_code (code),
      INDEX idx_type (type),
      INDEX idx_expires_at (expires_at),
      INDEX idx_used (used)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Pending registrations table to store user data before email verification
    `CREATE TABLE IF NOT EXISTS pending_registrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      company_name VARCHAR(255) NULL,
      role ENUM('user', 'admin', 'support', 'super_admin', 'funding_manager') NOT NULL DEFAULT 'admin',
      plan_id INT NULL,
      billing_cycle ENUM('monthly', 'yearly') NULL,
      referral_affiliate_id VARCHAR(255) NULL,
      referral_affiliate_name VARCHAR(255) NULL,
      referral_commission_rate DECIMAL(5,2) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      INDEX idx_email (email),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Affiliate referrals table to track referrals and commissions
    `CREATE TABLE IF NOT EXISTS affiliate_referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      affiliate_id INT NOT NULL,
      referred_user_id INT NOT NULL,
      purchase_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      commission_rate DECIMAL(5,2) NOT NULL,
      transaction_id VARCHAR(255) NULL,
      plan_id INT NULL,
      status ENUM('pending', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
      referral_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      conversion_date DATETIME NULL,
      payment_date DATETIME NULL,
      plan_name VARCHAR(150) NULL,
      plan_price DECIMAL(10,2) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_affiliate_id (affiliate_id),
      INDEX idx_referred_user_id (referred_user_id),
      INDEX idx_status (status),
      INDEX idx_referral_date (referral_date),
      INDEX idx_transaction_id (transaction_id),
      FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Affiliate commissions table for detailed commission tracking
    `CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      affiliate_id INT NOT NULL,
      referral_id INT NULL,
      customer_id INT NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      commission_rate DECIMAL(5,2) NOT NULL,
      commission_amount DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'approved', 'paid', 'rejected') NOT NULL DEFAULT 'pending',
      tier VARCHAR(50) NOT NULL DEFAULT 'Bronze',
      product VARCHAR(255) NOT NULL,
      commission_level TINYINT NOT NULL DEFAULT 1,
      affiliate_type_at_payout ENUM('free', 'paid') NOT NULL DEFAULT 'free',
      payer_user_id INT NOT NULL,
      subscription_id VARCHAR(255) NULL,
      order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approval_date DATETIME NULL,
      payment_date DATETIME NULL,
      notes TEXT,
      tracking_code VARCHAR(100),
      commission_type ENUM('signup', 'monthly', 'upgrade', 'bonus') NOT NULL DEFAULT 'signup',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_affiliate_id (affiliate_id),
      INDEX idx_customer_id (customer_id),
      INDEX idx_referral_id (referral_id),
      INDEX idx_status (status),
      INDEX idx_tier (tier),
      INDEX idx_commission_level (commission_level),
      INDEX idx_payer_user_id (payer_user_id),
      INDEX idx_affiliate_type_at_payout (affiliate_type_at_payout),
      INDEX idx_order_date (order_date),
      INDEX idx_tracking_code (tracking_code),
      FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
      FOREIGN KEY (referral_id) REFERENCES affiliate_referrals(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payer_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Commission tiers table for tier management
    `CREATE TABLE IF NOT EXISTS commission_tiers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      min_referrals INT NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL,
      bonuses JSON,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_min_referrals (min_referrals),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // DIY Funding submissions table
    `CREATE TABLE IF NOT EXISTS funding_diy_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      card_id INT NOT NULL,
      card_type ENUM('personal', 'business') NOT NULL,
      status ENUM('approved', 'not_approved') NOT NULL DEFAULT 'not_approved',
      amount_approved DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      admin_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      description TEXT,
      credit_bureaus JSON NOT NULL,
      submitted_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_card_id (card_id),
      INDEX idx_submitted_by (submitted_by),
      INDEX idx_status (status),
      INDEX idx_card_type (card_type),
      UNIQUE KEY unique_user_card_submission (submitted_by, card_id),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Client-specific funding submissions table (per client-card)
    `CREATE TABLE IF NOT EXISTS client_funding_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      card_id INT NOT NULL,
      status ENUM('approved', 'not_approved') NOT NULL DEFAULT 'not_approved',
      amount_approved DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      admin_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      description TEXT,
      credit_bureaus JSON NOT NULL,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client_id (client_id),
      INDEX idx_card_id (card_id),
      INDEX idx_status (status),
      UNIQUE KEY unique_client_card (client_id, card_id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Blog Categories table
    `CREATE TABLE IF NOT EXISTS blog_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Blog Posts table
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      content LONGTEXT NOT NULL,
      excerpt TEXT,
      featured_image VARCHAR(500),
      youtube_url VARCHAR(500),
      author_id INT NOT NULL,
      category_id INT,
      status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
      published_at DATETIME,
      seo_title VARCHAR(255),
      seo_description TEXT,
      seo_keywords TEXT,
      views INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_slug (slug),
      INDEX idx_category_id (category_id),
      INDEX idx_author_id (author_id),
      INDEX idx_status (status),
      INDEX idx_published_at (published_at),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Blog Tags table
    `CREATE TABLE IF NOT EXISTS blog_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Blog Post Tags relation table
    `CREATE TABLE IF NOT EXISTS blog_post_tags (
      post_id INT NOT NULL,
      tag_id INT NOT NULL,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Testimonials table
    `CREATE TABLE IF NOT EXISTS testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      video VARCHAR(500) NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_role VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client_name (client_name),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Newsletter subscribers table
    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active', 'unsubscribed') NOT NULL DEFAULT 'active',
      INDEX idx_email (email),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Affiliate Trial Plans table
    `CREATE TABLE IF NOT EXISTS affiliates_trial_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      affiliate_id INT NOT NULL,
      duration_months INT NOT NULL DEFAULT 1,
      max_clients INT NULL,
      max_users INT NULL,
      status ENUM('active', 'scheduled', 'draft', 'expired') NOT NULL DEFAULT 'active',
      start_date DATETIME NULL,
      end_date DATETIME NULL,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_affiliate_id (affiliate_id),
      INDEX idx_status (status),
      INDEX idx_start_date (start_date),
      INDEX idx_end_date (end_date),
      FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ==========================================
    // CREDIT REPAIR FLOW TABLES
    // ==========================================

    // Support letter categories (used by dispute templates)
    `CREATE TABLE IF NOT EXISTS support_letter_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Support letter templates (for generating dispute letters)
    `CREATE TABLE IF NOT EXISTS support_letter_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NULL,
      name VARCHAR(255) NOT NULL,
      bureau VARCHAR(20) NULL,
      round INT NOT NULL DEFAULT 1,
      goal VARCHAR(50) NULL DEFAULT 'DELETION',
      tone VARCHAR(50) NULL DEFAULT 'FIRM',
      template_type VARCHAR(50) NOT NULL DEFAULT 'DISPUTE_STANDARD',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      version INT NOT NULL DEFAULT 1,
      content LONGTEXT NULL,
      notes TEXT NULL,
      tags JSON NULL,
      required_law_tags JSON NULL,
      constraints_json JSON NULL,
      placeholders JSON NULL,
      blocks JSON NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category_id),
      INDEX idx_bureau (bureau),
      INDEX idx_round (round),
      INDEX idx_status (status),
      INDEX idx_template_type (template_type),
      FOREIGN KEY (category_id) REFERENCES support_letter_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Dispute letter content (block-based letter templates by bureau/round)
    `CREATE TABLE IF NOT EXISTS dispute_letter_content (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bureau VARCHAR(10) NOT NULL DEFAULT 'ALL',
      round INT NOT NULL DEFAULT 1,
      category VARCHAR(100) NOT NULL,
      \`type\` VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
      block VARCHAR(50) NOT NULL,
      block_label VARCHAR(255) NULL,
      clause_content LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bureau_round (bureau, round),
      INDEX idx_category (category),
      INDEX idx_block (block),
      INDEX idx_type (\`type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Letter categories (for letter management)
    `CREATE TABLE IF NOT EXISTS letter_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Letter templates (for letter management)
    `CREATE TABLE IF NOT EXISTS letter_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      content LONGTEXT NOT NULL,
      category_id INT NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category_id),
      FOREIGN KEY (category_id) REFERENCES letter_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Credit repair generated letters (tracks all generated dispute letters)
    `CREATE TABLE IF NOT EXISTS credit_repair_generated_letters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      client_id INT NOT NULL,
      credit_report_id INT NULL,
      negative_item_id VARCHAR(255) NULL,
      bureau VARCHAR(20) NOT NULL,
      round INT NOT NULL DEFAULT 1,
      goal VARCHAR(50) NULL,
      tone VARCHAR(50) NULL,
      template_id INT NULL,
      template_version INT NULL,
      seed_used INT NULL,
      selected_clause_ids JSON NULL,
      rendered_letter LONGTEXT NULL,
      letter_hash VARCHAR(64) NULL,
      prior_letter_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_client (client_id),
      INDEX idx_bureau (bureau),
      INDEX idx_round (round),
      INDEX idx_negative_item (negative_item_id),
      INDEX idx_letter_hash (letter_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Dispute letter ZIP downloads
    `CREATE TABLE IF NOT EXISTS dispute_letter_zips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      client_id INT NOT NULL,
      history_id INT NULL,
      letter_count INT NOT NULL DEFAULT 0,
      file_name VARCHAR(500) NULL,
      file_path VARCHAR(1000) NULL,
      client_documents_version INT NOT NULL DEFAULT 0,
      print_status VARCHAR(50) NOT NULL DEFAULT 'Action Required',
      print_note TEXT NULL,
      sender_name VARCHAR(255) NULL,
      sender_email VARCHAR(255) NULL,
      sender_phone VARCHAR(50) NULL,
      sent_to_printing_at DATETIME NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'generating',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_client (client_id),
      INDEX idx_history (history_id),
      INDEX idx_sent_to_printing_at (sent_to_printing_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Client additional documents (multi-document support)
    `CREATE TABLE IF NOT EXISTS client_additional_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      document_type VARCHAR(50) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      original_name VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_client_doc (client_id, document_type),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  // Some integration tables reference clients, so these parent tables must be
  // created first when initializing an empty database. Keep the remaining schema
  // in its declared order.
  const parentTablePriority = new Map([
    ['users', 0],
    ['admin_integrations', 1],
    ['clients', 2]
  ]);
  tables.sort((left, right) => {
    const leftName = left.match(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/)?.[1] || '';
    const rightName = right.match(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/)?.[1] || '';
    return (parentTablePriority.get(leftName) ?? 3) - (parentTablePriority.get(rightName) ?? 3);
  });
  
  // Execute table creation in transaction
  await executeTransaction(async (connection) => {
    for (const tableSQL of tables) {
      await connection.execute(tableSQL);
    }
  });

  // Imported dumps can contain the integration activity table without the
  // indexes/constraints normally declared by CREATE TABLE. Restore them after
  // all parent tables are guaranteed to exist.
  await repairTableIdAutoIncrement('integration_activity_logs');
  const integrationLogForeignKeys = await executeQuery(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'integration_activity_logs'
        AND REFERENCED_TABLE_NAME IS NOT NULL`
  );
  const constrainedIntegrationLogColumns = new Set(
    (integrationLogForeignKeys as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME)
  );
  const integrationLogConstraintAlters: string[] = [];
  if (!constrainedIntegrationLogColumns.has('integration_id')) {
    integrationLogConstraintAlters.push(
      'ADD CONSTRAINT fk_integration_activity_logs_integration FOREIGN KEY (integration_id) REFERENCES admin_integrations(id) ON DELETE CASCADE'
    );
  }
  if (!constrainedIntegrationLogColumns.has('admin_id')) {
    integrationLogConstraintAlters.push(
      'ADD CONSTRAINT fk_integration_activity_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE'
    );
  }
  if (!constrainedIntegrationLogColumns.has('client_id')) {
    integrationLogConstraintAlters.push(
      'ADD CONSTRAINT fk_integration_activity_logs_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL'
    );
  }
  if (integrationLogConstraintAlters.length > 0) {
    try {
      await executeQuery(`ALTER TABLE integration_activity_logs ${integrationLogConstraintAlters.join(', ')}`);
    } catch (error: any) {
      if (isRecoverableForeignKeyError(error)) {
        console.warn('⚠️  Encountered legacy foreign-key issue while applying integration activity constraints; attempting cleanup before retrying.');
        try {
          await executeQuery(getForeignKeyCleanupSql('integration_activity_logs', 'admin_id', 'users', false));
        } catch (cleanupError: any) {
          console.warn('⚠️  Failed to clean integration_activity_logs.admin_id references:', cleanupError.message);
        }
        try {
          await executeQuery(getForeignKeyCleanupSql('integration_activity_logs', 'client_id', 'clients', true));
        } catch (cleanupError: any) {
          console.warn('⚠️  Failed to clean integration_activity_logs.client_id references:', cleanupError.message);
        }
        try {
          await executeQuery(getForeignKeyCleanupSql('integration_activity_logs', 'integration_id', 'admin_integrations', false));
        } catch (cleanupError: any) {
          console.warn('⚠️  Failed to clean integration_activity_logs.integration_id references:', cleanupError.message);
        }
        await executeQuery(`ALTER TABLE integration_activity_logs ${integrationLogConstraintAlters.join(', ')}`);
      } else {
        throw error;
      }
    }
  }
  
  console.log('✅ MySQL tables created successfully');

  // Add file_path column to dispute_letter_zips if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips 
      ADD COLUMN file_path VARCHAR(1000) NULL
    `);
    console.log('✅ Added file_path column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  file_path column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add file_path column:', error.message);
    }
  }

  // Add print_status column to dispute_letter_zips for printing team workflow
  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips 
      ADD COLUMN print_status VARCHAR(50) NOT NULL DEFAULT 'Action Required'
    `);
    console.log('✅ Added print_status column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  print_status column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add print_status column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      ADD COLUMN history_id INT NULL
    `);
    console.log('✅ Added history_id column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  history_id column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add history_id column:', error.message);
    }
  }

  try {
    await executeQuery(`
      CREATE INDEX idx_dispute_letter_zips_history_id
      ON dispute_letter_zips (history_id)
    `);
    console.log('✅ Added history_id index to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  history_id index already exists on dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add history_id index:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      MODIFY COLUMN print_status VARCHAR(50) NOT NULL DEFAULT 'Action Required'
    `);
    console.log('✅ Updated print_status default on dispute_letter_zips table');
  } catch (error: any) {
    console.warn('⚠️  Could not update print_status default:', error.message);
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      ADD COLUMN print_note TEXT NULL
    `);
    console.log('✅ Added print_note column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  print_note column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add print_note column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      ADD COLUMN sent_to_printing_at DATETIME NULL
    `);
    console.log('✅ Added sent_to_printing_at column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  sent_to_printing_at column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add sent_to_printing_at column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      ADD COLUMN sender_name VARCHAR(255) NULL
    `);
    console.log('✅ Added sender_name column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  sender_name column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add sender_name column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      ADD COLUMN sender_email VARCHAR(255) NULL
    `);
    console.log('✅ Added sender_email column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  sender_email column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add sender_email column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE dispute_letter_zips
      ADD COLUMN sender_phone VARCHAR(50) NULL
    `);
    console.log('✅ Added sender_phone column to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  sender_phone column already exists in dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add sender_phone column:', error.message);
    }
  }

  try {
    await executeQuery(`
      CREATE INDEX idx_dispute_letter_zips_sent_to_printing_at
      ON dispute_letter_zips (sent_to_printing_at)
    `);
    console.log('✅ Added sent_to_printing_at index to dispute_letter_zips table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  sent_to_printing_at index already exists on dispute_letter_zips');
    } else {
      console.warn('⚠️  Could not add sent_to_printing_at index:', error.message);
    }
  }

  try {
    await executeQuery(`
      UPDATE dispute_letter_zips
      SET sent_to_printing_at = COALESCE(sent_to_printing_at, created_at)
      WHERE sent_to_printing_at IS NULL
        AND (
          print_status <> 'Action Required'
          OR LENGTH(TRIM(COALESCE(print_note, ''))) > 0
        )
    `);
    console.log('✅ Backfilled sent_to_printing_at for known printing-team records');
  } catch (error: any) {
    console.warn('⚠️  Could not backfill sent_to_printing_at:', error.message);
  }

  // Add printing_team to users role enum
  try {
    await executeQuery(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('user','admin','support','super_admin','funding_manager','printing_team') NOT NULL DEFAULT 'user'
    `);
    console.log('✅ Updated users role enum to include printing_team');
  } catch (error: any) {
    console.warn('⚠️  Could not update users role enum:', error.message);
  }

  // Add stripe_customer_id column if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN stripe_customer_id VARCHAR(255) NULL,
      ADD INDEX idx_stripe_customer_id (stripe_customer_id)
    `);
    console.log('✅ Added stripe_customer_id column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  stripe_customer_id column already exists');
    } else {
      console.log('⚠️  Error adding stripe_customer_id column:', error.message);
    }
  }

  // Ensure testimonials table has 'video' column for cross-DB compatibility
  try {
    await executeQuery(`
      ALTER TABLE testimonials 
      ADD COLUMN video VARCHAR(500) NOT NULL
    `);
    console.log('✅ Added video column to testimonials table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  video column already exists on testimonials');
    } else {
      console.log('⚠️  Error adding video column to testimonials:', error.message);
    }
  }

  // Add unique key to prevent duplicate transactions per intent/session
  try {
    await executeQuery(`
      ALTER TABLE billing_transactions 
      ADD UNIQUE KEY uniq_stripe_intent (stripe_payment_intent_id)
    `);
    console.log('✅ Added uniq_stripe_intent unique key to billing_transactions');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  uniq_stripe_intent key already exists');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.log('⚠️  Could not add uniq_stripe_intent due to existing duplicates');
    } else {
      console.log('⚠️  Error adding uniq_stripe_intent:', error.message);
    }
  }

  // Add phone column if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN phone VARCHAR(20) NULL
    `);
    console.log('✅ Added phone column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  phone column already exists');
    } else {
      console.log('⚠️  Error adding phone column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN send_dispute_letter_email BOOLEAN NOT NULL DEFAULT TRUE
    `);
    console.log('✅ Added send_dispute_letter_email column to users table');
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Error adding send_dispute_letter_email column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN send_inactivity_email BOOLEAN NOT NULL DEFAULT TRUE
    `);
    console.log('Added send_inactivity_email column to users table');
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      console.log('Error adding send_inactivity_email column:', error.message);
    }
  }

  for (const column of ['send_report_pull_reminder_email', 'notify_client_after_report_pull']) {
    try {
      await executeQuery(`ALTER TABLE users ADD COLUMN ${column} BOOLEAN NOT NULL DEFAULT TRUE`);
      console.log(`Added ${column} column to users table`);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log(`Error adding ${column} column:`, error.message);
      }
    }
  }

  // Add address column if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN address TEXT NULL
    `);
    console.log('✅ Added address column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  address column already exists');
    } else {
      console.log('⚠️  Error adding address column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN city VARCHAR(100) NULL
    `);
    console.log('✅ Added city column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  city column already exists');
    } else {
      console.log('⚠️  Error adding city column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN state VARCHAR(50) NULL
    `);
    console.log('✅ Added state column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  state column already exists');
    } else {
      console.log('⚠️  Error adding state column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN zip_code VARCHAR(10) NULL
    `);
    console.log('✅ Added zip_code column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  zip_code column already exists');
    } else {
      console.log('⚠️  Error adding zip_code column:', error.message);
    }
  }

  // Add stripe_customer_id column to affiliates if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE affiliates 
      ADD COLUMN stripe_customer_id VARCHAR(255) NULL,
      ADD INDEX idx_affiliate_stripe_customer_id (stripe_customer_id)
    `);
    console.log('✅ Added stripe_customer_id column to affiliates table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  stripe_customer_id column already exists on affiliates');
    } else {
      console.log('⚠️  Error adding stripe_customer_id to affiliates:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE affiliate_referrals 
      ADD UNIQUE KEY uniq_affiliate_user_txn (affiliate_id, referred_user_id, transaction_id)
    `);
    console.log('✅ Added uniq_affiliate_user_txn unique key to affiliate_referrals');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  uniq_affiliate_user_txn key already exists');
    } else {
      console.log('⚠️  Error adding uniq_affiliate_user_txn:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE affiliate_commissions 
      ADD UNIQUE KEY uniq_referral_commission (referral_id)
    `);
    console.log('✅ Added uniq_referral_commission unique key to affiliate_commissions');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  uniq_referral_commission key already exists');
    } else {
      console.log('⚠️  Error adding uniq_referral_commission:', error.message);
    }
  }

  // Add must_change_password column if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('✅ Added must_change_password column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  must_change_password column already exists');
    } else {
      console.log('⚠️  Error adding must_change_password column:', error.message);
    }
  }

  // Add affiliate-only tracking columns if missing
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN account_type ENUM('admin','affiliate_only') NOT NULL DEFAULT 'admin'
    `);
    console.log('✅ Added account_type column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  account_type column already exists');
    } else {
      console.log('⚠️  Error adding account_type column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN referred_by_user_id INT NULL
    `);
    console.log('✅ Added referred_by_user_id column to users table');
    try {
      await executeQuery(`CREATE INDEX idx_referred_by_user_id ON users(referred_by_user_id)`);
      console.log('✅ Added idx_referred_by_user_id index');
    } catch (idxErr: any) {
      if (idxErr.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  idx_referred_by_user_id index already exists');
      } else {
        console.log('⚠️  Error adding idx_referred_by_user_id index:', idxErr.message);
      }
    }
    try {
      await executeQuery(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added fk_users_referred_by foreign key');
    } catch (fkErr: any) {
      if (fkErr.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  fk_users_referred_by already exists');
      } else {
        console.log('⚠️  Error adding fk_users_referred_by:', fkErr.message);
      }
    }
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  referred_by_user_id column already exists');
    } else {
      console.log('⚠️  Error adding referred_by_user_id column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN referral_source ENUM('product_link','affiliate_link') NULL
    `);
    console.log('✅ Added referral_source column to users table');
    try {
      await executeQuery(`CREATE INDEX idx_referral_source ON users(referral_source)`);
      console.log('✅ Added idx_referral_source index');
    } catch (idxErr: any) {
      if (idxErr.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  idx_referral_source index already exists');
      } else {
        console.log('⚠️  Error adding idx_referral_source index:', idxErr.message);
      }
    }
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  referral_source column already exists');
    } else {
      console.log('⚠️  Error adding referral_source column:', error.message);
    }
  }

  // Backward-compatible additions: NMI / Funding gateway columns
  // Add credit_repair_url column if missing
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN credit_repair_url VARCHAR(500) NULL
    `);
    console.log('✅ Added credit_repair_url column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  credit_repair_url column already exists');
    } else {
      console.log('⚠️  Error adding credit_repair_url column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN onboarding_slug VARCHAR(190) NULL
    `);
    console.log('✅ Added onboarding_slug column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  onboarding_slug column already exists');
    } else {
      console.log('⚠️  Error adding onboarding_slug column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_redirect_url VARCHAR(1000) NULL
    `);
    console.log('✅ Added intake_redirect_url column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_redirect_url column already exists');
    } else {
      console.log('⚠️  Error adding intake_redirect_url column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_logo_url VARCHAR(1000) NULL
    `);
    console.log('✅ Added intake_logo_url column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_logo_url column already exists');
    } else {
      console.log('⚠️  Error adding intake_logo_url column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_primary_color VARCHAR(7) NULL
    `);
    console.log('✅ Added intake_primary_color column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_primary_color column already exists');
    } else {
      console.log('⚠️  Error adding intake_primary_color column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_company_name VARCHAR(255) NULL
    `);
    console.log('✅ Added intake_company_name column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_company_name column already exists');
    } else {
      console.log('⚠️  Error adding intake_company_name column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_website_url VARCHAR(1000) NULL
    `);
    console.log('✅ Added intake_website_url column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_website_url column already exists');
    } else {
      console.log('⚠️  Error adding intake_website_url column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_email VARCHAR(255) NULL
    `);
    console.log('✅ Added intake_email column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_email column already exists');
    } else {
      console.log('⚠️  Error adding intake_email column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN intake_phone_number VARCHAR(50) NULL
    `);
    console.log('✅ Added intake_phone_number column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  intake_phone_number column already exists');
    } else {
      console.log('⚠️  Error adding intake_phone_number column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD UNIQUE KEY uniq_onboarding_slug (onboarding_slug)
    `);
    console.log('✅ Added uniq_onboarding_slug key to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  uniq_onboarding_slug key already exists');
    } else {
      console.log('⚠️  Error adding uniq_onboarding_slug key:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_merchant_id VARCHAR(255) NULL
    `);
    console.log('✅ Added nmi_merchant_id column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_merchant_id column already exists');
    } else {
      console.log('⚠️  Error adding nmi_merchant_id column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_public_key VARCHAR(500) NULL
    `);
    console.log('✅ Added nmi_public_key column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_public_key column already exists');
    } else {
      console.log('⚠️  Error adding nmi_public_key column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_api_key VARCHAR(500) NULL
    `);
    console.log('✅ Added nmi_api_key column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_api_key column already exists');
    } else {
      console.log('⚠️  Error adding nmi_api_key column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_username VARCHAR(255) NULL
    `);
    console.log('✅ Added nmi_username column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_username column already exists');
    } else {
      console.log('⚠️  Error adding nmi_username column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_password VARCHAR(255) NULL
    `);
    console.log('✅ Added nmi_password column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_password column already exists');
    } else {
      console.log('⚠️  Error adding nmi_password column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_test_mode BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('✅ Added nmi_test_mode column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_test_mode column already exists');
    } else {
      console.log('⚠️  Error adding nmi_test_mode column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN nmi_gateway_logo VARCHAR(500) NULL
    `);
    console.log('✅ Added nmi_gateway_logo column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  nmi_gateway_logo column already exists');
    } else {
      console.log('⚠️  Error adding nmi_gateway_logo column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN funding_override_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('✅ Added funding_override_enabled column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  funding_override_enabled column already exists');
    } else {
      console.log('⚠️  Error adding funding_override_enabled column:', error.message);
    }
  }
  // Add trial_expires_at column to users if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN trial_expires_at DATETIME NULL
    `);
    console.log('✅ Added trial_expires_at column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  trial_expires_at column already exists');
    } else {
      console.log('⚠️  Error adding trial_expires_at column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE users
      ADD COLUMN funding_override_signature_text TEXT NULL
    `);
    console.log('✅ Added funding_override_signature_text column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  funding_override_signature_text column already exists');
    } else {
      console.log('⚠️  Error adding funding_override_signature_text column:', error.message);
    }
  }
  try {
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN funding_override_signed_at DATETIME NULL
    `);
    console.log('✅ Added funding_override_signed_at column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  funding_override_signed_at column already exists');
    } else {
      console.log('⚠️  Error adding funding_override_signed_at column:', error.message);
    }
  }

  try {
    await executeQuery(`
      ALTER TABLE tsm_elite_signatures
      ADD COLUMN signature_image_url TEXT NULL
    `);
    console.log('✅ Added signature_image_url column to tsm_elite_signatures table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  signature_image_url column already exists on tsm_elite_signatures');
    } else {
      console.log('⚠️  Error adding signature_image_url column to tsm_elite_signatures:', error.message);
    }
  }

  // Add fundable_status column to clients if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE clients 
      ADD COLUMN fundable_status ENUM('fundable','not_fundable') NULL
    `);
    console.log('✅ Added fundable_status column to clients table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  fundable_status column already exists');
    } else {
      console.log('⚠️  Error adding fundable_status column:', error.message);
    }
  }

  // Add state column to cards if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE cards 
      ADD COLUMN state CHAR(2) NULL AFTER credit_bureaus
    `);
    console.log('✅ Added state column to cards table');
    try {
      await executeQuery(`CREATE INDEX idx_cards_state ON cards(state)`);
      console.log('✅ Added idx_cards_state index');
    } catch (idxErr: any) {
      if (idxErr.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  idx_cards_state already exists');
      } else {
        console.log('⚠️  Error adding idx_cards_state:', idxErr.message);
      }
    }
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  state column already exists on cards');
    } else {
      console.log('⚠️  Error adding state column to cards:', error.message);
    }
  }

  // Add states JSON column to cards if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE cards 
      ADD COLUMN states JSON NULL AFTER state
    `);
    console.log('✅ Added states JSON column to cards table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  states column already exists on cards');
    } else {
      console.log('⚠️  Error adding states column to cards:', error.message);
    }
  }

  // Add credit_bureaus JSON column to banks if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE banks 
      ADD COLUMN credit_bureaus JSON NULL AFTER state
    `);
    console.log('✅ Added credit_bureaus JSON column to banks table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  credit_bureaus column already exists on banks');
    } else {
      console.log('⚠️  Error adding credit_bureaus column to banks:', error.message);
    }
  }

  // Add primary_bureau column to banks if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE banks 
      ADD COLUMN primary_bureau ENUM('Experian','Equifax','TransUnion') NULL AFTER credit_bureaus
    `);
    console.log('✅ Added primary_bureau column to banks table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  primary_bureau column already exists on banks');
    } else {
      console.log('⚠️  Error adding primary_bureau column to banks:', error.message);
    }
  }
  
  // Add is_recommended column to banks if it doesn't exist
  try {
    await executeQuery(`
      ALTER TABLE banks
      ADD COLUMN is_recommended BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active
    `);
    console.log('✅ Added is_recommended column to banks table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  is_recommended column already exists on banks');
    } else {
      console.log('⚠️  Error adding is_recommended column to banks:', error.message);
    }
  }

  // Add max_clients column to affiliates_trial_plans if it doesn't exist
  try {
    await executeQuery(`ALTER TABLE affiliates_trial_plans ADD COLUMN max_clients INT NULL`);
    console.log('✅ Added max_clients column to affiliates_trial_plans table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  max_clients column already exists on affiliates_trial_plans');
    } else {
      console.log('⚠️  Error adding max_clients column to affiliates_trial_plans:', error.message);
    }
  }

  // Add max_users column to affiliates_trial_plans if it doesn't exist
  try {
    await executeQuery(`ALTER TABLE affiliates_trial_plans ADD COLUMN max_users INT NULL`);
    console.log('✅ Added max_users column to affiliates_trial_plans table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  max_users column already exists on affiliates_trial_plans');
    } else {
      console.log('⚠️  Error adding max_users column to affiliates_trial_plans:', error.message);
    }
  }

  // Add trial_max_clients column to users if it doesn't exist
  try {
    await executeQuery(`ALTER TABLE users ADD COLUMN trial_max_clients INT NULL`);
    console.log('✅ Added trial_max_clients column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  trial_max_clients column already exists on users');
    } else {
      console.log('⚠️  Error adding trial_max_clients column to users:', error.message);
    }
  }

  // Add trial_max_users column to users if it doesn't exist
  try {
    await executeQuery(`ALTER TABLE users ADD COLUMN trial_max_users INT NULL`);
    console.log('✅ Added trial_max_users column to users table');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  trial_max_users column already exists on users');
    } else {
      console.log('⚠️  Error adding trial_max_users column to users:', error.message);
    }
  }
}

// Seed MySQL database with initial data
async function seedMySQLDatabase(): Promise<void> {
  try {
    // Check if data already exists
    const [userCount] = await executeQuery<any[]>('SELECT COUNT(*) as count FROM users');
    const [courseCount] = await executeQuery<any[]>('SELECT COUNT(*) as count FROM courses');
    
    if (userCount && userCount.count > 0 && courseCount && courseCount.count > 0) {
      console.log('📊 Database already seeded, skipping...');
      return;
    }
    
    // If users exist but no courses, only seed courses
    if (userCount && userCount.count > 0 && (!courseCount || courseCount.count === 0)) {
      console.log('🌱 Adding demo courses to existing database...');
      await seedCourses();
      return;
    }
    
    console.log('🌱 Seeding MySQL database with demo data...');
    
    // Create demo user with bcrypt hash
    const demoPasswordHash = await bcrypt.hash('demo123', 12);
    
    await executeTransaction(async (connection) => {
      // Insert demo user
      const [userResult] = await connection.execute(
        `INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['demo@creditrepairpro.com', demoPasswordHash, 'John', 'Doe', 'CreditRepair Pro', 'admin', true]
      );
      
      const userId = (userResult as any).insertId;
      
      // Insert demo clients
      const clients = [
        ['Sarah', 'Johnson', 'sarah.johnson@email.com', '(555) 123-4567', '123 Main St, Springfield, IL', 'active', 650, 580, 'Medical collections affecting score'],
        ['Michael', 'Chen', 'm.chen@email.com', '(555) 234-5678', '456 Oak Ave, Portland, OR', 'active', 580, 560, 'Small business owner, improving credit'],
        ['Emma', 'Davis', 'emma.davis@email.com', '(555) 345-6789', '789 Pine Rd, Denver, CO', 'active', 720, 680, 'Excellent progress, almost to target score'],
        ['Robert', 'Wilson', 'r.wilson@email.com', '(555) 456-7890', '321 Elm St, Austin, TX', 'active', 780, 630, 'Successfully completed credit repair program'],
        ['Lisa', 'Rodriguez', 'lisa.r@email.com', '(555) 567-8901', '654 Maple Dr, Miami, FL', 'active', 685, 620, 'Making steady progress on disputes']
      ];
      
      for (const client of clients) {
        await connection.execute(
          `INSERT INTO clients (user_id, first_name, last_name, email, phone, address, status, credit_score, target_score, notes, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, ...client, userId, userId]
        );
      }
      
      // Insert demo disputes
      await connection.execute(
        `INSERT INTO disputes (client_id, bureau, account_name, dispute_reason, status, filed_date, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, 'experian', 'ABC Medical', 'Not mine - never had services', 'investigating', '2024-01-15', userId, userId]
      );
      
      await connection.execute(
        `INSERT INTO disputes (client_id, bureau, account_name, dispute_reason, status, filed_date, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, 'equifax', 'Old Credit Card', 'Paid in full - should be removed', 'pending', '2024-01-20', userId, userId]
      );
      
      // Insert demo activities
      await connection.execute(
        `INSERT INTO activities (user_id, client_id, type, description)
         VALUES (?, ?, ?, ?)`,
        [userId, 1, 'dispute_filed', 'Dispute submitted for Collection Account - ABC Medical']
      );
      
      await connection.execute(
        `INSERT INTO activities (user_id, client_id, type, description)
         VALUES (?, ?, ?, ?)`,
        [userId, 3, 'score_updated', 'Credit score increased from 680 to 720']
      );
      
      // Seed courses
      await seedCourses();
    });
    
    // Seed affiliate data (tiers and sample commissions)
    await seedAffiliateData();
    
    console.log('✅ MySQL database seeded successfully');
    
  } catch (error) {
    console.error('❌ Failed to seed MySQL database:', error);
    throw error;
  }
}

// Seed courses separately
async function seedCourses(): Promise<void> {
  try {
    // Get the first user to assign as course creator
    const [firstUser] = await executeQuery<any[]>('SELECT id FROM users LIMIT 1');
    const userId = firstUser?.id || 1;
    
    await executeTransaction(async (connection) => {
      // Insert demo courses
      const courses = [
        {
          title: 'Credit Fundamentals 101',
          description: 'Learn the basics of credit scores, credit reports, and how credit works in the financial system.',
          instructor: 'Sarah Mitchell, CFP',
          duration: '2 hours',
          difficulty: 'beginner',
          points: 100,
          featured: true,
          chapters: [
            { title: 'What is Credit?', content: 'Understanding the concept of credit and its importance in personal finance.', duration: '15 min', order_index: 1 },
            { title: 'Credit Scores Explained', content: 'Deep dive into FICO scores, VantageScore, and factors that affect your credit score.', duration: '20 min', order_index: 2 },
            { title: 'Reading Your Credit Report', content: 'How to obtain and interpret your credit report from the three major bureaus.', duration: '25 min', order_index: 3 },
            { title: 'Credit Utilization', content: 'Understanding how credit utilization affects your score and optimal usage strategies.', duration: '20 min', order_index: 4 },
            { title: 'Building Credit History', content: 'Strategies for establishing and maintaining a positive credit history.', duration: '20 min', order_index: 5 }
          ]
        },
        {
          title: 'Advanced Dispute Strategies',
          description: 'Master advanced techniques for disputing inaccurate items on credit reports and maximizing success rates.',
          instructor: 'Michael Rodriguez, Credit Expert',
          duration: '3.5 hours',
          difficulty: 'advanced',
          points: 200,
          featured: true,
          chapters: [
            { title: 'Legal Framework for Disputes', content: 'Understanding FCRA, FDCPA, and your rights as a consumer.', duration: '30 min', order_index: 1 },
            { title: 'Documentation and Evidence', content: 'Gathering and organizing supporting documentation for disputes.', duration: '25 min', order_index: 2 },
            { title: 'Writing Effective Dispute Letters', content: 'Crafting compelling dispute letters that get results.', duration: '35 min', order_index: 3 },
            { title: 'Follow-up Strategies', content: 'How to follow up on disputes and escalate when necessary.', duration: '30 min', order_index: 4 },
            { title: 'Dealing with Debt Collectors', content: 'Advanced strategies for handling debt collector communications.', duration: '40 min', order_index: 5 },
            { title: 'Court Procedures', content: 'When and how to take legal action for persistent inaccuracies.', duration: '30 min', order_index: 6 }
          ]
        },
        {
          title: 'Building Business Credit',
          description: 'Comprehensive guide to establishing and building credit for your business entity.',
          instructor: 'Jennifer Chen, Business Credit Specialist',
          duration: '2.5 hours',
          difficulty: 'intermediate',
          points: 150,
          featured: false,
          chapters: [
            { title: 'Business Structure and EIN', content: 'Setting up your business entity and obtaining an EIN.', duration: '20 min', order_index: 1 },
            { title: 'Business Credit Bureaus', content: 'Understanding Dun & Bradstreet, Experian Business, and Equifax Business.', duration: '25 min', order_index: 2 },
            { title: 'Net 30 Accounts', content: 'Building credit with vendor accounts and trade references.', duration: '30 min', order_index: 3 },
            { title: 'Business Credit Cards', content: 'Strategic use of business credit cards for building credit.', duration: '25 min', order_index: 4 },
            { title: 'Business Loans and Lines of Credit', content: 'Qualifying for and managing business financing.', duration: '30 min', order_index: 5 }
          ]
        },
        {
          title: 'Debt Management and Negotiation',
          description: 'Learn effective strategies for managing debt and negotiating with creditors and collectors.',
          instructor: 'David Thompson, Debt Negotiation Expert',
          duration: '3 hours',
          difficulty: 'intermediate',
          points: 175,
          featured: false,
          chapters: [
            { title: 'Debt Assessment and Prioritization', content: 'Analyzing your debt situation and creating a repayment strategy.', duration: '25 min', order_index: 1 },
            { title: 'Negotiation Fundamentals', content: 'Basic principles of successful debt negotiation.', duration: '30 min', order_index: 2 },
            { title: 'Settlement Strategies', content: 'When and how to negotiate debt settlements.', duration: '35 min', order_index: 3 },
            { title: 'Payment Plans and Hardship Programs', content: 'Working with creditors to establish manageable payment arrangements.', duration: '30 min', order_index: 4 },
            { title: 'Dealing with Collection Agencies', content: 'Strategies for handling third-party debt collectors.', duration: '30 min', order_index: 5 },
            { title: 'Bankruptcy Alternatives', content: 'Exploring alternatives to bankruptcy filing.', duration: '30 min', order_index: 6 }
          ]
        },
        {
          title: 'Credit Repair for Real Estate',
          description: 'Specialized credit repair strategies for real estate investors and homebuyers.',
          instructor: 'Lisa Parker, Real Estate Credit Specialist',
          duration: '2 hours',
          difficulty: 'intermediate',
          points: 125,
          featured: true,
          chapters: [
            { title: 'Mortgage Credit Requirements', content: 'Understanding credit requirements for different loan types.', duration: '25 min', order_index: 1 },
            { title: 'Rapid Rescoring Techniques', content: 'Fast-track methods for improving credit scores before closing.', duration: '30 min', order_index: 2 },
            { title: 'Investment Property Financing', content: 'Credit considerations for investment property purchases.', duration: '25 min', order_index: 3 },
            { title: 'Credit for First-Time Homebuyers', content: 'Special programs and strategies for first-time buyers.', duration: '20 min', order_index: 4 },
            { title: 'Post-Purchase Credit Management', content: 'Maintaining and improving credit after home purchase.', duration: '20 min', order_index: 5 }
          ]
        }
      ];
      
      for (const course of courses) {
        const [courseResult] = await connection.execute(
          `INSERT INTO courses (title, description, instructor, duration, difficulty, points, featured, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [course.title, course.description, course.instructor, course.duration, course.difficulty, course.points, course.featured, userId]
        );
        
        const courseId = (courseResult as any).insertId;
        
        // Insert chapters for this course
        for (const chapter of course.chapters) {
          await connection.execute(
            `INSERT INTO course_chapters (course_id, title, content, duration, order_index)
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, chapter.title, chapter.content, chapter.duration, chapter.order_index]
          );
        }
      }
    });
    
    console.log('✅ Demo courses added successfully');
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    throw error;
  }
}

// Helper functions for MySQL operations (similar to SQLite versions)
export async function runMySQLQuery(sql: string, params: any[] = []): Promise<any> {
  const result = await executeQuery(sql, params);
  return {
    lastID: (result as any).insertId || 0,
    changes: (result as any).affectedRows || 0
  };
}

export async function getMySQLQuery<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await executeQuery<T[]>(sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

export async function getAllMySQLQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const results = await executeQuery<T[]>(sql, params);
  return Array.isArray(results) ? results : [];
}

// Export MySQL pool getter
export function getMySQLDatabase() {
  return getMySQLPool();
}

// Support Settings Interfaces
export interface SupportTeamMember {
  id?: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  permissions: string; // JSON string of permissions array
  avatar?: string;
  phone?: string;
  department?: string;
  hire_date?: string;
  last_active?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupportNotificationSettings {
  id?: number;
  user_id?: number;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  new_ticket_alerts: boolean;
  ticket_updates: boolean;
  escalation_alerts: boolean;
  daily_reports: boolean;
  weekly_reports: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupportWorkingHours {
  id?: number;
  day_of_week: string; // monday, tuesday, etc.
  start_time: string;
  end_time: string;
  is_working_day: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupportGeneralSettings {
  id?: number;
  company_name: string;
  support_email: string;
  timezone: string;
  language: string;
  auto_assignment: boolean;
  ticket_auto_close_days: number;
  max_tickets_per_agent: number;
  response_time_target: number; // in hours
  resolution_time_target: number; // in hours
  created_at?: string;
  updated_at?: string;
}

  export interface Affiliate {
    id: number;
    admin_id: number;
    parent_affiliate_id?: number;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    avatar?: string;
    logo_url?: string;
    referral_slug?: string;
    plan_type: 'free' | 'paid_partner';
    partner_monitoring_link?: string | null;
    credit_repair_link?: string | null;
    paid_referrals_count: number;
    commission_rate: number;
    parent_commission_rate: number;
    total_earnings: number;
    total_referrals: number;
    affiliate_level: number;
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    email_verified: boolean;
    failed_login_attempts: number;
    locked_until?: string;
    last_login?: string;
    last_login_ip?: string;
    last_login_user_agent?: string;
    password_changed_at: string;
    notes?: string;
    stripe_customer_id?: string;
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    routing_number?: string;
    account_type?: 'checking' | 'savings';
    swift_code?: string;
    iban?: string;
    bank_address?: string;
    payment_method?: 'bank_transfer' | 'paypal' | 'stripe' | 'check';
    paypal_email?: string;
    stripe_account_id?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    updated_by?: number;
  }

export interface AffiliateReferral {
  id: number;
  affiliate_id: number;
  referred_user_id: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  referral_date: string;
  conversion_date?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommission {
  id: number;
  affiliate_id: number;
  referral_id?: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  order_value: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  tier: string;
  product: string;
  commission_level: number;
  affiliate_type_at_payout: 'free' | 'paid';
  payer_user_id: number;
  subscription_id?: string | null;
  order_date: string;
  approval_date?: string;
  payment_date?: string;
  notes?: string;
  tracking_code?: string;
  commission_type: 'signup' | 'monthly' | 'upgrade' | 'bonus';
  created_at: string;
  updated_at: string;
}

export interface CommissionTier {
  id: number;
  name: string;
  min_referrals: number;
  commission_rate: number;
  bonuses?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Export all helper functions
export { executeQuery, executeTransaction, getMySQLPool };
