import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { emailService } from './emailService.js';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const REPORT_PULL_REMINDER_EMAIL_SETTING_KEY = 'notifications.report_pull_reminder_email_enabled';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

function getAdminPortalBaseUrl(): string {
  const configured = String(process.env.ADMIN_PORTAL_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return process.env.NODE_ENV === 'production'
    ? 'https://admin.thescoremachine.com'
    : `http://admin.localhost:${process.env.PORT || '3001'}`;
}

let cachedEmailLogo: Buffer | null = null;

async function getEmailLogoAttachments(): Promise<
  | Array<{
      filename: string;
      content: Buffer;
      contentType: string;
      cid: string;
    }>
  | undefined
> {
  try {
    if (!cachedEmailLogo) {
      cachedEmailLogo = await readFile(path.resolve(process.cwd(), 'public', 'image.png'));
    }
    return [
      {
        filename: 'image.png',
        content: cachedEmailLogo,
        contentType: 'image/png',
        cid: 'score-machine-logo'
      }
    ];
  } catch {
    return undefined;
  }
}

async function ensureReportPullReminderLogTable(): Promise<void> {
  const db = getDatabaseAdapter();
  if (db.getType() === 'sqlite') {
    await db.executeQuery(`
      CREATE TABLE IF NOT EXISTS report_pull_reminder_email_log (
        client_id INTEGER PRIMARY KEY,
        last_report_at DATETIME NOT NULL,
        sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);
    return;
  }

  await db.executeQuery(`
    CREATE TABLE IF NOT EXISTS report_pull_reminder_email_log (
      client_id INT NOT NULL PRIMARY KEY,
      last_report_at DATETIME NOT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_report_pull_reminder_client
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getReportPullReminderEmailEnabled(): Promise<boolean> {
  const db = getDatabaseAdapter();
  try {
    const setting = await db.getQuery(
      'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
      [REPORT_PULL_REMINDER_EMAIL_SETTING_KEY]
    );
    return parseBooleanSetting(setting?.setting_value, true);
  } catch {
    return true;
  }
}

export async function setReportPullReminderEmailEnabled(enabled: boolean, updatedBy: number): Promise<void> {
  const db = getDatabaseAdapter();
  const description = 'Remind admins when a client credit report has not been pulled for 30 days';
  const params = [REPORT_PULL_REMINDER_EMAIL_SETTING_KEY, enabled ? 'true' : 'false', description, updatedBy];

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

async function getReportReminderCandidates(): Promise<any[]> {
  const db = getDatabaseAdapter();
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const clientIdExpression = db.getType() === 'sqlite'
    ? 'CAST(client_id AS INTEGER)'
    : 'CAST(client_id AS UNSIGNED)';
  const activeCondition = db.getType() === 'sqlite'
    ? 'COALESCE(u.is_active, 1) = 1'
    : "u.status = 'active'";

  return db.allQuery(
    `SELECT c.id AS client_id, c.first_name AS client_first_name, c.last_name AS client_last_name,
            u.id AS admin_id, u.first_name AS admin_first_name, u.email AS admin_email,
            COALESCE(reports.last_report_at, c.created_at) AS last_report_at,
            reminder.last_report_at AS emailed_report_at
     FROM clients c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN (
       SELECT ${clientIdExpression} AS client_id, MAX(created_at) AS last_report_at
       FROM credit_report_history
       WHERE status = 'completed'
       GROUP BY ${clientIdExpression}
     ) reports ON reports.client_id = c.id
     LEFT JOIN report_pull_reminder_email_log reminder ON reminder.client_id = c.id
     WHERE u.role = 'admin'
       AND ${activeCondition}
       AND COALESCE(u.send_report_pull_reminder_email, 1) = 1
       AND u.email IS NOT NULL
       AND TRIM(u.email) != ''
       AND COALESCE(reports.last_report_at, c.created_at) <= ?
       AND (reminder.last_report_at IS NULL OR reminder.last_report_at < COALESCE(reports.last_report_at, c.created_at))
     ORDER BY COALESCE(reports.last_report_at, c.created_at) ASC`,
    [cutoff]
  );
}

async function recordReportReminder(clientId: number, lastReportAt: Date | string): Promise<void> {
  const db = getDatabaseAdapter();
  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO report_pull_reminder_email_log (client_id, last_report_at, sent_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(client_id) DO UPDATE SET
         last_report_at = excluded.last_report_at,
         sent_at = CURRENT_TIMESTAMP`,
      [clientId, lastReportAt]
    );
    return;
  }

  await db.executeQuery(
    `INSERT INTO report_pull_reminder_email_log (client_id, last_report_at, sent_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_report_at = VALUES(last_report_at), sent_at = NOW()`,
    [clientId, lastReportAt]
  );
}

async function sendReportPullReminder(candidate: any): Promise<boolean> {
  const adminFirstName = String(candidate.admin_first_name || '').trim() || 'there';
  const clientFirstName = String(candidate.client_first_name || '').trim() || 'your client';
  const clientLastName = String(candidate.client_last_name || '').trim();
  const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ');
  const clientProfileLink = `${getAdminPortalBaseUrl()}/clients/${candidate.client_id}`;
  const automationLink = 'https://admin.thescoremachine.com/settings';
  const subject = `Reminder: It\u2019s Time to Pull ${clientFirstName}\u2019s Updated Report`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Updated Report Reminder</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #fafcff;
      margin: 0;
      padding: 40px 20px;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
      overflow: hidden;
      border: 1px solid #f1f5f9;
    }
    .header {
      background: linear-gradient(135deg, #00d4ff 0%, #7000ff 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to top, #ffffff, transparent);
    }
    .header img {
      height: 48px;
      width: auto;
      margin-bottom: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 900;
      margin: 0;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 15px;
      font-weight: 500;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .body-content {
      padding: 40px 30px;
      background: #ffffff;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 15px;
    }
    .text-block {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 25px;
    }
    .list-block {
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px 20px 20px 40px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #00d4ff;
    }
    .list-block li {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .list-block li:last-child {
      margin-bottom: 0;
    }
    .action-button {
      display: block;
      width: 100%;
      text-align: center;
      background: linear-gradient(to right, #0f172a, #1e293b);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 0;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 30px;
      box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2);
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
    }
    .footer p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }
    .footer strong {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:score-machine-logo" alt="Score Machine Logo" />
      <h1>Updated Report Reminder</h1>
      <p>Score Machine</p>
    </div>
    <div class="body-content">
      <div class="greeting">Hey ${escapeHtml(adminFirstName)},</div>
      <div class="text-block">
        This is a reminder that it has been <strong>30 days</strong> since <strong>${escapeHtml(clientName)}'s</strong> last report was pulled inside The Score Machine.
        To keep the client's progress accurate and up to date, please pull their updated credit report as soon as possible.
      </div>
      
      <div class="text-block" style="font-weight: 600; color: #0f172a;">
        Keeping reports current helps the system provide better visibility into:
      </div>
      <ul class="list-block">
        <li>Client progress</li>
        <li>Updated account activity</li>
        <li>Score movement</li>
        <li>Funding readiness</li>
        <li>Changes in utilization</li>
        <li>New inquiries or negative items</li>
        <li>Next-step recommendations</li>
      </ul>

      <a href="${escapeHtml(clientProfileLink)}" class="action-button">Open Client Profile</a>

      <div class="text-block" style="font-size: 13px; color: #64748b; background: #f1f5f9; padding: 15px; border-radius: 12px;">
        <strong>Note:</strong> Once the new report is pulled, the client can be notified automatically if that automation is turned on. <a href="${escapeHtml(automationLink)}" style="color: #00d4ff; font-weight: 600;">View Automation Status</a>.
      </div>
    </div>
    <div class="footer">
      <p><strong>The Score Machine Team</strong></p>
      <p style="margin-top: 10px;">Automating your credit workflow.</p>
    </div>
  </div>
</body>
</html>
  `;
  const text = `Hey ${adminFirstName},\n\nThis is a reminder that it has been 30 days since ${clientName}'s last report was pulled inside The Score Machine.\n\nTo keep the client's progress accurate and up to date, please pull their updated credit report as soon as possible.\n\nKeeping reports current helps the system provide better visibility into:\nClient progress\nUpdated account activity\nScore movement\nFunding readiness\nChanges in utilization\nNew inquiries or negative items\nNext-step recommendations\n\nClient Profile: ${clientProfileLink}\n\nOnce the new report is pulled, the client can be notified automatically if that automation is turned on. View Automation Status: ${automationLink}\n\nThe Score Machine Team`;

  const attachments = await getEmailLogoAttachments();
  return emailService.sendEmail({
    to: String(candidate.admin_email),
    subject,
    html,
    text,
    attachments,
    allowDevelopmentFallback: false
  });
}

export async function sendClientReportPulledNotification(clientId: number): Promise<{ sent: boolean; skippedReason?: string }> {
  const db = getDatabaseAdapter();
  const record = await db.getQuery(
    `SELECT c.id, c.first_name AS client_first_name, c.last_name AS client_last_name, c.email AS client_email,
            u.first_name AS admin_first_name, u.last_name AS admin_last_name,
            COALESCE(u.notify_client_after_report_pull, 1) AS notify_client_after_report_pull
     FROM clients c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ? AND u.role = 'admin'
     LIMIT 1`,
    [clientId]
  );

  if (!record?.client_email) return { sent: false, skippedReason: 'client_email_missing' };
  if (!parseBooleanSetting(record.notify_client_after_report_pull, true)) {
    return { sent: false, skippedReason: 'admin_disabled' };
  }

  const clientName = [record.client_first_name, record.client_last_name].filter(Boolean).join(' ').trim() || 'there';
  const adminName = [record.admin_first_name, record.admin_last_name].filter(Boolean).join(' ').trim() || 'Your account admin';
  const subject = 'Your Credit Report Was Successfully Pulled';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Report Was Successfully Pulled</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #fafcff;
      margin: 0;
      padding: 40px 20px;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
      overflow: hidden;
      border: 1px solid #f1f5f9;
    }
    .header {
      background: linear-gradient(135deg, #00d4ff 0%, #7000ff 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to top, #ffffff, transparent);
    }
    .header img {
      height: 48px;
      width: auto;
      margin-bottom: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 900;
      margin: 0;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 15px;
      font-weight: 500;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .body-content {
      padding: 40px 30px;
      background: #ffffff;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 15px;
    }
    .text-block {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 25px;
    }
    .success-box {
      background: #f8fafc;
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #00d4ff;
      text-align: center;
    }
    .success-box strong {
      display: block;
      font-size: 18px;
      color: #0f172a;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
    }
    .footer p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }
    .footer strong {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:score-machine-logo" alt="Score Machine Logo" />
      <h1>Report Pulled</h1>
      <p>Score Machine</p>
    </div>
    <div class="body-content">
      <div class="greeting">Hi ${escapeHtml(clientName)},</div>
      
      <div class="success-box">
        <strong>Successfully Updated!</strong>
        <span style="color: #475569;"><strong>${escapeHtml(adminName)}</strong> has successfully pulled your credit report in The Score Machine software.</span>
      </div>

      <div class="text-block" style="text-align: center;">
        Your updated report is now available to your account admin for review. You can log in to your portal to check any updates.
      </div>
    </div>
    <div class="footer">
      <p><strong>The Score Machine Team</strong></p>
      <p style="margin-top: 10px;">Automating your credit workflow.</p>
    </div>
  </div>
</body>
</html>
  `;
  const text = `Hi ${clientName},\n\n${adminName} has successfully pulled your credit report in The Score Machine software.\n\nYour updated report is now available to your account admin for review.\n\nThe Score Machine Team`;
  const attachments = await getEmailLogoAttachments();
  const sent = await emailService.sendEmail({
    to: String(record.client_email),
    subject,
    html,
    text,
    attachments,
    allowDevelopmentFallback: false
  });
  return sent ? { sent: true } : { sent: false, skippedReason: 'smtp_delivery_failed' };
}

export function sendClientReportPulledNotificationInBackground(clientId: number) {
  void sendClientReportPulledNotification(clientId)
    .then((result) => {
      if (result.sent) console.log(`[ClientReportPulledEmail] Sent for client ${clientId}`);
      else console.warn(`[ClientReportPulledEmail] Skipped for client ${clientId}: ${result.skippedReason}`);
    })
    .catch((error: any) => console.error('[ClientReportPulledEmail] Failed:', error?.message || error));
}

class ReportPullReminderEmailScheduler {
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  start() {
    if (this.interval) return;
    void this.checkAndSend();
    this.interval = setInterval(() => void this.checkAndSend(), ONE_DAY_MS);
    console.log('Report pull reminder email scheduler started');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async checkAndSend() {
    if (this.running) return;
    this.running = true;
    try {
      await ensureReportPullReminderLogTable();
      if (!(await getReportPullReminderEmailEnabled())) return;
      const candidates = await getReportReminderCandidates();
      for (const candidate of candidates) {
        try {
          const sent = await sendReportPullReminder(candidate);
          if (sent) {
            await recordReportReminder(Number(candidate.client_id), candidate.last_report_at);
            console.log(`[ReportPullReminderEmail] Sent for client ${candidate.client_id}`);
          }
        } catch (error: any) {
          console.error(`[ReportPullReminderEmail] Failed for client ${candidate.client_id}:`, error?.message || error);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error('Report pull reminder email scheduler failed:', error?.message || error);
    } finally {
      this.running = false;
    }
  }
}

export const reportPullReminderEmailScheduler = new ReportPullReminderEmailScheduler();
