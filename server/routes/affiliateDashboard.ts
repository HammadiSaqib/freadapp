import express from 'express';
import Stripe from 'stripe';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { SecurityLogger } from '../utils/securityLogger.js';

const router = express.Router();
const securityLogger = new SecurityLogger();
let stripeClient: Stripe | null | undefined;

type StripePaymentHistoryItem = {
  paymentIntentId: string;
  amount: number;
  currency: string;
  createdAt: string;
  description: string;
};

const STRIPE_PAYMENT_HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const STRIPE_PAYMENT_HISTORY_CONCURRENCY = 2;
const MAX_STRIPE_RATE_LIMIT_RETRIES = 5;
const stripePaymentHistoryCache = new Map<string, {
  expiresAt: number;
  value: StripePaymentHistoryItem[];
}>();
const stripePaymentHistoryInFlight = new Map<string, Promise<StripePaymentHistoryItem[]>>();

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryableStripeError(error: any) {
  const code = String(error?.code || error?.type || '').toLowerCase();
  const statusCode = Number(error?.statusCode || error?.status || error?.raw?.statusCode || 0);
  return code === 'rate_limit' || statusCode === 429;
}

async function withStripeRateLimitRetry<T>(operation: () => Promise<T>) {
  let attempt = 0;
  let delayMs = 500;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableStripeError(error) || attempt >= MAX_STRIPE_RATE_LIMIT_RETRIES - 1) {
        throw error;
      }

      attempt += 1;
      await sleep(delayMs);
      delayMs *= 2;
    }
  }
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrencyLimit: number,
  iteratee: (item: T, index: number) => Promise<TResult>
) {
  if (items.length === 0) {
    return [] as TResult[];
  }

  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrencyLimit, items.length) }, () => worker())
  );

  return results;
}

async function getStripeClient(): Promise<Stripe | null> {
  if (stripeClient !== undefined) {
    return stripeClient;
  }

  try {
    const stripeConfigs = await executeQuery(
      'SELECT stripe_secret_key FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1',
      []
    );
    const dbSecretKey = stripeConfigs && stripeConfigs[0]?.stripe_secret_key;
    const secretKey = dbSecretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      stripeClient = null;
      return stripeClient;
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
    return stripeClient;
  } catch (error) {
    console.error('Error initializing Stripe for affiliate dashboard:', error);
    stripeClient = null;
    return stripeClient;
  }
}

async function fetchCustomerPaymentHistory(customerId: string) {
  const stripe = await getStripeClient();
  if (!stripe) {
    return [] as StripePaymentHistoryItem[];
  }

  const payments: StripePaymentHistoryItem[] = [];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const paymentIntentPage = await withStripeRateLimitRetry(() => stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    }));

    paymentIntentPage.data.forEach((paymentIntent) => {
      if (paymentIntent.status !== 'succeeded') {
        return;
      }

      payments.push({
        paymentIntentId: paymentIntent.id,
        amount: typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : 0,
        currency: paymentIntent.currency ? paymentIntent.currency.toUpperCase() : 'USD',
        createdAt: new Date(paymentIntent.created * 1000).toISOString(),
        description: paymentIntent.description || '',
      });
    });

    hasMore = paymentIntentPage.has_more;
    startingAfter = hasMore && paymentIntentPage.data.length > 0
      ? paymentIntentPage.data[paymentIntentPage.data.length - 1].id
      : undefined;
  }

  payments.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return payments;
}

async function getCustomerPaymentHistory(customerId?: string | null) {
  if (!customerId) {
    return [] as StripePaymentHistoryItem[];
  }

  const cachedEntry = stripePaymentHistoryCache.get(customerId);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.value;
  }

  if (cachedEntry) {
    stripePaymentHistoryCache.delete(customerId);
  }

  const inFlightRequest = stripePaymentHistoryInFlight.get(customerId);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = (async () => {
    try {
      const payments = await fetchCustomerPaymentHistory(customerId);
      stripePaymentHistoryCache.set(customerId, {
        expiresAt: Date.now() + STRIPE_PAYMENT_HISTORY_CACHE_TTL_MS,
        value: payments,
      });
      return payments;
    } catch (error) {
      console.error(`Error fetching Stripe payment history for customer ${customerId}:`, error);
      return [] as StripePaymentHistoryItem[];
    } finally {
      stripePaymentHistoryInFlight.delete(customerId);
    }
  })();

  stripePaymentHistoryInFlight.set(customerId, request);
  return request;
}

function getAffiliateBaseCommissionRate(planType?: string | null, configuredRate?: number | null) {
  const normalizedPlanType = String(planType || '').toLowerCase();
  const numericRate = Number(configuredRate) || 0;
  const hasPaidPlan = ['paid_partner', 'partner', 'pro', 'premium'].includes(normalizedPlanType) || numericRate >= 20;

  if (numericRate > 0) {
    return hasPaidPlan ? Math.max(20, Math.min(25, numericRate)) : Math.max(10, Math.min(15, numericRate));
  }

  return hasPaidPlan ? 20 : 10;
}

function getEffectiveCommissionRate(baseRate: number, qualifiesForBonus: boolean) {
  const normalizedBaseRate = Number(baseRate) || 0;
  const maxRate = normalizedBaseRate >= 20 ? 25 : 15;
  if (!qualifiesForBonus) {
    return normalizedBaseRate;
  }
  return Math.min(normalizedBaseRate + 5, maxRate);
}

// Middleware to ensure only affiliates OR admins with affiliate access can use these routes
const requireAffiliateRole = (req: any, res: any, next: any) => {
  const role = req.user?.role;
  if (!['affiliate', 'admin', 'super_admin'].includes(role)) {
    securityLogger.logSecurityEvent('unauthorized_affiliate_dashboard_access', {
      userId: req.user?.id,
      role,
      endpoint: req.path,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Access denied. Affiliate or Admin role required.' });
  }
  next();
};

// Resolve the affiliate ID for the current user (supports affiliate role and admin owners)
async function resolveAffiliateId(req: any): Promise<number | null> {
  try {
    if (req.user?.role === 'affiliate') return req.user.id;
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
      const userRows = await executeQuery('SELECT email FROM users WHERE id = ? LIMIT 1', [req.user.id]);
      const adminEmail = userRows && userRows[0]?.email;
      const rows = await executeQuery('SELECT id, email, status, updated_at, created_at FROM affiliates WHERE admin_id = ?', [req.user.id]);
      if (!rows || rows.length === 0) return null;
      let selected = null as any;
      if (adminEmail) {
        selected = rows.find((r: any) => String(r.email || '').toLowerCase() === String(adminEmail).toLowerCase()) || null;
      }
      if (!selected) {
        selected = rows.find((r: any) => r.status === 'active') || null;
      }
      if (!selected) {
        selected = rows.sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
      }
      if (!selected) selected = rows[0];
      return selected?.id || null;
    }
    return null;
  } catch (err) {
    console.error('💥 [AFFILIATE] Error resolving affiliate id for user:', req.user?.id, err);
    return null;
  }
}

export async function getAffiliateDashboardStatsData(affiliateId: number) {
  const affiliateQuery = `
    SELECT 
      total_earnings,
      total_referrals,
      commission_rate,
      plan_type,
      paid_referrals_count,
      status,
      created_at,
      admin_id
    FROM affiliates 
    WHERE id = ?
  `;

  const affiliate = await executeQuery(affiliateQuery, [affiliateId]);
  if (!affiliate || affiliate.length === 0) {
    const error: any = new Error('Affiliate not found');
    error.code = 'AFFILIATE_NOT_FOUND';
    throw error;
  }

  const affiliateData = affiliate[0];

  let subscriptionData = null;
  if (affiliateData.admin_id) {
    const subscriptionQuery = `
      SELECT 
        plan_name,
        plan_type,
        status,
        current_period_start,
        current_period_end
      FROM subscriptions 
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const subscriptionResult = await executeQuery(subscriptionQuery, [affiliateData.admin_id]);
    if (subscriptionResult && subscriptionResult.length > 0) {
      subscriptionData = subscriptionResult[0];
    }
  }

  const earningsAggregationQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_amount,
      COALESCE(SUM(CASE WHEN status IN ('cancelled', 'refunded', 'chargeback') THEN commission_amount ELSE 0 END), 0) AS cancelled_amount,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_amount,
      COALESCE(SUM(CASE 
        WHEN status = 'paid' 
          AND COALESCE(payment_date, approval_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
        THEN commission_amount 
        ELSE 0 
      END), 0) AS month_paid_amount,
      COALESCE(SUM(CASE 
        WHEN status IN ('cancelled', 'refunded', 'chargeback') 
          AND COALESCE(updated_at, payment_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
        THEN commission_amount 
        ELSE 0 
      END), 0) AS month_cancelled_amount,
      COALESCE(SUM(CASE 
        WHEN status = 'paid' 
          AND COALESCE(payment_date, approval_date, created_at) >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01') 
          AND COALESCE(payment_date, approval_date, created_at) < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
        THEN commission_amount 
        ELSE 0 
      END), 0) AS prior_month_paid_amount,
      COALESCE(SUM(CASE 
        WHEN status IN ('cancelled', 'refunded', 'chargeback') 
          AND COALESCE(updated_at, payment_date, created_at) >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01') 
          AND COALESCE(updated_at, payment_date, created_at) < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
        THEN commission_amount 
        ELSE 0 
      END), 0) AS prior_month_cancelled_amount,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
      SUM(CASE 
        WHEN status = 'paid' 
          AND COALESCE(payment_date, approval_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
        THEN 1 ELSE 0
      END) AS month_paid_count,
      COALESCE(SUM(CASE 
        WHEN status IN ('pending','approved','paid') 
          AND COALESCE(order_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
        THEN commission_amount 
        ELSE 0 
      END), 0) AS month_all_earned_amount
    FROM affiliate_commissions
    WHERE affiliate_id = ?
  `;

  const earningsAggregate = await executeQuery(earningsAggregationQuery, [affiliateId]);
  const {
    paid_amount: totalPaidAmountRaw = 0,
    cancelled_amount: totalCancelledAmountRaw = 0,
    pending_amount: totalPendingValueRaw = 0,
    month_paid_amount: monthPaidAmountRaw = 0,
    month_cancelled_amount: monthCancelledAmountRaw = 0,
    prior_month_paid_amount: priorMonthPaidAmountRaw = 0,
    prior_month_cancelled_amount: priorMonthCancelledAmountRaw = 0,
    pending_count: pendingCountRaw = 0,
    paid_count: paidCountRaw = 0,
    month_paid_count: monthPaidCountRaw = 0,
    month_all_earned_amount: monthAllEarnedAmountRaw = 0,
  } = earningsAggregate[0] || {};

  const totalPaidAmount = parseFloat(totalPaidAmountRaw) || 0;
  const totalCancelledAmount = parseFloat(totalCancelledAmountRaw) || 0;
  const totalPendingValue = parseFloat(totalPendingValueRaw) || 0;
  const currentMonthPaidGross = parseFloat(monthPaidAmountRaw) || 0;
  const currentMonthCancelled = parseFloat(monthCancelledAmountRaw) || 0;
  const priorMonthPaidGross = parseFloat(priorMonthPaidAmountRaw) || 0;
  const priorMonthCancelled = parseFloat(priorMonthCancelledAmountRaw) || 0;
  const pendingSignups = parseInt(pendingCountRaw) || 0;
  const currentMonthPaidCount = parseInt(monthPaidCountRaw) || 0;
  const monthAllEarnedAmount = parseFloat(monthAllEarnedAmountRaw) || 0;

  const totalPaidEarnings = totalPaidAmount - totalCancelledAmount;
  const currentMonthNet = currentMonthPaidGross - currentMonthCancelled;
  const priorMonthNet = priorMonthPaidGross - priorMonthCancelled;

  const commissionRate = parseFloat(affiliateData.commission_rate) || 10;
  const monthlyBillingQuery = `
    SELECT COALESCE(SUM(bt.amount), 0) AS total_referral_revenue_this_month
    FROM billing_transactions bt
    JOIN affiliate_referrals ar ON bt.user_id = ar.referred_user_id
    WHERE ar.affiliate_id = ?
      AND bt.status = 'succeeded'
      AND bt.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
  `;
  const monthlyBillingResult = await executeQuery(monthlyBillingQuery, [affiliateId]);
  const totalReferralRevenueThisMonth = parseFloat(monthlyBillingResult[0]?.total_referral_revenue_this_month) || 0;
  const realMonthlyEarnings = (totalReferralRevenueThisMonth * commissionRate) / 100;
  const effectiveMonthlyEarnings = Math.max(monthAllEarnedAmount, realMonthlyEarnings);

  const statusBreakdownQuery = `
    SELECT status, COALESCE(SUM(commission_amount), 0) AS amount, COUNT(*) AS count
    FROM affiliate_commissions
    WHERE affiliate_id = ? AND status IN ('paid', 'cancelled', 'refunded', 'chargeback')
    GROUP BY status
  `;
  const statusBreakdown = await executeQuery(statusBreakdownQuery, [affiliateId]);
  const cancelledTotal = statusBreakdown
    .filter((row: any) => ['cancelled', 'refunded', 'chargeback'].includes(row.status))
    .reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);

  const cancelledCount = statusBreakdown
    .filter((row: any) => ['cancelled', 'refunded', 'chargeback'].includes(row.status))
    .reduce((sum: number, row: any) => sum + (parseInt(row.count) || 0), 0);

  const activeReferralsQuery = `
    SELECT COUNT(DISTINCT ar.id) as active_referrals
    FROM affiliate_referrals ar
    WHERE ar.affiliate_id = ? 
      AND ar.status IN ('approved', 'converted')
  `;
  const activeResult = await executeQuery(activeReferralsQuery, [affiliateId]);
  const activeReferrals = activeResult[0]?.active_referrals || 0;
  const conversionRate = affiliateData.total_referrals > 0 ? (activeReferrals / affiliateData.total_referrals * 100) : 0;

  const nextPayment = new Date();
  nextPayment.setMonth(nextPayment.getMonth() + 1);
  nextPayment.setDate(1);

  const calculateCurrentTierRate = (planType: string | null | undefined, paidReferralsCount: number) => {
    const normalizedPlanType = planType?.toLowerCase();
    const hasPaidPlan = subscriptionData?.status === 'active' || 
      normalizedPlanType === 'paid_partner' || 
      normalizedPlanType === 'partner' || 
      normalizedPlanType === 'pro' || 
      normalizedPlanType === 'premium';

    if (!hasPaidPlan || normalizedPlanType === 'free' || normalizedPlanType === 'starter') {
      return paidReferralsCount >= 100 ? 15.0 : 10.0;
    }

    return paidReferralsCount >= 100 ? 25.0 : 20.0;
  };

  const currentTierRate = calculateCurrentTierRate(affiliateData.plan_type, affiliateData.paid_referrals_count);

  const getTierInfo = (planType: string | null | undefined, paidReferralsCount: number) => {
    const normalizedPlanType = planType?.toLowerCase();
    const hasPaidPlan = subscriptionData?.status === 'active' || 
      normalizedPlanType === 'paid_partner' || 
      normalizedPlanType === 'partner' || 
      normalizedPlanType === 'pro' || 
      normalizedPlanType === 'premium';

    if (!hasPaidPlan || normalizedPlanType === 'free' || normalizedPlanType === 'starter') {
      if (paidReferralsCount >= 100) {
        return {
          currentTier: 'Free - Advanced',
          nextTier: 'Upgrade to Pro Partner for higher rates',
          progressToNext: 100,
          referralsToNext: 0,
        };
      }

      return {
        currentTier: 'Free - Starter',
        nextTier: 'Free - Advanced (15%)',
        progressToNext: (paidReferralsCount / 100) * 100,
        referralsToNext: 100 - paidReferralsCount,
      };
    }

    if (paidReferralsCount >= 100) {
      return {
        currentTier: 'Pro - Premium',
        nextTier: 'Maximum tier reached',
        progressToNext: 100,
        referralsToNext: 0,
      };
    }

    return {
      currentTier: 'Pro - Standard',
      nextTier: 'Pro - Premium (25%)',
      progressToNext: (paidReferralsCount / 100) * 100,
      referralsToNext: 100 - paidReferralsCount,
    };
  };

  const tierInfo = getTierInfo(affiliateData.plan_type, affiliateData.paid_referrals_count);

  const nonRenewalsQuery = `
    SELECT 
      COUNT(DISTINCT ar.id) as non_renewals_count,
      COALESCE(SUM(
        CASE
          WHEN s.plan_type = 'yearly' THEN CAST(bt_latest.amount AS DECIMAL(10,2)) / 12
          ELSE CAST(bt_latest.amount AS DECIMAL(10,2))
        END
      ), 0) as non_renewal_revenue
    FROM affiliate_referrals ar
    JOIN users u ON ar.referred_user_id = u.id
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN (
      SELECT bt.user_id, bt.amount
      FROM billing_transactions bt
      INNER JOIN (
        SELECT user_id, MAX(id) as max_id
        FROM billing_transactions
        WHERE status = 'succeeded'
        GROUP BY user_id
      ) bt_latest_ids ON bt.id = bt_latest_ids.max_id
    ) bt_latest ON bt_latest.user_id = u.id
    WHERE ar.affiliate_id = ?
      AND ar.status NOT IN ('cancelled')
      AND (s.status IN ('unpaid', 'past_due', 'incomplete', 'incomplete_expired') OR s.id IS NULL)
      AND u.status != 'inactive'
  `;
  const nonRenewalsResult = await executeQuery(nonRenewalsQuery, [affiliateId]);
  const nonRenewalsCount = nonRenewalsResult[0]?.non_renewals_count || 0;
  const nonRenewalRevenue = parseFloat(nonRenewalsResult[0]?.non_renewal_revenue) || 0;
  const nonRenewalsAmount = (nonRenewalRevenue * currentTierRate) / 100;

  const lostCommissionQuery = `
    SELECT COALESCE(SUM(bt.amount), 0) as cancelled_revenue
    FROM affiliate_referrals ar
    JOIN users u ON ar.referred_user_id = u.id
    LEFT JOIN subscriptions s ON u.id = s.user_id
    JOIN billing_transactions bt ON bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
    WHERE ar.affiliate_id = ?
      AND (
        ar.status = 'cancelled'
        OR s.status IN ('canceled', 'cancelled')
        OR (u.status = 'inactive' AND (s.status IS NULL OR s.status != 'active'))
      )
  `;
  const lostCommissionResult = await executeQuery(lostCommissionQuery, [affiliateId]);
  const cancelledRevenue = parseFloat(lostCommissionResult[0]?.cancelled_revenue) || 0;
  const lostCommissionAmount = (cancelledRevenue * commissionRate) / 100;

  const potentialLostCommissionQuery = `
    SELECT COUNT(DISTINCT ar.id) as at_risk_referrals,
           COALESCE(AVG(ac.commission_amount), 0) as avg_commission
    FROM affiliate_referrals ar
    JOIN affiliate_commissions ac ON ar.id = ac.referral_id
    LEFT JOIN users u ON ar.referred_user_id = u.id
    WHERE ar.affiliate_id = ? 
      AND ar.status IN ('approved', 'converted', 'paid')
      AND ac.status = 'paid'
      AND (u.status IS NULL OR u.status = 'active')
  `;
  const potentialLostResult = await executeQuery(potentialLostCommissionQuery, [affiliateId]);
  const atRiskReferrals = potentialLostResult[0]?.at_risk_referrals || 0;
  const avgCommission = potentialLostResult[0]?.avg_commission || 0;

  const yearlyEarningsQuery = `
    SELECT COALESCE(SUM(commission_amount), 0) as yearly_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? 
      AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      AND status = 'paid'
  `;
  const yearlyResult = await executeQuery(yearlyEarningsQuery, [affiliateId]);
  const yearlyEarnings = yearlyResult[0]?.yearly_earnings || 0;
  const estimatedLostCommission = atRiskReferrals * avgCommission * 0.2;

  const freshTotalReferralsQuery = `
    SELECT COUNT(*) as total_referrals_count
    FROM affiliate_referrals
    WHERE affiliate_id = ?
  `;
  const freshTotalResult = await executeQuery(freshTotalReferralsQuery, [affiliateId]);
  const freshTotalReferrals = parseInt(freshTotalResult[0]?.total_referrals_count) || 0;

  const [activePayingResult, unpaidClientsResult, cancelledClientsResult] = await Promise.all([
    executeQuery(`
      SELECT COUNT(DISTINCT ar.id) as active_paying
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ar.affiliate_id = ?
        AND s.status = 'active'
    `, [affiliateId]),
    executeQuery(`
      SELECT COUNT(DISTINCT ar.id) as unpaid_clients
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ar.affiliate_id = ?
        AND s.status IN ('unpaid', 'past_due', 'incomplete')
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

  const activePayingClients = parseInt(activePayingResult[0]?.active_paying) || 0;
  const unpaidClients = parseInt(unpaidClientsResult[0]?.unpaid_clients) || 0;
  const cancelledClients = parseInt(cancelledClientsResult[0]?.cancelled_clients) || 0;

  let totalPayouts = 0;
  let lastPayoutDate: string | null = null;
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS affiliate_payouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL,
        admin_user_id INT NULL,
        commission_month CHAR(7) NOT NULL,
        payout_month CHAR(7) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        invoice_id INT NULL,
        invoice_number VARCHAR(64) NULL,
        invoice_public_token VARCHAR(64) NULL,
        invoice_url VARCHAR(255) NULL,
        status ENUM('generated','emailed','paid','cancelled') DEFAULT 'generated',
        paid_at DATETIME NULL,
        notes VARCHAR(255) NULL,
        payslip_number VARCHAR(64) NULL,
        payslip_token VARCHAR(64) NULL,
        payslip_url VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_affiliate_commission_month (affiliate_id, commission_month)
      )
    `, []);

    const payoutsResult = await executeQuery(`
      SELECT
        COALESCE(
          (SELECT SUM(amount) FROM affiliate_payouts WHERE affiliate_id = ? AND status IN ('generated', 'emailed', 'paid')),
          0
        ) +
        COALESCE(
          (SELECT SUM(amount) FROM commission_payments WHERE affiliate_id = ? AND status IN ('pending', 'completed')),
          0
        ) as total_payouts,
        GREATEST(
          COALESCE((SELECT MAX(COALESCE(paid_at, created_at)) FROM affiliate_payouts WHERE affiliate_id = ? AND status IN ('generated', 'emailed', 'paid')), '1970-01-01'),
          COALESCE((SELECT MAX(COALESCE(payment_date, created_at)) FROM commission_payments WHERE affiliate_id = ? AND status IN ('pending', 'completed')), '1970-01-01')
        ) as last_payout_date
    `, [affiliateId, affiliateId, affiliateId, affiliateId]);
    totalPayouts = parseFloat(payoutsResult[0]?.total_payouts) || 0;
    const rawPayoutDate = payoutsResult[0]?.last_payout_date;
    if (rawPayoutDate && rawPayoutDate !== '1970-01-01' && rawPayoutDate !== '1970-01-01 00:00:00') {
      lastPayoutDate = rawPayoutDate;
    }
  } catch (payoutErr) {
    console.warn('[AFFILIATE STATS] Payout query failed, using defaults:', payoutErr);
  }

  let currentMRR = 0;
  let mrrBase = 0;
  try {
    const mrrResult = await executeQuery(`
      SELECT COALESCE(SUM(
        CASE
          WHEN s.plan_type = 'yearly' THEN CAST(bt_latest.amount AS DECIMAL(10,2)) / 12
          ELSE CAST(bt_latest.amount AS DECIMAL(10,2))
        END
      ), 0) as mrr_base
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
      LEFT JOIN (
        SELECT bt.user_id, bt.amount
        FROM billing_transactions bt
        INNER JOIN (
          SELECT user_id, MAX(id) as max_id
          FROM billing_transactions
          WHERE status = 'succeeded'
          GROUP BY user_id
        ) bt_max ON bt.id = bt_max.max_id
      ) bt_latest ON bt_latest.user_id = u.id
      WHERE ar.affiliate_id = ?
    `, [affiliateId]);
    mrrBase = parseFloat(mrrResult[0]?.mrr_base) || 0;
    currentMRR = mrrBase * (currentTierRate / 100);
  } catch (mrrErr) {
    console.warn('[AFFILIATE STATS] MRR query failed:', mrrErr);
  }

  const lastPaymentQuery = `
    SELECT 
      commission_amount as amount,
      DATE_FORMAT(created_at, '%b %d') as date
    FROM affiliate_commissions 
    WHERE affiliate_id = ? AND status = 'paid'
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  const lastPaymentResult = await executeQuery(lastPaymentQuery, [affiliateId]);
  const lastPayment = lastPaymentResult[0] ? {
    amount: parseFloat(lastPaymentResult[0].amount),
    date: lastPaymentResult[0].date,
  } : null;

  const earningsChangePercentage = priorMonthNet > 0
    ? ((currentMonthNet - priorMonthNet) / priorMonthNet * 100)
    : (currentMonthNet > 0 ? 100 : 0);

  const currentMonthConversionsQuery = `
    SELECT COUNT(*) as conversions
    FROM affiliate_referrals 
    WHERE affiliate_id = ? 
      AND status IN ('approved', 'converted', 'paid')
      AND COALESCE(conversion_date, referral_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
      AND COALESCE(conversion_date, referral_date, created_at) < DATE_FORMAT(DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH), '%Y-%m-01')
  `;

  const lastMonthConversionsQuery = `
    SELECT COUNT(*) as conversions
    FROM affiliate_referrals 
    WHERE affiliate_id = ? 
      AND status IN ('approved', 'converted', 'paid')
      AND COALESCE(conversion_date, referral_date, created_at) >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01')
      AND COALESCE(conversion_date, referral_date, created_at) < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
  `;

  const currentMonthReferralLeadsQuery = `
    SELECT COUNT(*) as leads
    FROM affiliate_referrals
    WHERE affiliate_id = ?
      AND COALESCE(referral_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
      AND COALESCE(referral_date, created_at) < DATE_FORMAT(DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH), '%Y-%m-01')
  `;

  const currentMonthConversions = await executeQuery(currentMonthConversionsQuery, [affiliateId]);
  const lastMonthConversions = await executeQuery(lastMonthConversionsQuery, [affiliateId]);
  const currentMonthReferralLeads = await executeQuery(currentMonthReferralLeadsQuery, [affiliateId]);

  const currentConversions = parseInt(currentMonthConversions[0]?.conversions) || 0;
  const lastConversions = parseInt(lastMonthConversions[0]?.conversions) || 0;
  const currentReferralLeads = parseInt(currentMonthReferralLeads[0]?.leads) || 0;
  const conversionChangePercentage = lastConversions > 0
    ? ((currentConversions - lastConversions) / lastConversions * 100)
    : 0;

  const currentMonthConversionRate = currentReferralLeads > 0 ? (currentConversions / currentReferralLeads * 100) : 0;
  const currentMonthAverageCommission = currentMonthPaidCount > 0 ? (currentMonthNet / currentMonthPaidCount) : 0;

  return {
    totalEarnings: totalPaidEarnings,
    monthlyEarnings: effectiveMonthlyEarnings,
    yearlyEarnings: parseFloat(yearlyEarnings) || 0,
    totalReferrals: freshTotalReferrals,
    activeReferrals,
    clickThroughRate: 8.4,
    conversionRate: parseFloat(conversionRate.toFixed(1)),
    pendingCommissions: Math.max((totalPaidAmount + totalPendingValue) - totalPayouts, 0),
    pendingSignupCount: pendingSignups,
    commissionRate: parseFloat(affiliateData.commission_rate) || 10,
    status: affiliateData.status,
    planType: subscriptionData ? subscriptionData.plan_type : (affiliateData.plan_type || 'free'),
    actualPlanName: subscriptionData ? subscriptionData.plan_name : null,
    subscriptionStatus: subscriptionData ? subscriptionData.status : null,
    paidReferralsCount: affiliateData.paid_referrals_count || 0,
    paidCommissions: affiliateData.paid_referrals_count || 0,
    currentTierRate,
    tierInfo,
    nonRenewalsCount: parseInt(nonRenewalsCount) || 0,
    nonRenewalsAmount: parseFloat(nonRenewalsAmount.toFixed(2)) || 0,
    lostCommissionAmount: parseFloat(lostCommissionAmount) || 0,
    churnedReferrals: cancelledCount,
    churnedCommission: cancelledTotal,
    estimatedLostCommission: parseFloat(estimatedLostCommission.toFixed(2)) || 0,
    atRiskReferrals: parseInt(atRiskReferrals) || 0,
    activePayingClients,
    unpaidClients,
    cancelledClients,
    totalPayouts,
    lastPayoutDate,
    currentMRR: parseFloat(currentMRR.toFixed(2)),
    mrrBase: parseFloat(mrrBase.toFixed(2)),
    lastPayment,
    nextPayment: pendingSignups > 0 ? {
      date: nextPayment.toISOString().split('T')[0].replace(/-/g, '/'),
      status: 'Pending',
    } : null,
    paymentMethod: lastPayment ? 'Bank Transfer' : null,
    totalEarningsChange: {
      percentage: parseFloat(earningsChangePercentage.toFixed(1)),
      period: 'last month',
    },
    conversionRateChange: {
      percentage: parseFloat(conversionChangePercentage.toFixed(1)),
      period: 'last month',
    },
    currentMonthReferralLeads: currentReferralLeads,
    currentMonthConversionCount: currentConversions,
    currentMonthConversionRate: parseFloat(currentMonthConversionRate.toFixed(1)),
    currentMonthAverageCommission: parseFloat(currentMonthAverageCommission.toFixed(2)),
    currentMonthPaidCommissionCount: currentMonthPaidCount,
  };
}

export async function getAffiliateDashboardReferralsData(
  affiliateId: number,
  page: number = 1,
  limit: number = 50,
) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 50;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeOffset = (safePage - 1) * safeLimit;

  const query = `
    SELECT
      ar.id,
      ar.transaction_id,
      ar.referred_user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.stripe_customer_id,
      ar.created_at as signup_date,
      ar.conversion_date,
      u.status as user_status,
      ar.status as referral_status,
      COALESCE(ac.total_commission, ar.commission_amount, 0) as commission_earned,
      s.status as subscription_status,
      s.stripe_subscription_id,
      s.plan_name as subscription_plan_name,
      s.current_period_end,
      CASE
        WHEN u.status = 'inactive' THEN 'churned'
        WHEN s.status IN ('canceled') THEN 'cancelled'
        WHEN s.status IN ('unpaid','past_due','incomplete') THEN 'unpaid'
        WHEN ac.latest_status IN ('paid','settled','approved') OR ac.payment_date IS NOT NULL THEN 'paid'
        WHEN ar.status IN ('approved','converted','paid') THEN 'paid'
        ELSE 'pending'
      END as final_status,
      (
        SELECT bt.amount
        FROM billing_transactions bt
        WHERE bt.user_id = u.id AND bt.status = 'succeeded'
        ORDER BY bt.created_at DESC LIMIT 1
      ) as plan_price,
      (
        SELECT MAX(bt.created_at)
        FROM billing_transactions bt
        WHERE bt.user_id = u.id AND bt.status = 'succeeded'
      ) as last_payment_date,
      (
        SELECT bt.stripe_payment_intent_id
        FROM billing_transactions bt
        WHERE bt.user_id = u.id AND bt.status = 'succeeded'
        ORDER BY bt.created_at DESC LIMIT 1
      ) as stripe_transaction_id
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
    ORDER BY ar.created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

  const referrals = await executeQuery(query, [affiliateId, affiliateId]);
  const transformedReferrals = await mapWithConcurrency(referrals || [], STRIPE_PAYMENT_HISTORY_CONCURRENCY, async (referral: any) => {
    const stripePayments = await getCustomerPaymentHistory(referral.stripe_customer_id || null);
    const latestStripePayment = stripePayments[0] || null;
    const fallbackPlanPrice = referral.plan_price ? parseFloat(referral.plan_price) : null;

    return {
      id: referral.id,
      referredUserId: referral.referred_user_id,
      customerName: `${referral.first_name || ''} ${referral.last_name || ''}`.trim() || `User ${referral.id}`,
      email: referral.email,
      phone: referral.phone || null,
      status: referral.final_status,
      signupDate: referral.signup_date,
      conversionDate: referral.conversion_date,
      commission: parseFloat(referral.commission_earned) || 0,
      lifetimeValue: parseFloat(referral.commission_earned) || 0,
      tier: parseFloat(referral.commission_earned) > 100 ? 'enterprise' :
        parseFloat(referral.commission_earned) > 50 ? 'premium' : 'basic',
      transactionId: referral.transaction_id,
      planPrice: latestStripePayment ? latestStripePayment.amount : fallbackPlanPrice,
      planName: referral.subscription_plan_name || null,
      subscriptionStatus: referral.subscription_status || null,
      isStripePaid: String(referral.subscription_status || '').toLowerCase() === 'active',
      lastPaymentDate: latestStripePayment?.createdAt || referral.last_payment_date || null,
      stripeTransactionId: latestStripePayment?.paymentIntentId || referral.stripe_transaction_id || referral.transaction_id || null,
      paymentHistory: stripePayments,
      currentPeriodEnd: referral.current_period_end || null,
    };
  });

  return transformedReferrals;
}

export async function getAffiliateDashboardPurchasesData(affiliateId: number) {
  const affiliateRows = await executeQuery(
    `SELECT id, commission_rate, plan_type
     FROM affiliates
     WHERE id = ?
     LIMIT 1`,
    [affiliateId]
  );

  const affiliate = affiliateRows?.[0] || {};
  const baseCommissionRate = getAffiliateBaseCommissionRate(affiliate.plan_type, parseFloat(affiliate.commission_rate));

  const referralRows = await executeQuery(
    `SELECT
       ar.id AS referral_id,
       ar.referred_user_id,
       ar.transaction_id,
       u.first_name,
       u.last_name,
       u.email,
       u.stripe_customer_id
     FROM affiliate_referrals ar
     JOIN users u ON ar.referred_user_id = u.id
     WHERE ar.affiliate_id = ?
       AND u.stripe_customer_id IS NOT NULL
     ORDER BY ar.created_at ASC`,
    [affiliateId]
  );

  const referralPurchases = await mapWithConcurrency(referralRows || [], STRIPE_PAYMENT_HISTORY_CONCURRENCY, async (referral: any) => {
    const payments = await getCustomerPaymentHistory(referral.stripe_customer_id || null);
    return payments.map((payment) => ({
      referralId: String(referral.referral_id),
      referredUserId: referral.referred_user_id,
      customerName: `${referral.first_name || ''} ${referral.last_name || ''}`.trim() || referral.email || `User ${referral.referred_user_id}`,
      email: referral.email,
      stripeCustomerId: referral.stripe_customer_id,
      paymentIntentId: payment.paymentIntentId,
      amount: Number(payment.amount) || 0,
      currency: payment.currency,
      createdAt: payment.createdAt,
      description: payment.description || '',
      transactionId: referral.transaction_id || null,
    }));
  });

  const uniquePurchases = Array.from(
    new Map(
      referralPurchases
        .flat()
        .map((purchase) => [`${purchase.stripeCustomerId}:${purchase.paymentIntentId}`, purchase])
    ).values()
  );

  const purchases = uniquePurchases
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);
  const nextMonthStart = new Date(currentMonthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

  let currentMonthPaidCount = 0;

  const purchaseTimeline = purchases.map((purchase, index) => {
    const createdAtDate = new Date(purchase.createdAt);
    const isCurrentMonth = createdAtDate >= currentMonthStart && createdAtDate < nextMonthStart;
    if (isCurrentMonth) {
      currentMonthPaidCount += 1;
    }

    const qualifiesForBonus = isCurrentMonth && currentMonthPaidCount > 100;
    const effectiveCommissionRate = getEffectiveCommissionRate(baseCommissionRate, qualifiesForBonus);
    const commissionEarned = Number(((purchase.amount * effectiveCommissionRate) / 100).toFixed(2));

    return {
      id: `${purchase.paymentIntentId}-${index + 1}`,
      index: index + 1,
      referralId: purchase.referralId,
      referredUserId: purchase.referredUserId,
      customerName: purchase.customerName,
      email: purchase.email,
      stripeCustomerId: purchase.stripeCustomerId,
      paymentIntentId: purchase.paymentIntentId,
      amount: purchase.amount,
      currency: purchase.currency,
      createdAt: purchase.createdAt,
      description: purchase.description,
      baseCommissionRate,
      effectiveCommissionRate,
      commissionEarned,
      currentMonthPaidSequence: isCurrentMonth ? currentMonthPaidCount : null,
      isThresholdBonus: qualifiesForBonus,
      transactionId: purchase.transactionId,
    };
  });

  const summary = {
    totalPurchases: purchaseTimeline.length,
    totalRevenue: Number(purchaseTimeline.reduce((sum, purchase) => sum + purchase.amount, 0).toFixed(2)),
    totalCommissionEarned: Number(purchaseTimeline.reduce((sum, purchase) => sum + purchase.commissionEarned, 0).toFixed(2)),
    currentMonthPurchases: purchaseTimeline.filter((purchase) => purchase.currentMonthPaidSequence !== null).length,
    thresholdBonusPurchases: purchaseTimeline.filter((purchase) => purchase.isThresholdBonus).length,
    baseCommissionRate,
  };

  return {
    data: purchaseTimeline,
    summary,
  };
}

// GET /api/affiliate/dashboard/stats - Get affiliate earnings and performance stats
router.get('/dashboard/stats', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      console.log('❌ [AFFILIATE STATS] No affiliate record associated with user:', req.user?.id);
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    console.log('🔍 [AFFILIATE STATS] Starting stats fetch for affiliate ID:', affiliateId);
    
    // Get affiliate basic stats including new tier fields
    const affiliateQuery = `
      SELECT 
        total_earnings,
        total_referrals,
        commission_rate,
        plan_type,
        paid_referrals_count,
        status,
        created_at,
        admin_id
      FROM affiliates 
      WHERE id = ?
    `;
    
    console.log('📊 [AFFILIATE STATS] Executing affiliate query:', affiliateQuery, 'with params:', [affiliateId]);
    const affiliate = await executeQuery(affiliateQuery, [affiliateId]);
    console.log('📊 [AFFILIATE STATS] Affiliate query result:', affiliate);
    
    if (!affiliate || affiliate.length === 0) {
      console.log('❌ [AFFILIATE STATS] Affiliate not found for ID:', affiliateId);
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const affiliateData = affiliate[0];
    console.log('✅ [AFFILIATE STATS] Affiliate data:', affiliateData);
    
    // Check if affiliate has been upgraded to admin and get subscription info
    let subscriptionData = null;
    if (affiliateData.admin_id) {
      console.log('🔍 [AFFILIATE STATS] Checking subscription for admin_id:', affiliateData.admin_id);
      const subscriptionQuery = `
        SELECT 
          plan_name,
          plan_type,
          status,
          current_period_start,
          current_period_end
        FROM subscriptions 
        WHERE user_id = ? AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const subscriptionResult = await executeQuery(subscriptionQuery, [affiliateData.admin_id]);
      if (subscriptionResult && subscriptionResult.length > 0) {
        subscriptionData = subscriptionResult[0];
        console.log('✅ [AFFILIATE STATS] Found active subscription:', subscriptionData);
      }
    }
    
    // Check what commission tables exist
    const tablesQuery = `SHOW TABLES LIKE '%commission%'`;
    const tables = await executeQuery(tablesQuery, []);
    console.log('🗄️ [AFFILIATE STATS] Available commission tables:', tables);
    
    // Earnings aggregations (paid only)
    const earningsAggregationQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('cancelled', 'refunded', 'chargeback') THEN commission_amount ELSE 0 END), 0) AS cancelled_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_amount,
        COALESCE(SUM(CASE 
          WHEN status = 'paid' 
            AND COALESCE(payment_date, approval_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
          THEN commission_amount 
          ELSE 0 
        END), 0) AS month_paid_amount,
        COALESCE(SUM(CASE 
          WHEN status IN ('cancelled', 'refunded', 'chargeback') 
            AND COALESCE(updated_at, payment_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
          THEN commission_amount 
          ELSE 0 
        END), 0) AS month_cancelled_amount,
        COALESCE(SUM(CASE 
          WHEN status = 'paid' 
            AND COALESCE(payment_date, approval_date, created_at) >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01') 
            AND COALESCE(payment_date, approval_date, created_at) < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
          THEN commission_amount 
          ELSE 0 
        END), 0) AS prior_month_paid_amount,
        COALESCE(SUM(CASE 
          WHEN status IN ('cancelled', 'refunded', 'chargeback') 
            AND COALESCE(updated_at, payment_date, created_at) >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01') 
            AND COALESCE(updated_at, payment_date, created_at) < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
          THEN commission_amount 
          ELSE 0 
        END), 0) AS prior_month_cancelled_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE 
          WHEN status = 'paid' 
            AND COALESCE(payment_date, approval_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
          THEN 1 ELSE 0
        END) AS month_paid_count,
        COALESCE(SUM(CASE 
          WHEN status IN ('pending','approved','paid') 
            AND COALESCE(order_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') 
          THEN commission_amount 
          ELSE 0 
        END), 0) AS month_all_earned_amount
      FROM affiliate_commissions
      WHERE affiliate_id = ?
    `;

    const earningsAggregate = await executeQuery(earningsAggregationQuery, [affiliateId]);
    const {
      paid_amount: totalPaidAmountRaw = 0,
      cancelled_amount: totalCancelledAmountRaw = 0,
      pending_amount: totalPendingValueRaw = 0,
      month_paid_amount: monthPaidAmountRaw = 0,
      month_cancelled_amount: monthCancelledAmountRaw = 0,
      prior_month_paid_amount: priorMonthPaidAmountRaw = 0,
      prior_month_cancelled_amount: priorMonthCancelledAmountRaw = 0,
      pending_count: pendingCountRaw = 0,
      paid_count: paidCountRaw = 0,
      month_paid_count: monthPaidCountRaw = 0,
      month_all_earned_amount: monthAllEarnedAmountRaw = 0,
    } = earningsAggregate[0] || {};

    const totalPaidAmount = parseFloat(totalPaidAmountRaw) || 0;
    const totalCancelledAmount = parseFloat(totalCancelledAmountRaw) || 0;
    const totalPendingValue = parseFloat(totalPendingValueRaw) || 0;
    const currentMonthPaidGross = parseFloat(monthPaidAmountRaw) || 0;
    const currentMonthCancelled = parseFloat(monthCancelledAmountRaw) || 0;
    const priorMonthPaidGross = parseFloat(priorMonthPaidAmountRaw) || 0;
    const priorMonthCancelled = parseFloat(priorMonthCancelledAmountRaw) || 0;
    const pendingSignups = parseInt(pendingCountRaw) || 0;
    const paidCommissionCount = parseInt(paidCountRaw) || 0;
    const currentMonthPaidCount = parseInt(monthPaidCountRaw) || 0;
    const monthAllEarnedAmount = parseFloat(monthAllEarnedAmountRaw) || 0;

    const totalPaidEarnings = totalPaidAmount - totalCancelledAmount;
    const currentMonthNet = currentMonthPaidGross - currentMonthCancelled;
    const priorMonthNet = priorMonthPaidGross - priorMonthCancelled;

    // Calculate REAL monthly earnings from billing transactions of referrals this month
    // This captures recurring payments, not just initial signup commissions
    const commissionRate = parseFloat(affiliateData.commission_rate) || 10;
    const monthlyBillingQuery = `
      SELECT COALESCE(SUM(bt.amount), 0) AS total_referral_revenue_this_month
      FROM billing_transactions bt
      JOIN affiliate_referrals ar ON bt.user_id = ar.referred_user_id
      WHERE ar.affiliate_id = ?
        AND bt.status = 'succeeded'
        AND bt.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
    `;
    const monthlyBillingResult = await executeQuery(monthlyBillingQuery, [affiliateId]);
    const totalReferralRevenueThisMonth = parseFloat(monthlyBillingResult[0]?.total_referral_revenue_this_month) || 0;
    const realMonthlyEarnings = (totalReferralRevenueThisMonth * commissionRate) / 100;
    // Use whichever is higher: commission records this month OR calculated from billing
    const effectiveMonthlyEarnings = Math.max(monthAllEarnedAmount, realMonthlyEarnings);

    // Paid totals by status buckets (paid/cancelled/churned)
    const statusBreakdownQuery = `
      SELECT status, COALESCE(SUM(commission_amount), 0) AS amount, COUNT(*) AS count
      FROM affiliate_commissions
      WHERE affiliate_id = ? AND status IN ('paid', 'cancelled', 'refunded', 'chargeback')
      GROUP BY status
    `;
    const statusBreakdown = await executeQuery(statusBreakdownQuery, [affiliateId]);
    const cancelledTotal = statusBreakdown
      .filter((row: any) => ['cancelled', 'refunded', 'chargeback'].includes(row.status))
      .reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);

    const cancelledCount = statusBreakdown
      .filter((row: any) => ['cancelled', 'refunded', 'chargeback'].includes(row.status))
      .reduce((sum: number, row: any) => sum + (parseInt(row.count) || 0), 0);

    // Get active referrals count - only count approved/converted referrals (paid customers)
    const activeReferralsQuery = `
      SELECT COUNT(DISTINCT ar.id) as active_referrals
      FROM affiliate_referrals ar
      WHERE ar.affiliate_id = ? 
        AND ar.status IN ('approved', 'converted')
    `;
    
    console.log('👥 [AFFILIATE STATS] Executing active referrals query:', activeReferralsQuery, 'with params:', [affiliateId]);
    const activeResult = await executeQuery(activeReferralsQuery, [affiliateId]);
    console.log('👥 [AFFILIATE STATS] Active referrals result:', activeResult);
    const activeReferrals = activeResult[0]?.active_referrals || 0;
    
    // Calculate conversion rate with better logic
    const conversionRate = affiliateData.total_referrals > 0 ? (activeReferrals / affiliateData.total_referrals * 100) : 0;
    
    // Get next payment date (first day of next month)
    const nextPayment = new Date();
    nextPayment.setMonth(nextPayment.getMonth() + 1);
    nextPayment.setDate(1);
    
    // Calculate current tier commission rate based on plan type and referrals
    const calculateCurrentTierRate = (planType, paidReferralsCount) => {
      // Normalize plan type - handle both affiliate plan types and subscription plan types
      const normalizedPlanType = planType?.toLowerCase();
      
      // Check if user has a paid plan (from subscription data or affiliate data)
      const hasPaidPlan = subscriptionData?.status === 'active' || 
                         normalizedPlanType === 'paid_partner' || 
                         normalizedPlanType === 'partner' || 
                         normalizedPlanType === 'pro' || 
                         normalizedPlanType === 'premium';
      
      if (!hasPaidPlan || normalizedPlanType === 'free' || normalizedPlanType === 'starter') {
        return paidReferralsCount >= 100 ? 15.0 : 10.0;
      } else {
        // User has a paid plan (Pro/Premium/Partner)
        return paidReferralsCount >= 100 ? 25.0 : 20.0;
      }
    };

    const currentTierRate = calculateCurrentTierRate(affiliateData.plan_type, affiliateData.paid_referrals_count);
    
    // Determine tier name and next tier info
    const getTierInfo = (planType, paidReferralsCount) => {
      // Normalize plan type - handle both affiliate plan types and subscription plan types
      const normalizedPlanType = planType?.toLowerCase();
      
      // Check if user has a paid plan (from subscription data or affiliate data)
      const hasPaidPlan = subscriptionData?.status === 'active' || 
                         normalizedPlanType === 'paid_partner' || 
                         normalizedPlanType === 'partner' || 
                         normalizedPlanType === 'pro' || 
                         normalizedPlanType === 'premium';
      
      if (!hasPaidPlan || normalizedPlanType === 'free' || normalizedPlanType === 'starter') {
        if (paidReferralsCount >= 100) {
          return {
            currentTier: 'Free - Advanced',
            nextTier: 'Upgrade to Pro Partner for higher rates',
            progressToNext: 100,
            referralsToNext: 0
          };
        } else {
          return {
            currentTier: 'Free - Starter',
            nextTier: 'Free - Advanced (15%)',
            progressToNext: (paidReferralsCount / 100) * 100,
            referralsToNext: 100 - paidReferralsCount
          };
        }
      } else {
        // User has a paid plan (Pro/Premium/Partner)
        if (paidReferralsCount >= 100) {
          return {
            currentTier: 'Pro - Premium',
            nextTier: 'Maximum tier reached',
            progressToNext: 100,
            referralsToNext: 0
          };
        } else {
          return {
            currentTier: 'Pro - Standard',
            nextTier: 'Pro - Premium (25%)',
            progressToNext: (paidReferralsCount / 100) * 100,
            referralsToNext: 100 - paidReferralsCount
          };
        }
      }
    };

    const tierInfo = getTierInfo(affiliateData.plan_type, affiliateData.paid_referrals_count);

    // Non-renewals: referrals who are NOT cancelled but have unpaid/past_due subscriptions (didn't pay)
    const nonRenewalsQuery = `
      SELECT 
        COUNT(DISTINCT ar.id) as non_renewals_count,
        COALESCE(SUM(
          CASE
            WHEN s.plan_type = 'yearly' THEN CAST(bt_latest.amount AS DECIMAL(10,2)) / 12
            ELSE CAST(bt_latest.amount AS DECIMAL(10,2))
          END
        ), 0) as non_renewal_revenue
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN (
        SELECT bt.user_id, bt.amount
        FROM billing_transactions bt
        INNER JOIN (
          SELECT user_id, MAX(id) as max_id
          FROM billing_transactions
          WHERE status = 'succeeded'
          GROUP BY user_id
        ) bt_latest_ids ON bt.id = bt_latest_ids.max_id
      ) bt_latest ON bt_latest.user_id = u.id
      WHERE ar.affiliate_id = ?
        AND ar.status NOT IN ('cancelled')
        AND (s.status IN ('unpaid', 'past_due', 'incomplete', 'incomplete_expired') OR s.id IS NULL)
        AND u.status != 'inactive'
    `;
    
    console.log('📉 [AFFILIATE STATS] Executing non-renewals query:', nonRenewalsQuery, 'with params:', [affiliateId]);
    const nonRenewalsResult = await executeQuery(nonRenewalsQuery, [affiliateId]);
    console.log('📉 [AFFILIATE STATS] Non-renewals result:', nonRenewalsResult);
    const nonRenewalsCount = nonRenewalsResult[0]?.non_renewals_count || 0;
    const nonRenewalRevenue = parseFloat(nonRenewalsResult[0]?.non_renewal_revenue) || 0;
    const nonRenewalsAmount = (nonRenewalRevenue * currentTierRate) / 100;

    // Lost commission: total revenue paid by referrals who are now cancelled/churned × commission rate
    // Must match the same cancellation detection used in the pipeline (subscription status or user inactive),
    // not just affiliate_referrals.status which is often never updated to 'cancelled'.
    const lostCommissionQuery = `
      SELECT COALESCE(SUM(bt.amount), 0) as cancelled_revenue
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      JOIN billing_transactions bt ON bt.user_id = ar.referred_user_id AND bt.status = 'succeeded'
      WHERE ar.affiliate_id = ?
        AND (
          ar.status = 'cancelled'
          OR s.status IN ('canceled', 'cancelled')
          OR (u.status = 'inactive' AND (s.status IS NULL OR s.status != 'active'))
        )
    `;
    const lostCommissionResult = await executeQuery(lostCommissionQuery, [affiliateId]);
    const cancelledRevenue = parseFloat(lostCommissionResult[0]?.cancelled_revenue) || 0;
    const lostCommissionAmount = (cancelledRevenue * commissionRate) / 100;

    // Calculate potential lost commission for next month (based on current active referrals who might not renew)
    const potentialLostCommissionQuery = `
      SELECT COUNT(DISTINCT ar.id) as at_risk_referrals,
             COALESCE(AVG(ac.commission_amount), 0) as avg_commission
      FROM affiliate_referrals ar
      JOIN affiliate_commissions ac ON ar.id = ac.referral_id
      LEFT JOIN users u ON ar.referred_user_id = u.id
      WHERE ar.affiliate_id = ? 
        AND ar.status IN ('approved', 'converted', 'paid')
        AND ac.status = 'paid'
        AND (u.status IS NULL OR u.status = 'active')
    `;
    
    console.log('⚠️ [AFFILIATE STATS] Executing potential lost commission query:', potentialLostCommissionQuery, 'with params:', [affiliateId]);
    const potentialLostResult = await executeQuery(potentialLostCommissionQuery, [affiliateId]);
    console.log('⚠️ [AFFILIATE STATS] Potential lost commission result:', potentialLostResult);
    const atRiskReferrals = potentialLostResult[0]?.at_risk_referrals || 0;
    const avgCommission = potentialLostResult[0]?.avg_commission || 0;
    
    // Get actual yearly earnings (last 12 months of paid commissions)
    const yearlyEarningsQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as yearly_earnings
      FROM affiliate_commissions 
      WHERE affiliate_id = ? 
        AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        AND status = 'paid'
    `;
    
    console.log('📅 [AFFILIATE STATS] Executing yearly earnings query:', yearlyEarningsQuery, 'with params:', [affiliateId]);
    const yearlyResult = await executeQuery(yearlyEarningsQuery, [affiliateId]);
    console.log('📅 [AFFILIATE STATS] Yearly earnings result:', yearlyResult);
    const yearlyEarnings = yearlyResult[0]?.yearly_earnings || 0;

    // Estimate potential lost commission (assuming 20% churn rate)
    const estimatedLostCommission = atRiskReferrals * avgCommission * 0.2;

    // Get fresh total referrals count from source table
    const freshTotalReferralsQuery = `
      SELECT COUNT(*) as total_referrals_count
      FROM affiliate_referrals
      WHERE affiliate_id = ?
    `;
    const freshTotalResult = await executeQuery(freshTotalReferralsQuery, [affiliateId]);
    const freshTotalReferrals = parseInt(freshTotalResult[0]?.total_referrals_count) || 0;

    // Get subscription-aware referral breakdown
    const [activePayingResult, unpaidClientsResult, cancelledClientsResult] = await Promise.all([
      executeQuery(`
        SELECT COUNT(DISTINCT ar.id) as active_paying
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE ar.affiliate_id = ?
          AND s.status = 'active'
      `, [affiliateId]),
      executeQuery(`
        SELECT COUNT(DISTINCT ar.id) as unpaid_clients
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE ar.affiliate_id = ?
          AND s.status IN ('unpaid', 'past_due', 'incomplete')
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
      `, [affiliateId])
    ]);

    const activePayingClients = parseInt(activePayingResult[0]?.active_paying) || 0;
    const unpaidClients = parseInt(unpaidClientsResult[0]?.unpaid_clients) || 0;
    const cancelledClients = parseInt(cancelledClientsResult[0]?.cancelled_clients) || 0;

    // Get payout totals from both payout tables
    let totalPayouts = 0;
    let lastPayoutDate: string | null = null;
    try {
      // Ensure affiliate_payouts table exists
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS affiliate_payouts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          affiliate_id INT NOT NULL,
          admin_user_id INT NULL,
          commission_month CHAR(7) NOT NULL,
          payout_month CHAR(7) NOT NULL,
          amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          invoice_id INT NULL,
          invoice_number VARCHAR(64) NULL,
          invoice_public_token VARCHAR(64) NULL,
          invoice_url VARCHAR(255) NULL,
          status ENUM('generated','emailed','paid','cancelled') DEFAULT 'generated',
          paid_at DATETIME NULL,
          notes VARCHAR(255) NULL,
          payslip_number VARCHAR(64) NULL,
          payslip_token VARCHAR(64) NULL,
          payslip_url VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_affiliate_commission_month (affiliate_id, commission_month)
        )
      `, []);

      const payoutsResult = await executeQuery(`
        SELECT
          COALESCE(
            (SELECT SUM(amount) FROM affiliate_payouts WHERE affiliate_id = ? AND status IN ('generated', 'emailed', 'paid')),
            0
          ) +
          COALESCE(
            (SELECT SUM(amount) FROM commission_payments WHERE affiliate_id = ? AND status IN ('pending', 'completed')),
            0
          ) as total_payouts,
          GREATEST(
            COALESCE((SELECT MAX(COALESCE(paid_at, created_at)) FROM affiliate_payouts WHERE affiliate_id = ? AND status IN ('generated', 'emailed', 'paid')), '1970-01-01'),
            COALESCE((SELECT MAX(COALESCE(payment_date, created_at)) FROM commission_payments WHERE affiliate_id = ? AND status IN ('pending', 'completed')), '1970-01-01')
          ) as last_payout_date
      `, [affiliateId, affiliateId, affiliateId, affiliateId]);
      totalPayouts = parseFloat(payoutsResult[0]?.total_payouts) || 0;
      const rawPayoutDate = payoutsResult[0]?.last_payout_date;
      if (rawPayoutDate && rawPayoutDate !== '1970-01-01' && rawPayoutDate !== '1970-01-01 00:00:00') {
        lastPayoutDate = rawPayoutDate;
      }
    } catch (payoutErr) {
      console.warn('[AFFILIATE STATS] Payout query failed, using defaults:', payoutErr);
    }

    // Calculate MRR driven by this affiliate
    let currentMRR = 0;
    let mrrBase = 0;
    try {
      const mrrResult = await executeQuery(`
        SELECT COALESCE(SUM(
          CASE
            WHEN s.plan_type = 'yearly' THEN CAST(bt_latest.amount AS DECIMAL(10,2)) / 12
            ELSE CAST(bt_latest.amount AS DECIMAL(10,2))
          END
        ), 0) as mrr_base
        FROM affiliate_referrals ar
        JOIN users u ON ar.referred_user_id = u.id
        JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN (
          SELECT bt.user_id, bt.amount
          FROM billing_transactions bt
          INNER JOIN (
            SELECT user_id, MAX(id) as max_id
            FROM billing_transactions
            WHERE status = 'succeeded'
            GROUP BY user_id
          ) bt_max ON bt.id = bt_max.max_id
        ) bt_latest ON bt_latest.user_id = u.id
        WHERE ar.affiliate_id = ?
      `, [affiliateId]);
      mrrBase = parseFloat(mrrResult[0]?.mrr_base) || 0;
      currentMRR = mrrBase * (currentTierRate / 100);
    } catch (mrrErr) {
      console.warn('[AFFILIATE STATS] MRR query failed:', mrrErr);
    }

    // Get payment information
    const lastPaymentQuery = `
      SELECT 
        commission_amount as amount,
        DATE_FORMAT(created_at, '%b %d') as date
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status = 'paid'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const lastPaymentResult = await executeQuery(lastPaymentQuery, [affiliateId]);
    const lastPayment = lastPaymentResult[0] ? {
      amount: parseFloat(lastPaymentResult[0].amount),
      date: lastPaymentResult[0].date
    } : null;

    // Calculate percentage changes (comparing current month to last month)
    const earningsChangePercentage = priorMonthNet > 0 ? 
      ((currentMonthNet - priorMonthNet) / priorMonthNet * 100) : (currentMonthNet > 0 ? 100 : 0);

    // Calculate conversion rate change (current month vs last month)
    const currentMonthConversionsQuery = `
      SELECT COUNT(*) as conversions
      FROM affiliate_referrals 
      WHERE affiliate_id = ? 
        AND status IN ('approved', 'converted', 'paid')
        AND COALESCE(conversion_date, referral_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
        AND COALESCE(conversion_date, referral_date, created_at) < DATE_FORMAT(DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH), '%Y-%m-01')
    `;

    const lastMonthConversionsQuery = `
      SELECT COUNT(*) as conversions
      FROM affiliate_referrals 
      WHERE affiliate_id = ? 
        AND status IN ('approved', 'converted', 'paid')
        AND COALESCE(conversion_date, referral_date, created_at) >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND COALESCE(conversion_date, referral_date, created_at) < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
    `;

    const currentMonthReferralLeadsQuery = `
      SELECT COUNT(*) as leads
      FROM affiliate_referrals
      WHERE affiliate_id = ?
        AND COALESCE(referral_date, created_at) >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
        AND COALESCE(referral_date, created_at) < DATE_FORMAT(DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH), '%Y-%m-01')
    `;
    
    const currentMonthConversions = await executeQuery(currentMonthConversionsQuery, [affiliateId]);
    const lastMonthConversions = await executeQuery(lastMonthConversionsQuery, [affiliateId]);
    const currentMonthReferralLeads = await executeQuery(currentMonthReferralLeadsQuery, [affiliateId]);
    
    const currentConversions = parseInt(currentMonthConversions[0]?.conversions) || 0;
    const lastConversions = parseInt(lastMonthConversions[0]?.conversions) || 0;
    const currentReferralLeads = parseInt(currentMonthReferralLeads[0]?.leads) || 0;

    const conversionChangePercentage = lastConversions > 0 ? 
      ((currentConversions - lastConversions) / lastConversions * 100) : 0;

    const currentMonthConversionRate = currentReferralLeads > 0 ? (currentConversions / currentReferralLeads * 100) : 0;
    const currentMonthAverageCommission = currentMonthPaidCount > 0 ? (currentMonthNet / currentMonthPaidCount) : 0;

    const stats = {
      totalEarnings: totalPaidEarnings,
      monthlyEarnings: effectiveMonthlyEarnings,
      yearlyEarnings: parseFloat(yearlyEarnings) || 0,
      totalReferrals: freshTotalReferrals,
      activeReferrals: activeReferrals,
      clickThroughRate: 8.4, // Mock data - would need click tracking
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      pendingCommissions: Math.max((totalPaidAmount + totalPendingValue) - totalPayouts, 0),
      pendingSignupCount: pendingSignups,
      commissionRate: parseFloat(affiliateData.commission_rate) || 10,
      status: affiliateData.status,
      // New tier-related fields - prioritize subscription data if available
      planType: subscriptionData ? subscriptionData.plan_type : (affiliateData.plan_type || 'free'),
      actualPlanName: subscriptionData ? subscriptionData.plan_name : null,
      subscriptionStatus: subscriptionData ? subscriptionData.status : null,
      paidReferralsCount: affiliateData.paid_referrals_count || 0,
      paidCommissions: affiliateData.paid_referrals_count || 0, // Add this field for frontend compatibility
      currentTierRate: currentTierRate,
      tierInfo: tierInfo,
      // New non-renewals and lost commission fields
      nonRenewalsCount: parseInt(nonRenewalsCount) || 0,
      nonRenewalsAmount: parseFloat(nonRenewalsAmount.toFixed(2)) || 0,
      lostCommissionAmount: parseFloat(lostCommissionAmount) || 0,
      churnedReferrals: cancelledCount,
      churnedCommission: cancelledTotal,
      estimatedLostCommission: parseFloat(estimatedLostCommission.toFixed(2)) || 0,
      atRiskReferrals: parseInt(atRiskReferrals) || 0,
      // Subscription-aware breakdown
      activePayingClients,
      unpaidClients,
      cancelledClients,
      // Payout data (separated from earnings)
      totalPayouts,
      lastPayoutDate,
      // MRR
      currentMRR: parseFloat(currentMRR.toFixed(2)),
      mrrBase: parseFloat(mrrBase.toFixed(2)),
      // Payment information
      lastPayment: lastPayment,
      nextPayment: pendingSignups > 0 ? {
        date: nextPayment.toISOString().split('T')[0].replace(/-/g, '/'),
        status: 'Pending'
      } : null,
      paymentMethod: lastPayment ? 'Bank Transfer' : null,
      // Percentage changes
      totalEarningsChange: {
        percentage: parseFloat(earningsChangePercentage.toFixed(1)),
        period: 'last month'
      },
      conversionRateChange: {
        percentage: parseFloat(conversionChangePercentage.toFixed(1)),
        period: 'last month'
      },
      currentMonthReferralLeads: currentReferralLeads,
      currentMonthConversionCount: currentConversions,
      currentMonthConversionRate: parseFloat(currentMonthConversionRate.toFixed(1)),
      currentMonthAverageCommission: parseFloat(currentMonthAverageCommission.toFixed(2)),
      currentMonthPaidCommissionCount: currentMonthPaidCount
    };
    
    console.log('📈 [AFFILIATE STATS] Final stats object:', stats);
    console.log('🎯 [AFFILIATE STATS] Key values - Total Earnings:', stats.totalEarnings, 'Monthly:', stats.monthlyEarnings, 'Yearly:', stats.yearlyEarnings, 'Pending Signups:', stats.pendingCommissions);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('💥 [AFFILIATE STATS] Error fetching affiliate stats:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate statistics' });
  }
});

// GET /api/affiliate/dashboard/recent-referrals - Get recent referrals
router.get('/dashboard/recent-referrals', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const limitParam = parseInt(req.query.limit as string);
    const safeLimit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 10;
    
    const columnCheckQuery = `
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'affiliate_referrals' 
        AND COLUMN_NAME IN ('plan_name', 'plan_price')
    `;

    let columnRows: any[] = [];
    try {
      columnRows = await executeQuery(columnCheckQuery, []);
    } catch (columnErr) {
      console.warn('[affiliate/dashboard/recent-referrals] Column check failed, continuing with defaults:', columnErr);
      columnRows = [];
    }
    const columnSet = new Set((columnRows as any[]).map((row) => row.COLUMN_NAME));
    const hasPlanNameColumn = columnSet.has('plan_name');
    const hasPlanPriceColumn = columnSet.has('plan_price');

    const selectColumns = [
      'ar.id',
      'ar.transaction_id',
      hasPlanNameColumn ? 'ar.plan_name' : 'NULL AS plan_name',
      hasPlanPriceColumn ? 'ar.plan_price' : 'NULL AS plan_price',
      'ar.commission_amount',
      'ar.status AS referral_status',
      'ar.created_at AS signup_date',
      'ar.conversion_date',
      'u.first_name',
      'u.last_name',
      'u.email',
      'u.phone',
      'u.status AS user_status',
      's.plan_name AS subscription_plan',
      's.plan_type AS subscription_plan_type',
      's.status AS subscription_status',
      's.stripe_subscription_id',
      's.current_period_end',
      `(SELECT MAX(bt.created_at) FROM billing_transactions bt WHERE bt.user_id = u.id AND bt.status = 'succeeded') AS last_payment_date`,
      `(SELECT bt.stripe_payment_intent_id FROM billing_transactions bt WHERE bt.user_id = u.id AND bt.status = 'succeeded' ORDER BY bt.created_at DESC LIMIT 1) AS last_transaction_id`
    ];

    const referralsQuery = `
      SELECT 
        ${selectColumns.join(',\n        ')}
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ar.affiliate_id = ?
      ORDER BY ar.created_at DESC
      LIMIT ${safeLimit}
    `;

    const referrals = await executeQuery(referralsQuery, [affiliateId]);

    const transformedReferrals = referrals.map((referral: any) => {
      const baseStatus = String(referral.referral_status || '').toLowerCase();
      const userStatus = String(referral.user_status || '').toLowerCase();
      const subscriptionStatus = String(referral.subscription_status || '').toLowerCase();

      let normalizedStatus: 'paid' | 'cancelled' | 'churned' | 'pending' | 'unpaid' = 'pending';

      if (['paid', 'approved', 'converted'].includes(baseStatus)) {
        if (['canceled', 'cancelled'].includes(subscriptionStatus)) {
          normalizedStatus = 'cancelled';
        } else if (['unpaid', 'past_due', 'incomplete'].includes(subscriptionStatus)) {
          normalizedStatus = 'unpaid';
        } else {
          normalizedStatus = 'paid';
        }
      } else if (['cancelled', 'refunded', 'expired'].includes(baseStatus)) {
        normalizedStatus = 'cancelled';
      } else if (['inactive'].includes(userStatus)) {
        normalizedStatus = 'churned';
      } else if (['canceled', 'cancelled'].includes(subscriptionStatus)) {
        normalizedStatus = 'cancelled';
      } else if (['unpaid', 'past_due', 'incomplete'].includes(subscriptionStatus)) {
        normalizedStatus = 'unpaid';
      } else if (baseStatus === 'pending') {
        normalizedStatus = 'pending';
      } else {
        normalizedStatus = 'unpaid';
      }

      const planName = referral.plan_name || referral.subscription_plan || 'No Plan';
      const planValue = referral.plan_price != null ? Number(referral.plan_price) : 0;
      const commission = parseFloat(referral.commission_amount) || 0;

      return {
        id: referral.id,
        transactionId: referral.transaction_id,
        customerName: `${referral.first_name || ''} ${referral.last_name || ''}`.trim() || `User ${referral.id}`,
        email: referral.email,
        phone: referral.phone,
        status: normalizedStatus,
        planName,
        planValue,
        commission,
        dateReferred: referral.signup_date,
        conversionDate: referral.conversion_date,
        subscriptionStatus: referral.subscription_status || null,
        isStripePaid: subscriptionStatus === 'active',
        lastPaymentDate: referral.last_payment_date || null,
        lastTransactionId: referral.last_transaction_id || referral.transaction_id || null,
        currentPeriodEnd: referral.current_period_end || null,
      };
    });
    
    res.json({
      success: true,
      data: transformedReferrals
    });
    
  } catch (error) {
    console.error('Error fetching recent referrals:', error);
    res.status(500).json({ error: 'Failed to fetch recent referrals' });
  }
});

// GET /api/affiliate/dashboard/performance - Get performance metrics
router.get('/dashboard/performance', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Get monthly performance for the last 6 months
    const performanceQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as referrals,
        COALESCE(SUM(commission_amount), 0) as earnings
      FROM affiliate_commissions
      WHERE affiliate_id = ? 
        AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
        AND status = 'paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 6
    `;
    
    const performance = await executeQuery(performanceQuery, [affiliateId]);
    
    const transformedPerformance = performance.map((item: any) => ({
      month: item.month,
      referrals: item.referrals,
      earnings: parseFloat(item.earnings) || 0
    }));
    
    res.json({
      success: true,
      data: transformedPerformance
    });
    
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// GET /api/affiliate/dashboard/commissions - Get commission history
router.get('/dashboard/commissions', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const pageNum = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const safeOffset = (pageNum - 1) * limitNum;
    
    const query = `
      SELECT 
        ac.id,
        ac.customer_name,
        ac.customer_email,
        ac.order_value,
        ac.commission_rate,
        ac.commission_amount,
        ac.status,
        ac.tier,
        ac.product,
        ac.order_date,
        ac.payment_date,
        ac.commission_type,
        ac.tracking_code,
        ac.created_at
      FROM affiliate_commissions ac
      WHERE ac.affiliate_id = ?
      ORDER BY ac.created_at DESC
      LIMIT ${limitNum} OFFSET ${safeOffset}
    `;
    
    const commissions = await executeQuery(query, [affiliateId]);
    
    const transformedCommissions = commissions.map((commission: any) => ({
      id: commission.id,
      customerName: commission.customer_name,
      customerEmail: commission.customer_email,
      orderValue: parseFloat(commission.order_value) || 0,
      commissionRate: parseFloat(commission.commission_rate) || 0,
      commissionAmount: parseFloat(commission.commission_amount) || 0,
      status: commission.status,
      tier: commission.tier,
      product: commission.product,
      orderDate: commission.order_date,
      paymentDate: commission.payment_date,
      type: commission.commission_type || 'signup',
      trackingCode: commission.tracking_code,
      createdAt: commission.created_at
    }));
    
    res.json({
      success: true,
      data: transformedCommissions
    });
    
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commission history' });
  }
});

// POST /api/affiliate/dashboard/generate-link - Generate affiliate tracking link(s)
router.post('/dashboard/generate-link', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const { campaign, customCode, linkType } = req.body;
    
    // Generate unique tracking code
    const trackingCode = customCode || `AFF${affiliateId}_${Date.now()}`;
    const baseUrl = process.env.FRONTEND_URL || 'https://creditrepairpro.com';
    const productLink = `${baseUrl}/ref/${affiliateId}?campaign=${campaign || 'general'}&code=${trackingCode}`;
    const affiliateOnlyLink = `${baseUrl}/join-affiliate?ref=${affiliateId}&campaign=${campaign || 'general'}&code=${trackingCode}`;
    
    // Log link generation
    securityLogger.logSecurityEvent('affiliate_link_generated', {
      affiliateId,
      trackingCode,
      campaign: campaign || 'general',
      ip: req.ip
    });
    
    if (linkType === 'affiliate_only') {
      return res.json({
        success: true,
        data: {
          link: affiliateOnlyLink,
          trackingCode,
          campaign: campaign || 'general',
          type: 'affiliate_only'
        }
      });
    }
    if (linkType === 'product') {
      return res.json({
        success: true,
        data: {
          link: productLink,
          trackingCode,
          campaign: campaign || 'general',
          type: 'product'
        }
      });
    }
    return res.json({
      success: true,
      data: {
        productLink,
        affiliateOnlyLink,
        trackingCode,
        campaign: campaign || 'general'
      }
    });
    
  } catch (error) {
    console.error('Error generating affiliate link:', error);
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

// GET /api/affiliate/dashboard/analytics - Get performance analytics
router.get('/dashboard/analytics', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Get click through rate and conversion data
    const analyticsQuery = `
      SELECT 
        COUNT(DISTINCT ar.id) as total_referrals,
        COUNT(DISTINCT CASE WHEN u.status = 'active' THEN ar.id END) as conversions,
        AVG(CASE WHEN u.status = 'active' THEN 50.0 ELSE 0 END) as avg_order_value
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      WHERE ar.affiliate_id = ?
    `;
    
    const analyticsResult = await executeQuery(analyticsQuery, [affiliateId]);
    const analytics = analyticsResult[0] || {};
    
    // Get monthly earnings for chart
    const earningsQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COALESCE(SUM(commission_amount), 0) as earnings
      FROM affiliate_commissions
      WHERE affiliate_id = ? 
        AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
        AND status = 'paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY created_at ASC
      LIMIT 6
    `;
    
    const earningsResult = await executeQuery(earningsQuery, [affiliateId]);
    
    const performanceData = {
      clickThroughRate: 12.8, // Mock data - would need click tracking
      conversionRate: analytics.total_referrals > 0 ? 
        ((analytics.conversions / analytics.total_referrals) * 100).toFixed(1) : 0,
      averageOrderValue: parseFloat(analytics.avg_order_value) || 0,
      totalClicks: analytics.total_referrals * 10, // Mock multiplier
      totalConversions: analytics.conversions || 0,
      earningsChart: earningsResult.map((item: any) => ({
        month: item.month,
        earnings: parseFloat(item.earnings) || 0
      }))
    };
    
    res.json({
      success: true,
      data: performanceData
    });
    
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

router.get('/analytics/stats', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ success: false, error: 'Affiliate not found for this user' });
    }
    const totalsQuery = `
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as conversions,
        COALESCE(SUM(ar.commission_amount), 0) as revenue
      FROM affiliate_referrals ar
      LEFT JOIN users u ON u.id = ar.referred_user_id
      WHERE ar.affiliate_id = ?
    `;
    const totals = await executeQuery(totalsQuery, [affiliateId]);
    const t = totals && totals[0] ? totals[0] : { total_referrals: 0, conversions: 0, revenue: 0 };
    const totalClicks = (t.total_referrals || 0) * 10;
    const uniqueVisitors = t.total_referrals || 0;
    const conversions = t.conversions || 0;
    const conversionRate = uniqueVisitors > 0 ? Number(((conversions / uniqueVisitors) * 100).toFixed(1)) : 0;
    const clickThroughRate = totalClicks > 0 ? Number(((conversions / totalClicks) * 100).toFixed(1)) : 0;
    res.json({
      success: true,
      data: {
        totalClicks,
        uniqueVisitors,
        conversions,
        conversionRate,
        clickThroughRate,
        avgSessionDuration: '0:00',
        bounceRate: 0,
        topReferralSource: 'Direct'
      }
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics stats' });
  }
});

router.get('/analytics/traffic-sources', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ success: false, error: 'Affiliate not found for this user' });
    }
    res.json({
      success: true,
      data: [
        { source: 'Direct', clicks: 0, conversions: 0, conversionRate: 0, revenue: 0 },
        { source: 'Social', clicks: 0, conversions: 0, conversionRate: 0, revenue: 0 },
        { source: 'Email', clicks: 0, conversions: 0, conversionRate: 0, revenue: 0 },
        { source: 'Search', clicks: 0, conversions: 0, conversionRate: 0, revenue: 0 }
      ]
    });
  } catch (error) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch traffic sources' });
  }
});

router.get('/analytics/geographic', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ success: false, error: 'Affiliate not found for this user' });
    }
    res.json({
      success: true,
      data: [
        { country: 'United States', clicks: 0, conversions: 0, revenue: 0 }
      ]
    });
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch geographic data' });
  }
});

router.get('/analytics/devices', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ success: false, error: 'Affiliate not found for this user' });
    }
    res.json({
      success: true,
      data: [
        { device: 'Mobile', clicks: 0, percentage: 60 },
        { device: 'Desktop', clicks: 0, percentage: 35 },
        { device: 'Tablet', clicks: 0, percentage: 5 }
      ]
    });
  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch device data' });
  }
});

router.get('/analytics/time-series', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ success: false, error: 'Affiliate not found for this user' });
    }
    const range = String(req.query.range || '30d');
    const interval = range === '7d' ? '7 DAY' : range === '90d' ? '90 DAY' : range === '1y' ? '365 DAY' : '30 DAY';
    const tsQuery = `
      SELECT 
        DATE(ar.created_at) as date,
        COUNT(*) as clicks,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as conversions,
        COALESCE(SUM(ar.commission_amount), 0) as revenue
      FROM affiliate_referrals ar
      LEFT JOIN users u ON u.id = ar.referred_user_id
      WHERE ar.affiliate_id = ? AND ar.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
      GROUP BY DATE(ar.created_at)
      ORDER BY date ASC
    `;
    const rows = await executeQuery(tsQuery, [affiliateId]);
    const data = Array.isArray(rows) ? rows.map((r: any) => ({
      date: r.date,
      clicks: Number(r.clicks) || 0,
      conversions: Number(r.conversions) || 0,
      revenue: Number(r.revenue) || 0
    })) : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch time series data' });
  }
});

router.get('/analytics/top-links', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ success: false, error: 'Affiliate not found for this user' });
    }
    const tlQuery = `
      SELECT 
        COALESCE(ac.tracking_code, CONCAT('AFF-', ac.affiliate_id)) as tracking_code,
        COUNT(*) as clicks,
        COUNT(CASE WHEN ac.status = 'paid' THEN 1 END) as conversions,
        COALESCE(SUM(ac.commission_amount), 0) as revenue
      FROM affiliate_commissions ac
      WHERE ac.affiliate_id = ?
      GROUP BY tracking_code
      ORDER BY clicks DESC
      LIMIT 10
    `;
    const rows = await executeQuery(tlQuery, [affiliateId]);
    const data = Array.isArray(rows) ? rows.map((r: any, idx: number) => ({
      id: String(idx + 1),
      url: `/r/${affiliateId}?code=${encodeURIComponent(r.tracking_code || 'general')}`,
      clicks: Number(r.clicks) || 0,
      conversions: Number(r.conversions) || 0,
      revenue: Number(r.revenue) || 0,
      conversionRate: (Number(r.clicks) || 0) > 0 ? Number(((Number(r.conversions) || 0) / Number(r.clicks) * 100).toFixed(1)) : 0
    })) : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching top links:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top links' });
  }
});

// GET /api/affiliate/referrals - Get all referrals for the affiliate
router.get('/referrals', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const pageParam = parseInt(req.query.page as string);
    const limitParam = parseInt(req.query.limit as string);
    const safeLimit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 50;
    const safePage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const safeOffset = (safePage - 1) * safeLimit;
    
    const query = `
      SELECT
        ar.id,
        ar.transaction_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.stripe_customer_id,
        ar.created_at as signup_date,
        ar.conversion_date,
        u.status as user_status,
        ar.status as referral_status,
        COALESCE(ac.total_commission, ar.commission_amount, 0) as commission_earned,
        s.status as subscription_status,
        s.stripe_subscription_id,
        s.plan_name as subscription_plan_name,
        s.current_period_end,
        CASE
          WHEN u.status = 'inactive' THEN 'churned'
          WHEN s.status IN ('canceled') THEN 'cancelled'
          WHEN s.status IN ('unpaid','past_due','incomplete') THEN 'unpaid'
          WHEN ac.latest_status IN ('paid','settled','approved') OR ac.payment_date IS NOT NULL THEN 'paid'
          WHEN ar.status IN ('approved','converted','paid') THEN 'paid'
          ELSE 'pending'
        END as final_status,
        (
          SELECT bt.amount
          FROM billing_transactions bt
          WHERE bt.user_id = u.id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC LIMIT 1
        ) as plan_price,
        (
          SELECT MAX(bt.created_at)
          FROM billing_transactions bt
          WHERE bt.user_id = u.id AND bt.status = 'succeeded'
        ) as last_payment_date,
        (
          SELECT bt.stripe_payment_intent_id
          FROM billing_transactions bt
          WHERE bt.user_id = u.id AND bt.status = 'succeeded'
          ORDER BY bt.created_at DESC LIMIT 1
        ) as stripe_transaction_id
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
      ORDER BY ar.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const referrals = await executeQuery(query, [affiliateId, affiliateId]);

    // Transform data to match frontend interface
    const transformedReferrals = await mapWithConcurrency(referrals || [], STRIPE_PAYMENT_HISTORY_CONCURRENCY, async (referral: any) => {
      const stripePayments = await getCustomerPaymentHistory(referral.stripe_customer_id || null);
      const latestStripePayment = stripePayments[0] || null;
      const fallbackPlanPrice = referral.plan_price ? parseFloat(referral.plan_price) : null;

      return {
        id: referral.id,
        customerName: `${referral.first_name || ''} ${referral.last_name || ''}`.trim() || `User ${referral.id}`,
        email: referral.email,
        phone: referral.phone || null,
        status: referral.final_status,
        signupDate: referral.signup_date,
        conversionDate: referral.conversion_date,
        commission: parseFloat(referral.commission_earned) || 0,
        lifetimeValue: parseFloat(referral.commission_earned) || 0,
        tier: parseFloat(referral.commission_earned) > 100 ? 'enterprise' :
              parseFloat(referral.commission_earned) > 50 ? 'premium' : 'basic',
        transactionId: referral.transaction_id,
        planPrice: latestStripePayment ? latestStripePayment.amount : fallbackPlanPrice,
        planName: referral.subscription_plan_name || null,
        subscriptionStatus: referral.subscription_status || null,
        isStripePaid: String(referral.subscription_status || '').toLowerCase() === 'active',
        lastPaymentDate: latestStripePayment?.createdAt || referral.last_payment_date || null,
        stripeTransactionId: latestStripePayment?.paymentIntentId || referral.stripe_transaction_id || referral.transaction_id || null,
        paymentHistory: stripePayments,
        currentPeriodEnd: referral.current_period_end || null,
      };
    });
    
    res.json({
      success: true,
      data: transformedReferrals
    });
    
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

router.get('/referrals/purchases', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }

    const affiliateRows = await executeQuery(
      `SELECT id, commission_rate, plan_type
       FROM affiliates
       WHERE id = ?
       LIMIT 1`,
      [affiliateId]
    );

    const affiliate = affiliateRows?.[0] || {};
    const baseCommissionRate = getAffiliateBaseCommissionRate(affiliate.plan_type, parseFloat(affiliate.commission_rate));

    const referralRows = await executeQuery(
      `SELECT
         ar.id AS referral_id,
         ar.referred_user_id,
         ar.transaction_id,
         u.first_name,
         u.last_name,
         u.email,
         u.stripe_customer_id
       FROM affiliate_referrals ar
       JOIN users u ON ar.referred_user_id = u.id
       WHERE ar.affiliate_id = ?
         AND u.stripe_customer_id IS NOT NULL
       ORDER BY ar.created_at ASC`,
      [affiliateId]
    );

    const referralPurchases = await mapWithConcurrency(referralRows || [], STRIPE_PAYMENT_HISTORY_CONCURRENCY, async (referral: any) => {
      const payments = await getCustomerPaymentHistory(referral.stripe_customer_id || null);
      return payments.map((payment) => ({
        referralId: String(referral.referral_id),
        referredUserId: referral.referred_user_id,
        customerName: `${referral.first_name || ''} ${referral.last_name || ''}`.trim() || referral.email || `User ${referral.referred_user_id}`,
        email: referral.email,
        stripeCustomerId: referral.stripe_customer_id,
        paymentIntentId: payment.paymentIntentId,
        amount: Number(payment.amount) || 0,
        currency: payment.currency,
        createdAt: payment.createdAt,
        description: payment.description || '',
        transactionId: referral.transaction_id || null,
      }));
    });

    const uniquePurchases = Array.from(
      new Map(
        referralPurchases
          .flat()
          .map((purchase) => [`${purchase.stripeCustomerId}:${purchase.paymentIntentId}`, purchase])
      ).values()
    );

    const purchases = uniquePurchases
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

    const currentMonthStart = new Date();
    currentMonthStart.setUTCDate(1);
    currentMonthStart.setUTCHours(0, 0, 0, 0);
    const nextMonthStart = new Date(currentMonthStart);
    nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

    let currentMonthPaidCount = 0;

    const purchaseTimeline = purchases.map((purchase, index) => {
      const createdAtDate = new Date(purchase.createdAt);
      const isCurrentMonth = createdAtDate >= currentMonthStart && createdAtDate < nextMonthStart;
      if (isCurrentMonth) {
        currentMonthPaidCount += 1;
      }

      const qualifiesForBonus = isCurrentMonth && currentMonthPaidCount > 100;
      const effectiveCommissionRate = getEffectiveCommissionRate(baseCommissionRate, qualifiesForBonus);
      const commissionEarned = Number(((purchase.amount * effectiveCommissionRate) / 100).toFixed(2));

      return {
        id: `${purchase.paymentIntentId}-${index + 1}`,
        index: index + 1,
        referralId: purchase.referralId,
        referredUserId: purchase.referredUserId,
        customerName: purchase.customerName,
        email: purchase.email,
        stripeCustomerId: purchase.stripeCustomerId,
        paymentIntentId: purchase.paymentIntentId,
        amount: purchase.amount,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        description: purchase.description,
        baseCommissionRate,
        effectiveCommissionRate,
        commissionEarned,
        currentMonthPaidSequence: isCurrentMonth ? currentMonthPaidCount : null,
        isThresholdBonus: qualifiesForBonus,
        transactionId: purchase.transactionId,
      };
    });

    const summary = {
      totalPurchases: purchaseTimeline.length,
      totalRevenue: Number(purchaseTimeline.reduce((sum, purchase) => sum + purchase.amount, 0).toFixed(2)),
      totalCommissionEarned: Number(purchaseTimeline.reduce((sum, purchase) => sum + purchase.commissionEarned, 0).toFixed(2)),
      currentMonthPurchases: purchaseTimeline.filter((purchase) => purchase.currentMonthPaidSequence !== null).length,
      thresholdBonusPurchases: purchaseTimeline.filter((purchase) => purchase.isThresholdBonus).length,
      baseCommissionRate,
    };

    res.json({
      success: true,
      data: purchaseTimeline,
      summary,
    });
  } catch (error) {
    console.error('Error fetching affiliate referral purchases:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate referral purchases' });
  }
});

router.get('/referrals/child', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const pageParam = parseInt(req.query.page as string);
    const limitParam = parseInt(req.query.limit as string);
    const safeLimit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 50;
    const safePage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const safeOffset = (safePage - 1) * safeLimit;

    const childCountQuery = `
      SELECT 
        COUNT(*) as total_referrals
      FROM affiliates child
      WHERE child.parent_affiliate_id = ?
        AND child.status = 'active'
    `;

    const commissionSummaryQuery = `
      SELECT 
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
        AND child.status = 'active'
    `;

    const referralRowsQuery = `
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
      LEFT JOIN users u ON u.id = ar.referred_user_id
      LEFT JOIN affiliate_commissions ac ON ac.referral_id = ar.id AND ac.affiliate_id = ?
      WHERE child.parent_affiliate_id = ?
        AND child.status = 'active'
    `;

    const directChildrenQuery = `
      SELECT 
        child.id as child_affiliate_id,
        child.first_name as child_first_name,
        child.last_name as child_last_name,
        child.email as child_email,
        child.parent_commission_rate as child_parent_commission_rate,
        child.created_at as child_created_at
      FROM affiliates child
      WHERE child.parent_affiliate_id = ?
        AND child.status = 'active'
        AND NOT EXISTS (
          SELECT 1
          FROM affiliate_referrals ar
          WHERE ar.affiliate_id = child.id
        )
    `;

    const [countRows, commissionSummaryRows, referralRows, directChildRows] = await Promise.all([
      executeQuery(childCountQuery, [affiliateId]),
      executeQuery(commissionSummaryQuery, [affiliateId, affiliateId]),
      executeQuery(referralRowsQuery, [affiliateId, affiliateId]),
      executeQuery(directChildrenQuery, [affiliateId])
    ]);

    const summary = {
      totalReferrals: countRows[0]?.total_referrals || 0,
      totalCommission: parseFloat(commissionSummaryRows[0]?.total_commission) || 0
    };

    const transformedReferralRows = referralRows.map((row: any) => {
      const childCommissionRate = parseFloat(row.referral_commission_rate) || 0;
      const childCommissionAmount = parseFloat(row.referral_commission_amount) || 0;
      const childOrderValue = childCommissionRate > 0 ? (childCommissionAmount * 100) / childCommissionRate : 0;
      const fallbackParentRate = parseFloat(row.child_parent_commission_rate) || 0;
      const parentCommissionRate = parseFloat(row.commission_rate) || fallbackParentRate;
      const parentCommissionAmount = parseFloat(row.commission_amount) || (parentCommissionRate > 0 ? (childOrderValue * parentCommissionRate) / 100 : 0);
      const parentOrderValue = parseFloat(row.order_value) || childOrderValue;
      const normalizedReferralStatus = String(row.referral_status || '').toLowerCase();
      const normalizedCommissionStatus = String(row.commission_status || '').toLowerCase();
      const status = normalizedReferralStatus === 'paid' || normalizedCommissionStatus === 'paid'
        ? 'paid'
        : normalizedReferralStatus === 'approved' || normalizedCommissionStatus === 'approved'
          ? 'approved'
          : (row.commission_status || row.referral_status);

      return {
        id: row.commission_id || row.referral_id || `child-affiliate-${row.child_affiliate_id}`,
        childAffiliateId: row.child_affiliate_id,
        childAffiliateName: `${row.child_first_name || ''} ${row.child_last_name || ''}`.trim() || row.child_email || 'Unknown',
        customerName: `${row.customer_first_name || ''} ${row.customer_last_name || ''}`.trim() || 'Direct sub-affiliate signup',
        customerEmail: row.customer_email || row.child_email || '',
        product: row.product || 'Sub-affiliate registration',
        orderValue: parentOrderValue,
        commissionRate: parentCommissionRate,
        commissionAmount: parentCommissionAmount,
        childCommissionRate,
        childCommissionAmount,
        childOrderValue,
        status: status || 'pending',
        orderDate: row.order_date || row.referral_date,
        paymentDate: row.commission_payment_date || row.payment_date,
        level: 2
      };
    });

    const transformedDirectChildren = directChildRows.map((row: any) => ({
      id: `child-affiliate-${row.child_affiliate_id}`,
      childAffiliateId: row.child_affiliate_id,
      childAffiliateName: `${row.child_first_name || ''} ${row.child_last_name || ''}`.trim() || row.child_email || 'Unknown',
      customerName: 'Direct sub-affiliate signup',
      customerEmail: row.child_email || '',
      product: 'Sub-affiliate registration',
      orderValue: 0,
      commissionRate: parseFloat(row.child_parent_commission_rate) || 0,
      commissionAmount: 0,
      childCommissionRate: 0,
      childCommissionAmount: 0,
      childOrderValue: 0,
      status: 'pending',
      orderDate: row.child_created_at,
      paymentDate: null,
      level: 2
    }));

    const transformed = [...transformedReferralRows, ...transformedDirectChildren]
      .sort((left: any, right: any) => {
        const leftTimestamp = new Date(left.orderDate || 0).getTime() || 0;
        const rightTimestamp = new Date(right.orderDate || 0).getTime() || 0;
        return rightTimestamp - leftTimestamp;
      })
      .slice(safeOffset, safeOffset + safeLimit);

    res.json({
      success: true,
      data: transformed,
      summary
    });
  } catch (error) {
    console.error('Error fetching child affiliate referrals:', error);
    res.status(500).json({ error: 'Failed to fetch child affiliate referrals' });
  }
});

// GET /api/affiliate/referrals/stats - Get referral statistics
router.get('/referrals/stats', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Get total referrals count
    const totalReferralsQuery = `
      SELECT COUNT(*) as total_referrals
      FROM affiliate_referrals 
      WHERE affiliate_id = ?
    `;
    
    // Get paid referrals count based on commissions/payment evidence or referral status
    const paidReferralsQuery = `
      SELECT COUNT(*) as paid_referrals
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN (
        SELECT 
          referral_id,
          affiliate_id,
          SUM(CASE WHEN status = 'paid' OR payment_date IS NOT NULL THEN 1 ELSE 0 END) AS paid_events
        FROM affiliate_commissions
        GROUP BY referral_id, affiliate_id
      ) ac ON ar.id = ac.referral_id AND ar.affiliate_id = ac.affiliate_id
      WHERE ar.affiliate_id = ?
        AND u.status != 'inactive'
        AND (
          COALESCE(ac.paid_events, 0) > 0
          OR ar.status IN ('approved', 'converted', 'paid')
        )
    `;

    // Get unpaid referrals count (no paid commission/payment evidence and not approved/converted/paid)
    const unpaidReferralsQuery = `
      SELECT COUNT(*) as unpaid_referrals
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN (
        SELECT 
          referral_id,
          affiliate_id,
          SUM(CASE WHEN status = 'paid' OR payment_date IS NOT NULL THEN 1 ELSE 0 END) AS paid_events
        FROM affiliate_commissions
        GROUP BY referral_id, affiliate_id
      ) ac ON ar.id = ac.referral_id AND ar.affiliate_id = ac.affiliate_id
      WHERE ar.affiliate_id = ?
        AND u.status != 'inactive'
        AND NOT (
          COALESCE(ac.paid_events, 0) > 0
          OR ar.status IN ('approved', 'converted', 'paid')
        )
    `;
    
    // Get total commission earned
    const totalCommissionQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as total_commission
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status = 'paid'
    `;
    
    // Get average lifetime value per paid referral (matching updated referrals logic)
    const avgLifetimeValueQuery = `
      SELECT COALESCE(AVG(ac.commission_amount), 0) as avg_lifetime_value
      FROM affiliate_commissions ac
      JOIN affiliate_referrals ar ON ac.referral_id = ar.id
      JOIN users u ON ar.referred_user_id = u.id
      WHERE ac.affiliate_id = ? AND ac.status = 'paid' AND ar.status IN ('approved', 'converted')
    `;
    
    // Get cancelled/churned referrals count
    const cancelledReferralsQuery = `
      SELECT COUNT(*) as cancelled_referrals
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE ar.affiliate_id = ?
        AND (
          s.status IN ('canceled', 'cancelled')
          OR (u.status = 'inactive' AND (s.status IS NULL OR s.status != 'active'))
        )
    `;

    const [totalResult, paidResult, unpaidResult, commissionResult, avgResult, cancelledResult] = await Promise.all([
      executeQuery(totalReferralsQuery, [affiliateId]),
      executeQuery(paidReferralsQuery, [affiliateId]),
      executeQuery(unpaidReferralsQuery, [affiliateId]),
      executeQuery(totalCommissionQuery, [affiliateId]),
      executeQuery(avgLifetimeValueQuery, [affiliateId]),
      executeQuery(cancelledReferralsQuery, [affiliateId])
    ]);
    
    const totalReferrals = totalResult[0]?.total_referrals || 0;
    const paidReferrals = paidResult[0]?.paid_referrals || 0;
    const unpaidReferrals = unpaidResult[0]?.unpaid_referrals || 0;
    const totalCommission = parseFloat(commissionResult[0]?.total_commission) || 0;
    const avgLifetimeValue = parseFloat(avgResult[0]?.avg_lifetime_value) || 0;
    const cancelledReferrals = parseInt(cancelledResult[0]?.cancelled_referrals) || 0;
    
    const conversionRate = totalReferrals > 0 ? ((paidReferrals / totalReferrals) * 100) : 0;
    
    const stats = {
      totalReferrals,
      convertedReferrals: paidReferrals, // Keep the same field name for frontend compatibility
      pendingReferrals: unpaidReferrals, // Keep the same field name for frontend compatibility
      cancelledReferrals,
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      totalCommission,
      avgLifetimeValue: parseFloat(avgLifetimeValue.toFixed(2))
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral statistics' });
  }
});

// GET /api/affiliate/earnings/stats - Get detailed earnings statistics
router.get('/earnings/stats', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Get total earnings
    const totalEarningsQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as total_earnings
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status = 'paid'
    `;
    
    // Get monthly earnings (current month)
    const monthlyEarningsQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as monthly_earnings
      FROM affiliate_commissions 
      WHERE affiliate_id = ? 
        AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND status = 'paid'
    `;
    
    // Get yearly earnings (current year)
    const yearlyEarningsQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as yearly_earnings
      FROM affiliate_commissions 
      WHERE affiliate_id = ? 
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND status = 'paid'
    `;
    
    // Get pending earnings
    const pendingEarningsQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as pending_earnings
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status = 'pending'
    `;
    
    // Get average monthly earnings (last 6 months)
    const avgMonthlyQuery = `
      SELECT COALESCE(AVG(monthly_total), 0) as avg_monthly
      FROM (
        SELECT COALESCE(SUM(commission_amount), 0) as monthly_total
        FROM affiliate_commissions 
        WHERE affiliate_id = ? 
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
          AND status = 'paid'
        GROUP BY YEAR(created_at), MONTH(created_at)
      ) monthly_earnings
    `;
    
    // Get growth rate (compare current month to last month)
    const growthRateQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE()) THEN commission_amount ELSE 0 END), 0) as current_month,
        COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) THEN commission_amount ELSE 0 END), 0) as last_month
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status = 'paid'
    `;
    
    const [totalResult, monthlyResult, yearlyResult, pendingResult, avgResult, growthResult] = await Promise.all([
      executeQuery(totalEarningsQuery, [affiliateId]),
      executeQuery(monthlyEarningsQuery, [affiliateId]),
      executeQuery(yearlyEarningsQuery, [affiliateId]),
      executeQuery(pendingEarningsQuery, [affiliateId]),
      executeQuery(avgMonthlyQuery, [affiliateId]),
      executeQuery(growthRateQuery, [affiliateId])
    ]);
    
    const totalEarnings = parseFloat(totalResult[0]?.total_earnings) || 0;
    const monthlyEarnings = parseFloat(monthlyResult[0]?.monthly_earnings) || 0;
    const yearlyEarnings = parseFloat(yearlyResult[0]?.yearly_earnings) || 0;
    const pendingEarnings = parseFloat(pendingResult[0]?.pending_earnings) || 0;
    const avgMonthlyEarnings = parseFloat(avgResult[0]?.avg_monthly) || 0;
    
    const currentMonth = parseFloat(growthResult[0]?.current_month) || 0;
    const lastMonth = parseFloat(growthResult[0]?.last_month) || 0;
    const growthRate = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth * 100) : 0;
    
    const stats = {
      totalEarnings,
      monthlyEarnings,
      yearlyEarnings,
      pendingEarnings,
      paidEarnings: totalEarnings,
      avgMonthlyEarnings,
      growthRate: parseFloat(growthRate.toFixed(1)),
      nextPaymentDate: "2024-02-01", // Mock data - would need payment schedule logic
      nextPaymentAmount: pendingEarnings
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching earnings stats:', error);
    res.status(500).json({ error: 'Failed to fetch earnings statistics' });
  }
});

// GET /api/affiliate/earnings/payments - Get payment history
router.get('/earnings/payments', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    const paymentsQuery = `
      SELECT 
        ac.id,
        ac.commission_amount as amount,
        ac.status,
        DATE_FORMAT(ac.created_at, '%Y-%m-%d') as payment_date,
        ac.updated_at,
        'Bank Transfer' as payment_method,
        CONCAT('TXN-', ac.id) as transaction_id,
        DATE_FORMAT(ac.created_at, '%M %Y') as period,
        ac.commission_amount as commissions,
        0 as bonuses
      FROM affiliate_commissions ac
      WHERE ac.affiliate_id = ?
      ORDER BY ac.created_at DESC
      LIMIT 50
    `;
    
    const payments = await executeQuery(paymentsQuery, [affiliateId]);
    
    const transformedPayments = payments.map((payment: any) => ({
      id: payment.id.toString(),
      amount: parseFloat(payment.amount) || 0,
      status: payment.status,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      period: payment.period,
      commissions: parseFloat(payment.commissions) || 0,
      bonuses: parseFloat(payment.bonuses) || 0
    }));
    
    // Return the array directly as expected by the frontend
    res.json(transformedPayments);
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// GET /api/affiliate/earnings/breakdown - Get earnings breakdown
router.get('/earnings/breakdown', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Get commission breakdown
    const breakdownQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN commission_type = 'referral' THEN commission_amount ELSE 0 END), 0) as commissions,
        COALESCE(SUM(CASE WHEN commission_type = 'bonus' THEN commission_amount ELSE 0 END), 0) as bonuses,
        COALESCE(SUM(CASE WHEN commission_type = 'recurring' THEN commission_amount ELSE 0 END), 0) as recurring_commissions,
        COALESCE(SUM(CASE WHEN commission_type = 'one_time' THEN commission_amount ELSE 0 END), 0) as one_time_commissions,
        COALESCE(SUM(CASE WHEN commission_type = 'tier_bonus' THEN commission_amount ELSE 0 END), 0) as tier_bonuses
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status IN ('paid', 'pending')
    `;
    
    const result = await executeQuery(breakdownQuery, [affiliateId]);
    const breakdown = result[0] || {};
    
    // If commission_type doesn't exist, use fallback logic
    const fallbackQuery = `
      SELECT COALESCE(SUM(commission_amount), 0) as total_commissions
      FROM affiliate_commissions 
      WHERE affiliate_id = ? AND status IN ('paid', 'pending')
    `;
    
    const fallbackResult = await executeQuery(fallbackQuery, [affiliateId]);
    const totalCommissions = parseFloat(fallbackResult[0]?.total_commissions) || 0;
    
    const earningsBreakdown = {
      commissions: parseFloat(breakdown.commissions) || totalCommissions,
      bonuses: parseFloat(breakdown.bonuses) || 0,
      recurringCommissions: parseFloat(breakdown.recurring_commissions) || totalCommissions * 0.7,
      oneTimeCommissions: parseFloat(breakdown.one_time_commissions) || totalCommissions * 0.3,
      tierBonuses: parseFloat(breakdown.tier_bonuses) || 0
    };
    
    // Return the data directly as expected by the frontend
    res.json(earningsBreakdown);
    
  } catch (error) {
    console.error('Error fetching earnings breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch earnings breakdown' });
  }
});

// GET /api/affiliate/earnings/monthly - Get monthly earnings data
router.get('/earnings/monthly', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    const monthlyQuery = `
      SELECT 
        DATE_FORMAT(ac.created_at, '%b %Y') as month,
        COALESCE(SUM(ac.commission_amount), 0) as earnings,
        COALESCE(SUM(ac.commission_amount), 0) as commissions,
        COUNT(DISTINCT ar.id) as referrals
      FROM affiliate_commissions ac
      LEFT JOIN affiliate_referrals ar ON ac.affiliate_id = ar.affiliate_id 
        AND MONTH(ac.created_at) = MONTH(ar.created_at)
        AND YEAR(ac.created_at) = YEAR(ar.created_at)
      WHERE ac.affiliate_id = ? 
        AND ac.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        AND ac.status IN ('paid', 'pending')
      GROUP BY YEAR(ac.created_at), MONTH(ac.created_at), DATE_FORMAT(ac.created_at, '%b %Y')
      ORDER BY YEAR(ac.created_at) ASC, MONTH(ac.created_at) ASC
    `;
    
    const monthlyData = await executeQuery(monthlyQuery, [affiliateId]);
    
    const transformedData = monthlyData.map((item: any) => ({
      month: item.month,
      earnings: parseFloat(item.earnings) || 0,
      commissions: parseFloat(item.commissions) || 0,
      referrals: parseInt(item.referrals) || 0
    }));
    
    // Return the array directly as expected by the frontend
    res.json(transformedData);
    
  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    res.status(500).json({ error: 'Failed to fetch monthly earnings' });
  }
});

// GET /api/affiliate/tiers - Get commission tiers information
router.get('/tiers', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const query = `
      SELECT 
        name,
        min_referrals,
        commission_rate,
        bonuses
      FROM commission_tiers
      WHERE is_active = true
      ORDER BY min_referrals ASC
    `;
    
    const tiersData = await executeQuery(query, []);
    
    const tiers = tiersData.map((tier: any) => ({
      name: tier.name,
      minReferrals: tier.min_referrals,
      commissionRate: parseFloat(tier.commission_rate),
      bonuses: tier.bonuses ? JSON.parse(tier.bonuses) : []
    }));

    // If no tiers found in database, return default tiers
    if (tiers.length === 0) {
      const defaultTiers = [
        {
          name: "Bronze",
          minReferrals: 0,
          commissionRate: 15,
          bonuses: ["Basic support", "Monthly reports"]
        },
        {
          name: "Silver",
          minReferrals: 10,
          commissionRate: 20,
          bonuses: ["Priority support", "Weekly reports", "Marketing materials"]
        },
        {
          name: "Gold",
          minReferrals: 25,
          commissionRate: 25,
          bonuses: ["Dedicated support", "Daily reports", "Custom materials", "Performance bonuses"]
        },
        {
          name: "Platinum",
          minReferrals: 50,
          commissionRate: 30,
          bonuses: ["VIP support", "Real-time analytics", "Custom landing pages", "Quarterly bonuses", "Exclusive events"]
        }
      ];
      
      res.json({
        success: true,
        data: defaultTiers
      });
      return;
    }

    res.json({
      success: true,
      data: tiers
    });
    
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({ error: 'Failed to fetch commission tiers' });
  }
});

// GET /api/affiliate/dashboard/commissions/export - Export commission history as CSV
router.get('/dashboard/commissions/export', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const { from, to } = req.query;
    
    let query = `
      SELECT 
        ac.id,
        u.first_name,
        u.last_name,
        u.email,
        ac.commission_amount as amount,
        ac.created_at as date,
        ac.status,
        ac.commission_type as type,
        ar.created_at as referral_date
      FROM affiliate_commissions ac
      JOIN affiliate_referrals ar ON ac.referral_id = ar.id
      JOIN users u ON ar.referred_user_id = u.id
      WHERE ac.affiliate_id = ?
    `;
    
    const params = [affiliateId];
    
    if (from) {
      query += ' AND ac.created_at >= ?';
      params.push(from as string);
    }
    
    if (to) {
      query += ' AND ac.created_at <= ?';
      params.push(to as string);
    }
    
    query += ' ORDER BY ac.created_at DESC';
    
    const commissions = await executeQuery(query, params);
    
    // Generate CSV content
    const headers = ['ID', 'Customer Name', 'Email', 'Amount', 'Status', 'Type', 'Date', 'Referral Date'];
    const csvRows = [headers.join(',')];
    
    commissions.forEach((commission: any) => {
      const row = [
        commission.id,
        `"${commission.first_name} ${commission.last_name}"`,
        commission.email,
        commission.amount,
        commission.status,
        commission.type || 'signup',
        new Date(commission.date).toISOString().split('T')[0],
        new Date(commission.referral_date).toISOString().split('T')[0]
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    res.json({
      success: true,
      data: csvContent
    });
    
  } catch (error) {
    console.error('Error exporting commissions:', error);
    res.status(500).json({ error: 'Failed to export commission data' });
  }
});

// GET /api/affiliate/links - Get all referral links for the affiliate
router.get('/links', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // For now, return mock data since we don't have a links table yet
    // In a real implementation, you would query a referral_links table
    const mockLinks = [
      {
        id: "link_1",
        name: "Social Media Campaign",
        description: "General social media promotion link",
        originalUrl: "https://creditrepairpro.com/signup",
        shortUrl: "https://crp.ly/social123",
        trackingCode: "SOCIAL_JAN2024",
        campaign: "social_media",
        source: "facebook",
        medium: "social",
        clicks: 1247,
        conversions: 89,
        conversionRate: 7.14,
        revenue: 2201.50,
        status: "active",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-20T14:30:00Z"
      },
      {
        id: "link_2",
        name: "Email Newsletter",
        description: "Weekly newsletter promotion",
        originalUrl: "https://creditrepairpro.com/special-offer",
        shortUrl: "https://crp.ly/email456",
        trackingCode: "EMAIL_WEEKLY",
        campaign: "email_marketing",
        source: "newsletter",
        medium: "email",
        clicks: 892,
        conversions: 67,
        conversionRate: 7.51,
        revenue: 1654.75,
        status: "active",
        createdAt: "2024-01-10T09:15:00Z",
        updatedAt: "2024-01-18T16:45:00Z"
      },
      {
        id: "link_3",
        name: "Blog Content",
        description: "Credit repair tips blog post",
        originalUrl: "https://creditrepairpro.com/blog-signup",
        shortUrl: "https://crp.ly/blog789",
        trackingCode: "BLOG_CONTENT",
        campaign: "content_marketing",
        source: "blog",
        medium: "organic",
        clicks: 634,
        conversions: 41,
        conversionRate: 6.47,
        revenue: 1012.25,
        status: "active",
        createdAt: "2024-01-08T14:20:00Z",
        updatedAt: "2024-01-16T11:30:00Z"
      }
    ];
    
    res.json({
      success: true,
      data: mockLinks
    });
    
  } catch (error) {
    console.error('Error fetching affiliate links:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate links' });
  }
});

// GET /api/affiliate/links/stats - Get link statistics
router.get('/links/stats', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Mock stats data - in real implementation, aggregate from links table
    const mockStats = {
      totalClicks: 2773,
      totalConversions: 197,
      totalRevenue: 4868.50,
      conversionRate: 7.10,
      activeLinks: 3,
      pausedLinks: 0,
      expiredLinks: 0
    };
    
    res.json({
      success: true,
      data: mockStats
    });
    
  } catch (error) {
    console.error('Error fetching link stats:', error);
    res.status(500).json({ error: 'Failed to fetch link statistics' });
  }
});

// POST /api/affiliate/links - Create a new referral link
router.post('/links', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const { name, description, originalUrl, campaign, source, medium, expiresAt } = req.body;
    
    // Validate required fields
    if (!name || !originalUrl) {
      return res.status(400).json({ error: 'Name and original URL are required' });
    }
    
    // Generate a unique tracking code
    const trackingCode = `${campaign?.toUpperCase() || 'CUSTOM'}_${Date.now()}`;
    const shortUrl = `https://crp.ly/${Math.random().toString(36).substr(2, 8)}`;
    
    // In a real implementation, you would insert into a referral_links table
    const newLink = {
      id: `link_${Date.now()}`,
      name,
      description: description || '',
      originalUrl,
      shortUrl,
      trackingCode,
      campaign: campaign || 'custom',
      source: source || 'direct',
      medium: medium || 'referral',
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      revenue: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt || null
    };
    
    // Log the link creation
    securityLogger.logSecurityEvent('affiliate_link_created', {
      affiliateId,
      linkId: newLink.id,
      name,
      campaign,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: newLink
    });
    
  } catch (error) {
    console.error('Error creating affiliate link:', error);
    res.status(500).json({ error: 'Failed to create affiliate link' });
  }
});

// GET /api/affiliate/dashboard/leaderboard - Get affiliate leaderboard data
router.get('/dashboard/leaderboard', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    console.log('🏆 [LEADERBOARD] Starting leaderboard fetch');
    
    // Get top Pro affiliates (premium plans)
    const proAffiliatesQuery = `
      SELECT 
        a.id,
        a.first_name,
        a.last_name,
        a.total_earnings,
        a.total_referrals,
        a.paid_referrals_count,
        a.plan_type,
        a.commission_rate,
        COALESCE(SUM(ac.commission_amount), 0) as monthly_earnings
      FROM affiliates a
      LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id 
        AND ac.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND ac.status = 'paid'
      WHERE a.status = 'active'
        AND (
          LOWER(COALESCE(a.plan_type, '')) NOT IN ('', 'free', 'starter', 'trial', 'basic')
          OR a.commission_rate >= 20
        )
      GROUP BY a.id, a.first_name, a.last_name, a.total_earnings, a.total_referrals, 
               a.paid_referrals_count, a.plan_type, a.commission_rate
      ORDER BY a.total_earnings DESC
      LIMIT 10
    `;
    
    // Get top Free affiliates (free/starter plans or low commission rate)
    const freeAffiliatesQuery = `
      SELECT 
        a.id,
        a.first_name,
        a.last_name,
        a.total_earnings,
        a.total_referrals,
        a.paid_referrals_count,
        a.plan_type,
        a.commission_rate,
        COALESCE(SUM(ac.commission_amount), 0) as monthly_earnings
      FROM affiliates a
      LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id 
        AND ac.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND ac.status = 'paid'
      WHERE a.status = 'active'
        AND (
          LOWER(COALESCE(a.plan_type, '')) IN ('', 'free', 'starter', 'trial', 'basic')
          AND a.commission_rate < 20
        )
      GROUP BY a.id, a.first_name, a.last_name, a.total_earnings, a.total_referrals, 
               a.paid_referrals_count, a.plan_type, a.commission_rate
      ORDER BY a.total_earnings DESC
      LIMIT 10
    `;
    
    console.log('🏆 [LEADERBOARD] Executing Pro affiliates query');
    const proAffiliates = await executeQuery(proAffiliatesQuery);
    
    console.log('🏆 [LEADERBOARD] Executing Free affiliates query');
    const freeAffiliates = await executeQuery(freeAffiliatesQuery);
    
    // Format the results with rankings
    const formatLeaderboard = (affiliates: any[]) => {
      return affiliates.map((affiliate, index) => ({
        rank: index + 1,
        id: affiliate.id,
        name: `${affiliate.first_name} ${affiliate.last_name}`,
        totalEarnings: parseFloat(affiliate.total_earnings) || 0,
        monthlyEarnings: parseFloat(affiliate.monthly_earnings) || 0,
        totalReferrals: affiliate.total_referrals || 0,
        paidReferrals: affiliate.paid_referrals_count || 0,
        planType: affiliate.plan_type,
        commissionRate: affiliate.commission_rate || 10,
        tier: getTierFromPlanType(affiliate.plan_type)
      }));
    };
    
    const leaderboardData = {
      pro: formatLeaderboard(proAffiliates || []),
      free: formatLeaderboard(freeAffiliates || [])
    };
    
    console.log('✅ [LEADERBOARD] Leaderboard data prepared:', {
      proCount: leaderboardData.pro.length,
      freeCount: leaderboardData.free.length
    });
    
    res.json({
      success: true,
      data: leaderboardData
    });
    
  } catch (error) {
    console.error('💥 [LEADERBOARD] Error fetching leaderboard:', error);
    securityLogger.logSecurityEvent('affiliate_leaderboard_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data'
    });
  }
});

// GET /api/affiliate/dashboard/team-performance - Get team performance data with affiliate counts by level
router.get('/dashboard/team-performance', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    console.log('🏢 [TEAM PERFORMANCE] Starting team performance fetch for affiliate ID:', affiliateId);
    
    // Get Level 1 (Direct) affiliates - those directly recruited by this affiliate
    const level1Query = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(ac.commission_amount), 0) as total_earnings
      FROM affiliates a
      LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id 
        AND ac.status = 'paid'
      WHERE a.parent_affiliate_id = ?
        AND a.status = 'active'
    `;
    
    // Get Level 2 affiliates - those recruited by Level 1 affiliates
    const level2Query = `
      SELECT 
        COUNT(DISTINCT a2.id) as count,
        COALESCE(SUM(ac.commission_amount), 0) as total_earnings
      FROM affiliates a1
      JOIN affiliates a2 ON a1.id = a2.parent_affiliate_id
      LEFT JOIN affiliate_commissions ac ON a2.id = ac.affiliate_id 
        AND ac.status = 'paid'
      WHERE a1.parent_affiliate_id = ?
        AND a1.status = 'active'
        AND a2.status = 'active'
    `;
    
    // Get Level 3 affiliates - those recruited by Level 2 affiliates
    const level3Query = `
      SELECT 
        COUNT(DISTINCT a3.id) as count,
        COALESCE(SUM(ac.commission_amount), 0) as total_earnings
      FROM affiliates a1
      JOIN affiliates a2 ON a1.id = a2.parent_affiliate_id
      JOIN affiliates a3 ON a2.id = a3.parent_affiliate_id
      LEFT JOIN affiliate_commissions ac ON a3.id = ac.affiliate_id 
        AND ac.status = 'paid'
      WHERE a1.parent_affiliate_id = ?
        AND a1.status = 'active'
        AND a2.status = 'active'
        AND a3.status = 'active'
    `;
    
    console.log('🏢 [TEAM PERFORMANCE] Executing Level 1 query');
    const level1Result = await executeQuery(level1Query, [affiliateId]);
    
    console.log('🏢 [TEAM PERFORMANCE] Executing Level 2 query');
    const level2Result = await executeQuery(level2Query, [affiliateId]);
    
    console.log('🏢 [TEAM PERFORMANCE] Executing Level 3 query');
    const level3Result = await executeQuery(level3Query, [affiliateId]);
    
    const teamPerformanceData = {
      level1: {
        count: level1Result[0]?.count || 0,
        earnings: parseFloat(level1Result[0]?.total_earnings) || 0
      },
      level2: {
        count: level2Result[0]?.count || 0,
        earnings: parseFloat(level2Result[0]?.total_earnings) || 0
      },
      level3: {
        count: level3Result[0]?.count || 0,
        earnings: parseFloat(level3Result[0]?.total_earnings) || 0
      }
    };
    
    console.log('✅ [TEAM PERFORMANCE] Team performance data prepared:', teamPerformanceData);
    
    res.json({
      success: true,
      data: teamPerformanceData
    });
    
  } catch (error) {
    console.error('💥 [TEAM PERFORMANCE] Error fetching team performance:', error);
    securityLogger.logSecurityEvent('affiliate_team_performance_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team performance data'
    });
  }
});

// Helper function to get tier display name from plan type
function getTierFromPlanType(planType: string): string {
  const normalized = planType?.toLowerCase() || '';

  if (['free', 'starter', 'trial', 'basic', ''].includes(normalized)) {
    return 'Free - Starter';
  }

  if (normalized.includes('premium') || normalized.includes('partner')) {
    return 'Premium - Partner';
  }

  if (
    normalized.includes('pro') ||
    normalized.includes('advanced') ||
    normalized.includes('paid') ||
    normalized.includes('vip') ||
    normalized.includes('elite')
  ) {
    return 'Pro - Advanced';
  }

  // Fallback classification based on commission rate expectation handled earlier
  return 'Pro - Advanced';
}

export default router;
