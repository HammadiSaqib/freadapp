import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { emailService } from './emailService.js';

export const ADMIN_INACTIVITY_EMAIL_SETTING_KEY = 'notifications.admin_inactivity_email_enabled';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAdminLoginLink(): string {
  const configured = String(process.env.ADMIN_PORTAL_URL || '').trim();
  const baseUrl = configured
    ? configured.replace(/\/+$/, '')
    : process.env.NODE_ENV === 'production'
      ? 'https://admin.thescoremachine.com'
      : `http://admin.localhost:${process.env.PORT || '3001'}`;
  return `${baseUrl}/login`;
}

async function ensureInactivityEmailLogTable(): Promise<void> {
  const db = getDatabaseAdapter();
  if (db.getType() === 'sqlite') {
    await db.executeQuery(`
      CREATE TABLE IF NOT EXISTS admin_inactivity_email_log (
        admin_id INTEGER PRIMARY KEY,
        last_activity_at DATETIME NOT NULL,
        sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    return;
  }

  await db.executeQuery(`
    CREATE TABLE IF NOT EXISTS admin_inactivity_email_log (
      admin_id INT NOT NULL PRIMARY KEY,
      last_activity_at DATETIME NOT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_admin_inactivity_email_user
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getAdminInactivityEmailEnabled(): Promise<boolean> {
  const db = getDatabaseAdapter();
  try {
    const setting = await db.getQuery(
      'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
      [ADMIN_INACTIVITY_EMAIL_SETTING_KEY]
    );
    return parseBooleanSetting(setting?.setting_value, true);
  } catch {
    return true;
  }
}

export async function setAdminInactivityEmailEnabled(enabled: boolean, updatedBy: number): Promise<void> {
  const db = getDatabaseAdapter();
  const description = 'Send a We Miss You email after an active admin has not logged in for two days';
  const params = [ADMIN_INACTIVITY_EMAIL_SETTING_KEY, enabled ? 'true' : 'false', description, updatedBy];

  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO system_settings
       (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
       VALUES (?, ?, 'boolean', 'notifications', ?, 0, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_by = excluded.updated_by,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
    return;
  }

  await db.executeQuery(
    `INSERT INTO system_settings
     (id, setting_key, setting_value, setting_type, category, description, is_public, updated_by)
     SELECT COALESCE(MAX(id), 0) + 1, ?, ?, 'boolean', 'notifications', ?, 0, ?
     FROM system_settings
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_by = VALUES(updated_by),
       updated_at = NOW()`,
    params
  );
}

async function getInactiveAdmins(): Promise<any[]> {
  const db = getDatabaseAdapter();
  const cutoff = new Date(Date.now() - TWO_DAYS_MS);
  const activeCondition = db.getType() === 'sqlite'
    ? 'COALESCE(u.is_active, 1) = 1'
    : "u.status = 'active'";

  return db.allQuery(
    `SELECT u.id, u.first_name, u.email,
            COALESCE(u.last_login, u.created_at) AS last_activity_at,
            l.last_activity_at AS emailed_activity_at
     FROM users u
     LEFT JOIN admin_inactivity_email_log l ON l.admin_id = u.id
     WHERE u.role = 'admin'
       AND ${activeCondition}
       AND COALESCE(u.send_inactivity_email, 1) = 1
       AND u.email IS NOT NULL
       AND TRIM(u.email) != ''
       AND COALESCE(u.last_login, u.created_at) <= ?
       AND (l.last_activity_at IS NULL OR l.last_activity_at < COALESCE(u.last_login, u.created_at))
     ORDER BY COALESCE(u.last_login, u.created_at) ASC`,
    [cutoff]
  );
}

async function recordInactivityEmail(adminId: number, lastActivityAt: Date | string): Promise<void> {
  const db = getDatabaseAdapter();
  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO admin_inactivity_email_log (admin_id, last_activity_at, sent_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(admin_id) DO UPDATE SET
         last_activity_at = excluded.last_activity_at,
         sent_at = CURRENT_TIMESTAMP`,
      [adminId, lastActivityAt]
    );
    return;
  }

  await db.executeQuery(
    `INSERT INTO admin_inactivity_email_log (admin_id, last_activity_at, sent_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       last_activity_at = VALUES(last_activity_at),
       sent_at = NOW()`,
    [adminId, lastActivityAt]
  );
}

async function sendWeMissYouEmail(admin: any): Promise<boolean> {
  const firstName = String(admin.first_name || '').trim() || 'there';
  const loginLink = getAdminLoginLink();
  const demoLink = 'https://calendly.com/adrwealthadvisorsllc/30min';
  const subject = 'We Miss You \u2014 Your Score Machine Account Is Waiting';
  const html = `
    <div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#1e293b">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#0f172a;padding:28px;text-align:center;color:#fff">
          <h1 style="margin:0;font-size:26px">We Miss You</h1>
        </div>
        <div style="padding:32px;line-height:1.65;font-size:15px">
          <p style="font-size:18px;font-weight:700">Hey ${escapeHtml(firstName)},</p>
          <p>We noticed you haven't logged into The Score Machine in a little while, and we wanted to check in.</p>
          <p>Your account is still active, and there may be important tools, client updates, reports, or funding-readiness information waiting for you inside the platform.</p>
          <p>The Score Machine is built to help you stay organized, track progress, review credit data, understand funding readiness, and move clients through the process with more clarity. But the system can only help when it's being used consistently.</p>
          <p style="margin:28px 0"><a href="${escapeHtml(loginLink)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 22px;border-radius:6px;font-weight:700">Log Back In</a></p>
          <p>If you need help getting started, or if you want a walkthrough of how to use the platform, you can <a href="${demoLink}">schedule a demo with our team here</a>.</p>
          <p>We're here to help you make the most out of your account.</p>
          <p style="margin-top:28px"><strong>The Score Machine Team</strong></p>
        </div>
      </div>
    </div>`;
  const text = `Hey ${firstName},

We noticed you haven't logged into The Score Machine in a little while, and we wanted to check in.

Your account is still active, and there may be important tools, client updates, reports, or funding-readiness information waiting for you inside the platform.

The Score Machine is built to help you stay organized, track progress, review credit data, understand funding readiness, and move clients through the process with more clarity. But the system can only help when it's being used consistently.

You can log back in here: ${loginLink}

If you need help getting started, or if you want a walkthrough of how to use the platform, you can schedule a demo with our team here: ${demoLink}

We're here to help you make the most out of your account.

The Score Machine Team`;

  return emailService.sendEmail({
    to: String(admin.email),
    subject,
    html,
    text,
    allowDevelopmentFallback: false
  });
}

class AdminInactivityEmailScheduler {
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  start() {
    if (this.interval) return;
    void this.checkAndSend();
    this.interval = setInterval(() => void this.checkAndSend(), ONE_HOUR_MS);
    console.log('Admin inactivity email scheduler started');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async checkAndSend() {
    if (this.running) return;
    this.running = true;
    try {
      await ensureInactivityEmailLogTable();
      if (!(await getAdminInactivityEmailEnabled())) return;

      const admins = await getInactiveAdmins();
      for (const admin of admins) {
        try {
          const sent = await sendWeMissYouEmail(admin);
          if (sent) {
            await recordInactivityEmail(Number(admin.id), admin.last_activity_at);
            console.log(`[AdminInactivityEmail] Sent to admin ${admin.id}`);
          } else {
            console.warn(`[AdminInactivityEmail] SMTP delivery failed for admin ${admin.id}`);
          }
        } catch (error: any) {
          console.error(`[AdminInactivityEmail] Failed for admin ${admin.id}:`, error?.message || error);
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    } catch (error: any) {
      console.error('Admin inactivity email scheduler failed:', error?.message || error);
    } finally {
      this.running = false;
    }
  }
}

export const adminInactivityEmailScheduler = new AdminInactivityEmailScheduler();
