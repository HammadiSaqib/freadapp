import { Router, Request, Response } from 'express';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { getWebSocketService } from '../services/websocketService.js';
import CommissionService from '../services/commissionService.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Get all active subscription plans (public endpoint)
router.get('/plans', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseAdapter();
    const plans = await db.allQuery(
      `SELECT id, name, description, price, billing_cycle, features, page_permissions, max_users, max_clients, max_disputes, sort_order
       FROM subscription_plans 
       WHERE is_active = TRUE 
       ORDER BY sort_order ASC, price ASC`
    );

    let activePlanIds: number[] = [];
    let contextAffiliateId: number | null = null;
    let hasPlanHistory = false;
    const requesterEmail = String(((req as any).user as any)?.email || '');
    const requesterRole = String(((req as any).user as any)?.role || '').toLowerCase();
    try {
      const user: any = (req as any).user;
      try {
        const refParam = String((req.query as any)?.ref || '').trim();
        if (refParam) {
          const commissionService = new CommissionService();
          const resolved = await commissionService.resolveAffiliateId(refParam);
          if (resolved) contextAffiliateId = resolved;
        }
      } catch {}
      if (user && user.id) {
        let subCheckUserId = Number(user.id);
        const role = String(user.role || '').toLowerCase();
        if (contextAffiliateId === null) {
          try {
            if (role === 'affiliate') {
              const parsed = Number(subCheckUserId);
              if (!Number.isNaN(parsed)) contextAffiliateId = parsed;
            } else {
              const refRow = await db.getQuery(
                `SELECT affiliate_id 
                 FROM affiliate_referrals 
                 WHERE referred_user_id = ? 
                 ORDER BY created_at ASC 
                 LIMIT 1`,
                [subCheckUserId]
              );
              if (refRow && (refRow as any).affiliate_id) {
                const parsed = Number((refRow as any).affiliate_id);
                if (!Number.isNaN(parsed)) contextAffiliateId = parsed;
              }
            }
          } catch {}
        }
        if (role === 'affiliate') {
          try {
            const aff = await db.getQuery('SELECT admin_id FROM affiliates WHERE id = ? LIMIT 1', [subCheckUserId]);
            if (aff && aff.admin_id) subCheckUserId = Number(aff.admin_id);
          } catch {}
        }
        const rows = await db.allQuery(
          `SELECT asub.plan_id 
           FROM admin_subscriptions asub
           JOIN admin_profiles ap ON ap.id = asub.admin_id
           WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active'`,
          [subCheckUserId]
        );
        const rowsDirect = await db.allQuery(
          `SELECT plan_id FROM admin_subscriptions WHERE admin_id = ? AND LOWER(TRIM(status)) = 'active'`,
          [subCheckUserId]
        );
        const rowsSubs = await db.allQuery(
          `SELECT sp.id as plan_id
           FROM subscriptions s
           LEFT JOIN subscription_plans sp ON sp.name = s.plan_name
           WHERE s.user_id = ? AND LOWER(TRIM(s.status)) = 'active'`,
          [subCheckUserId]
        );
        const historyRows = await db.allQuery(
          `SELECT asub.id
           FROM admin_subscriptions asub
           JOIN admin_profiles ap ON ap.id = asub.admin_id
           WHERE ap.user_id = ?
           LIMIT 1`,
          [subCheckUserId]
        );
        const historyRowsDirect = await db.allQuery(
          `SELECT id FROM admin_subscriptions WHERE admin_id = ? LIMIT 1`,
          [subCheckUserId]
        );
        const historyRowsSubs = await db.allQuery(
          `SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1`,
          [subCheckUserId]
        );
        const idsA = Array.isArray(rows) ? rows.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
        const idsB = Array.isArray(rowsDirect) ? rowsDirect.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
        const idsC = Array.isArray(rowsSubs) ? rowsSubs.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
        activePlanIds = Array.from(new Set([...idsA, ...idsB, ...idsC]));
        hasPlanHistory =
          (Array.isArray(historyRows) && historyRows.length > 0) ||
          (Array.isArray(historyRowsDirect) && historyRowsDirect.length > 0) ||
          (Array.isArray(historyRowsSubs) && historyRowsSubs.length > 0);
      }
    } catch {}

    const hasAffiliateExclusiveVisibility =
      requesterRole === 'admin' &&
      contextAffiliateId !== null &&
      !hasPlanHistory &&
      plans.some((plan: any) => {
        try {
          const perm = plan.page_permissions ? JSON.parse(plan.page_permissions) : [];
          if (Array.isArray(perm)) return false;
          const allowedAffiliateIds = Array.isArray(perm?.allowed_affiliate_ids)
            ? perm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
            : [];
          return allowedAffiliateIds.includes(contextAffiliateId);
        } catch {
          return false;
        }
      });

    const filtered = plans.filter((plan: any) => {
      try {
        const perm = plan.page_permissions ? JSON.parse(plan.page_permissions) : [];
        const planId = Number(plan.id);
        const hasThisPlan = Number.isFinite(planId) && activePlanIds.includes(planId);

        if (Array.isArray(perm)) return hasThisPlan || !hasAffiliateExclusiveVisibility;

        if (perm?.is_specific) {
          const allowedEmails = Array.isArray(perm?.allowed_admin_emails) ? perm.allowed_admin_emails : [];
          return hasThisPlan || (!hasAffiliateExclusiveVisibility && requesterEmail && allowedEmails.includes(requesterEmail));
        }

        const allowedAffiliateIds = Array.isArray(perm?.allowed_affiliate_ids)
          ? perm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
          : [];
        if (hasAffiliateExclusiveVisibility) {
          return hasThisPlan || (contextAffiliateId !== null && allowedAffiliateIds.includes(contextAffiliateId));
        }
        if (allowedAffiliateIds.length > 0) {
          return hasThisPlan || (contextAffiliateId !== null && allowedAffiliateIds.includes(contextAffiliateId));
        }
        if (perm?.restricted_to_current_subscribers === true) return hasThisPlan;
        return true;
      } catch { return true; }
    });

    const formattedPlans = filtered.map((plan: any) => ({
      ...plan,
      features: JSON.parse(plan.features || '[]')
    }));

    res.json({
      success: true,
      data: formattedPlans
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pricing plans' 
    });
  }
});

// Get a specific plan by ID (public endpoint)
router.get('/plans/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
    
    if (isNaN(planId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan ID' 
      });
    }

    const db = getDatabaseAdapter();
    const plan = await db.getQuery(
      `SELECT id, name, description, price, billing_cycle, features, page_permissions, max_users, max_clients, max_disputes, sort_order
       FROM subscription_plans 
       WHERE id = ? AND is_active = TRUE`,
      [planId]
    );

    if (!plan) {
      return res.status(404).json({ 
        success: false, 
        error: 'Plan not found' 
      });
    }

    const perm = (() => { try { return plan.page_permissions ? JSON.parse(plan.page_permissions) : []; } catch { return []; } })();
    const requesterRole = String(((req as any).user as any)?.role || '').toLowerCase();
    let contextAffiliateId: number | null = null;
    let hasPlanHistory = false;
    try {
      const refParam = String((req.query as any)?.ref || '').trim();
      if (refParam) {
        const commissionService = new CommissionService();
        const resolved = await commissionService.resolveAffiliateId(refParam);
        if (resolved) contextAffiliateId = resolved;
      }
    } catch {}
    try {
      const user: any = (req as any).user;
      if (user && user.id) {
        let subCheckUserId = Number(user.id);
        const role = String(user.role || '').toLowerCase();
        if (contextAffiliateId === null) {
          if (role === 'affiliate') {
            const parsed = Number(subCheckUserId);
            if (!Number.isNaN(parsed)) contextAffiliateId = parsed;
          } else {
            const refRow = await db.getQuery(
              `SELECT affiliate_id 
               FROM affiliate_referrals 
               WHERE referred_user_id = ? 
               ORDER BY created_at ASC 
               LIMIT 1`,
              [subCheckUserId]
            );
            if (refRow && (refRow as any).affiliate_id) {
              const parsed = Number((refRow as any).affiliate_id);
              if (!Number.isNaN(parsed)) contextAffiliateId = parsed;
            }
          }
        }
        if (role === 'affiliate') {
          try {
            const aff = await db.getQuery('SELECT admin_id FROM affiliates WHERE id = ? LIMIT 1', [subCheckUserId]);
            if (aff && aff.admin_id) subCheckUserId = Number(aff.admin_id);
          } catch {}
        }
        const historyRows = await db.allQuery(
          `SELECT asub.id
           FROM admin_subscriptions asub
           JOIN admin_profiles ap ON ap.id = asub.admin_id
           WHERE ap.user_id = ?
           LIMIT 1`,
          [subCheckUserId]
        );
        const historyRowsDirect = await db.allQuery(
          `SELECT id FROM admin_subscriptions WHERE admin_id = ? LIMIT 1`,
          [subCheckUserId]
        );
        const historyRowsSubs = await db.allQuery(
          `SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1`,
          [subCheckUserId]
        );
        hasPlanHistory =
          (Array.isArray(historyRows) && historyRows.length > 0) ||
          (Array.isArray(historyRowsDirect) && historyRowsDirect.length > 0) ||
          (Array.isArray(historyRowsSubs) && historyRowsSubs.length > 0);
      }
    } catch {}

    let hasAffiliateExclusiveVisibility = false;
    if (requesterRole === 'admin' && contextAffiliateId !== null && !hasPlanHistory) {
      try {
        const activePlanPermissions = await db.allQuery(
          'SELECT page_permissions FROM subscription_plans WHERE is_active = TRUE'
        );
        hasAffiliateExclusiveVisibility = activePlanPermissions.some((row: any) => {
          try {
            const parsedPerm = row.page_permissions ? JSON.parse(row.page_permissions) : [];
            if (Array.isArray(parsedPerm)) return false;
            const allowedAffiliateIds = Array.isArray(parsedPerm?.allowed_affiliate_ids)
              ? parsedPerm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
              : [];
            return allowedAffiliateIds.includes(contextAffiliateId);
          } catch {
            return false;
          }
        });
      } catch {}
    }

    if (Array.isArray(perm)) {
      if (hasAffiliateExclusiveVisibility) {
        return res.status(404).json({ success: false, error: 'Plan not found' });
      }
    } else {
      if (perm?.is_specific) {
        return res.status(404).json({ success: false, error: 'Plan not found' });
      }
      const allowedAffiliateIds = Array.isArray(perm?.allowed_affiliate_ids)
        ? perm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
        : [];
      if (hasAffiliateExclusiveVisibility) {
        if (contextAffiliateId === null || !allowedAffiliateIds.includes(contextAffiliateId)) {
          return res.status(404).json({ success: false, error: 'Plan not found' });
        }
      } else if (allowedAffiliateIds.length > 0) {
        if (contextAffiliateId === null || !allowedAffiliateIds.includes(contextAffiliateId)) {
          return res.status(404).json({ success: false, error: 'Plan not found' });
        }
      }
      if (perm?.restricted_to_current_subscribers === true) {
        let activePlanIds: number[] = [];
        try {
          const user: any = (req as any).user;
          if (user && user.id) {
            let subCheckUserId = Number(user.id);
            const role = String(user.role || '').toLowerCase();
            if (role === 'affiliate') {
              try {
                const aff = await db.getQuery('SELECT admin_id FROM affiliates WHERE id = ? LIMIT 1', [subCheckUserId]);
                if (aff && aff.admin_id) subCheckUserId = Number(aff.admin_id);
              } catch {}
            }
            const rows = await db.allQuery(
              `SELECT asub.plan_id 
               FROM admin_subscriptions asub
               JOIN admin_profiles ap ON ap.id = asub.admin_id
               WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active'`,
              [subCheckUserId]
            );
            const rowsDirect = await db.allQuery(
              `SELECT plan_id FROM admin_subscriptions WHERE admin_id = ? AND LOWER(TRIM(status)) = 'active'`,
              [subCheckUserId]
            );
            const rowsSubs = await db.allQuery(
              `SELECT sp.id as plan_id
               FROM subscriptions s
               LEFT JOIN subscription_plans sp ON sp.name = s.plan_name
               WHERE s.user_id = ? AND LOWER(TRIM(s.status)) = 'active'`,
              [subCheckUserId]
            );
            const idsA = Array.isArray(rows) ? rows.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
            const idsB = Array.isArray(rowsDirect) ? rowsDirect.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
            const idsC = Array.isArray(rowsSubs) ? rowsSubs.map((r: any) => Number(r.plan_id)).filter((id: any) => !isNaN(id)) : [];
            activePlanIds = Array.from(new Set([...idsA, ...idsB, ...idsC]));
          }
        } catch {}
        if (!activePlanIds.includes(planId)) {
          return res.status(404).json({ success: false, error: 'Plan not found' });
        }
      }
    }
    const formattedPlan = {
      ...plan,
      features: JSON.parse(plan.features || '[]')
    };

    res.json({
      success: true,
      data: formattedPlan
    });
  } catch (error) {
    console.error('Error fetching pricing plan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pricing plan' 
    });
  }
});

// Purchase plan endpoint - upgrades user to admin role
router.post('/purchase/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { userId, paymentMethod, paymentAmount, affiliateId } = req.body;

    if (!userId || !paymentMethod || !paymentAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, paymentMethod, paymentAmount'
      });
    }

    const db = getDatabaseAdapter();
    
    // Get the plan details
    const plan = await db.allQuery(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = true',
      [planId]
    );

    if (!plan || plan.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found or inactive'
      });
    }

    try {
      const perm = plan[0].page_permissions ? JSON.parse(plan[0].page_permissions) : [];
      if (!Array.isArray(perm) && perm?.is_specific) {
        const users = await db.allQuery('SELECT email FROM users WHERE id = ?', [userId]);
        const userEmail = users?.[0]?.email || '';
        const allowed = Array.isArray(perm?.allowed_admin_emails) ? perm.allowed_admin_emails : [];
        if (!userEmail || !allowed.includes(String(userEmail))) {
          return res.status(403).json({ success: false, error: 'This plan is restricted' });
        }
      }
      if (!Array.isArray(perm)) {
        const allowedAffiliateIds = Array.isArray(perm?.allowed_affiliate_ids)
          ? perm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
          : [];
        if (allowedAffiliateIds.length > 0) {
          const commissionService = new CommissionService();
          let contextAffiliateId: number | null = null;
          try {
            if (affiliateId) {
              const resolved = await commissionService.resolveAffiliateId(String(affiliateId));
              if (resolved) contextAffiliateId = resolved;
            }
          } catch {}
          try {
            if (contextAffiliateId === null && (req.query as any)?.ref) {
              const resolved = await commissionService.resolveAffiliateId(String((req.query as any).ref));
              if (resolved) contextAffiliateId = resolved;
            }
          } catch {}
          try {
            if (contextAffiliateId === null && (req.headers['referer'] || req.headers['origin'])) {
              const referer = (req.headers['referer'] as string) || (req.headers['origin'] as string);
              const url = new URL(referer);
              const refParam = url.searchParams.get('ref');
              if (refParam) {
                const resolved = await commissionService.resolveAffiliateId(String(refParam));
                if (resolved) contextAffiliateId = resolved;
              }
            }
          } catch {}
          try {
            if (contextAffiliateId === null) {
              const hierarchy = await commissionService.getAffiliateHierarchy(Number(userId));
              if (Array.isArray(hierarchy) && hierarchy.length > 0 && hierarchy[0]?.id) {
                const parsed = Number(hierarchy[0].id);
                if (!Number.isNaN(parsed)) contextAffiliateId = parsed;
              }
            }
          } catch {}
          if (contextAffiliateId === null || !allowedAffiliateIds.includes(contextAffiliateId)) {
            return res.status(403).json({ success: false, error: 'This plan is restricted' });
          }
        }
      }
    } catch {}

    // Check if user exists
    const user = await db.allQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Start transaction
    await db.executeQuery('START TRANSACTION');

    try {
      // Update user role to admin
      await db.executeQuery(
        'UPDATE users SET role = ? WHERE id = ?',
        ['admin', userId]
      );

      // Create admin subscription record
      await db.executeQuery(
        `INSERT INTO admin_subscriptions (admin_id, plan_id, status, start_date, end_date, 
         auto_renew, payment_method, payment_amount, currency, created_by, updated_by) 
         VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), true, ?, ?, 'USD', ?, ?)`,
        [userId, planId, paymentMethod, paymentAmount, userId, userId]
      );

      // Resolve affiliateId from body or request context and process hierarchical commission
      try {
        const commissionService = new CommissionService();
        let resolvedAffiliateId: number | undefined = undefined;
        // Prefer explicit affiliateId, resolve non-numeric formats too
        if (affiliateId) {
          const resolved = await commissionService.resolveAffiliateId(String(affiliateId));
          if (resolved) resolvedAffiliateId = resolved;
        }
        // Fallback: look for ?ref in query
        if (!resolvedAffiliateId && (req.query as any)?.ref) {
          const resolved = await commissionService.resolveAffiliateId(String((req.query as any).ref));
          if (resolved) resolvedAffiliateId = resolved;
        }
        // Fallback: parse referer header for ?ref
        if (!resolvedAffiliateId && (req.headers['referer'] || req.headers['origin'])) {
          const referer = (req.headers['referer'] as string) || (req.headers['origin'] as string);
          try {
            const url = new URL(referer);
            const refParam = url.searchParams.get('ref');
            if (refParam) {
              const resolved = await commissionService.resolveAffiliateId(String(refParam));
              if (resolved) resolvedAffiliateId = resolved;
            }
          } catch {}
        }
        // Dashboard fallback: derive from user's affiliate parent chain if still unresolved
        if (!resolvedAffiliateId) {
          const hierarchy = await commissionService.getAffiliateHierarchy(userId);
          if (Array.isArray(hierarchy) && hierarchy.length > 0 && hierarchy[0]?.id) {
            resolvedAffiliateId = Number(hierarchy[0].id);
            console.log('🔁 [PRICING] Fallback resolved affiliate via hierarchy:', resolvedAffiliateId);
          }
        }

        const transactionId = `pricing_${Date.now()}_${userId}`;
        await commissionService.processPurchase({
          userId,
          planId: parseInt(planId),
          amount: plan[0].price,
          transactionId,
          affiliateId: resolvedAffiliateId,
          paymentMethod
        });
        console.log('✅ Commission processed for purchase, user:', userId, 'affiliateId:', resolvedAffiliateId || 'none');
      } catch (commissionError) {
        console.error('⚠️ Commission processing failed for purchase:', commissionError);
        // Don't fail the purchase if commission processing fails
      }

      // Commit transaction
      await db.executeQuery('COMMIT');

      res.json({
        success: true,
        message: 'Plan purchased successfully. User upgraded to admin role.',
        data: {
          userId,
          planId,
          newRole: 'admin',
          subscriptionStart: new Date().toISOString()
        }
      });
    } catch (error) {
      // Rollback transaction on error
      await db.executeQuery('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error purchasing plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase plan'
    });
  }
});

export default router;
