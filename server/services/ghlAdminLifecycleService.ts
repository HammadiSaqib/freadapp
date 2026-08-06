import { executeQuery } from '../database/mysqlConfig.js';
import { isGhlAdminLifecycleConfigured, syncGhlAdminLifecycleContact } from './ghlService.js';

type SyncOptions = {
  paymentFailed?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function adminHasPulledReport(userId: number): Promise<boolean> {
  try {
    const rows = await executeQuery(
      `SELECT 1
       FROM credit_report_history crh
       JOIN clients c ON CAST(c.id AS CHAR) = CAST(crh.client_id AS CHAR)
       WHERE c.user_id = ?
         AND LOWER(COALESCE(crh.status, 'completed')) IN ('completed', 'success', 'succeeded')
       LIMIT 1`,
      [userId]
    ) as any[];
    return Array.isArray(rows) && rows.length > 0;
  } catch (error: any) {
    if (error?.code !== 'ER_NO_SUCH_TABLE') {
      console.warn('Unable to check admin credit report history for GHL tags:', error?.message || error);
    }
    return false;
  }
}

export async function syncGhlAdminLifecycleTags(userId: number, options: SyncOptions = {}) {
  if (!Number.isFinite(userId) || userId <= 0 || !isGhlAdminLifecycleConfigured()) {
    return { skipped: true };
  }

  const rows = await executeQuery(
    `SELECT
       u.id, u.email, u.phone, u.first_name, u.last_name, u.company_name,
       u.role, u.created_at, u.last_login,
       s.plan_name, s.status AS subscription_status, s.current_period_end,
       s.cancel_at_period_end, s.cancellation_requested_at,
       (SELECT bt.status
        FROM billing_transactions bt
        WHERE bt.user_id = u.id
        ORDER BY COALESCE(bt.updated_at, bt.created_at) DESC, bt.id DESC
        LIMIT 1) AS latest_payment_status
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  ) as any[];

  const admin = Array.isArray(rows) ? rows[0] : null;
  if (!admin || String(admin.role || '').toLowerCase() !== 'admin') {
    return { skipped: true, reason: 'not_admin' };
  }

  const now = Date.now();
  const lastLogin = asDate(admin.last_login);
  const createdAt = asDate(admin.created_at);
  const inactivityAnchor = lastLogin || createdAt;
  const noLoginFor30Days = Boolean(inactivityAnchor && now - inactivityAnchor.getTime() >= 30 * DAY_MS);
  const subscriptionStatus = String(admin.subscription_status || '').toLowerCase();
  const periodEnd = asDate(admin.current_period_end);
  const canceled = subscriptionStatus === 'canceled'
    || Boolean(admin.cancel_at_period_end)
    || Boolean(admin.cancellation_requested_at);
  const pastDue = ['past_due', 'unpaid', 'incomplete', 'expired'].includes(subscriptionStatus)
    || Boolean(periodEnd && periodEnd.getTime() < now && !canceled);
  const hasPulledReport = await adminHasPulledReport(userId);
  const paymentFailed = typeof options.paymentFailed === 'boolean'
    ? options.paymentFailed
    : String(admin.latest_payment_status || '').toLowerCase() === 'failed'
      || ['past_due', 'unpaid'].includes(subscriptionStatus);

  const desiredTags: string[] = [];
  const planName = String(admin.plan_name || '').trim();
  if (planName) desiredTags.push(`(${planName}) Purchased`);
  if (canceled) desiredTags.push('TSM-Canceled');
  if (pastDue) desiredTags.push('TSM-Pastdue');
  if (noLoginFor30Days) desiredTags.push('TSM-No-Login-30-Days');
  if (!hasPulledReport) desiredTags.push('tsm-no-report-pull');
  if (paymentFailed) desiredTags.push('tsm-payment-failed');

  return syncGhlAdminLifecycleContact({
    email: admin.email,
    phone: admin.phone,
    firstName: admin.first_name,
    lastName: admin.last_name,
    companyName: admin.company_name,
    desiredTags
  });
}

class GhlAdminLifecycleScheduler {
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  start() {
    if (this.interval || !isGhlAdminLifecycleConfigured()) return;
    void this.syncAllAdmins();
    this.interval = setInterval(() => void this.syncAllAdmins(), DAY_MS);
    console.log('GHL admin lifecycle tag scheduler started');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async syncAllAdmins() {
    if (this.running) return;
    this.running = true;
    try {
      const admins = await executeQuery("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC") as any[];
      for (const admin of Array.isArray(admins) ? admins : []) {
        try {
          await syncGhlAdminLifecycleTags(Number(admin.id));
        } catch (error: any) {
          console.error('GHL admin lifecycle sync failed:', { userId: admin.id, error: error?.response?.data || error?.message || error });
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error: any) {
      console.error('GHL admin lifecycle scheduler failed:', error?.message || error);
    } finally {
      this.running = false;
    }
  }
}

export const ghlAdminLifecycleScheduler = new GhlAdminLifecycleScheduler();

export function syncGhlAdminLifecycleTagsInBackground(userId: number, options: SyncOptions = {}) {
  void syncGhlAdminLifecycleTags(userId, options).catch((error: any) => {
    console.error('GHL admin lifecycle tag sync failed:', {
      userId,
      error: error?.response?.data || error?.message || error
    });
  });
}
