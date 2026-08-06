import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { emailService } from './emailService.js';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const DISPUTE_LETTER_ADMIN_EMAIL_SETTING_KEY = 'notifications.dispute_letter_admin_email_enabled';

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

export async function getDisputeLetterAdminEmailEnabled(): Promise<boolean> {
  const db = getDatabaseAdapter();
  try {
    const setting = await db.getQuery(
      'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
      [DISPUTE_LETTER_ADMIN_EMAIL_SETTING_KEY]
    );
    return parseBooleanSetting(setting?.setting_value, false);
  } catch {
    return false;
  }
}

export async function setDisputeLetterAdminEmailEnabled(enabled: boolean, updatedBy: number): Promise<void> {
  const db = getDatabaseAdapter();
  const description = 'Send an email to an admin when a dispute letter is generated for one of their clients';
  const params = [DISPUTE_LETTER_ADMIN_EMAIL_SETTING_KEY, enabled ? 'true' : 'false', description, updatedBy];

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

export async function sendDisputeLetterGeneratedNotification(params: {
  clientId: number;
  generatedAt?: Date;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const clientId = Number(params.clientId);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return { sent: false, skippedReason: 'invalid_client' };
  }

  if (!(await getDisputeLetterAdminEmailEnabled())) {
    return { sent: false, skippedReason: 'global_disabled' };
  }

  const db = getDatabaseAdapter();
  let record: any;
  try {
    record = await db.getQuery(
      `SELECT c.id AS client_id, c.first_name AS client_first_name, c.last_name AS client_last_name,
              u.id AS admin_id, u.first_name AS admin_first_name, u.email AS admin_email,
              COALESCE(u.send_dispute_letter_email, 1) AS send_dispute_letter_email
       FROM clients c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ? AND u.role = 'admin'
       LIMIT 1`,
      [clientId]
    );
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
    record = await db.getQuery(
      `SELECT c.id AS client_id, c.first_name AS client_first_name, c.last_name AS client_last_name,
              u.id AS admin_id, u.first_name AS admin_first_name, u.email AS admin_email,
              1 AS send_dispute_letter_email
       FROM clients c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ? AND u.role = 'admin'
       LIMIT 1`,
      [clientId]
    );
  }

  if (!record?.admin_email) {
    return { sent: false, skippedReason: 'admin_not_found' };
  }
  if (!parseBooleanSetting(record.send_dispute_letter_email, true)) {
    return { sent: false, skippedReason: 'admin_disabled' };
  }

  const clientFirstName = String(record.client_first_name || '').trim();
  const clientLastName = String(record.client_last_name || '').trim();
  const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ').trim() || `Client #${clientId}`;
  const adminFirstName = String(record.admin_first_name || '').trim() || 'there';
  const generatedAt = params.generatedAt || new Date();
  const generatedDate = generatedAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  const clientProfileLink = `${getAdminPortalBaseUrl()}/clients/${clientId}`;
  const subject = `Letter Generated for ${clientName}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Letter Generated for ${escapeHtml(clientName)}</title>
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
    .card {
      background: #f8fafc;
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #00d4ff;
    }
    .card-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-bottom: 15px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
    }
    .detail-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .detail-label {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-align: right;
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
      <h1>Dispute Letter Ready</h1>
      <p>Score Machine</p>
    </div>
    <div class="body-content">
      <div class="greeting">Hey ${escapeHtml(adminFirstName)},</div>
      <div class="text-block">
        A new dispute letter has been successfully generated for <strong>${escapeHtml(clientName)}</strong> inside your account. 
        You can now log in to review the generated letter, confirm the next steps, and decide how you would like to proceed.
      </div>
      
      <div class="card">
        <div class="card-title">Client Details</div>
        <div class="detail-row">
          <div class="detail-label">Client Name:&nbsp;</div>
          <div class="detail-value">${escapeHtml(clientName)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Generated Date:&nbsp;</div>
          <div class="detail-value">${escapeHtml(generatedDate)}</div>
        </div>
      </div>

      <a href="${escapeHtml(clientProfileLink)}" class="action-button">View Client Profile & Letter</a>

      <div class="text-block" style="font-size: 13px; color: #64748b; background: #f1f5f9; padding: 15px; border-radius: 12px;">
        <strong>Note:</strong> Please review the letter before taking any further action to make sure everything looks correct and matches your process. If you have client notifications turned on, your client may also receive a simple notification letting them know that a letter has been generated. You can toggle this setting in your admin dashboard.
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
  const text = `Hey ${adminFirstName},

This is a quick notification to let you know that a letter has been generated for ${clientName} inside your account.

You can now log in to review the generated letter, confirm the next steps, and decide how you would like to proceed with this client.

Client Details:
Client Name: ${clientName}
Generated Date: ${generatedDate}
Client Profile: ${clientProfileLink}

Please review the letter before taking any further action to make sure everything looks correct and matches your process.

If you have client notifications turned on, your client may also receive a simple notification letting them know that a letter has been generated. If you do not want clients receiving these notifications, you can keep that option turned off inside your admin dashboard.

The Score Machine Team`;

  const attachments = await getEmailLogoAttachments();
  const sent = await emailService.sendEmail({
    to: String(record.admin_email),
    subject,
    html,
    text,
    attachments,
    allowDevelopmentFallback: false
  });
  return sent ? { sent: true } : { sent: false, skippedReason: 'smtp_delivery_failed' };
}

export function sendDisputeLetterGeneratedNotificationInBackground(params: {
  clientId: number;
  generatedAt?: Date;
}) {
  void sendDisputeLetterGeneratedNotification(params)
    .then((result) => {
      if (result.sent) {
        console.log(`[DisputeLetterEmail] Sent admin notification for client ${params.clientId}`);
        return;
      }
      console.warn(`[DisputeLetterEmail] Notification not sent for client ${params.clientId}: ${result.skippedReason || 'unknown_reason'}`);
    })
    .catch((error: any) => {
      console.error('[DisputeLetterEmail] Notification failed:', error?.message || error);
    });
}
