import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getAffiliateDashboardPurchasesData,
  getAffiliateDashboardReferralsData,
  getAffiliateDashboardStatsData,
} from './affiliateDashboard.js';
import { SecurityLogger } from '../utils/securityLogger.js';

const router = express.Router();
const securityLogger = new SecurityLogger();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const hasAffiliateColumn = async (columnName: string) => {
  const rows: any[] = await executeQuery(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = ?`,
    [columnName]
  );

  return Number(rows?.[0]?.cnt || 0) > 0;
};

const ensureEliteLandingPageColumn = async () => {
  const hasColumn = await hasAffiliateColumn('elite_landing_page');
  if (hasColumn) {
    return;
  }

  await executeQuery(
    `ALTER TABLE affiliates ADD COLUMN elite_landing_page ENUM('allow','deny') NOT NULL DEFAULT 'deny'`,
    []
  );
};

const normalizeEliteLandingPageValue = (value: any): 'allow' | 'deny' => {
  if (typeof value === 'boolean') {
    return value ? 'allow' : 'deny';
  }

  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'allow' || normalized === 'true' || normalized === '1' || normalized === 'yes'
    ? 'allow'
    : 'deny';
};

const syncAffiliateHierarchyLevels = async (rootAffiliateId: number) => {
  const normalizedRootId = Number(rootAffiliateId);
  if (!Number.isFinite(normalizedRootId) || normalizedRootId <= 0) {
    return;
  }

  const rootRows: any[] = await executeQuery(
    `SELECT a.id, a.parent_affiliate_id, parent.affiliate_level AS parent_level
       FROM affiliates a
       LEFT JOIN affiliates parent ON parent.id = a.parent_affiliate_id
      WHERE a.id = ?
      LIMIT 1`,
    [normalizedRootId]
  );

  if (!rootRows || rootRows.length === 0) {
    return;
  }

  const rootParentId = rootRows[0].parent_affiliate_id != null ? Number(rootRows[0].parent_affiliate_id) : null;
  const rootLevel = rootParentId ? Number(rootRows[0].parent_level || 0) + 1 : 1;
  const queue: Array<{ id: number; level: number }> = [{ id: normalizedRootId, level: Math.max(1, rootLevel) }];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);

    await executeQuery(
      'UPDATE affiliates SET affiliate_level = ?, updated_at = NOW() WHERE id = ?',
      [current.level, current.id]
    );

    const childRows: any[] = await executeQuery(
      'SELECT id FROM affiliates WHERE parent_affiliate_id = ?',
      [current.id]
    );

    for (const child of Array.isArray(childRows) ? childRows : []) {
      const childId = Number(child.id);
      if (Number.isFinite(childId) && !visited.has(childId)) {
        queue.push({ id: childId, level: current.level + 1 });
      }
    }
  }
};

// Middleware to ensure only super admin can access affiliate management
const requireSuperAdminRole = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'super_admin') {
    securityLogger.logSecurityEvent('unauthorized_affiliate_access', {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Access denied. Super admin role required.' });
  }
  next();
};

const requireSuperAdminOrSupport = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'support') {
    securityLogger.logSecurityEvent('unauthorized_affiliate_import_access', {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Access denied. Super admin or Support role required.' });
  }
  next();
};

// GET /api/affiliate-management - Get all affiliates (all for super admin, filtered for regular admin)
router.get('/', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    await ensureEliteLandingPageColumn();

    const adminIdValue = req.user?.role === 'support' ? 2 : req.user.id;
    const userRole = req.user.role;
    let hasReferralSlug = false;
    try {
      const colRes: any[] = await executeQuery(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'referral_slug'`,
        []
      );
      hasReferralSlug = !!colRes && ((colRes[0]?.cnt || 0) > 0);
    } catch {}
    
    let query = `
      SELECT 
        a.id,
        a.admin_id,
        a.parent_affiliate_id,
        a.email,
        a.first_name,
        a.last_name,
        a.company_name,
        a.phone,
        a.address,
        a.city,
        a.state,
        a.zip_code,
        a.logo_url,
        a.commission_rate,
        a.parent_commission_rate,
        a.affiliate_level,
        a.total_earnings,
        a.paid_referrals_count,
        a.total_referrals,
        a.status,
        a.email_verified,
        a.last_login,
        a.bank_name,
        a.account_holder_name,
        a.account_number,
        a.routing_number,
        a.account_type,
        a.swift_code,
        a.iban,
        a.bank_address,
        a.payment_method,
        a.paypal_email,
        a.stripe_account_id,
        a.elite_landing_page,
        a.created_at,
        a.updated_at${hasReferralSlug ? ',\n        a.referral_slug' : ''},
        u.email as admin_email,
        u.first_name as admin_first_name,
        u.last_name as admin_last_name,
        pa.first_name as parent_first_name,
        pa.last_name as parent_last_name,
        pa.email as parent_email,
        COALESCE(acsum.total_commission, 0) - COALESCE(cpsum.total_paid, 0) AS computed_total_earnings,
        COALESCE(pfrsum.paid_referrals_count, a.paid_referrals_count) AS computed_paid_referrals_count,
        COALESCE(rfsum.total_referrals, a.total_referrals) AS computed_total_referrals
      FROM affiliates a
      LEFT JOIN users u ON a.admin_id = u.id
      LEFT JOIN affiliates pa ON a.parent_affiliate_id = pa.id
      LEFT JOIN (
        SELECT affiliate_id, SUM(commission_amount) AS total_commission
        FROM affiliate_commissions
        GROUP BY affiliate_id
      ) acsum ON acsum.affiliate_id = a.id
      LEFT JOIN (
        SELECT affiliate_id, SUM(amount) AS total_paid
        FROM commission_payments
        WHERE status = 'completed'
        GROUP BY affiliate_id
      ) cpsum ON cpsum.affiliate_id = a.id
      LEFT JOIN (
        SELECT affiliate_id, COUNT(*) AS paid_referrals_count
        FROM affiliate_referrals
        WHERE status = 'paid'
        GROUP BY affiliate_id
      ) pfrsum ON pfrsum.affiliate_id = a.id
      LEFT JOIN (
        SELECT affiliate_id, COUNT(*) AS total_referrals
        FROM affiliate_referrals
        GROUP BY affiliate_id
      ) rfsum ON rfsum.affiliate_id = a.id
    `;
    
    let queryParams = [];
    
    // Super admin can see all affiliates, regular admin only sees their own
    if (userRole !== 'super_admin') {
      query += ' WHERE a.admin_id = ?';
      queryParams.push(adminIdValue);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const affiliates = await executeQuery(query, queryParams);
    
    // Transform data to match frontend interface
    const transformedAffiliates = affiliates.map((affiliate: any) => ({
      id: affiliate.id,
      admin_id: affiliate.admin_id,
      parent_affiliate_id: affiliate.parent_affiliate_id,
      email: affiliate.email,
      first_name: affiliate.first_name,
      last_name: affiliate.last_name,
      company_name: affiliate.company_name,
      phone: affiliate.phone,
      address: affiliate.address,
      city: affiliate.city,
      state: affiliate.state,
      zip_code: affiliate.zip_code,
      logo_url: affiliate.logo_url,
      commission_rate: parseFloat(affiliate.commission_rate) || 0,
      parent_commission_rate: parseFloat(affiliate.parent_commission_rate) || 0,
      affiliate_level: parseInt(affiliate.affiliate_level) || 1,
      total_earnings: (affiliate.computed_total_earnings != null
        ? parseFloat(affiliate.computed_total_earnings)
        : parseFloat(affiliate.total_earnings)) || 0,
      paid_referrals_count: (affiliate.computed_paid_referrals_count != null
        ? parseInt(affiliate.computed_paid_referrals_count)
        : parseInt(affiliate.paid_referrals_count)) || 0,
      total_referrals: (affiliate.computed_total_referrals != null
        ? parseInt(affiliate.computed_total_referrals)
        : parseInt(affiliate.total_referrals)) || 0,
      status: affiliate.status,
      email_verified: affiliate.email_verified || false,
      last_login: affiliate.last_login,
      bank_name: affiliate.bank_name,
      account_holder_name: affiliate.account_holder_name,
      account_number: affiliate.account_number,
      routing_number: affiliate.routing_number,
      account_type: affiliate.account_type,
      swift_code: affiliate.swift_code,
      iban: affiliate.iban,
      bank_address: affiliate.bank_address,
      payment_method: affiliate.payment_method,
      paypal_email: affiliate.paypal_email,
      stripe_account_id: affiliate.stripe_account_id,
      elite_landing_page: affiliate.elite_landing_page || 'deny',
      created_at: affiliate.created_at,
      updated_at: affiliate.updated_at,
      referral_slug: hasReferralSlug ? affiliate.referral_slug : undefined,
      parent_info: affiliate.parent_first_name ? {
        first_name: affiliate.parent_first_name,
        last_name: affiliate.parent_last_name,
        email: affiliate.parent_email
      } : null
    }));
    
    res.json({ success: true, data: transformedAffiliates });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    securityLogger.logSecurityEvent('affiliate_fetch_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to fetch affiliates' });
  }
});

router.post('/import', authenticateToken, requireSuperAdminOrSupport, upload.single('file'), async (req, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const adminId = (req as any).user.id;
    const adminIdValue = (req as any).user.role === 'support' ? 2 : adminId;
    const content = (req as any).file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV has no data' });
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);

    let inserted = 0;
    let updated = 0;
    const errors: { line: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < raw.length; c++) {
        const ch = raw[c];
        if (ch === '"') {
          if (inQuotes && raw[c + 1] === '"') { current += '"'; c++; } else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          cols.push(current); current = '';
        } else { current += ch; }
      }
      cols.push(current);

      const get = (name: string, fallbackIndex?: number) => {
        const j = idx(name);
        if (j >= 0) return cols[j];
        if (typeof fallbackIndex === 'number' && fallbackIndex < cols.length) return cols[fallbackIndex];
        return '';
      };

      const nameRaw = get('affiliate name', 0).trim();
      const passwordRaw = get('password', 1).trim();
      const phoneRaw = get('phone', 2).trim();
      const emailRaw = get('email', 3).trim().toLowerCase();

      if (!emailRaw) {
        errors.push({ line: i + 1, message: 'Missing email' });
        continue;
      }
      if (!passwordRaw) {
        errors.push({ line: i + 1, message: 'Missing password' });
        continue;
      }

      const nameParts = nameRaw.split(' ').filter(Boolean);
      const firstName = nameParts.length > 0 ? nameParts.slice(0, -1).join(' ') || nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(passwordRaw, saltRounds);

      const existing = await executeQuery('SELECT id FROM affiliates WHERE email = ?', [emailRaw]);
      if (existing.length > 0) {
        const affiliateId = existing[0].id;
        await executeQuery(
          'UPDATE affiliates SET first_name = ?, last_name = ?, phone = ?, password_hash = ?, updated_at = NOW() WHERE id = ?',
          [firstName || null, lastName || null, phoneRaw || null, hashedPassword, affiliateId]
        );
        updated += 1;
        continue;
      }

      const result = await executeQuery(
        'INSERT INTO affiliates (admin_id, email, password_hash, first_name, last_name, phone, commission_rate, parent_commission_rate, affiliate_level, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active", NOW(), NOW())',
        [adminIdValue, emailRaw, hashedPassword, firstName || null, lastName || null, phoneRaw || null, 10.0, 5.0, 1]
      );
      if ((result as any).insertId) inserted += 1;
    }

    securityLogger.logSecurityEvent('affiliate_csv_import', {
      adminId,
      inserted,
      updated,
      errors: errors.length,
      ip: (req as any).ip
    });

    res.json({ message: 'Import completed', inserted, updated, errors });
  } catch (error: any) {
    console.error('Error importing affiliates:', error);
    securityLogger.logSecurityEvent('affiliate_csv_import_error', {
      userId: (req as any).user?.id,
      error: error.message,
      ip: (req as any).ip
    });
    res.status(500).json({ error: 'Failed to import affiliates' });
  }
});

// POST /api/affiliate-management - Create new affiliate
router.post('/', authenticateToken, requireSuperAdminOrSupport, async (req, res) => {
  try {
    await ensureEliteLandingPageColumn();

    const adminId = req.user.id;
    const adminIdValue = req.user?.role === 'support' ? 2 : req.user.id;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const firstName = String(req.body?.firstName ?? req.body?.first_name ?? '').trim();
    const lastName = String(req.body?.lastName ?? req.body?.last_name ?? '').trim();
    const companyName = String(req.body?.companyName ?? req.body?.company_name ?? '').trim();
    const phone = String(req.body?.phone || '').trim();
    const commissionRate = Number(req.body?.commissionRate ?? req.body?.commission_rate ?? 10);
    const parentAffiliateId = req.body?.parentAffiliateId ?? req.body?.parent_affiliate_id ?? null;
    const parentCommissionRate = Number(req.body?.parentCommissionRate ?? req.body?.parent_commission_rate ?? 5);
    const password = String(req.body?.password || '').trim();
    const status = String(req.body?.status || 'active').trim().toLowerCase();
    const eliteLandingPage = normalizeEliteLandingPageValue(
      req.body?.eliteLandingPage ?? req.body?.elite_landing_page ?? req.body?.allowEliteLandingPage
    );
    const safeStatus = ['active', 'inactive', 'pending', 'suspended'].includes(status) ? status : 'active';
    
    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if email already exists in affiliates table
    const existingAffiliate = await executeQuery(
      'SELECT id FROM affiliates WHERE email = ?',
      [email]
    );
    
    if (existingAffiliate.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Validate parent affiliate if provided
    let affiliateLevel = 1;
    if (parentAffiliateId) {
      const parentAffiliate = await executeQuery(
        'SELECT id, affiliate_level FROM affiliates WHERE id = ? AND status = "active"',
        [parentAffiliateId]
      );
      
      if (parentAffiliate.length === 0) {
        return res.status(400).json({ error: 'Invalid parent affiliate ID' });
      }
      
      affiliateLevel = parentAffiliate[0].affiliate_level + 1;
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create affiliate
    const insertQuery = `
      INSERT INTO affiliates (
        admin_id, parent_affiliate_id, email, password_hash, first_name, last_name, 
        company_name, phone, commission_rate, parent_commission_rate, affiliate_level,
        elite_landing_page, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const result = await executeQuery(insertQuery, [
      adminIdValue,
      parentAffiliateId || null,
      email,
      hashedPassword,
      firstName,
      lastName,
      companyName || null,
      phone || null,
      commissionRate || 10.0, // Default 10% commission
      parentCommissionRate || 5.0, // Default 5% parent commission
      affiliateLevel,
      eliteLandingPage,
      safeStatus
    ]);
    
    // Log security event
    securityLogger.logSecurityEvent('affiliate_created', {
      createdBy: adminId,
      affiliateId: result.insertId,
      affiliateEmail: email,
      parentAffiliateId: parentAffiliateId || null,
      affiliateLevel: affiliateLevel,
      ip: req.ip
    });
    
    res.status(201).json({
      success: true,
      message: 'Affiliate created successfully',
      affiliateId: result.insertId
    });
  } catch (error) {
    console.error('Error creating affiliate:', error);
    securityLogger.logSecurityEvent('affiliate_creation_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to create affiliate' });
  }
});

// PUT /api/affiliate-management/:id - Update affiliate
router.put('/:id', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    await ensureEliteLandingPageColumn();

    const adminId = req.user.id;
    const affiliateId = req.params.id.replace('AFF-', ''); // Remove prefix
    const firstName = String(req.body?.firstName ?? req.body?.first_name ?? '').trim();
    const lastName = String(req.body?.lastName ?? req.body?.last_name ?? '').trim();
    const companyName = String(req.body?.companyName ?? req.body?.company_name ?? '').trim();
    const phone = String(req.body?.phone || '').trim();
    const commissionRate = Number(req.body?.commissionRate ?? req.body?.commission_rate ?? 0);
    const status = String(req.body?.status || 'inactive').trim().toLowerCase();
    const bank_name = req.body?.bank_name ?? null;
    const account_holder_name = req.body?.account_holder_name ?? null;
    const account_number = req.body?.account_number ?? null;
    const routing_number = req.body?.routing_number ?? null;
    const account_type = req.body?.account_type ?? null;
    const swift_code = req.body?.swift_code ?? null;
    const iban = req.body?.iban ?? null;
    const bank_address = req.body?.bank_address ?? null;
    const payment_method = req.body?.payment_method ?? 'bank_transfer';
    const paypal_email = req.body?.paypal_email ?? null;
    const stripe_account_id = req.body?.stripe_account_id ?? null;
    const eliteLandingPage = normalizeEliteLandingPageValue(
      req.body?.eliteLandingPage ?? req.body?.elite_landing_page ?? req.body?.allowEliteLandingPage
    );
    const safeStatus = ['active', 'inactive', 'pending', 'suspended'].includes(status) ? status : 'inactive';
    
    // Verify affiliate exists
    const existingAffiliate = await executeQuery(
      'SELECT id, admin_id FROM affiliates WHERE id = ?',
      [affiliateId]
    );
    
    if (existingAffiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    // Update affiliate
    const updateQuery = `
      UPDATE affiliates 
      SET 
        first_name = ?,
        last_name = ?,
        company_name = ?,
        phone = ?,
        commission_rate = ?,
        status = ?,
        bank_name = ?,
        account_holder_name = ?,
        account_number = ?,
        routing_number = ?,
        account_type = ?,
        swift_code = ?,
        iban = ?,
        bank_address = ?,
        payment_method = ?,
        paypal_email = ?,
        stripe_account_id = ?,
        elite_landing_page = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      firstName,
      lastName,
      companyName,
      phone,
      commissionRate,
      status,
      bank_name || null,
      account_holder_name || null,
      account_number || null,
      routing_number || null,
      account_type || null,
      swift_code || null,
      iban || null,
      bank_address || null,
      payment_method || 'bank_transfer',
      paypal_email || null,
      stripe_account_id || null,
      eliteLandingPage,
      affiliateId
    ]);
    
    // Log security event
    securityLogger.logSecurityEvent('affiliate_updated', {
      updatedBy: adminId,
      affiliateId,
      ip: req.ip
    });
    
    res.json({ success: true, message: 'Affiliate updated successfully' });
  } catch (error) {
    console.error('Error updating affiliate:', error);
    securityLogger.logSecurityEvent('affiliate_update_error', {
      userId: req.user?.id,
      affiliateId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to update affiliate' });
  }
});

router.put('/:id/referrer', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const updatedBy = req.user.id;
    const affiliateId = Number(String(req.params.id).replace('AFF-', ''));
    const parentAffiliateId = Number(req.body?.parentAffiliateId ?? req.body?.parent_affiliate_id);

    if (!Number.isFinite(affiliateId) || affiliateId <= 0) {
      return res.status(400).json({ error: 'Valid affiliate ID is required' });
    }

    if (!Number.isFinite(parentAffiliateId) || parentAffiliateId <= 0) {
      return res.status(400).json({ error: 'Valid parent affiliate ID is required' });
    }

    if (affiliateId === parentAffiliateId) {
      return res.status(400).json({ error: 'An affiliate cannot refer itself' });
    }

    const affiliateRows: any[] = await executeQuery(
      'SELECT id, parent_affiliate_id FROM affiliates WHERE id = ? LIMIT 1',
      [affiliateId]
    );

    if (!affiliateRows || affiliateRows.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const parentRows: any[] = await executeQuery(
      'SELECT id, first_name, last_name, email, status FROM affiliates WHERE id = ? LIMIT 1',
      [parentAffiliateId]
    );

    if (!parentRows || parentRows.length === 0) {
      return res.status(404).json({ error: 'Parent affiliate not found' });
    }

    if (String(parentRows[0].status || '').toLowerCase() !== 'active') {
      return res.status(400).json({ error: 'Only active affiliates can be assigned as referrers' });
    }

    let currentAncestorId = parentAffiliateId;
    const visited = new Set<number>();
    while (Number.isFinite(currentAncestorId) && currentAncestorId > 0) {
      if (visited.has(currentAncestorId)) {
        break;
      }

      if (currentAncestorId === affiliateId) {
        return res.status(400).json({ error: 'This change would create a referral loop' });
      }

      visited.add(currentAncestorId);

      const ancestorRows: any[] = await executeQuery(
        'SELECT parent_affiliate_id FROM affiliates WHERE id = ? LIMIT 1',
        [currentAncestorId]
      );

      if (!ancestorRows || ancestorRows.length === 0 || ancestorRows[0].parent_affiliate_id == null) {
        break;
      }

      currentAncestorId = Number(ancestorRows[0].parent_affiliate_id);
    }

    await executeQuery(
      'UPDATE affiliates SET parent_affiliate_id = ?, updated_at = NOW() WHERE id = ?',
      [parentAffiliateId, affiliateId]
    );

    await syncAffiliateHierarchyLevels(affiliateId);

    securityLogger.logSecurityEvent('affiliate_referrer_updated', {
      updatedBy,
      affiliateId,
      parentAffiliateId,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        affiliate_id: affiliateId,
        parent_affiliate_id: parentAffiliateId,
        parent_info: {
          first_name: parentRows[0].first_name || null,
          last_name: parentRows[0].last_name || null,
          email: parentRows[0].email || null,
        }
      }
    });
  } catch (error: any) {
    console.error('Error updating affiliate referrer:', error);
    securityLogger.logSecurityEvent('affiliate_referrer_update_error', {
      userId: req.user?.id,
      affiliateId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to update affiliate referrer' });
  }
});

router.delete('/:id/referrer', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const updatedBy = req.user.id;
    const affiliateId = Number(String(req.params.id).replace('AFF-', ''));

    if (!Number.isFinite(affiliateId) || affiliateId <= 0) {
      return res.status(400).json({ error: 'Valid affiliate ID is required' });
    }

    const affiliateRows: any[] = await executeQuery(
      'SELECT id FROM affiliates WHERE id = ? LIMIT 1',
      [affiliateId]
    );

    if (!affiliateRows || affiliateRows.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    await executeQuery(
      'UPDATE affiliates SET parent_affiliate_id = NULL, updated_at = NOW() WHERE id = ?',
      [affiliateId]
    );

    await syncAffiliateHierarchyLevels(affiliateId);

    securityLogger.logSecurityEvent('affiliate_referrer_cleared', {
      updatedBy,
      affiliateId,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        affiliate_id: affiliateId,
        parent_affiliate_id: null,
        parent_info: null,
      }
    });
  } catch (error: any) {
    console.error('Error clearing affiliate referrer:', error);
    securityLogger.logSecurityEvent('affiliate_referrer_clear_error', {
      userId: req.user?.id,
      affiliateId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to clear affiliate referrer' });
  }
});

// DELETE /api/affiliate-management/:id - Deactivate affiliate
router.delete('/:id', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const adminId = req.user.id;
    const affiliateId = req.params.id.replace('AFF-', ''); // Remove prefix
    
    // Verify affiliate exists and belongs to this admin
    const existingAffiliate = await executeQuery(
      'SELECT id, admin_id, email FROM affiliates WHERE id = ? AND admin_id = ?',
      [affiliateId, adminId]
    );
    
    if (existingAffiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or access denied' });
    }
    
    // Soft delete by setting status to inactive
    await executeQuery(
      'UPDATE affiliates SET status = "inactive", updated_at = NOW() WHERE id = ? AND admin_id = ?',
      [affiliateId, adminId]
    );
    
    // Log security event
    securityLogger.logSecurityEvent('affiliate_deactivated', {
      deactivatedBy: adminId,
      affiliateId,
      affiliateEmail: existingAffiliate[0].email,
      ip: req.ip
    });
    
    res.json({ success: true, message: 'Affiliate deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating affiliate:', error);
    securityLogger.logSecurityEvent('affiliate_deactivation_error', {
      userId: req.user?.id,
      affiliateId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to deactivate affiliate' });
  }
});

// POST /api/affiliate-management/:id/toggle-status - Toggle affiliate status
router.post('/:id/toggle-status', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const adminId = req.user.id;
    const affiliateId = req.params.id.replace('AFF-', ''); // Remove prefix
    
    // Get current status
    const affiliate = await executeQuery(
      'SELECT id, status, email FROM affiliates WHERE id = ? AND admin_id = ?',
      [affiliateId, adminId]
    );
    
    if (affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or access denied' });
    }
    
    const currentStatus = affiliate[0].status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // Update status
    await executeQuery(
      'UPDATE affiliates SET status = ?, updated_at = NOW() WHERE id = ? AND admin_id = ?',
      [newStatus, affiliateId, adminId]
    );
    
    // Log security event
    securityLogger.logSecurityEvent('affiliate_status_toggled', {
      toggledBy: adminId,
      affiliateId,
      affiliateEmail: affiliate[0].email,
      oldStatus: currentStatus,
      newStatus,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: `Affiliate ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      newStatus
    });
  } catch (error) {
    console.error('Error toggling affiliate status:', error);
    securityLogger.logSecurityEvent('affiliate_status_toggle_error', {
      userId: req.user?.id,
      affiliateId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to toggle affiliate status' });
  }
});

// GET /api/affiliate-management/:id/dashboard-summary - Get the exact dashboard-visible summary for an affiliate
router.get('/:id/dashboard-summary', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const affiliateId = Number(String(req.params.id || '').replace('AFF-', ''));
    if (!Number.isFinite(affiliateId) || affiliateId <= 0) {
      return res.status(400).json({ error: 'Invalid affiliate id' });
    }

    const verifyResult = await executeQuery('SELECT id FROM affiliates WHERE id = ?', [affiliateId]);
    if (!verifyResult || verifyResult.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Use the same data sources as the affiliate dashboard, but with NO row limit for accurate counts
    const [dashboardStats, dashboardPurchases, statusCountRows] = await Promise.all([
      getAffiliateDashboardStatsData(affiliateId),
      getAffiliateDashboardPurchasesData(affiliateId),
      // Direct count query matching the exact same CASE logic as the affiliate /referrals endpoint — no LIMIT
      executeQuery(`
        SELECT
          COUNT(*) as total_count,
          SUM(CASE
            WHEN u.status = 'inactive' THEN 1
            WHEN s.status IN ('canceled') THEN 1
            ELSE 0
          END) as cancelled_count,
          SUM(CASE
            WHEN u.status != 'inactive' AND (s.status IS NULL OR s.status NOT IN ('canceled'))
              AND s.status IN ('unpaid','past_due','incomplete') THEN 1
            ELSE 0
          END) as unpaid_count,
          SUM(CASE
            WHEN u.status != 'inactive'
              AND (s.status IS NULL OR s.status NOT IN ('canceled','unpaid','past_due','incomplete'))
              AND (
                ac.latest_status IN ('paid','settled','approved') OR ac.payment_date IS NOT NULL
                OR ar.status IN ('approved','converted','paid')
              ) THEN 1
            ELSE 0
          END) as paid_count,
          SUM(CASE
            WHEN u.status != 'inactive'
              AND (s.status IS NULL OR s.status NOT IN ('canceled','unpaid','past_due','incomplete'))
              AND (ac.latest_status IS NULL OR ac.latest_status NOT IN ('paid','settled','approved'))
              AND ac.payment_date IS NULL
              AND (ar.status IS NULL OR ar.status NOT IN ('approved','converted','paid'))
            THEN 1
            ELSE 0
          END) as pending_count
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN (
          SELECT
            referral_id,
            affiliate_id,
            SUM(commission_amount) AS total_commission,
            MAX(status) AS latest_status,
            MAX(payment_date) AS payment_date
          FROM affiliate_commissions
          GROUP BY referral_id, affiliate_id
        ) ac ON ar.id = ac.referral_id AND ac.affiliate_id = ?
        WHERE ar.affiliate_id = ?
      `, [affiliateId, affiliateId]),
    ]);

    const purchaseRows = Array.isArray(dashboardPurchases?.data) ? dashboardPurchases.data : [];

    const counts = statusCountRows?.[0] || {};
    const totalReferralCount = Number(counts.total_count) || 0;
    const paidReferralCount = Number(counts.paid_count) || 0;
    const unpaidReferralCount = Number(counts.unpaid_count) || 0;
    const cancelledReferralCount = Number(counts.cancelled_count) || 0;
    const pendingReferralCount = Number(counts.pending_count) || 0;

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const totalCommissionEarned = purchaseRows.reduce((sum: number, row: any) => sum + (Number(row.commissionEarned) || 0), 0);
    const monthlyCommissionEarned = purchaseRows
      .filter((row: any) => new Date(row.createdAt) >= currentMonthStart)
      .reduce((sum: number, row: any) => sum + (Number(row.commissionEarned) || 0), 0);
    const effectiveMonthlyEarnings = Math.max(monthlyCommissionEarned, Number(dashboardStats?.monthlyEarnings || 0));

    const totalPayouts = Number(dashboardStats?.totalPayouts || 0);
    const pendingPayouts = purchaseRows.length > 0
      ? Number(Math.max(totalCommissionEarned - totalPayouts, 0).toFixed(2))
      : Number(Math.max((dashboardStats?.totalEarnings || 0) - totalPayouts, 0).toFixed(2));

    res.json({
      success: true,
      data: {
        totalAllTimeReferrals: totalReferralCount,
        activeClients: paidReferralCount,
        unpaidClients: unpaidReferralCount,
        cancelledClients: cancelledReferralCount,
        pendingClients: pendingReferralCount,
        monthlyEarnings: Number(effectiveMonthlyEarnings.toFixed(2)),
        allTimeEarnings: purchaseRows.length > 0 ? Number(totalCommissionEarned.toFixed(2)) : Number(dashboardStats?.totalEarnings || 0),
        totalPayouts: totalPayouts,
        pendingPayouts: pendingPayouts,
        lastPayoutDate: dashboardStats?.lastPayoutDate || null,
        currentMRR: Number(dashboardStats?.currentMRR || 0),
      }
    });
  } catch (error: any) {
    console.error('Error fetching affiliate dashboard parity summary:', error);
    if (error?.code === 'AFFILIATE_NOT_FOUND') {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    res.status(500).json({ error: 'Failed to fetch affiliate dashboard summary' });
  }
});

// GET /api/affiliate-management/:id/dashboard-referrals - Get the same referral rows used by the affiliate dashboard/referrals view
router.get('/:id/dashboard-referrals', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const affiliateId = Number(String(req.params.id || '').replace('AFF-', ''));
    if (!Number.isFinite(affiliateId) || affiliateId <= 0) {
      return res.status(400).json({ error: 'Invalid affiliate id' });
    }

    const verifyResult = await executeQuery('SELECT id FROM affiliates WHERE id = ?', [affiliateId]);
    if (!verifyResult || verifyResult.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const batchLimit = 100;
    const maxPages = 1000;
    const allRows: any[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await getAffiliateDashboardReferralsData(affiliateId, page, batchLimit);
      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      allRows.push(...batch);

      if (batch.length < batchLimit) {
        break;
      }
    }

    const rows = Array.from(
      new Map(allRows.map((row: any) => [String(row?.id ?? ''), row])).values()
    ).filter((row: any) => String(row?.id ?? '') !== '');

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching affiliate dashboard parity referrals:', error);
    if (error?.code === 'AFFILIATE_NOT_FOUND') {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    res.status(500).json({ error: 'Failed to fetch affiliate dashboard referrals' });
  }
});

// GET /api/affiliate-management/:id/referrals - Get affiliate referrals
router.get('/:id/referrals', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const adminId = req.user.id;
    const userRole = req.user.role;
    const affiliateId = req.params.id.replace('AFF-', ''); // Remove prefix
    
    // Verify affiliate exists; super_admin can view any affiliate
    let verifyQuery = 'SELECT id FROM affiliates WHERE id = ?';
    const verifyParams: any[] = [affiliateId];
    if (userRole !== 'super_admin') {
      verifyQuery += ' AND admin_id = ?';
      verifyParams.push(adminId);
    }
    const affiliate = await executeQuery(verifyQuery, verifyParams);
    
    if (affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or access denied' });
    }
    
    // Get referrals with subscription status and Stripe data
    const referralsQuery = `
      SELECT
        ar.id,
        ar.referred_user_id,
        ar.commission_amount,
        ar.status as commission_status,
        ar.referral_date,
        ar.conversion_date,
        ar.notes,
        u.email as referred_user_email,
        u.first_name as referred_user_first_name,
        u.last_name as referred_user_last_name,
        u.status as user_status,
        s.status as subscription_status,
        s.stripe_subscription_id,
        s.plan_name as subscription_plan_name,
        s.plan_type as subscription_plan_type,
        s.current_period_end,
        (
          SELECT bt.plan_name
          FROM billing_transactions bt
          WHERE bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC
          LIMIT 1
        ) AS plan_name,
        (
          SELECT bt.plan_type
          FROM billing_transactions bt
          WHERE bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC
          LIMIT 1
        ) AS plan_type,
        (
          SELECT bt.amount
          FROM billing_transactions bt
          WHERE bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC
          LIMIT 1
        ) AS plan_price,
        (
          SELECT MAX(bt.created_at)
          FROM billing_transactions bt
          WHERE bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
        ) AS last_payment_date,
        (
          SELECT bt.stripe_payment_intent_id
          FROM billing_transactions bt
          WHERE bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC LIMIT 1
        ) AS stripe_transaction_id
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ar.affiliate_id = ?
      ORDER BY ar.referral_date DESC
    `;

    const referrals = await executeQuery(referralsQuery, [affiliateId]);

    // Transform to include payment state
    const transformedReferrals = (referrals as any[]).map((r: any) => {
      const subStatus = String(r.subscription_status || '').toLowerCase();
      const userStatus = String(r.user_status || '').toLowerCase();

      let payment_state = 'pending';
      if (subStatus === 'active') payment_state = 'active';
      else if (['unpaid', 'past_due', 'incomplete'].includes(subStatus)) payment_state = 'unpaid';
      else if (['canceled', 'cancelled'].includes(subStatus)) payment_state = 'cancelled';
      else if (userStatus === 'inactive') payment_state = 'churned';

      return {
        ...r,
        payment_state,
        is_stripe_paid: subStatus === 'active',
        plan_price: r.plan_price ? parseFloat(r.plan_price) : null,
        last_payment_date: r.last_payment_date || null,
        stripe_transaction_id: r.stripe_transaction_id || null,
      };
    });

    res.json({ success: true, data: transformedReferrals });
  } catch (error) {
    console.error('Error fetching affiliate referrals:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate referrals' });
  }
});

// GET /api/affiliate-management/:id/earnings/monthly - Get current month's earnings for an affiliate
router.get('/:id/earnings/monthly', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const adminId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const affiliateId = String(req.params.id).replace('AFF-', '');

    // Verify affiliate exists; super_admin can view any affiliate
    let verifyQuery = 'SELECT id FROM affiliates WHERE id = ?';
    const verifyParams: any[] = [affiliateId];
    if (userRole !== 'super_admin') {
      verifyQuery += ' AND admin_id = ?';
      verifyParams.push(adminId);
    }
    const affiliate = await executeQuery(verifyQuery, verifyParams);

    if (!affiliate || affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or access denied' });
    }

    const monthlyEarningsQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as monthly_earnings
      FROM affiliate_commissions 
      WHERE affiliate_id = ? 
        AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND status IN ('paid','pending')
    `;

    const result = await executeQuery(monthlyEarningsQuery, [affiliateId]);
    const monthly_earnings = Number(result?.[0]?.monthly_earnings || 0);

    res.json({ success: true, data: { monthly_earnings } });
  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    res.status(500).json({ error: 'Failed to fetch monthly earnings' });
  }
});

// GET /api/affiliate-management/:id/stats - Get extended stats cards for affiliate profile
router.get('/:id/stats', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const affiliateId = String(req.params.id).replace('AFF-', '');

    const verifyResult = await executeQuery('SELECT id FROM affiliates WHERE id = ?', [affiliateId]);
    if (!verifyResult || verifyResult.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // All referrals with subscription / payment state
    const referralsQuery = `
      SELECT
        ar.id,
        s.status as subscription_status,
        u.status as user_status,
        (
          SELECT bt.amount FROM billing_transactions bt
          WHERE bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC LIMIT 1
        ) AS last_plan_price,
        ar.commission_amount
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ar.affiliate_id = ?
    `;

    // All-time commissions earned (paid only, net of cancellations — matches dashboard logic)
    const earningsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END),0) AS all_time_paid,
        COALESCE(SUM(CASE WHEN status IN ('cancelled','refunded','chargeback') THEN commission_amount ELSE 0 END),0) AS all_time_cancelled,
        COALESCE(SUM(CASE WHEN status IN ('pending','approved','paid') AND COALESCE(order_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') THEN commission_amount ELSE 0 END),0) AS monthly_earnings
      FROM affiliate_commissions
      WHERE affiliate_id = ?
    `;

    // Total already paid out (check both commission_payments and affiliate_payouts)
    const payoutsQuery = `
      SELECT
        COALESCE(
          (SELECT SUM(amount) FROM commission_payments WHERE affiliate_id = ? AND status = 'completed'),
          0
        ) +
        COALESCE(
          (SELECT SUM(amount) FROM affiliate_payouts WHERE affiliate_id = ? AND status = 'paid'),
          0
        ) AS total_payouts,
        GREATEST(
          COALESCE((SELECT MAX(payment_date) FROM commission_payments WHERE affiliate_id = ? AND status = 'completed'), '1970-01-01'),
          COALESCE((SELECT MAX(paid_at) FROM affiliate_payouts WHERE affiliate_id = ? AND status = 'paid'), '1970-01-01')
        ) AS last_payout_date
    `;

    const [referralsRaw, earningsRaw, payoutsRaw, activePayingResult, unpaidClientsResult, cancelledClientsResult] = await Promise.all([
      executeQuery(referralsQuery, [affiliateId]),
      executeQuery(earningsQuery, [affiliateId]),
      executeQuery(payoutsQuery, [affiliateId, affiliateId, affiliateId, affiliateId]),
      executeQuery(`
        SELECT COUNT(DISTINCT ar.id) as active_paying
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE ar.affiliate_id = ? AND s.status = 'active'
      `, [affiliateId]),
      executeQuery(`
        SELECT COUNT(DISTINCT ar.id) as unpaid_clients
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE ar.affiliate_id = ? AND s.status IN ('unpaid', 'past_due', 'incomplete')
      `, [affiliateId]),
      executeQuery(`
        SELECT COUNT(DISTINCT ar.id) as cancelled_clients
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE ar.affiliate_id = ?
          AND (
            s.status IN ('canceled', 'cancelled')
            OR (u.status = 'inactive' AND (s.status IS NULL OR s.status != 'active'))
          )
      `, [affiliateId]),
    ]);

    const activeClients = parseInt((activePayingResult as any[])[0]?.active_paying) || 0;
    const unpaidClients = parseInt((unpaidClientsResult as any[])[0]?.unpaid_clients) || 0;
    const cancelledClients = parseInt((cancelledClientsResult as any[])[0]?.cancelled_clients) || 0;

    // Calculate MRR from active clients
    let currentMRR = 0;
    (referralsRaw as any[]).forEach((r: any) => {
      const subStatus = String(r.subscription_status || '').toLowerCase();
      const planPrice = parseFloat(r.last_plan_price || 0);
      if (subStatus === 'active') {
        currentMRR += planPrice;
      }
    });

    const allTimePaid = parseFloat((earningsRaw as any[])[0]?.all_time_paid || 0);
    const allTimeCancelled = parseFloat((earningsRaw as any[])[0]?.all_time_cancelled || 0);
    const allTimeEarnings = allTimePaid - allTimeCancelled;
    const monthlyEarningsFromCommissions = parseFloat((earningsRaw as any[])[0]?.monthly_earnings || 0);
    const totalPayouts = parseFloat((payoutsRaw as any[])[0]?.total_payouts || 0);
    const rawPayoutDate = (payoutsRaw as any[])[0]?.last_payout_date;
    const lastPayoutDate = (rawPayoutDate && rawPayoutDate !== '1970-01-01' && rawPayoutDate !== '1970-01-01 00:00:00') ? rawPayoutDate : null;

    // Get affiliate commission rate
    const affiliateRow = await executeQuery('SELECT commission_rate FROM affiliates WHERE id = ?', [affiliateId]);
    const affCommissionRate = parseFloat((affiliateRow as any[])[0]?.commission_rate) || 10;

    // Calculate real monthly earnings from billing transactions of referrals this month
    const monthlyBillingQuery = `
      SELECT COALESCE(SUM(bt.amount), 0) AS total_referral_revenue_this_month
      FROM billing_transactions bt
      JOIN affiliate_referrals ar ON bt.user_id = ar.referred_user_id
      WHERE ar.affiliate_id = ?
        AND bt.status = 'succeeded'
        AND bt.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
    `;
    const monthlyBillingResult = await executeQuery(monthlyBillingQuery, [affiliateId]);
    const totalReferralRevenueThisMonth = parseFloat((monthlyBillingResult as any[])[0]?.total_referral_revenue_this_month) || 0;
    const realMonthlyEarnings = (totalReferralRevenueThisMonth * affCommissionRate) / 100;
    const monthlyEarnings = Math.max(monthlyEarningsFromCommissions, realMonthlyEarnings);

    // Get fresh total referrals count from source table (avoids duplicates from JOINs)
    const freshTotalResult = await executeQuery(
      'SELECT COUNT(*) as total_referrals_count FROM affiliate_referrals WHERE affiliate_id = ?',
      [affiliateId]
    );
    const totalAllTimeReferrals = parseInt((freshTotalResult as any[])[0]?.total_referrals_count) || 0;

    res.json({
      success: true,
      data: {
        totalAllTimeReferrals,
        activeClients,
        unpaidClients,
        cancelledClients,
        monthlyEarnings,
        allTimeEarnings,
        totalPayouts,
        lastPayoutDate,
        currentMRR,
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate stats' });
  }
});

// GET /api/affiliate-management/:id/referrals/child - Get affiliate override referrals for super admin
router.get('/:id/referrals/child', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const affiliateId = String(req.params.id).replace('AFF-', '');

    const verifyResult = await executeQuery('SELECT id FROM affiliates WHERE id = ?', [affiliateId]);
    if (!verifyResult || verifyResult.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const summaryQuery = `
      SELECT
        COUNT(*) as total_referrals,
        COALESCE(SUM(ac.commission_amount), 0) +
        COALESCE(SUM(CASE
          WHEN ac.id IS NULL AND child.parent_commission_rate > 0 AND ar.commission_rate > 0
            THEN (ar.commission_amount * child.parent_commission_rate / ar.commission_rate)
          ELSE 0
        END), 0) as total_commission
      FROM affiliate_referrals ar
      JOIN affiliates child ON child.id = ar.affiliate_id
      LEFT JOIN affiliate_commissions ac ON ac.referral_id = ar.id AND ac.affiliate_id = ?
      WHERE child.parent_affiliate_id = ?
    `;

    const dataQuery = `
      SELECT
        ar.id as referral_id,
        ar.referred_user_id,
        ar.status as referral_status,
        ar.commission_amount as referral_commission_amount,
        ar.commission_rate as referral_commission_rate,
        ar.referral_date,
        ar.conversion_date,
        ar.payment_date,
        child.id as child_affiliate_id,
        child.first_name as child_first_name,
        child.last_name as child_last_name,
        child.email as child_email,
        child.parent_commission_rate as child_parent_commission_rate,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        ac.id as commission_id,
        ac.order_value,
        ac.commission_rate,
        ac.commission_amount,
        ac.status as commission_status,
        ac.product,
        ac.order_date,
        ac.payment_date as commission_payment_date
      FROM affiliate_referrals ar
      JOIN affiliates child ON child.id = ar.affiliate_id
      JOIN users u ON u.id = ar.referred_user_id
      LEFT JOIN affiliate_commissions ac ON ac.referral_id = ar.id AND ac.affiliate_id = ?
      WHERE child.parent_affiliate_id = ?
      ORDER BY COALESCE(ac.order_date, ar.referral_date) DESC
    `;

    const [summaryRows, rows] = await Promise.all([
      executeQuery(summaryQuery, [affiliateId, affiliateId]),
      executeQuery(dataQuery, [affiliateId, affiliateId]),
    ]);

    const summary = {
      totalReferrals: (summaryRows as any[])[0]?.total_referrals || 0,
      totalCommission: parseFloat((summaryRows as any[])[0]?.total_commission) || 0,
    };

    const transformed = (rows as any[]).map((row: any) => {
      const childCommissionRate = parseFloat(row.referral_commission_rate) || 0;
      const childCommissionAmount = parseFloat(row.referral_commission_amount) || 0;
      const childOrderValue = childCommissionRate > 0 ? (childCommissionAmount * 100) / childCommissionRate : 0;
      const fallbackParentRate = parseFloat(row.child_parent_commission_rate) || 0;
      const parentCommissionRate = parseFloat(row.commission_rate) || fallbackParentRate;
      const parentCommissionAmount = parseFloat(row.commission_amount) || (parentCommissionRate > 0 ? (childOrderValue * parentCommissionRate) / 100 : 0);
      const parentOrderValue = parseFloat(row.order_value) || childOrderValue;
      const normalizedReferralStatus = String(row.referral_status || '').toLowerCase();
      const normalizedCommissionStatus = String(row.commission_status || '').toLowerCase();
      const status =
        normalizedReferralStatus === 'paid' || normalizedCommissionStatus === 'paid'
          ? 'paid'
          : normalizedReferralStatus === 'approved' || normalizedCommissionStatus === 'approved'
          ? 'approved'
          : row.commission_status || row.referral_status;

      return {
        id: row.commission_id || row.referral_id,
        childAffiliateId: row.child_affiliate_id,
        childAffiliateName:
          `${row.child_first_name || ''} ${row.child_last_name || ''}`.trim() || row.child_email || 'Unknown',
        customerName:
          `${row.customer_first_name || ''} ${row.customer_last_name || ''}`.trim() || 'Unknown',
        customerEmail: row.customer_email || '',
        product: row.product || 'Referral',
        orderValue: parentOrderValue,
        commissionRate: parentCommissionRate,
        commissionAmount: parentCommissionAmount,
        childCommissionRate,
        childCommissionAmount,
        childOrderValue,
        status,
        orderDate: row.order_date || row.referral_date,
        paymentDate: row.commission_payment_date || row.payment_date,
        level: 2,
      };
    });

    res.json({ success: true, data: transformed, summary });
  } catch (error) {
    console.error('Error fetching child affiliate referrals for admin:', error);
    res.status(500).json({ error: 'Failed to fetch child affiliate referrals' });
  }
});

export default router;
