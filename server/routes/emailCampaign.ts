import { Router } from 'express';
import multer from 'multer';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { emailService } from '../services/emailService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const requireSupportOrSuperAdmin = (req: any, res: any, next: any) => {
  const role = req.user?.role;
  if (role !== 'support' && role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Support or Super Admin role required.' });
  }
  next();
};

const parseCsvLine = (line: string) => {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.use(authenticateToken, requireSupportOrSuperAdmin);

router.get('/recipients', async (req, res) => {
  try {
    const filterRaw = String(req.query.filter || 'all').toLowerCase();
    const filter = filterRaw === 'canceled' ? 'cancelled' : filterRaw;
    const search = String(req.query.search || '').trim();

    let where = "u.role = 'admin' AND u.status != 'deleted'";
    const params: any[] = [];

    if (filter === 'paid') {
      where += " AND s.status = 'active'";
    } else if (filter === 'unpaid') {
      where += " AND (s.status IS NULL OR s.status = '' OR s.status IN ('unpaid', 'past_due', 'incomplete'))";
    } else if (filter === 'cancelled') {
      where += " AND (s.status = 'canceled' OR s.cancel_at_period_end = 1)";
    }

    if (search) {
      where += " AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        s.status as subscription_status,
        s.plan_name,
        s.plan_type,
        s.cancel_at_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ${where}
      ORDER BY u.created_at DESC
    `;

    const rows = await executeQuery<any[]>(query, params);
    const data = rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      subscriptionStatus: row.subscription_status || null,
      planName: row.plan_name || null,
      planType: row.plan_type || null,
      cancelAtPeriodEnd: !!row.cancel_at_period_end
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching email campaign recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ error: 'CSV is empty' });
    }

    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const emailIndex = header.indexOf('email');
    const startIndex = emailIndex >= 0 ? 1 : 0;
    const unique = new Set<string>();
    let invalidCount = 0;

    for (let i = startIndex; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      const emailRaw = (emailIndex >= 0 ? cols[emailIndex] : cols[0] || '').trim().toLowerCase();
      if (!emailRaw) {
        continue;
      }
      if (!isValidEmail(emailRaw)) {
        invalidCount += 1;
        continue;
      }
      unique.add(emailRaw);
    }

    res.json({ success: true, emails: Array.from(unique), invalidCount, total: lines.length - startIndex });
  } catch (error: any) {
    console.error('Error importing email list:', error);
    res.status(500).json({ error: 'Failed to import email list' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { subject, html, text, recipients } = req.body || {};
    if (!subject || !html) {
      return res.status(400).json({ error: 'Subject and HTML are required' });
    }

    const list = Array.isArray(recipients) ? recipients : [];
    const emailList = list
      .map((item: any) => (typeof item === 'string' ? item : item?.email))
      .filter((item: any) => typeof item === 'string')
      .map((item: string) => item.trim().toLowerCase())
      .filter((item: string) => isValidEmail(item));

    const uniqueEmails = Array.from(new Set(emailList));
    if (uniqueEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipients provided' });
    }

    const results = await Promise.all(
      uniqueEmails.map(async (email) => ({
        email,
        success: await emailService.sendEmail({ to: email, subject, html, text })
      }))
    );

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    res.json({ success: true, data: { sent, failed, results } });
  } catch (error: any) {
    console.error('Error sending email campaign:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

export default router;
