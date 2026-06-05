import express from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { SecurityLogger } from '../utils/securityLogger.js';

const router = express.Router();
const securityLogger = new SecurityLogger();

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

// GET /api/landing/pricing - Get pricing plans with affiliate tracking
router.get('/pricing', async (req, res) => {
  try {
    const { ref } = req.query; // Affiliate referral ID
    const refAffiliateId = (() => {
      const parsed = parseInt(String(ref || ''), 10);
      return Number.isNaN(parsed) ? null : parsed;
    })();

    if (refAffiliateId) {
      securityLogger.logSecurityEvent('affiliate_referral_visit', {
        affiliateId: refAffiliateId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }

    const planRows = await executeQuery(
      `SELECT id, name, description, price, billing_cycle, features, page_permissions, sort_order, max_users, max_clients, max_disputes
       FROM subscription_plans
       WHERE is_active = 1
       ORDER BY sort_order ASC, price ASC`,
      []
    );

    const plans = (Array.isArray(planRows) ? planRows : [])
      .map((row: any) => {
        const features = (() => {
          try {
            if (Array.isArray(row.features)) return row.features;
            return JSON.parse(row.features || '[]');
          } catch {
            return [];
          }
        })();

        const perm = (() => {
          try {
            if (!row.page_permissions) return {};
            if (typeof row.page_permissions === 'object') return row.page_permissions;
            return JSON.parse(row.page_permissions);
          } catch {
            return {};
          }
        })() as any;

        const isSpecific = !!perm?.is_specific;
        const restrictedToSubscribers = !!perm?.restricted_to_current_subscribers;
        const allowedAffiliateIds = Array.isArray(perm?.allowed_affiliate_ids)
          ? perm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
          : [];

        return {
          id: Number(row.id),
          name: String(row.name || ''),
          description: String(row.description || ''),
          price: Number(row.price || 0),
          billingCycle: (String(row.billing_cycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly',
          features: Array.isArray(features) ? features : [],
          maxUsers: row.max_users == null ? null : Number(row.max_users),
          maxClients: row.max_clients == null ? null : Number(row.max_clients),
          maxDisputes: row.max_disputes == null ? null : Number(row.max_disputes),
          isPopular: String(row.name || '').toLowerCase() === 'professional',
          _meta: { isSpecific, restrictedToSubscribers, allowedAffiliateIds }
        };
      })
      .filter((p: any) => {
        const meta = p._meta || {};
        if (meta.isSpecific) return false;
        if (meta.restrictedToSubscribers) return false;
        if (Array.isArray(meta.allowedAffiliateIds) && meta.allowedAffiliateIds.length > 0) {
          return refAffiliateId !== null && meta.allowedAffiliateIds.includes(refAffiliateId);
        }
        return true;
      })
      .map(({ _meta, ...rest }: any) => rest);

    res.json({ success: true, data: plans });

  } catch (error) {
    console.error('Error fetching pricing with affiliate info:', error);
    res.status(500).json({ error: 'Failed to load pricing information' });
  }
});

// POST /api/landing/track-visit - Track affiliate link visit
router.post('/track-visit', async (req, res) => {
  try {
    const { affiliateId, source, userAgent, referrer } = req.body;

    if (!affiliateId) {
      return res.status(400).json({
        success: false,
        error: 'Affiliate ID is required'
      });
    }

    // Validate affiliate exists and is active
    const affiliateQuery = `
      SELECT id FROM affiliates WHERE id = ? AND status = 'active'
    `;
    
    const affiliate = await executeQuery(affiliateQuery, [affiliateId]);

    if (!affiliate || affiliate.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Affiliate not found or inactive'
      });
    }

    // Log the visit (update affiliate's last activity)
    const updateQuery = `
      UPDATE affiliates SET last_referral_date = NOW() WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [affiliateId]);

    // Log the visit event
    securityLogger.logSecurityEvent('affiliate_visit_tracked', {
      affiliateId,
      source,
      userAgent,
      referrer,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Visit tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking affiliate visit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/landing/track-conversion - Track when a referral converts to a purchase
router.post('/track-conversion', async (req, res) => {
  try {
    const { affiliateId, userId, planId, amount, commissionRate } = req.body;

    if (!affiliateId || !userId || !planId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify affiliate exists and is active
    const affiliateQuery = `
      SELECT id, commission_rate, total_earnings, total_referrals
      FROM affiliates 
      WHERE id = ? AND status = 'active'
    `;
    
    const affiliate = await executeQuery(affiliateQuery, [affiliateId]);
    
    if (!affiliate || affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or inactive' });
    }

    const affiliateData = affiliate[0];
    const finalCommissionRate = commissionRate || affiliateData.commission_rate;
    const commissionAmount = (amount * finalCommissionRate) / 100;

    // Upsert referral record without transaction_id; will be updated at payment time
    const existingPending = await executeQuery(
      `SELECT id FROM affiliate_referrals 
       WHERE affiliate_id = ? AND referred_user_id = ? AND (transaction_id IS NULL OR transaction_id = '') 
       ORDER BY created_at ASC LIMIT 1`,
      [affiliateId, userId]
    );

    let referralId: number;
    let referralInsertId: number | null = null;
    if (existingPending && existingPending.length > 0) {
      referralId = existingPending[0].id;
      await executeQuery(
        `UPDATE affiliate_referrals 
         SET commission_amount = ?, commission_rate = ?, 
             notes = ?, conversion_date = NOW(), updated_at = NOW() 
         WHERE id = ?`,
        [commissionAmount, finalCommissionRate, `Plan: ${planId}, Amount: $${amount}`, referralId]
      );
    } else {
      const insertReferralQuery = `
        INSERT INTO affiliate_referrals (
          affiliate_id, referred_user_id, commission_amount, 
          commission_rate, status, referral_date, conversion_date,
          notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', NOW(), NOW(), ?, NOW(), NOW())
      `;
      const referralResult = await executeQuery(insertReferralQuery, [
        affiliateId,
        userId,
        commissionAmount,
        finalCommissionRate,
        `Plan: ${planId}, Amount: $${amount}`
      ]);
      referralId = referralResult.insertId;
      referralInsertId = referralResult.insertId;
    }

    // Update affiliate totals
    const updateAffiliateQuery = `
      UPDATE affiliates 
      SET 
        total_earnings = total_earnings + ?,
        total_referrals = total_referrals + 1,
        updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateAffiliateQuery, [commissionAmount, affiliateId]);

    // Log the conversion
    securityLogger.logSecurityEvent('affiliate_conversion', {
      affiliateId,
      userId,
      planId,
      amount,
      commissionAmount,
      commissionRate: finalCommissionRate,
      referralId: referralInsertId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Conversion tracked successfully',
      data: {
      referralId,
      commissionAmount,
      commissionRate: finalCommissionRate
    }
  });

  } catch (error) {
    console.error('Error tracking conversion:', error);
    securityLogger.logSecurityEvent('affiliate_conversion_error', {
      affiliateId: req.body?.affiliateId,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// GET /api/landing/affiliate/:id/info - Get public affiliate information
router.get('/affiliate/:id/info', async (req, res) => {
  try {
    await ensureEliteLandingPageColumn();

    const { id } = req.params;
    const isNumeric = /^\d+$/.test(String(id));
    let affiliate;
    if (isNumeric) {
      const q = `
        SELECT 
          a.id,
          a.email,
          a.first_name,
          a.last_name,
          a.company_name,
          a.total_referrals,
          a.commission_rate,
          a.logo_url,
          a.elite_landing_page,
          a.status,
          u.first_name as admin_first_name,
          u.last_name as admin_last_name,
          u.company_name as admin_company_name
        FROM affiliates a
        LEFT JOIN users u ON a.admin_id = u.id
        WHERE a.id = ? AND a.status = 'active'
      `;
      affiliate = await executeQuery(q, [id]);
    } else {
      const qSlug = `
        SELECT 
          a.id,
          a.email,
          a.first_name,
          a.last_name,
          a.company_name,
          a.total_referrals,
          a.commission_rate,
          a.logo_url,
          a.elite_landing_page,
          a.status,
          u.first_name as admin_first_name,
          u.last_name as admin_last_name,
          u.company_name as admin_company_name
        FROM affiliates a
        LEFT JOIN users u ON a.admin_id = u.id
        WHERE a.referral_slug = ? AND a.status = 'active'
        LIMIT 1
      `;
      affiliate = await executeQuery(qSlug, [id]);
      if (!affiliate || affiliate.length === 0) {
        const qFallback = `
          SELECT 
            a.id,
            a.email,
            a.first_name,
            a.last_name,
            a.company_name,
            a.total_referrals,
            a.commission_rate,
            a.logo_url,
            a.elite_landing_page,
            a.status,
            u.first_name as admin_first_name,
            u.last_name as admin_last_name,
            u.company_name as admin_company_name
          FROM affiliates a
          LEFT JOIN users u ON a.admin_id = u.id
          WHERE (a.email = ? OR LOWER(CONCAT(a.first_name, a.last_name)) = LOWER(?) OR LOWER(REPLACE(CONCAT(a.first_name, ' ', a.last_name), ' ', '')) = LOWER(?)) 
            AND a.status = 'active'
          LIMIT 1
        `;
        affiliate = await executeQuery(qFallback, [id, id, id]);
      }
    }
    if (!affiliate || affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or inactive' });
    }
    const a = affiliate[0];
    res.json({
      success: true,
      data: {
        id: a.id,
        name: `${a.first_name} ${a.last_name}`,
        firstName: a.first_name,
        lastName: a.last_name,
        email: a.email,
        companyName: a.company_name,
        totalReferrals: a.total_referrals,
        commissionRate: a.commission_rate,
        logoUrl: a.logo_url,
        eliteLandingPage: a.elite_landing_page === 'allow',
        elite_landing_page: a.elite_landing_page || 'deny',
        adminName: `${a.admin_first_name} ${a.admin_last_name}`,
        adminCompany: a.admin_company_name,
        status: a.status
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate info:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate information' });
  }
});

// GET /api/landing/referral/:username - Get affiliate info by username/email for landing page
router.get('/referral/:username', async (req, res) => {
  try {
    await ensureEliteLandingPageColumn();

    const { username } = req.params;
    
    // Try to find affiliate by email first, then by first_name+last_name combination
  const affiliateQuery = `
      SELECT 
        a.id,
        a.email,
        a.first_name,
        a.last_name,
        a.company_name,
        a.total_referrals,
        a.commission_rate,
        a.logo_url,
        a.elite_landing_page,
        a.status
      FROM affiliates a
      WHERE (a.email = ? OR a.referral_slug = ? OR LOWER(CONCAT(a.first_name, a.last_name)) = LOWER(?) OR LOWER(REPLACE(CONCAT(a.first_name, ' ', a.last_name), ' ', '')) = LOWER(?)) 
        AND a.status = 'active'
      LIMIT 1
    `;
    
    let affiliate;
    try {
      affiliate = await executeQuery(affiliateQuery, [username, username, username, username]);
    } catch (err) {
      const fallbackQuery = `
        SELECT 
          a.id,
          a.email,
          a.first_name,
          a.last_name,
          a.company_name,
          a.total_referrals,
          a.commission_rate,
          a.logo_url,
          a.elite_landing_page,
          a.status
        FROM affiliates a
        WHERE (a.email = ? OR LOWER(CONCAT(a.first_name, a.last_name)) = LOWER(?) OR LOWER(REPLACE(CONCAT(a.first_name, ' ', a.last_name), ' ', '')) = LOWER(?)) 
          AND a.status = 'active'
        LIMIT 1
      `;
      affiliate = await executeQuery(fallbackQuery, [username, username, username]);
    }
    
    if (!affiliate || affiliate.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Affiliate not found or inactive' 
      });
    }
    
    const affiliateData = affiliate[0];
    
    // Log the landing page visit
    securityLogger.logSecurityEvent('affiliate_landing_visit', {
      affiliateId: affiliateData.id,
      username: username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        id: affiliateData.id,
        name: `${affiliateData.first_name} ${affiliateData.last_name}`,
        firstName: affiliateData.first_name,
        lastName: affiliateData.last_name,
        companyName: affiliateData.company_name,
        email: affiliateData.email,
        totalReferrals: affiliateData.total_referrals,
        commissionRate: affiliateData.commission_rate,
        logoUrl: affiliateData.logo_url,
        eliteLandingPage: affiliateData.elite_landing_page === 'allow',
        elite_landing_page: affiliateData.elite_landing_page || 'deny',
        status: affiliateData.status
      }
    });
    
  } catch (error) {
    console.error('Error fetching affiliate by username:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch affiliate information' 
    });
  }
});

export default router;
