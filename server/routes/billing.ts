import express from 'express';
import Stripe from 'stripe';
import { ENV_CONFIG } from '../config/environment.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { executeQuery, executeTransaction } from '../database/mysqlConfig.js';
import { BillingTransaction, Subscription, StripeConfig } from '../database/mysqlSchema.js';
import CommissionService from '../services/commissionService.js';
import AffiliateUpgradeService from '../services/affiliateUpgradeService.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';
import { createAffiliate } from '../controllers/authController.js';
import type { Request } from 'express';
import { syncGhlAdminLifecycleTagsInBackground } from '../services/ghlAdminLifecycleService.js';

const router = express.Router();

// Initialize Stripe (will be updated dynamically from database)
let stripe: Stripe;
let basicPlansStripe: Stripe | null = null;
let basicPlansStripeSecretInUse: string | null = null;

type SubscriptionStripeContext = 'default' | 'basic_plans';

const SCORE_MACHINE_BASIC_PAGE = 'score-machine-basic';

function getBasicPlansStripeSecretKey() {
  return String(process.env.BASIC_PLANS_STRIPE_SECRET_KEY || '').trim();
}

function getBasicPlansStripePublishableKey() {
  return String(process.env.BASIC_PLANS_STRIPE_PUBLISHABLE_KEY || '').trim();
}

function getBasicPlansStripeWebhookSecret() {
  return String(process.env.BASIC_PLANS_STRIPE_WEBHOOK_SECRET || '').trim();
}

function getWebhookRequestHost(req: Request) {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').trim();
  const hostHeader = String(req.headers.host || '').trim();
  return (forwardedHost || hostHeader).toLowerCase();
}

function getStripeWebhookContextFromRequest(req: Request): SubscriptionStripeContext {
  const host = getWebhookRequestHost(req);

  if (
    host.includes('admin.tsmbasic.com') ||
    host === 'localhost:3000' ||
    host === '127.0.0.1:3000' ||
    host === 'admin.localhost:3000'
  ) {
    return 'basic_plans';
  }

  return 'default';
}

function getRequestProtocol(req: Request) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').trim().toLowerCase();
  if (forwardedProto === 'http' || forwardedProto === 'https') {
    return forwardedProto;
  }

  return req.protocol || 'http';
}

function getPortalBaseUrlForStripeContext(req: Request, context: SubscriptionStripeContext) {
  const protocol = getRequestProtocol(req);
  const host = getWebhookRequestHost(req);
  const hostname = host.split(':')[0];

  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost');

  if (isLocal) {
    const localHost = hostname === 'localhost' || hostname === '127.0.0.1'
      ? hostname
      : 'admin.localhost';
    const port = context === 'basic_plans' ? '3000' : '3001';
    return `${protocol}://${localHost}:${port}`;
  }

  return context === 'basic_plans'
    ? 'https://admin.tsmbasic.com'
    : 'https://admin.thescoremachine.com';
}

function getPlanPermissionPages(pagePermissions: any): string[] {
  if (!pagePermissions) {
    return [];
  }

  let parsed = pagePermissions;
  if (typeof pagePermissions === 'string') {
    try {
      parsed = JSON.parse(pagePermissions);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((pageId) => String(pageId));
  }

  if (parsed && Array.isArray(parsed.pages)) {
    return parsed.pages.map((pageId: any) => String(pageId));
  }

  if (parsed && Array.isArray(parsed.permissions)) {
    return parsed.permissions.map((pageId: any) => String(pageId));
  }

  return [];
}

function getStripeSubscriptionPeriodDates(stripeSub: any) {
  const firstItem = stripeSub?.items?.data?.[0];
  const periodStartSeconds = stripeSub?.current_period_start ?? firstItem?.current_period_start;
  const periodEndSeconds = stripeSub?.current_period_end ?? firstItem?.current_period_end;

  return {
    periodStart: typeof periodStartSeconds === 'number' ? new Date(periodStartSeconds * 1000) : null,
    periodEnd: typeof periodEndSeconds === 'number' ? new Date(periodEndSeconds * 1000) : null,
  };
}

function getStripeContextForPlan(plan: any): SubscriptionStripeContext {
  return getPlanPermissionPages(plan?.page_permissions).includes(SCORE_MACHINE_BASIC_PAGE)
    ? 'basic_plans'
    : 'default';
}

async function getBasicPlansStripe() {
  const secretKey = getBasicPlansStripeSecretKey();
  if (!secretKey) {
    throw new Error('Basic Plans Stripe secret key is not configured. Set BASIC_PLANS_STRIPE_SECRET_KEY.');
  }

  if (!secretKey.startsWith('sk_')) {
    throw new Error('Basic Plans Stripe secret key must start with sk_. Publishable keys start with pk_.');
  }

  if (!basicPlansStripe || basicPlansStripeSecretInUse !== secretKey) {
    basicPlansStripe = new Stripe(secretKey);
    basicPlansStripeSecretInUse = secretKey;
  }

  return basicPlansStripe;
}

async function getStripeForSubscriptionContext(context: SubscriptionStripeContext) {
  if (context === 'basic_plans') {
    return getBasicPlansStripe();
  }

  if (!stripe) {
    await initializeStripe();
  }

  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe;
}

async function findUserByStripeCustomerId(context: SubscriptionStripeContext, customerId: string) {
  if (context === 'basic_plans') {
    await ensureBasicPlansStripeCustomersTable();
    const basicCustomerRows = await executeQuery<any[]>(
      `SELECT user_kind, user_id
       FROM basic_plans_stripe_customers
       WHERE stripe_customer_id = ?
       LIMIT 1`,
      [customerId]
    );

    if (Array.isArray(basicCustomerRows) && basicCustomerRows.length > 0) {
      return {
        userId: Number(basicCustomerRows[0].user_id || 0) || undefined,
        userKind: String(basicCustomerRows[0].user_kind || 'user'),
      };
    }
  }

  const userRows = await executeQuery<any[]>(
    'SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1',
    [customerId]
  );
  if (Array.isArray(userRows) && userRows.length > 0) {
    return {
      userId: Number(userRows[0].id || 0) || undefined,
      userKind: 'user',
    };
  }

  const affiliateRows = await executeQuery<any[]>(
    'SELECT id FROM affiliates WHERE stripe_customer_id = ? LIMIT 1',
    [customerId]
  );
  if (Array.isArray(affiliateRows) && affiliateRows.length > 0) {
    return {
      userId: Number(affiliateRows[0].id || 0) || undefined,
      userKind: 'affiliate',
    };
  }

  return {
    userId: undefined,
    userKind: undefined,
  };
}

async function retrieveCheckoutSessionForSubscription(sessionId: string) {
  const contexts: SubscriptionStripeContext[] = ['default', 'basic_plans'];
  let firstError: any = null;

  for (const context of contexts) {
    if (context === 'basic_plans' && !getBasicPlansStripeSecretKey()) {
      continue;
    }

    try {
      const stripeClient = await getStripeForSubscriptionContext(context);
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);
      return { stripeClient, stripeContext: context, session };
    } catch (error: any) {
      firstError ||= error;
    }
  }

  throw firstError || new Error('Checkout session not found');
}

async function getStripeContextFromPlanId(planId: number): Promise<SubscriptionStripeContext> {
  if (!planId || Number.isNaN(planId)) {
    return 'default';
  }

  const planRows = await executeQuery<any[]>(
    'SELECT page_permissions FROM subscription_plans WHERE id = ? LIMIT 1',
    [planId]
  );
  const plan = Array.isArray(planRows) && planRows.length > 0 ? planRows[0] : null;
  return getStripeContextForPlan(plan);
}

async function ensureBasicPlansStripeCustomersTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS basic_plans_stripe_customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_kind VARCHAR(20) NOT NULL DEFAULT 'user',
      user_id INT NOT NULL,
      stripe_customer_id VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_basic_plans_stripe_customer_user (user_kind, user_id)
    )
  `);
}

async function getOrCreateCheckoutStripeCustomer(
  stripeClient: Stripe,
  context: SubscriptionStripeContext,
  userData: any,
  isAffiliate: boolean,
) {
  const userId = Number(userData?.id);
  const userKind = isAffiliate ? 'affiliate' : 'user';

  if (context === 'default') {
    let customerId = userData.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: userData.email,
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        metadata: { userId: String(userId), userKind }
      });
      customerId = customer.id;
      if (isAffiliate) {
        await executeQuery('UPDATE affiliates SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
      } else {
        await executeQuery('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
      }
    }
    return String(customerId);
  }

  await ensureBasicPlansStripeCustomersTable();
  const existingRows = await executeQuery<any[]>(
    'SELECT stripe_customer_id FROM basic_plans_stripe_customers WHERE user_kind = ? AND user_id = ? LIMIT 1',
    [userKind, userId]
  );
  if (Array.isArray(existingRows) && existingRows[0]?.stripe_customer_id) {
    return String(existingRows[0].stripe_customer_id);
  }

  const customer = await stripeClient.customers.create({
    email: userData.email,
    name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
    metadata: {
      userId: String(userId),
      userKind,
      product: 'score_machine_basic_plan'
    }
  });
  await executeQuery(
    `INSERT INTO basic_plans_stripe_customers (user_kind, user_id, stripe_customer_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE stripe_customer_id = VALUES(stripe_customer_id), updated_at = CURRENT_TIMESTAMP`,
    [userKind, userId, customer.id]
  );
  return customer.id;
}

// Get active Stripe configuration
async function getStripeConfig(): Promise<StripeConfig | null> {
  try {
    const config = await executeQuery<StripeConfig[]>(
      'SELECT * FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    return Array.isArray(config) && config.length > 0 ? config[0] : null;
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return null;
  }
}

// Initialize Stripe with current config
export async function initializeStripe() {
  try {
    console.log('🔧 Initializing Stripe...');
    const config = await getStripeConfig();
    if (config && config.stripe_secret_key) {
      console.log('✅ Using Stripe config from database');
      stripe = new Stripe(config.stripe_secret_key);
    } else {
      // Fallback to environment variables
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (secretKey) {
        console.log('✅ Using Stripe config from environment variables');
        stripe = new Stripe(secretKey);
      } else {
        console.error('❌ No Stripe configuration found in database or environment variables');
      }
    }
    
    if (stripe) {
      console.log('🎉 Stripe initialized successfully');
    } else {
      console.error('❌ Failed to initialize Stripe');
    }
  } catch (error) {
    console.error('❌ Error initializing Stripe:', error);
  }
}

async function getOrCreateStripeCustomer(userId: number) {
  let userRow: any = null;
  let isAffiliate = false;
  const users = await executeQuery<any[]>(
    'SELECT id, stripe_customer_id, email, first_name, last_name FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (Array.isArray(users) && users.length > 0) {
    userRow = users[0];
  } else {
    const affiliates = await executeQuery<any[]>(
      'SELECT id, stripe_customer_id, email, first_name, last_name FROM affiliates WHERE id = ? LIMIT 1',
      [userId]
    );
    if (Array.isArray(affiliates) && affiliates.length > 0) {
      userRow = affiliates[0];
      isAffiliate = true;
    }
  }

  if (!userRow) {
    return null;
  }

  if (!stripe) {
    await initializeStripe();
  }
  if (!stripe) {
    return null;
  }

  let customerId = userRow.stripe_customer_id ? String(userRow.stripe_customer_id) : null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: String(userRow.email || ''),
      name: `${userRow.first_name || ''} ${userRow.last_name || ''}`.trim(),
      metadata: { userId: String(userId) }
    });
    customerId = customer.id;
    if (isAffiliate) {
      await executeQuery('UPDATE affiliates SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
    } else {
      await executeQuery('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
    }
  }

  return customerId;
}

// Get billing history for authenticated user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const transactions = await executeQuery<BillingTransaction[]>(
      `SELECT * FROM billing_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      transactions: Array.isArray(transactions) ? transactions : []
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Get live billing history from Stripe for authenticated user (all-time)
router.get('/stripe-history', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    // Ensure Stripe is initialized
    if (!stripe) {
      await initializeStripe();
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Resolve Stripe customer ID for this user (supports users and affiliates)
    let customerId: string | null = null;
    try {
      const userRows = await executeQuery<any[]>(
        'SELECT stripe_customer_id, email, first_name, last_name FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      if (Array.isArray(userRows) && userRows.length > 0 && userRows[0]?.stripe_customer_id) {
        customerId = String(userRows[0].stripe_customer_id);
      } else {
        const affRows = await executeQuery<any[]>(
          'SELECT stripe_customer_id, email, first_name, last_name FROM affiliates WHERE id = ? LIMIT 1',
          [userId]
        );
        if (Array.isArray(affRows) && affRows.length > 0 && affRows[0]?.stripe_customer_id) {
          customerId = String(affRows[0].stripe_customer_id);
        }
      }
    } catch {}

    if (!customerId) {
      return res.status(404).json({ error: 'Stripe customer not found for user' });
    }

    // Fetch all payment intents with pagination
    const transactions: any[] = [];
    let piStartingAfter: string | undefined = undefined;
    let piHasMore = true;
    while (piHasMore) {
      const piList = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 100,
        ...(piStartingAfter ? { starting_after: piStartingAfter } : {})
      });
      for (const pi of piList.data) {
        let pmType: string | null = null;
        let pmBrand: string | null = null;
        let pmLast4: string | null = null;
        let invoiceId: string | null = null;
        let feeAmount: number | null = null;
        try {
          const piFull = await stripe.paymentIntents.retrieve(pi.id, { expand: ['payment_method'] });
          const pm = piFull.payment_method as Stripe.PaymentMethod | null;
          if (pm) {
            pmType = pm.type || null;
            if (pm.type === 'card' && pm.card) {
              pmBrand = pm.card.brand || null;
              pmLast4 = pm.card.last4 || null;
            }
          }
          const chId = typeof piFull.latest_charge === 'string' ? piFull.latest_charge : null;
          if (chId) {
            const ch = await stripe.charges.retrieve(chId);
            const inv = (ch as any).invoice;
            invoiceId = typeof inv === 'string' ? inv : null;
            const btId = typeof ch.balance_transaction === 'string' ? ch.balance_transaction : null;
            if (btId) {
              const bt = await stripe.balanceTransactions.retrieve(btId);
              const fee = typeof bt.fee === 'number' ? bt.fee : null;
              feeAmount = fee != null ? Number(fee) / 100 : null;
            }
          }
        } catch {}
        transactions.push({
          id: transactions.length + 1,
          stripe_payment_intent_id: pi.id,
          stripe_customer_id: customerId,
          amount: typeof pi.amount === 'number' ? Number(pi.amount) / 100 : 0,
          currency: (pi.currency || 'usd').toUpperCase(),
          status: (pi.status || 'succeeded') as any,
          plan_name: 'Subscription',
          plan_type: 'monthly',
          description: pi.description || '',
          created_at: new Date(pi.created * 1000).toISOString(),
          updated_at: new Date(pi.created * 1000).toISOString(),
          stripe_invoice_id: invoiceId,
          stripe_payment_method_type: pmType,
          stripe_payment_method_brand: pmBrand,
          stripe_payment_method_last4: pmLast4,
          stripe_fee_amount: feeAmount,
        });
      }
      piHasMore = piList.has_more;
      if (piHasMore && piList.data.length > 0) {
        piStartingAfter = piList.data[piList.data.length - 1].id;
      }
    }

    // Fetch invoices and merge missing ones
    let invStartingAfter: string | undefined = undefined;
    let invHasMore = true;
    const piIndex = new Map<string, number>();
    transactions.forEach((t, idx) => {
      if (t.stripe_payment_intent_id) piIndex.set(String(t.stripe_payment_intent_id), idx);
    });
    while (invHasMore) {
      const invList = await stripe.invoices.list({
        customer: customerId,
        limit: 100,
        ...(invStartingAfter ? { starting_after: invStartingAfter } : {})
      });
      for (const inv of invList.data) {
        const invoiceAny = inv as any;
        const piId = typeof invoiceAny.payment_intent === 'string' ? invoiceAny.payment_intent : null;
        const createdIso = new Date((inv.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
        if (piId && piIndex.has(piId)) {
          const idx = piIndex.get(piId)!;
          transactions[idx].stripe_invoice_id = inv.id;
          transactions[idx].amount = typeof inv.total === 'number' ? Number(inv.total) / 100 : transactions[idx].amount;
          transactions[idx].currency = (inv.currency || transactions[idx].currency || 'usd').toUpperCase();
        } else {
          transactions.push({
            id: transactions.length + 1,
            stripe_payment_intent_id: piId || '',
            stripe_customer_id: customerId,
            amount: typeof inv.total === 'number' ? Number(inv.total) / 100 : 0,
            currency: (inv.currency || 'usd').toUpperCase(),
            status: (inv.status || 'paid') as any,
            plan_name: 'Subscription',
            plan_type: 'monthly',
            description: inv.description || '',
            created_at: createdIso,
            updated_at: createdIso,
            stripe_invoice_id: inv.id,
          });
        }
      }
      invHasMore = invList.has_more;
      if (invHasMore && invList.data.length > 0) {
        invStartingAfter = invList.data[invList.data.length - 1].id;
      }
    }

    // Sort desc by created_at
    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error fetching Stripe billing history:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe billing history' });
  }
});

// Get current subscription
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    let subscription = null;
    
    if (userRole === 'affiliate') {
      // For affiliate users, check if they have an admin_id and get subscription from that
      console.log('🔍 [BILLING] Fetching subscription for affiliate user:', userId);
      
      // First get the affiliate's admin_id
      const affiliateQuery = await executeQuery(
        'SELECT admin_id FROM affiliates WHERE id = ?',
        [userId]
      );
      
      if (affiliateQuery && affiliateQuery.length > 0 && affiliateQuery[0].admin_id) {
        const adminId = affiliateQuery[0].admin_id;
        console.log('🔍 [BILLING] Found admin_id for affiliate:', adminId);
        
        // Get subscription using admin_id
        const subscriptionResult = await executeQuery<Subscription[]>(
          'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          [adminId]
        );
        
        if (subscriptionResult && subscriptionResult.length > 0) {
          subscription = subscriptionResult[0];
          console.log('✅ [BILLING] Found subscription for affiliate via admin_id:', subscription.plan_name);
        }
      } else {
        console.log('⚠️ [BILLING] Affiliate has no admin_id, checking direct subscription');
        // Fallback: check if affiliate has direct subscription
        const directSubscription = await executeQuery<Subscription[]>(
          'SELECT * FROM subscriptions WHERE user_id = ?',
          [userId]
        );
        if (directSubscription && directSubscription.length > 0) {
          subscription = directSubscription[0];
        }
      }
    } else if (userRole === 'user' || userRole === 'funding_manager' || userRole === 'employee') {
      // Employees should see their admin's subscription
      console.log('🔍 [BILLING] Resolving admin subscription for employee user:', userId);
      const link = await executeQuery<any[]>(
        'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
        [userId, 'active']
      );

      if (Array.isArray(link) && link.length > 0 && link[0]?.admin_id) {
        const adminId = link[0].admin_id;
        const subscriptionResult = await executeQuery<Subscription[]>(
          'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          [adminId]
        );
        if (subscriptionResult && subscriptionResult.length > 0) {
          subscription = subscriptionResult[0];
          console.log('✅ [BILLING] Found subscription for employee via admin_id:', subscription.plan_name);
        } else {
          console.log('ℹ️ [BILLING] No subscription found for admin linked to employee');
        }
      } else {
        // Fallback: check direct subscription for the employee (legacy behavior)
        const directSubscription = await executeQuery<Subscription[]>(
          'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          [userId]
        );
        if (directSubscription && directSubscription.length > 0) {
          subscription = directSubscription[0];
          console.log('ℹ️ [BILLING] Using direct subscription for employee');
        }
      }
    } else {
      // For admin/super_admin users, use direct user_id lookup
      console.log('🔍 [BILLING] Fetching subscription for admin user:', userId);
      const subscriptionResult = await executeQuery<Subscription[]>(
        'SELECT * FROM subscriptions WHERE user_id = ?',
        [userId]
      );

      if (subscriptionResult && subscriptionResult.length > 0) {
        subscription = subscriptionResult[0];
        console.log('✅ [BILLING] Found subscription for admin user:', subscription.plan_name);
      }

      // If no active subscription, check if the user has an active affiliate trial
      if (!subscription || String(subscription.status || '').toLowerCase() !== 'active') {
        try {
          const trialRows = await executeQuery<any[]>(
            `SELECT trial_expires_at FROM users WHERE id = ? AND trial_expires_at IS NOT NULL AND trial_expires_at > NOW() LIMIT 1`,
            [userId]
          );
          if (trialRows && trialRows.length > 0) {
            console.log('✅ [BILLING] User is on affiliate trial until:', trialRows[0].trial_expires_at);
            subscription = {
              ...(subscription || {}),
              plan_name: 'Affiliate Trial',
              plan_type: 'monthly',
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: trialRows[0].trial_expires_at,
            } as any;
          }
        } catch (trialCheckErr) {
          console.warn('⚠️ [BILLING] Could not check trial_expires_at:', trialCheckErr);
        }
      }
    }

    res.json({
      success: true,
      subscription: subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create payment intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Creating payment intent...');
    const userId = (req as any).user.id;
    const { amount, currency = 'usd', planName, planType, plan_id, course_id, affiliateId } = req.body;
    
    console.log('📋 Request data:', { userId, amount, currency, planName, planType, course_id, affiliateId });
    if (!Number.isFinite(amount) || amount < 0.5) {
      return res.status(400).json({ error: 'Invalid amount. Must be at least $0.50.' });
    }
    
    const parsedPlanId = Number(plan_id || 0);
    const stripeContext = parsedPlanId > 0
      ? await getStripeContextFromPlanId(parsedPlanId)
      : 'default';
    const paymentStripe = await getStripeForSubscriptionContext(stripeContext);
    console.log('Stripe initialized successfully for payment intent context:', stripeContext);
    // Resolve affiliateId from body, query, or referer using robust resolver
    let resolvedAffiliateId: number | null = null;
    let referralSource: 'affiliate' | 'main' = 'main';
    try {
      const commissionSvc = new CommissionService();
      let candidate: string | number | undefined = affiliateId;
      if (!candidate && (req as any).query && (req as any).query.ref) {
        candidate = (req as any).query.ref;
      }
      if (!candidate && req.headers && (req.headers['referer'] || req.headers['origin'])) {
        const referer = (req.headers['referer'] as string) || (req.headers['origin'] as string);
        try {
          const url = new URL(referer);
          const refParam = url.searchParams.get('ref');
          if (refParam) candidate = refParam;
        } catch {}
      }
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const resolved = await commissionSvc.resolveAffiliateId(String(candidate));
        if (resolved) {
          resolvedAffiliateId = resolved;
          referralSource = 'affiliate';
        }
      }
      // Dashboard fallback: if still not resolved, derive from user's affiliate parent chain
      if (!resolvedAffiliateId) {
        const hierarchy = await commissionSvc.getAffiliateHierarchy(userId);
        if (Array.isArray(hierarchy) && hierarchy.length > 0 && hierarchy[0]?.id) {
          resolvedAffiliateId = Number(hierarchy[0].id);
          referralSource = 'affiliate';
          console.log('🔁 Fallback resolved affiliate via hierarchy:', resolvedAffiliateId);
        }
      }
    } catch (affErr) {
      console.log('ℹ️ Affiliate resolution skipped due to parse/validation error');
    }
    
    // Create or get Stripe customer
    console.log('🔍 Fetching user data for ID:', userId);
    let user = await executeQuery<any[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    let userData = null;
    let isAffiliate = false;
    
    if (!Array.isArray(user) || user.length === 0) {
      console.log('🔍 User not found in users table, checking affiliates table for ID:', userId);
      // Check if this is an affiliate user
      const affiliate = await executeQuery<any[]>(
        'SELECT * FROM affiliates WHERE id = ?',
        [userId]
      );
      
      if (!Array.isArray(affiliate) || affiliate.length === 0) {
        console.error('❌ User not found in users or affiliates table for ID:', userId);
        return res.status(404).json({ error: 'User not found' });
      }
      
      userData = affiliate[0];
      isAffiliate = true;
      console.log('👤 Affiliate data found:', { email: userData.email, name: `${userData.first_name} ${userData.last_name}` });
    } else {
      userData = user[0];
      console.log('👤 User data found:', { email: userData.email, name: `${userData.first_name} ${userData.last_name}` });
    }
    let customerId = userData.stripe_customer_id;
    console.log('Existing customer ID:', customerId);

    if (stripeContext === 'basic_plans') {
      customerId = await getOrCreateCheckoutStripeCustomer(paymentStripe, stripeContext, userData, isAffiliate);
    } else if (!customerId) {
      console.log('🆕 Creating new Stripe customer...');
      const customer = await paymentStripe.customers.create({
        email: userData.email,
        name: `${userData.first_name} ${userData.last_name}`,
        metadata: {
          userId: userId.toString()
        }
      });
      customerId = customer.id;
      console.log('✅ Stripe customer created:', customerId);
      
      // Update user/affiliate with Stripe customer ID
      if (isAffiliate) {
        await executeQuery(
          'UPDATE affiliates SET stripe_customer_id = ? WHERE id = ?',
          [customerId, userId]
        );
        console.log('💾 Updated affiliate with Stripe customer ID');
      } else {
        await executeQuery(
          'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
          [customerId, userId]
        );
        console.log('💾 Updated user with Stripe customer ID');
      }
    }
    
    // Create payment intent
    console.log('💰 Creating payment intent with amount:', Math.round(amount * 100), 'cents');
    const paymentIntent = await paymentStripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata: {
        userId: userId.toString(),
        planName: planName || '',
        planType: planType || '',
        course_id: course_id ? course_id.toString() : '',
        affiliateId: resolvedAffiliateId ? String(resolvedAffiliateId) : '',
        referralSource,
        stripeContext
      }
    }, {
      idempotencyKey: `pi_${userId}_${course_id || 'none'}_${Math.round(amount * 100)}`
    });
    console.log('✅ Payment intent created:', paymentIntent.id);
    
    // For affiliate users, create user record first to satisfy foreign key constraint
    if (isAffiliate) {
      console.log('👤 Creating user record for affiliate before saving transaction...');
      
      // Check if user already exists in users table
      const existingUser = await executeQuery<any[]>(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );
      
      if (!Array.isArray(existingUser) || existingUser.length === 0) {
        // Create user record with affiliate data
        await executeQuery(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, company_name, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'user', 'active', NOW(), NOW())`,
          [
            userId,
            userData.email,
            userData.password_hash || '', // Use existing password hash or empty string
            userData.first_name,
            userData.last_name,
            userData.company_name || null
          ]
        );
        console.log('✅ User record created for affiliate');
      } else {
        console.log('✅ User record already exists for affiliate');
      }
    }

    // Save transaction record
    console.log('💾 Saving transaction record...');

    // Persist metadata for later commission processing and course handling
    const transactionMetadata = JSON.stringify({
      type: course_id ? 'course_purchase' : 'subscription',
      course_id: course_id || undefined,
      affiliateId: resolvedAffiliateId || undefined,
      referralSource,
      stripeContext
    });
    await executeQuery(
      `INSERT INTO billing_transactions 
       (user_id, stripe_payment_intent_id, stripe_customer_id, amount, currency, status, plan_name, plan_type, description, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        paymentIntent.id,
        customerId,
        amount,
        currency,
        'pending',
        planName || null,
        planType || null,
        course_id ? `Course purchase: ${planName}` : `Payment for ${planName} plan`,
        transactionMetadata
      ]
    );
    console.log('✅ Transaction record saved');
    
    console.log('🎉 Payment intent creation completed successfully');
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to create payment intent', details: error.message });
  }
});

// Create Stripe Checkout session for subscriptions
router.post('/create-subscription-checkout', authenticateToken, async (req, res) => {
  try {
    console.log('🧾 Creating subscription checkout session...');
    const userId = (req as any).user.id;
    const { planId, billingCycle = 'monthly', affiliateId } = req.body as { planId: number; billingCycle?: 'monthly' | 'yearly'; affiliateId?: string | number };

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // Fetch plan to get Stripe Price IDs
    const planRows = await executeQuery<any[]>(
      'SELECT id, name, price, trial_price_id, stripe_monthly_price_id, stripe_yearly_price_id, stripe_product_id, page_permissions FROM subscription_plans WHERE id = ? AND is_active = TRUE',
      [planId]
    );
    if (!Array.isArray(planRows) || planRows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }
    const plan = planRows[0];
    const stripeContext = getStripeContextForPlan(plan);
    const checkoutStripe = await getStripeForSubscriptionContext(stripeContext);
    console.log('Subscription checkout Stripe context:', stripeContext, 'plan:', plan.name);

    try {
      const perm = plan.page_permissions ? JSON.parse(plan.page_permissions) : [];
      if (!Array.isArray(perm) && perm?.is_specific) {
        const userRows = await executeQuery<any[]>(
          'SELECT email FROM users WHERE id = ?',
          [userId]
        );
        const userEmail = userRows?.[0]?.email || '';
        const allowed = Array.isArray(perm?.allowed_admin_emails) ? perm.allowed_admin_emails : [];
        if (!userEmail || !allowed.includes(String(userEmail))) {
          return res.status(403).json({ error: 'This plan is restricted for your account' });
        }
      }
    } catch {}

    const useTrialPrice = stripeContext === 'default' && billingCycle === 'monthly' && !!plan.trial_price_id;
    let priceId = useTrialPrice
      ? plan.trial_price_id
      : billingCycle === 'yearly'
        ? (stripeContext === 'default' ? plan.stripe_yearly_price_id : null)
        : (stripeContext === 'default' ? plan.stripe_monthly_price_id : null);
    const interval = billingCycle === 'yearly' ? 'year' : 'month';
    let pendingAmount = 0;
    let stripePriceValid = false;
    try {
      if (priceId) {
        const stripePrice = await checkoutStripe.prices.retrieve(String(priceId));
        if (stripePrice && stripePrice.id) {
          stripePriceValid = true;
          if (typeof stripePrice.unit_amount === 'number') {
            pendingAmount = stripePrice.unit_amount / 100;
          }
        }
      }
    } catch {}
    if (!stripePriceValid) {
      if (useTrialPrice) {
        return res.status(400).json({ error: 'Trial price is not configured correctly for this plan' });
      }
      const planPriceNum = Number(plan.price);
      if (!Number.isFinite(planPriceNum) || planPriceNum <= 0) {
        return res.status(400).json({ error: 'Plan price not configured' });
      }
      let productId = String(plan.stripe_product_id || '');
      let productExists = false;
      if (productId) {
        try {
          const product = await checkoutStripe.products.retrieve(productId);
          if (product && product.id) {
            productExists = true;
          }
        } catch {}
      }
      if (!productExists) {
        const product = await checkoutStripe.products.create({ name: plan.name });
        productId = product.id;
        if (stripeContext === 'default') {
          await executeQuery(
            'UPDATE subscription_plans SET stripe_product_id = ? WHERE id = ?',
            [productId, plan.id]
          );
        }
      }
      const newPrice = await checkoutStripe.prices.create({
        unit_amount: Math.round(planPriceNum * 100),
        currency: 'usd',
        recurring: { interval },
        product: productId
      });
      priceId = newPrice.id;
      stripePriceValid = true;
      pendingAmount = planPriceNum;
      if (stripeContext === 'default' && billingCycle === 'yearly') {
        await executeQuery(
          'UPDATE subscription_plans SET stripe_yearly_price_id = ? WHERE id = ?',
          [priceId, plan.id]
        );
      } else if (stripeContext === 'default') {
        await executeQuery(
          'UPDATE subscription_plans SET stripe_monthly_price_id = ? WHERE id = ?',
          [priceId, plan.id]
        );
      }
    }

    // Resolve affiliateId similar to payment intent
    let resolvedAffiliateId: number | null = null;
    let referralSource: 'affiliate' | 'main' = 'main';
    try {
      const commissionSvc = new CommissionService();
      let candidate: string | number | undefined = affiliateId;
      if (!candidate && (req as any).query && (req as any).query.ref) {
        candidate = (req as any).query.ref;
      }
      if (!candidate && req.headers && (req.headers['referer'] || req.headers['origin'])) {
        const referer = (req.headers['referer'] as string) || (req.headers['origin'] as string);
        try {
          const url = new URL(referer);
          const refParam = url.searchParams.get('ref');
          if (refParam) candidate = refParam;
        } catch {}
      }
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const resolved = await commissionSvc.resolveAffiliateId(String(candidate));
        if (resolved) {
          resolvedAffiliateId = resolved;
          referralSource = 'affiliate';
        }
      }
      // Dashboard fallback: if still not resolved, derive from user's affiliate parent chain
      if (!resolvedAffiliateId) {
        const hierarchy = await commissionSvc.getAffiliateHierarchy(userId);
        if (Array.isArray(hierarchy) && hierarchy.length > 0 && hierarchy[0]?.id) {
          resolvedAffiliateId = Number(hierarchy[0].id);
          referralSource = 'affiliate';
          console.log('🔁 Fallback resolved affiliate via hierarchy:', resolvedAffiliateId);
        }
      }
    } catch (affErr) {
      console.log('ℹ️ Affiliate resolution skipped due to parse/validation error');
    }

    try {
      const perm = (() => {
        try {
          return plan.page_permissions ? JSON.parse(plan.page_permissions) : [];
        } catch {
          return [];
        }
      })();
      let subCheckUserId = Number(userId);
      try {
        const role = String((req as any)?.user?.role || '').toLowerCase();
        if (role === 'affiliate') {
          const aff = await executeQuery<any[]>(
            'SELECT admin_id FROM affiliates WHERE id = ? LIMIT 1',
            [subCheckUserId]
          );
          if (Array.isArray(aff) && aff[0]?.admin_id) {
            subCheckUserId = Number(aff[0].admin_id);
          }
        }
      } catch {}

      let hasAnyActiveSubscription = false;
      let hasPlanHistory = false;
      try {
        const rowA = await executeQuery<any[]>(
          `SELECT asub.id
           FROM admin_subscriptions asub
           JOIN admin_profiles ap ON ap.id = asub.admin_id
           WHERE ap.user_id = ? AND LOWER(TRIM(asub.status)) = 'active'
           LIMIT 1`,
          [subCheckUserId]
        );
        if (Array.isArray(rowA) && rowA.length > 0) hasAnyActiveSubscription = true;

        const historyRowA = await executeQuery<any[]>(
          `SELECT asub.id
           FROM admin_subscriptions asub
           JOIN admin_profiles ap ON ap.id = asub.admin_id
           WHERE ap.user_id = ?
           LIMIT 1`,
          [subCheckUserId]
        );
        if (Array.isArray(historyRowA) && historyRowA.length > 0) hasPlanHistory = true;
      } catch {}
      if (!hasAnyActiveSubscription) {
        try {
          const rowB = await executeQuery<any[]>(
            `SELECT id FROM admin_subscriptions
             WHERE admin_id = ? AND LOWER(TRIM(status)) = 'active'
             LIMIT 1`,
            [subCheckUserId]
          );
          if (Array.isArray(rowB) && rowB.length > 0) hasAnyActiveSubscription = true;
        } catch {}
      }
      if (!hasPlanHistory) {
        try {
          const historyRowB = await executeQuery<any[]>(
            `SELECT id FROM admin_subscriptions WHERE admin_id = ? LIMIT 1`,
            [subCheckUserId]
          );
          if (Array.isArray(historyRowB) && historyRowB.length > 0) hasPlanHistory = true;
        } catch {}
      }
      if (!hasAnyActiveSubscription) {
        try {
          const rowC = await executeQuery<any[]>(
            `SELECT id FROM subscriptions
             WHERE user_id = ? AND LOWER(TRIM(status)) = 'active'
             LIMIT 1`,
            [subCheckUserId]
          );
          if (Array.isArray(rowC) && rowC.length > 0) hasAnyActiveSubscription = true;
        } catch {}
      }
      if (!hasPlanHistory) {
        try {
          const historyRowC = await executeQuery<any[]>(
            `SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1`,
            [subCheckUserId]
          );
          if (Array.isArray(historyRowC) && historyRowC.length > 0) hasPlanHistory = true;
        } catch {}
      }

      let hasAffiliateExclusiveVisibility = false;
      if (requesterRole === 'admin' && resolvedAffiliateId !== null && !hasPlanHistory) {
        try {
          const activePlanPermissions = await executeQuery<any[]>(
            'SELECT page_permissions FROM subscription_plans WHERE is_active = TRUE'
          );
          hasAffiliateExclusiveVisibility = Array.isArray(activePlanPermissions)
            ? activePlanPermissions.some((row: any) => {
                try {
                  const parsedPerm = row.page_permissions ? JSON.parse(row.page_permissions) : [];
                  if (Array.isArray(parsedPerm)) return false;
                  const allowedAffiliateIds = Array.isArray(parsedPerm?.allowed_affiliate_ids)
                    ? parsedPerm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
                    : [];
                  return allowedAffiliateIds.includes(resolvedAffiliateId);
                } catch {
                  return false;
                }
              })
            : false;
        } catch {}
      }

      if (Array.isArray(perm)) {
        if (hasAffiliateExclusiveVisibility) {
          return res.status(403).json({ error: 'This plan is restricted' });
        }
      } else {
        const allowedAffiliateIds = Array.isArray(perm?.allowed_affiliate_ids)
          ? perm.allowed_affiliate_ids.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n))
          : [];

        if (perm?.is_specific && hasAffiliateExclusiveVisibility && allowedAffiliateIds.length === 0) {
          return res.status(403).json({ error: 'This plan is restricted' });
        }

        if (perm?.restricted_to_current_subscribers === true && !hasAnyActiveSubscription) {
          return res.status(403).json({ error: 'This plan is restricted' });
        }

        if (hasAffiliateExclusiveVisibility) {
          if (resolvedAffiliateId === null || !allowedAffiliateIds.includes(resolvedAffiliateId)) {
            return res.status(403).json({ error: 'This plan is restricted' });
          }
        }

        if (allowedAffiliateIds.length > 0) {
          if (resolvedAffiliateId === null || !allowedAffiliateIds.includes(resolvedAffiliateId)) {
            return res.status(403).json({ error: 'This plan is restricted' });
          }
        }
      }
    } catch {}

    // Get or create Stripe customer
    let user = await executeQuery<any[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    let userData = null;
    let isAffiliate = false;
    if (!Array.isArray(user) || user.length === 0) {
      const affiliate = await executeQuery<any[]>(
        'SELECT * FROM affiliates WHERE id = ?',
        [userId]
      );
      if (!Array.isArray(affiliate) || affiliate.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      userData = affiliate[0];
      isAffiliate = true;
    } else {
      userData = user[0];
    }
    const customerId = await getOrCreateCheckoutStripeCustomer(checkoutStripe, stripeContext, userData, isAffiliate);

    // Create Checkout Session
    const portalBaseUrl = getPortalBaseUrlForStripeContext(req, stripeContext);
    const successUrl = `${portalBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${portalBaseUrl}/billing/cancel`;
    const session = await checkoutStripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: String(priceId), quantity: 1 }],
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(userId),
      metadata: {
        userId: String(userId),
        planId: String(planId),
        billingCycle,
        affiliateId: resolvedAffiliateId ? String(resolvedAffiliateId) : '',
        referralSource,
        stripeContext
      },
      subscription_data: {
        metadata: {
          userId: String(userId),
          planId: String(planId),
          billingCycle,
          affiliateId: resolvedAffiliateId ? String(resolvedAffiliateId) : '',
          referralSource,
          stripeContext
        }
      }
    });

    // Store a pending transaction record keyed by Checkout Session for later update
    await executeQuery(
      `INSERT INTO billing_transactions 
       (user_id, stripe_payment_intent_id, stripe_customer_id, amount, currency, status, plan_name, plan_type, description, metadata)
       VALUES (?, ?, ?, ?, 'USD', 'pending', ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         stripe_customer_id = VALUES(stripe_customer_id),
         amount = VALUES(amount),
         currency = VALUES(currency),
         plan_name = VALUES(plan_name),
         plan_type = VALUES(plan_type),
         description = VALUES(description),
         metadata = VALUES(metadata),
         status = IF(status = 'succeeded', 'succeeded', 'pending'),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        session.id,
        customerId,
        pendingAmount,
        plan.name,
        billingCycle,
        `Stripe Checkout session ${session.id} for ${plan.name} (${billingCycle})`,
        JSON.stringify({ type: 'subscription_checkout', planId, billingCycle, sessionId: session.id, affiliateId: resolvedAffiliateId || undefined, referralSource, stripeContext })
      ]
    );

    console.log('✅ Checkout session created:', session.id);
    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('❌ Error creating subscription checkout session:', error);
    res.status(500).json({ error: 'Failed to create subscription checkout session', details: error?.message || 'Unknown error' });
  }
});

// Confirm payment and activate subscription
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, newAdminPassword } = req.body;
    const userId = (req as any).user.id;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }
    
    // Initialize Stripe
    if (!stripe) {
      await initializeStripe();
    }
    
    // Retrieve the payment intent from Stripe to verify its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log(`🔍 Payment intent ${paymentIntentId} status: ${paymentIntent.status}`);
    
    // Check if payment intent is in a valid state for confirmation
    if (paymentIntent.status === 'succeeded') {
      // Check if this payment has already been processed
      const [existingTxn] = await executeQuery(
        'SELECT id, status FROM billing_transactions WHERE stripe_payment_intent_id = ? AND user_id = ?',
        [paymentIntentId, userId]
      ) as any[];
      
      if (existingTxn && existingTxn.length > 0 && existingTxn[0].status === 'succeeded') {
        console.log(`⚠️ Payment ${paymentIntentId} already processed for user ${userId}`);
        return res.json({ 
          success: true, 
          message: 'Payment already processed',
          alreadyProcessed: true 
        });
      }
      
      // Update transaction status
      await executeQuery(
        'UPDATE billing_transactions SET status = ? WHERE stripe_payment_intent_id = ? AND user_id = ?',
        ['succeeded', paymentIntentId, userId]
      );
      
      // Get transaction details for processing
      const txnRows = await executeQuery(
        'SELECT plan_name, amount, plan_type, metadata FROM billing_transactions WHERE stripe_payment_intent_id = ? AND user_id = ?',
        [paymentIntentId, userId]
      ) as any[];
      
      if (!txnRows || txnRows.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      const transaction = Array.isArray(txnRows) ? txnRows[0] : txnRows;
      
      // Check if this is a course purchase
      let isCoursePurchase = false;
      let courseId = null;
      let affiliateIdFromMetadata: number | null = null;
      let referralSourceFromMetadata: 'affiliate' | 'main' | null = null;
      
      if (transaction.metadata) {
        try {
          const metadata = JSON.parse(transaction.metadata);
          if (metadata.type === 'course_purchase' && metadata.course_id) {
             isCoursePurchase = true;
            courseId = metadata.course_id;
          }
          if (metadata.affiliateId) {
            const parsed = parseInt(metadata.affiliateId, 10);
            affiliateIdFromMetadata = Number.isNaN(parsed) ? null : parsed;
          }
          if (metadata.referralSource) {
            referralSourceFromMetadata = metadata.referralSource === 'affiliate' ? 'affiliate' : 'main';
          }
        } catch (e) {
          console.log('Could not parse transaction metadata');
        }
      }
      
      if (isCoursePurchase && courseId) {
        // Handle course purchase - create enrollment
        console.log('📚 Processing course purchase for course ID:', courseId);
        
        // Check if user is already enrolled
        const existingEnrollment = await executeQuery(
          'SELECT id FROM course_enrollments WHERE user_id = ? AND course_id = ?',
          [userId, courseId]
        ) as any[];
        
        if (!existingEnrollment || existingEnrollment.length === 0) {
          // Create course enrollment
          await executeQuery(
            'INSERT INTO course_enrollments (user_id, course_id, enrolled_at) VALUES (?, ?, NOW())',
            [userId, courseId]
          );
          console.log('✅ Course enrollment created for user:', userId, 'course:', courseId);
        } else {
          console.log('ℹ️ User already enrolled in course');
        }
        
        // Skip commission processing for course purchases
        console.log('ℹ️ Skipping commission processing for course purchase');
      } else {
        // Handle subscription purchase
        console.log('📋 Processing subscription purchase');
      }
      
      // Calculate subscription period (declare at higher scope)
      const now = new Date();
      let endDate = new Date(now);
      
      if (!isCoursePurchase) {
        // Only calculate end date for subscriptions
        if (transaction.plan_type === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (transaction.plan_type === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (transaction.plan_type === 'lifetime') {
          endDate.setFullYear(endDate.getFullYear() + 100);
        }
        
        // Create or update subscription
        await executeQuery(`
          INSERT INTO subscriptions (user_id, plan_name, status, current_period_start, current_period_end, plan_type)
          VALUES (?, ?, 'active', ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          plan_name = VALUES(plan_name),
          status = 'active',
          current_period_start = VALUES(current_period_start),
          current_period_end = VALUES(current_period_end),
          plan_type = VALUES(plan_type),
          cancel_at_period_end = FALSE
        `, [userId, transaction.plan_name, now, endDate, transaction.plan_type]);
        syncGhlAdminLifecycleTagsInBackground(Number(userId), { paymentFailed: false });
        console.log('✅ Subscription created/updated for user:', userId);

        // Create admin onboarding contract if not already pending/signed
        try {
          // Check for existing latest contract
          const existingContracts = await executeQuery(
            `SELECT id, status FROM contracts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [userId]
          ) as any[];

          const latestContract = existingContracts && existingContracts.length > 0 ? existingContracts[0] : null;
          // Harden condition: treat 'pending_signature' as an existing active contract to avoid duplicates
          if (!latestContract || (latestContract.status !== 'signed' && latestContract.status !== 'sent' && latestContract.status !== 'pending_signature')) {
            // Defensive guard: if any active/pending contract exists, skip creation
            const activeContracts = await executeQuery(
              `SELECT id, status FROM contracts WHERE user_id = ? AND status IN ('sent','pending_signature','signed') ORDER BY created_at DESC LIMIT 1`,
              [userId]
            ) as any[];
            if (activeContracts && activeContracts.length > 0) {
              console.log('ℹ️ Admin contract already exists (guard), latest status:', activeContracts[0].status);
            } else {
            // Find an active template
            // Prefer admin's own active template; fall back to super admin's active template
            let template: any = null;
            const templateRows = await executeQuery(
              `SELECT id, name, content FROM contract_templates WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`,
              [userId]
            ) as any[];
            if (templateRows && templateRows.length > 0) {
              template = templateRows[0];
            } else {
              const superAdminTpl = await executeQuery(
                `SELECT t.id, t.name, t.content
                 FROM contract_templates t
                 JOIN users u ON t.user_id = u.id
                 WHERE u.role = 'super_admin' AND t.is_active = 1
                 ORDER BY t.id DESC LIMIT 1`
              ) as any[];
              template = superAdminTpl && superAdminTpl.length > 0 ? superAdminTpl[0] : null;
            }

            const title = 'Admin Onboarding Agreement';
            const body = template?.content || 'By purchasing a subscription, you agree to the Admin Onboarding Agreement.';
            const templateId = template?.id || null;

            // Attribute creation to a super admin if available
            let creatorId = userId;
            try {
              const superAdmins = await executeQuery(
                `SELECT id FROM users WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1`
              ) as any[];
              if (superAdmins && superAdmins.length > 0) {
                creatorId = superAdmins[0].id;
              }
            } catch {}

            await executeQuery(
              `INSERT INTO contracts (user_id, client_id, template_id, title, body, status, sent_at, created_at, updated_at, created_by, updated_by)
               VALUES (?, NULL, ?, ?, ?, 'sent', NOW(), NOW(), NOW(), ?, ?)`,
              [userId, templateId, title, body, creatorId, creatorId]
            );
            console.log('✅ Admin onboarding contract created and sent for user:', userId);
            }
          } else {
            console.log('ℹ️ Admin contract already exists with status:', latestContract.status);
          }
        } catch (contractError) {
          console.error('⚠️ Failed to create admin onboarding contract:', contractError);
        }

        // Process affiliate commission only for subscriptions
        try {
          const commissionService = new CommissionService();
          // Provide affiliateId from metadata when available to correctly attribute commission
          await commissionService.processPurchase({
            userId,
            planId: 0,
            amount: transaction.amount,
            transactionId: paymentIntentId,
            affiliateId: affiliateIdFromMetadata || undefined,
            paymentMethod: 'stripe'
          });
          console.log('✅ Commission processed for user:', userId, 'affiliateId:', affiliateIdFromMetadata || 'none', 'source:', referralSourceFromMetadata || 'unknown');
        } catch (commissionError) {
          console.error('⚠️ Commission processing failed:', commissionError);
        }
      }
      
      // Only process affiliate upgrades for subscription purchases, not course purchases
      if (!isCoursePurchase) {
        // Check if user is an affiliate and upgrade to admin if needed
        try {
          const affiliateUpgradeService = new AffiliateUpgradeService();
        
        // Get user email and details - check both users and affiliates tables
        let userEmail = null;
        let userDetails = null;
        
        // First try users table
        const userRows = await executeQuery(
          'SELECT email, first_name, last_name, company_name, role FROM users WHERE id = ?',
          [userId]
        ) as any[];
        
        if (userRows && userRows.length > 0) {
          userEmail = userRows[0].email;
          userDetails = userRows[0];
        } else {
          // If not found in users, check affiliates table
          const affiliateRows = await executeQuery(
            'SELECT email FROM affiliates WHERE id = ?',
            [userId]
          ) as any[];
          
          if (affiliateRows && affiliateRows.length > 0) {
            userEmail = affiliateRows[0].email;
          }
        }
        
        if (userEmail && userDetails) {
          // Check if user is affiliate by email
          const affiliateCheck = await affiliateUpgradeService.checkIfAffiliate(userEmail);
          
          if (affiliateCheck.isAffiliate) {
            // Update affiliate plan_type to reflect paid status for dashboard detection
            console.log('🔄 Updating affiliate plan_type for dashboard detection...');
            await executeQuery(
              'UPDATE affiliates SET plan_type = ?, updated_at = NOW() WHERE email = ?',
              ['paid_partner', userEmail]
            );
            console.log('✅ Affiliate plan_type updated to paid_partner for:', userEmail);
            
            // Create a temporary admin password: first name + 'score8241'
            const tempPasswordBase = (userDetails.first_name || 'Admin');
            const tempPassword = `${tempPasswordBase}score8241`;

            const upgradeResult = await affiliateUpgradeService.upgradeAffiliateToAdmin(
              userEmail,
              1, // planId - can be derived from plan_name if needed
              transaction.plan_name,
              transaction.plan_type,
              transaction.amount,
              tempPassword
            );
            
            if (upgradeResult.success) {
              console.log('✅ Affiliate upgraded to admin for user:', userEmail);
              // Send admin account creation email with temporary password
              try {
                await emailService.sendAdminAccountCreatedEmail({
                  firstName: userDetails.first_name || 'Admin',
                  email: userEmail,
                  password: tempPassword
                });
                console.log('✉️ Sent admin account creation email to:', userEmail);
              } catch (emailErr) {
                console.error('⚠️ Failed to send admin account creation email:', emailErr);
              }
            } else {
              console.log('⚠️ Affiliate upgrade skipped:', upgradeResult.message);
            }
          } else {
            // Check if this admin user has an affiliate record (admin_id relationship)
            console.log('🔍 Checking if admin user has affiliate record...');
            const adminAffiliateRows = await executeQuery(
              'SELECT id, email, plan_type FROM affiliates WHERE admin_id = ?',
              [userId]
            ) as any[];
            
            if (adminAffiliateRows && adminAffiliateRows.length > 0) {
              const affiliateRecord = adminAffiliateRows[0];
              console.log('🔄 Found affiliate record for admin user, updating plan_type...');
              
              // Update affiliate plan_type for admin user's affiliate record
              await executeQuery(
                'UPDATE affiliates SET plan_type = ?, updated_at = NOW() WHERE admin_id = ?',
                ['paid_partner', userId]
              );
              console.log('✅ Admin user affiliate plan_type updated to paid_partner for admin_id:', userId);
              
              // Create affiliate payment history record
              try {
                await executeQuery(
                  `INSERT INTO affiliate_payment_history (
                    affiliate_id, transaction_id, amount, plan_name, plan_type, 
                    payment_status, payment_date, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, 'completed', NOW(), NOW(), NOW())`,
                  [
                    affiliateRecord.id,
                    paymentIntentId,
                    transaction.amount,
                    transaction.plan_name,
                    transaction.plan_type
                  ]
                );
                console.log('✅ Affiliate payment history created for admin user');
              } catch (paymentHistoryError) {
                console.error('⚠️ Failed to create affiliate payment history:', paymentHistoryError);
              }
            } else if (userDetails.role === 'admin') {
              // Admin user doesn't have affiliate record - create one automatically
              console.log('🆕 Creating affiliate profile for admin user who purchased plan...');
              
              try {
                // Create affiliate profile for admin user
                // Generate a temp password using admin first name + 'score8241'
                const baseFirstName = (userDetails.first_name || 'admin').toString().replace(/\s+/g, '');
                const tempPassword = `${baseFirstName}score8241`;
                
                const affiliateData = {
                  admin_id: userId,
                  email: userEmail,
                  password: tempPassword, // Set temp password based on first name
                  first_name: userDetails.first_name || '',
                  last_name: userDetails.last_name || '',
                  company_name: userDetails.company_name || null,
                  commission_rate: 20.00, // Default commission rate for admin affiliates
                  parent_commission_rate: 10.00,
                  created_by: userId,
                  isPasswordHashed: false // Let createAffiliate hash the password
                };
                
                const newAffiliate = await createAffiliate(affiliateData);
                
                if (newAffiliate) {
                  console.log('✅ Affiliate profile created for admin user:', userEmail);
                  
                  // Send affiliate account creation email with temp password
                  try {
                    await emailService.sendAffiliateAccountCreatedEmail({
                      firstName: userDetails.first_name || 'Admin',
                      email: userEmail,
                      password: tempPassword
                    });
                    console.log('📧 Sent affiliate account creation email to:', userEmail);
                  } catch (emailErr) {
                    console.error('⚠️ Failed to send affiliate account creation email:', emailErr);
                  }
                  
                  // Update the new affiliate record with paid partner status
                  await executeQuery(
                    'UPDATE affiliates SET plan_type = ?, status = ?, updated_at = NOW() WHERE id = ?',
                    ['paid_partner', 'active', newAffiliate.id]
                  );
                  console.log('✅ Admin affiliate profile activated with paid_partner status');
                  
                  // Create affiliate payment history record
                  try {
                    await executeQuery(
                      `INSERT INTO affiliate_payment_history (
                        affiliate_id, transaction_id, amount, plan_name, plan_type, 
                        payment_status, payment_date, created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, 'completed', NOW(), NOW(), NOW())`,
                      [
                        newAffiliate.id,
                        paymentIntentId,
                        transaction.amount,
                        transaction.plan_name,
                        transaction.plan_type
                      ]
                    );
                    console.log('✅ Affiliate payment history created for new admin affiliate');
                  } catch (paymentHistoryError) {
                    console.error('⚠️ Failed to create affiliate payment history:', paymentHistoryError);
                  }
                  
                  // Create default affiliate settings
                  try {
                    // Create notification settings
                    await executeQuery(
                      `INSERT INTO affiliate_notification_settings (
                        affiliate_id, email_notifications, sms_notifications, 
                        push_notifications, commission_alerts, referral_updates,
                        weekly_reports, monthly_reports, marketing_emails, created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                      [newAffiliate.id, 1, 0, 1, 1, 1, 1, 1, 0]
                    );
                    
                    // Create payment settings
                    await executeQuery(
                      `INSERT INTO affiliate_payment_settings (
                        affiliate_id, payment_method, paypal_email, minimum_payout,
                        payout_frequency, w9_submitted, created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                      [newAffiliate.id, 'bank_transfer', userEmail, '50.00', 'monthly', 0]
                    );
                    
                    console.log('✅ Default affiliate settings created for admin user');
                  } catch (settingsError) {
                    console.error('⚠️ Failed to create affiliate settings:', settingsError);
                  }
                } else {
                  console.error('❌ Failed to create affiliate profile for admin user');
                }
              } catch (createAffiliateError) {
                console.error('❌ Error creating affiliate profile for admin user:', createAffiliateError);
              }
            }
          }
        } else {
          console.log('⚠️ Could not find email or user details for user ID:', userId);
        }
      } catch (upgradeError) {
        console.error('⚠️ Affiliate upgrade failed:', upgradeError);
      }
      } // End of subscription-only processing
      
      // Send purchase notification email
      try {
        // Get user details for purchase notification
        const userDetails = await executeQuery(
          'SELECT first_name, last_name, email, company_name FROM users WHERE id = ?',
          [userId]
        ) as any[];
        
        if (userDetails && userDetails.length > 0) {
          const user = userDetails[0];
          await emailService.sendPurchaseNotification({
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            companyName: user.company_name || '',
            planName: transaction.plan_name,
            planType: transaction.plan_type,
            amount: transaction.amount,
            purchaseDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            transactionId: paymentIntent.id
          });
          console.log('✅ Purchase notification email sent to:', user.email);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send purchase notification email:', emailError);
        // Don't fail the payment confirmation if email fails
      }

      // Send verification code upon first successful purchase (if email not verified)
      try {
        const userRows = await executeQuery(
          'SELECT id, email, first_name, email_verified FROM users WHERE id = ?',
          [userId]
        ) as any[];

        if (userRows && userRows.length > 0) {
          const user = userRows[0];
          if (!user.email_verified) {
            // Check for existing active verification code
            const codeRows = await executeQuery(
              `SELECT id, code FROM email_verification_codes 
               WHERE email = ? AND type = 'admin_registration' AND used = 0 AND expires_at > NOW()
               ORDER BY created_at DESC LIMIT 1`,
              [user.email]
            ) as any[];

            let verificationCode: string;
            if (codeRows && codeRows.length > 0) {
              verificationCode = codeRows[0].code;
            } else {
              verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
              await executeQuery(
                `INSERT INTO email_verification_codes (email, code, type, expires_at)
                 VALUES (?, ?, 'admin_registration', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
                [user.email, verificationCode]
              );
            }

            try {
              await emailService.sendVerificationCode(user.email, verificationCode, user.first_name);
              console.log('✅ Verification code sent after first purchase to:', user.email);
            } catch (codeEmailError) {
              console.error('⚠️ Failed to send verification code after purchase:', codeEmailError);
            }
          }
        }
      } catch (postPurchaseVerificationError) {
        console.error('⚠️ Post-purchase verification code flow failed:', postPurchaseVerificationError);
      }
      
      res.json({ 
        success: true, 
        message: isCoursePurchase ? 'Course purchase confirmed and enrollment created' : 'Payment confirmed and subscription activated',
        ...(isCoursePurchase ? {
          enrollment: {
            course_id: courseId,
            status: 'enrolled'
          }
        } : {
          subscription: {
            plan: transaction.plan_name,
            status: 'active',
            period_end: endDate
          }
        })
      });
      
    } else if (paymentIntent.status === 'processing') {
      res.json({ 
        success: false, 
        error: 'Payment is still processing. Please wait a moment.',
        status: 'processing'
      });
    } else if (paymentIntent.status === 'requires_action') {
      res.json({ 
        success: false, 
        error: 'Payment requires additional authentication.',
        status: 'requires_action'
      });
    } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
      res.json({ 
        success: false, 
        error: 'Payment was canceled or requires a new payment method.',
        status: paymentIntent.status
      });
    } else {
      res.json({ 
        success: false, 
        error: `Payment failed with status: ${paymentIntent.status}`,
        status: paymentIntent.status
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error confirming payment:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error type:', error.type);
    console.error('❌ Error code:', error.code);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        return res.status(404).json({ 
          error: 'Payment intent not found. It may have expired or been deleted.',
          code: 'payment_intent_not_found'
        });
      }
    }
    
    // Return more detailed error information for debugging
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      details: error.message,
      type: error.type || 'Unknown',
      code: error.code || 'Unknown'
    });
  }
});

router.post('/finalize-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    const {
      stripeClient: checkoutStripe,
      stripeContext,
      session,
    } = await retrieveCheckoutSessionForSubscription(String(sessionId));
    if (!session || session.mode !== 'subscription' || !session.subscription) {
      return res.status(400).json({ error: 'Invalid checkout session' });
    }
    const stripeSubscriptionId = String(session.subscription);
    const customerId = String(session.customer);
    const metadata: any = session.metadata || {};
    let userId: number | undefined = undefined;
    if (metadata.userId) {
      const parsed = parseInt(String(metadata.userId), 10);
      if (!Number.isNaN(parsed)) userId = parsed;
    }
    if (!userId && session.client_reference_id) {
      const refParsed = parseInt(String(session.client_reference_id), 10);
      if (!Number.isNaN(refParsed)) userId = refParsed;
    }
    let planName = 'Subscription';
    let billingCycle: 'monthly' | 'yearly' = metadata?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const planIdMeta = metadata?.planId ? parseInt(String(metadata.planId), 10) : undefined;
    if (planIdMeta) {
      const planRows = await executeQuery<any[]>('SELECT name FROM subscription_plans WHERE id = ?', [planIdMeta]);
      if (Array.isArray(planRows) && planRows.length > 0 && planRows[0].name) {
        planName = planRows[0].name;
      }
    }
    const stripeSub = await checkoutStripe.subscriptions.retrieve(stripeSubscriptionId);
    const { periodStart, periodEnd } = getStripeSubscriptionPeriodDates(stripeSub);
    const statusMap: any = { active: 'active', canceled: 'canceled', past_due: 'past_due', unpaid: 'unpaid', incomplete: 'incomplete', incomplete_expired: 'incomplete' };
    const normalizedStatus = statusMap[stripeSub.status] || 'active';
    try {
      await executeQuery(
        `UPDATE billing_transactions 
         SET status = 'succeeded', updated_at = NOW() 
         WHERE stripe_payment_intent_id = ?`,
        [String(session.id)]
      );
    } catch {}
    if (userId) {
      const existing = await executeQuery<any[]>('SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1', [userId]);
      if (Array.isArray(existing) && existing.length > 0) {
        await executeQuery(
          `UPDATE subscriptions 
           SET stripe_subscription_id = ?, stripe_customer_id = ?, plan_name = ?, plan_type = ?, status = ?, 
               current_period_start = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = ?`,
          [
            stripeSubscriptionId,
            customerId,
            planName,
            billingCycle,
            normalizedStatus,
            periodStart ? new Date(periodStart) : null,
            periodEnd ? new Date(periodEnd) : null,
            !!stripeSub.cancel_at_period_end,
            userId
          ]
        );
      } else {
        await executeQuery(
          `INSERT INTO subscriptions 
           (user_id, stripe_subscription_id, stripe_customer_id, plan_name, plan_type, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId,
            stripeSubscriptionId,
            customerId,
            planName,
            billingCycle,
            normalizedStatus,
            periodStart ? new Date(periodStart) : null,
            periodEnd ? new Date(periodEnd) : null,
            !!stripeSub.cancel_at_period_end
          ]
        );
      }
    }
    if (userId) {
      syncGhlAdminLifecycleTagsInBackground(Number(userId), { paymentFailed: false });
      const userRows = await executeQuery('SELECT email, first_name, last_name, company_name, role FROM users WHERE id = ?', [userId]) as any[];
      if (userRows && userRows.length > 0 && userRows[0].role === 'admin') {
        const adminAffiliateRows = await executeQuery('SELECT id FROM affiliates WHERE admin_id = ?', [userId]) as any[];
        if (adminAffiliateRows && adminAffiliateRows.length > 0) {
          await executeQuery('UPDATE affiliates SET plan_type = ?, status = ?, updated_at = NOW() WHERE admin_id = ?', ['paid_partner', 'active', userId]);
        } else {
          const baseFirstName = (userRows[0].first_name || 'admin').toString().replace(/\s+/g, '');
          const tempPassword = `${baseFirstName}score8241`;
          const newAffiliate = await createAffiliate({
            admin_id: userId,
            email: userRows[0].email,
            password: tempPassword,
            first_name: userRows[0].first_name || '',
            last_name: userRows[0].last_name || '',
            company_name: userRows[0].company_name || null,
            commission_rate: 20.0,
            parent_commission_rate: 10.0,
            created_by: userId,
            isPasswordHashed: false
          });
          if (newAffiliate) {
            await executeQuery('UPDATE affiliates SET plan_type = ?, status = ?, updated_at = NOW() WHERE id = ?', ['paid_partner', 'active', newAffiliate.id]);
            try {
              await emailService.sendAffiliateAccountCreatedEmail({
                firstName: userRows[0].first_name || 'Admin',
                email: userRows[0].email,
                password: tempPassword
              });
            } catch {}
          }
        }
      }
    }
    try {
      const commissionService = new CommissionService();
      let amount = 0;
      try {
        const item = (stripeSub as any)?.items?.data?.[0];
        const unit = item?.price?.unit_amount || 0;
        amount = unit / 100;
      } catch {}
      let affiliateIdResolved: number | undefined = undefined;
      if (metadata?.affiliateId) {
        const rawAffiliate = String(metadata.affiliateId);
        const parsed = parseInt(rawAffiliate, 10);
        if (!Number.isNaN(parsed)) {
          affiliateIdResolved = parsed;
        } else {
          const resolved = await commissionService.resolveAffiliateId(rawAffiliate);
          affiliateIdResolved = resolved || undefined;
        }
      }
      const result = await commissionService.processPurchase({
        userId: userId || 0,
        planId: planIdMeta || 0,
        amount,
        transactionId: session.id,
        affiliateId: affiliateIdResolved,
        paymentMethod: 'stripe'
      });
      if (result?.commissionIds && result.commissionIds.length > 0) {
        await commissionService.markCommissionsAsPaid(result.commissionIds);
        const placeholders = result.commissionIds.map(() => '?').join(',');
        await executeQuery(
          `UPDATE affiliate_commissions SET status = 'paid', updated_at = NOW() 
           WHERE referral_id IN (${placeholders}) AND status = 'pending'`,
          result.commissionIds
        );
        if (userId) {
          await executeQuery(
            `UPDATE affiliate_referrals SET status = 'paid', payment_date = NOW() 
             WHERE referred_user_id = ? AND status = 'pending'`,
            [userId]
          );
          await executeQuery(
            `UPDATE affiliate_commissions SET status = 'paid', payment_date = NOW(), updated_at = NOW() 
             WHERE customer_id = ? AND status = 'pending'`,
            [userId]
          );
        }
      }
    } catch {}
    res.json({
      success: true,
      subscription: {
        user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: customerId,
        plan_name: planName,
        plan_type: billingCycle,
        status: normalizedStatus,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: !!stripeSub.cancel_at_period_end,
        stripe_context: stripeContext
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to finalize checkout session', details: error?.message || 'Unknown error' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { reasonCode, reasonText, guidanceChoice } = req.body as {
      reasonCode?: string;
      reasonText?: string;
      guidanceChoice?: string;
    };
    const guidanceChoices = ['join_class_now', 'not_now', 'still_cancel'];
    const normalizedReasonCode = ['affordability', 'guidance', 'other'].includes(String(reasonCode))
      ? String(reasonCode)
      : 'other';
    const normalizedReasonText = String(reasonText || '').trim().slice(0, 1000) || null;
    const normalizedGuidanceChoice = guidanceChoices.includes(String(guidanceChoice))
      ? String(guidanceChoice)
      : null;
    const guidanceChoiceForSave = normalizedReasonCode === 'guidance' ? normalizedGuidanceChoice : null;
    console.log(`🔄 Attempting to cancel subscription for user ${userId}`);
    const rows = await executeQuery(
      'SELECT id, status, plan_name, stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = ? LIMIT 1',
      [userId, 'active']
    ) as any[];
    if (!rows || rows.length === 0) {
      console.log(`❌ No active subscription found for user ${userId}`);
      return res.status(404).json({ success: false, error: 'No active subscription found to cancel' });
    }
    const sub = rows[0];
    console.log(`📋 Found active subscription: ${sub.plan_name}`);
    if (!stripe) {
      await initializeStripe();
    }
    let periodEnd: Date | null = null;
    try {
      if (stripe && sub.stripe_subscription_id) {
        await stripe.subscriptions.update(String(sub.stripe_subscription_id), { cancel_at_period_end: true });
        const updated = await stripe.subscriptions.retrieve(String(sub.stripe_subscription_id));
        const updatedPeriodDates = getStripeSubscriptionPeriodDates(updated);
        periodEnd = updatedPeriodDates.periodEnd;
      }
    } catch (err) {}
    await executeQuery(
      `UPDATE subscriptions
       SET cancel_at_period_end = TRUE,
           current_period_end = ?,
           cancellation_reason_code = ?,
           cancellation_reason_text = ?,
           cancellation_guidance_choice = ?,
           cancellation_guidance_updated_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE cancellation_guidance_updated_at END,
           cancellation_requested_at = COALESCE(cancellation_requested_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = ?`,
      [
        periodEnd ? new Date(periodEnd) : null,
        normalizedReasonCode,
        normalizedReasonText,
        guidanceChoiceForSave,
        guidanceChoiceForSave,
        userId,
        'active'
      ]
    );
    try {
      const userRows = await executeQuery(
        'SELECT email FROM users WHERE id = ? LIMIT 1',
        [userId]
      ) as any[];
      const userEmail = userRows && userRows.length > 0 ? userRows[0].email : null;
      await executeQuery(
        'UPDATE affiliates SET plan_type = ?, commission_rate = ?, updated_at = NOW() WHERE admin_id = ?',
        ['free', 10.0, userId]
      );
      if (userEmail) {
        await executeQuery(
          'UPDATE affiliates SET plan_type = ?, commission_rate = ?, updated_at = NOW() WHERE email = ?',
          ['free', 10.0, userEmail]
        );
      }
      console.log('🔁 Affiliate plan_type set to free and commission_rate set to 10% for user', userId);
    } catch {}
    console.log(`✅ Subscription set to cancel at period end for user ${userId}`);
    syncGhlAdminLifecycleTagsInBackground(Number(userId));
    return res.json({
      success: true,
      message: 'Subscription cancellation scheduled',
      subscription: {
        status: 'active',
        plan_name: sub.plan_name,
        current_period_end: periodEnd || null,
        cancel_at_period_end: true,
        cancellation_reason_code: normalizedReasonCode,
        cancellation_reason_text: normalizedReasonText,
        cancellation_guidance_choice: guidanceChoiceForSave,
        cancellation_requested_at: new Date()
      }
    });
  } catch (error: any) {
    console.error('❌ Error canceling subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription', details: error?.message || 'Unknown error' });
  }
});

// Track cancellation guidance choice for analytics (before final cancellation)
router.post('/cancellation-guidance-choice', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { guidanceChoice } = req.body as { guidanceChoice?: string };
    const normalizedGuidanceChoice = ['join_class_now', 'not_now', 'still_cancel'].includes(String(guidanceChoice))
      ? String(guidanceChoice)
      : null;

    if (!normalizedGuidanceChoice) {
      return res.status(400).json({ success: false, error: 'Invalid guidance choice' });
    }

    const rows = await executeQuery(
      'SELECT id FROM subscriptions WHERE user_id = ? AND status = ? LIMIT 1',
      [userId, 'active']
    ) as any[];

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    await executeQuery(
      `UPDATE subscriptions
       SET cancellation_guidance_choice = ?,
           cancellation_guidance_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = ?`,
      [normalizedGuidanceChoice, userId, 'active']
    );

    return res.json({
      success: true,
      guidanceChoice: normalizedGuidanceChoice,
      trackedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error tracking cancellation guidance choice:', error);
    return res.status(500).json({ success: false, error: 'Failed to track guidance choice' });
  }
});

router.post('/billing-portal', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    if (!stripe) {
      await initializeStripe();
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    const customerId = await getOrCreateStripeCustomer(userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Stripe customer not found for user' });
    }
    const origin = req.get('origin') || 'https://thescoremachine.com';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/subscription`
    });
    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session', details: error?.message || 'Unknown error' });
  }
});

router.post('/retry-payment', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    if (!stripe) {
      await initializeStripe();
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    const rows = await executeQuery<any[]>(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.stripe_subscription_id) {
      return res.status(404).json({ error: 'Stripe subscription not found for user' });
    }
    const subscriptionId = String(rows[0].stripe_subscription_id);
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      status: 'open',
      limit: 1
    });
    if (!invoices.data.length) {
      return res.status(404).json({ error: 'No open invoices to retry' });
    }
    const invoice = await stripe.invoices.pay(invoices.data[0].id);
    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        status: invoice.status,
        amount_due: typeof invoice.amount_due === 'number' ? invoice.amount_due / 100 : 0,
        currency: (invoice.currency || 'usd').toUpperCase()
      }
    });
  } catch (error: any) {
    console.error('Error retrying payment:', error);
    res.status(500).json({ error: 'Failed to retry payment', details: error?.message || 'Unknown error' });
  }
});

// Get Stripe publishable key
router.get('/stripe-config', async (req, res) => {
  try {
    const planId = Number(req.query.planId || req.query.plan_id || 0);
    const stripeContext = planId > 0
      ? await getStripeContextFromPlanId(planId)
      : 'default';

    if (stripeContext === 'basic_plans') {
      const basicPublishableKey = getBasicPlansStripePublishableKey();
      if (!basicPublishableKey) {
        return res.status(500).json({
          error: 'Basic Plans Stripe publishable key is not configured. Set BASIC_PLANS_STRIPE_PUBLISHABLE_KEY.',
        });
      }

      return res.json({
        success: true,
        publishableKey: basicPublishableKey,
        stripeContext,
      });
    }

    const config = await getStripeConfig();
    const publishableKey = config?.stripe_publishable_key || process.env.STRIPE_PUBLISHABLE_KEY;
    
    res.json({
      success: true,
      publishableKey,
      stripeContext,
    });
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe configuration' });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookContext = getStripeWebhookContextFromRequest(req);
    const config = await getStripeConfig();
    const webhookStripe = await getStripeForSubscriptionContext(webhookContext);
    const endpointSecret = webhookContext === 'basic_plans'
      ? getBasicPlansStripeWebhookSecret()
      : (config?.webhook_endpoint_secret || process.env.STRIPE_WEBHOOK_SECRET);
    
    if (!webhookStripe || !endpointSecret) {
      return res.status(400).send('Webhook configuration missing');
    }
    
    let event: Stripe.Event;
    
    try {
      event = webhookStripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send('Webhook signature verification failed');
    }

    const syncSubscriptionFromStripe = async (stripeSub: Stripe.Subscription, lifecycleOptions: { paymentFailed?: boolean } = {}) => {
      const customerId = String(stripeSub.customer);
      const userLookup = await findUserByStripeCustomerId(webhookContext, customerId);
      const userId = userLookup.userId;

      const statusMap: any = {
        active: 'active',
        trialing: 'active',
        canceled: 'canceled',
        past_due: 'past_due',
        unpaid: 'unpaid',
        incomplete: 'incomplete',
        incomplete_expired: 'incomplete'
      };
      const normalizedStatus = statusMap[stripeSub.status] || 'active';
      const { periodStart, periodEnd } = getStripeSubscriptionPeriodDates(stripeSub);
      const stripePrice = (stripeSub as any)?.items?.data?.[0]?.price;
      const stripePriceId = String(stripePrice?.id || '').trim();
      const stripePlanType = stripePrice?.recurring?.interval === 'year' ? 'yearly' : 'monthly';
      let updatedPlanName: string | null = null;
      if (stripePriceId) {
        const planRows = await executeQuery(
          `SELECT name
           FROM subscription_plans
           WHERE stripe_monthly_price_id = ? OR stripe_yearly_price_id = ?
           LIMIT 1`,
          [stripePriceId, stripePriceId]
        ) as any[];
        updatedPlanName = String(planRows?.[0]?.name || '').trim() || null;
      }

      if (userId) {
        await executeQuery(
          `UPDATE subscriptions 
           SET status = ?,
               plan_name = COALESCE(?, plan_name),
               plan_type = COALESCE(?, plan_type),
               current_period_start = ?,
               current_period_end = ?,
               cancel_at_period_end = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [
            normalizedStatus,
            updatedPlanName,
            updatedPlanName ? stripePlanType : null,
            periodStart ? new Date(periodStart) : null,
            periodEnd ? new Date(periodEnd) : null,
            !!stripeSub.cancel_at_period_end,
            userId
          ]
        );
        syncGhlAdminLifecycleTagsInBackground(Number(userId), lifecycleOptions);
      }

      return { userId, customerId, normalizedStatus };
    };
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await executeQuery(
          'UPDATE billing_transactions SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
          ['succeeded', paymentIntent.id]
        );
        
        // Process affiliate commission for webhook payments
        try {
          const txnRows = await executeQuery(
            'SELECT user_id, amount, plan_name, plan_type, metadata FROM billing_transactions WHERE stripe_payment_intent_id = ?',
            [paymentIntent.id]
          ) as any[];
          
          if (txnRows && txnRows.length > 0) {
            syncGhlAdminLifecycleTagsInBackground(Number(txnRows[0].user_id), { paymentFailed: false });
            const commissionService = new CommissionService();
            // Parse affiliateId from transaction metadata if present
            let affiliateIdFromMetadata: number | undefined = undefined;
            let referralSourceFromMetadata: 'affiliate' | 'main' | undefined = undefined;
            try {
              if (txnRows[0].metadata) {
                const metadataObj = JSON.parse(txnRows[0].metadata);
                if (metadataObj && metadataObj.affiliateId) {
                  const raw = String(metadataObj.affiliateId);
                  const parsed = parseInt(raw, 10);
                  if (!Number.isNaN(parsed)) {
                    affiliateIdFromMetadata = parsed;
                  } else {
                    const commissionService = new CommissionService();
                    const resolved = await commissionService.resolveAffiliateId(raw);
                    affiliateIdFromMetadata = resolved || undefined;
                  }
                }
                if (metadataObj && metadataObj.referralSource) {
                  referralSourceFromMetadata = metadataObj.referralSource === 'affiliate' ? 'affiliate' : 'main';
                }
              }
            } catch {}

            await commissionService.processPurchase({
              userId: txnRows[0].user_id,
              planId: 0,
              amount: txnRows[0].amount,
              transactionId: paymentIntent.id,
              affiliateId: affiliateIdFromMetadata,
              paymentMethod: 'stripe'
            });
            // Explicit upsert for referrals/commissions to ensure fields and paid status
            try {
              let affiliateIdEffective: number | undefined = affiliateIdFromMetadata;
              if (!affiliateIdEffective) {
                const refRows = await executeQuery(
                  `SELECT affiliate_id, id FROM affiliate_referrals 
                   WHERE referred_user_id = ? ORDER BY created_at ASC LIMIT 1`,
                  [txnRows[0].user_id]
                ) as any[];
                if (refRows && refRows.length > 0) {
                  affiliateIdEffective = refRows[0].affiliate_id;
                }
              }

              if (affiliateIdEffective) {
                const affRows = await executeQuery(
                  'SELECT plan_type, paid_referrals_count FROM affiliates WHERE id = ? AND status = "active" LIMIT 1',
                  [affiliateIdEffective]
                ) as any[];
                const planType = affRows && affRows.length > 0 ? String(affRows[0].plan_type || 'free') : 'free';
                const paidReferralsCount = affRows && affRows.length > 0 ? Number(affRows[0].paid_referrals_count || 0) : 0;
                const affiliateTypeAtPayout = (planType === 'paid_partner' || planType === 'pro' || planType === 'premium' || planType === 'partner') ? 'paid' : 'free';
                const commissionRate = affiliateTypeAtPayout === 'paid'
                  ? (paidReferralsCount >= 100 ? 25 : 20)
                  : (paidReferralsCount >= 100 ? 15 : 10);
                const commissionAmount = (txnRows[0].amount * commissionRate) / 100;
                let subscriptionId: string | null = null;
                try {
                  const subRows = await executeQuery(
                    `SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`,
                    [txnRows[0].user_id]
                  ) as any[];
                  if (subRows && subRows.length > 0 && subRows[0].stripe_subscription_id) {
                    subscriptionId = String(subRows[0].stripe_subscription_id);
                  }
                } catch {}

                // Update or insert referral
                const pendingRef = await executeQuery(
                  `SELECT id FROM affiliate_referrals 
                   WHERE affiliate_id = ? AND referred_user_id = ? AND (transaction_id IS NULL OR transaction_id = '') 
                   ORDER BY created_at ASC LIMIT 1`,
                  [affiliateIdEffective, txnRows[0].user_id]
                ) as any[];

                let referralIdToUse: number | undefined = undefined;
                if (pendingRef && pendingRef.length > 0) {
                  referralIdToUse = pendingRef[0].id;
                  await executeQuery(
                    `UPDATE affiliate_referrals 
                     SET commission_amount = ?, commission_rate = ?, transaction_id = ?,
                         status = 'paid', payment_date = NOW(), conversion_date = NOW(), updated_at = NOW()
                     WHERE id = ?`,
                    [commissionAmount, commissionRate, paymentIntent.id, referralIdToUse]
                  );
                } else {
                  const existingRef = await executeQuery(
                    `SELECT id FROM affiliate_referrals 
                     WHERE affiliate_id = ? AND referred_user_id = ? AND transaction_id = ? LIMIT 1`,
                  [affiliateIdEffective, txnRows[0].user_id, paymentIntent.id]
                ) as any[];
                  if (existingRef && existingRef.length > 0) {
                    referralIdToUse = existingRef[0].id;
                    await executeQuery(
                      `UPDATE affiliate_referrals 
                       SET commission_amount = ?, commission_rate = ?,
                           status = 'paid', payment_date = NOW(), conversion_date = NOW(), updated_at = NOW()
                       WHERE id = ?`,
                      [commissionAmount, commissionRate, referralIdToUse]
                    );
                  } else {
                    const ins = await executeQuery(
                      `INSERT INTO affiliate_referrals (
                         affiliate_id, referred_user_id, commission_amount, commission_rate,
                         transaction_id, status, referral_date, conversion_date, payment_date, notes, created_at, updated_at
                       ) VALUES (?, ?, ?, ?, ?, 'paid', NOW(), NOW(), NOW(), ?, NOW(), NOW())`,
                      [affiliateIdEffective, txnRows[0].user_id, commissionAmount, commissionRate, paymentIntent.id, 'Subscription purchase']
                    ) as any;
                    referralIdToUse = ins.insertId;
                  }
                }

                if (referralIdToUse) {
                  const userInfoRows = await executeQuery(
                    `SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
                    [txnRows[0].user_id]
                  ) as any[];
                  const customerName = userInfoRows && userInfoRows.length > 0 ? `${userInfoRows[0].first_name || ''} ${userInfoRows[0].last_name || ''}`.trim() || 'Unknown' : 'Unknown';
                  const customerEmail = userInfoRows && userInfoRows.length > 0 ? userInfoRows[0].email || 'unknown@example.com' : 'unknown@example.com';

                  const existingComm = await executeQuery(
                    `SELECT id FROM affiliate_commissions WHERE referral_id = ? LIMIT 1`,
                    [referralIdToUse]
                  ) as any[];
                  if (existingComm && existingComm.length > 0) {
                    await executeQuery(
                      `UPDATE affiliate_commissions 
                       SET customer_name = ?, customer_email = ?, order_value = ?, commission_rate = ?, commission_amount = ?,
                           commission_level = 1, affiliate_type_at_payout = ?, payer_user_id = ?, subscription_id = ?,
                           status = 'paid', payment_date = NOW(), updated_at = NOW()
                       WHERE id = ?`,
                      [customerName, customerEmail, txnRows[0].amount, commissionRate, commissionAmount, affiliateTypeAtPayout, txnRows[0].user_id, subscriptionId, existingComm[0].id]
                    );
                  } else {
                    await executeQuery(
                      `INSERT INTO affiliate_commissions (
                         affiliate_id, referral_id, customer_id, customer_name, customer_email,
                         order_value, commission_rate, commission_amount, status, tier, product,
                         commission_level, affiliate_type_at_payout, subscription_id, payer_user_id,
                         order_date, payment_date, tracking_code, commission_type, created_at, updated_at
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'Bronze', 'Subscription', ?, ?, ?, ?, NOW(), NOW(), ?, 'signup', NOW(), NOW())`,
                      [
                        affiliateIdEffective,
                        referralIdToUse,
                        txnRows[0].user_id,
                        customerName,
                        customerEmail,
                        txnRows[0].amount,
                        commissionRate,
                        commissionAmount,
                        1,
                        affiliateTypeAtPayout,
                        subscriptionId,
                        txnRows[0].user_id,
                        paymentIntent.id
                      ]
                    );
                  }
                }
              }
            } catch (errUpsert) {
              console.error('⚠️ Error upserting affiliate referral/commission at payment intent succeeded:', errUpsert);
            }
            console.log('✅ Commission processed via webhook for user:', txnRows[0].user_id, 'affiliateId:', affiliateIdFromMetadata || 'none', 'source:', referralSourceFromMetadata || 'unknown');
            
            // Check if user is an affiliate and upgrade to admin if needed
            try {
              const affiliateUpgradeService = new AffiliateUpgradeService();
              // Look up the user's email and first name from their ID
              const userInfoRows = await executeQuery(
                'SELECT email, first_name FROM users WHERE id = ? LIMIT 1',
                [txnRows[0].user_id]
              ) as any[];
              let userEmail: string | null = null;
              let firstName: string | null = null;
              if (userInfoRows && userInfoRows.length > 0) {
                userEmail = userInfoRows[0].email;
                firstName = userInfoRows[0].first_name || 'Admin';
              }

              if (userEmail) {
                const affiliateCheck = await affiliateUpgradeService.checkIfAffiliate(userEmail);
                if (affiliateCheck.isAffiliate) {
                  const tempPassword = `${firstName}score8241`;
                  const upgradeResult = await affiliateUpgradeService.upgradeAffiliateToAdmin(
                    userEmail,
                    1,
                    txnRows[0].plan_name,
                    txnRows[0].plan_type,
                    txnRows[0].amount,
                    tempPassword
                  );
                  if (upgradeResult.success) {
                    console.log('✅ Affiliate upgraded to admin via webhook for user:', userEmail);
                    try {
                      await emailService.sendAdminAccountCreatedEmail({
                        firstName: firstName || 'Admin',
                        email: userEmail,
                        password: tempPassword
                      });
                      console.log('✉️ Sent admin account creation email (webhook) to:', userEmail);
                    } catch (emailErr) {
                      console.error('⚠️ Failed to send admin account creation email (webhook):', emailErr);
                    }
                  } else {
                    console.log('ℹ️ Webhook upgrade skipped:', upgradeResult.message);
                  }
                }
              }
            } catch (upgradeError) {
              console.error('⚠️ Webhook affiliate upgrade failed:', upgradeError);
            }
          }
        } catch (commissionError) {
          console.error('⚠️ Webhook commission processing failed:', commissionError);
        }

        // Send verification code upon first successful purchase (webhook path)
        try {
          const userRows = await executeQuery(
            `SELECT u.id, u.email, u.first_name, u.email_verified
             FROM users u
             JOIN billing_transactions bt ON bt.user_id = u.id
             WHERE bt.stripe_payment_intent_id = ?
             LIMIT 1`,
            [paymentIntent.id]
          ) as any[];

          if (userRows && userRows.length > 0) {
            const user = userRows[0];
            if (!user.email_verified) {
              // Check for existing active verification code
              const codeRows = await executeQuery(
                `SELECT id, code FROM email_verification_codes 
                 WHERE email = ? AND type = 'admin_registration' AND used = 0 AND expires_at > NOW()
                 ORDER BY created_at DESC LIMIT 1`,
                [user.email]
              ) as any[];

              let verificationCode: string;
              if (codeRows && codeRows.length > 0) {
                verificationCode = codeRows[0].code;
              } else {
                verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                await executeQuery(
                  `INSERT INTO email_verification_codes (email, code, type, expires_at)
                   VALUES (?, ?, 'admin_registration', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`,
                  [user.email, verificationCode]
                );
              }

              try {
                await emailService.sendVerificationCode(user.email, verificationCode, user.first_name);
                console.log('✅ Verification code sent via webhook after purchase to:', user.email);
              } catch (codeEmailError) {
                console.error('⚠️ Failed to send verification code via webhook after purchase:', codeEmailError);
              }
            }
          }
        } catch (webhookVerificationError) {
          console.error('⚠️ Webhook post-purchase verification code flow failed:', webhookVerificationError);
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await executeQuery(
          'UPDATE billing_transactions SET status = ? WHERE stripe_payment_intent_id = ?',
          ['failed', failedPayment.id]
        );
        try {
          const failedTransactionRows = await executeQuery(
            'SELECT user_id FROM billing_transactions WHERE stripe_payment_intent_id = ? LIMIT 1',
            [failedPayment.id]
          ) as any[];
          let failedUserId = failedTransactionRows?.[0]?.user_id
            ? Number(failedTransactionRows[0].user_id)
            : null;
          if (!failedUserId && failedPayment.customer) {
            const userLookup = await findUserByStripeCustomerId(webhookContext, String(failedPayment.customer));
            failedUserId = userLookup.userId ? Number(userLookup.userId) : null;
          }
          if (failedUserId) {
            syncGhlAdminLifecycleTagsInBackground(failedUserId, { paymentFailed: true });
          }
        } catch {}
        break;
      
      // Subscription Checkout completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        try {
          if (session.mode === 'subscription' && session.subscription) {
            const stripeSubscriptionId = String(session.subscription);
            const customerId = String(session.customer);
            const metadata = session.metadata || {};
            const userId = metadata?.userId ? parseInt(String(metadata.userId), 10) : undefined;
            const planId = metadata?.planId ? parseInt(String(metadata.planId), 10) : undefined;
            const billingCycle: 'monthly' | 'yearly' = metadata?.billingCycle === 'yearly' ? 'yearly' : 'monthly';

            let planName = 'Subscription';
            if (planId) {
              const planRows = await executeQuery<any[]>(
                'SELECT name FROM subscription_plans WHERE id = ?',
                [planId]
              );
              if (Array.isArray(planRows) && planRows.length > 0 && planRows[0].name) {
                planName = planRows[0].name;
              }
            }

            // Retrieve subscription details for period times
            const stripeSub = await webhookStripe.subscriptions.retrieve(stripeSubscriptionId);
            const { periodStart, periodEnd } = getStripeSubscriptionPeriodDates(stripeSub);
            const amount = typeof session.amount_total === 'number'
              ? session.amount_total / 100
              : Number((stripeSub as any)?.items?.data?.[0]?.price?.unit_amount || 0) / 100;
            const statusMap: any = {
              active: 'active',
              trialing: 'active',
              canceled: 'canceled',
              past_due: 'past_due',
              unpaid: 'unpaid',
              incomplete: 'incomplete',
              incomplete_expired: 'incomplete'
            };
            const normalizedStatus = statusMap[stripeSub.status] || 'active';

            // Update pending billing transaction (by Checkout Session ID) to succeeded for this user
            try {
              await executeQuery(
                `UPDATE billing_transactions 
                 SET status = 'succeeded', updated_at = NOW() 
                 WHERE stripe_payment_intent_id = ?`,
                [String(session.id)]
              );
            } catch {}

            // Explicitly upsert affiliate referral/commission using resolved affiliateId
            try {
              let affiliateIdEffective: number | undefined = undefined;
              if (metadata?.affiliateId) {
                const raw = String(metadata.affiliateId);
                const parsed = parseInt(raw, 10);
                if (!Number.isNaN(parsed)) {
                  affiliateIdEffective = parsed;
                } else {
                  const commissionService = new CommissionService();
                  const resolved = await commissionService.resolveAffiliateId(raw);
                  affiliateIdEffective = resolved || undefined;
                }
              }
              if (!affiliateIdEffective && userId) {
                const refRows = await executeQuery(
                  `SELECT affiliate_id, id FROM affiliate_referrals 
                   WHERE referred_user_id = ? ORDER BY created_at ASC LIMIT 1`,
                  [userId]
                ) as any[];
                if (refRows && refRows.length > 0) {
                  affiliateIdEffective = refRows[0].affiliate_id;
                }
              }

              if (affiliateIdEffective && userId) {
                const affRows = await executeQuery(
                  'SELECT plan_type, paid_referrals_count FROM affiliates WHERE id = ? AND status = "active" LIMIT 1',
                  [affiliateIdEffective]
                ) as any[];
                const planType = affRows && affRows.length > 0 ? String(affRows[0].plan_type || 'free') : 'free';
                const paidReferralsCount = affRows && affRows.length > 0 ? Number(affRows[0].paid_referrals_count || 0) : 0;
                const affiliateTypeAtPayout = (planType === 'paid_partner' || planType === 'pro' || planType === 'premium' || planType === 'partner') ? 'paid' : 'free';
                const commissionRate = affiliateTypeAtPayout === 'paid'
                  ? (paidReferralsCount >= 100 ? 25 : 20)
                  : (paidReferralsCount >= 100 ? 15 : 10);
                const commissionAmount = (amount * commissionRate) / 100;

                // Update existing pending referral or create a new one
                const pendingRef = await executeQuery(
                  `SELECT id FROM affiliate_referrals 
                   WHERE affiliate_id = ? AND referred_user_id = ? AND (transaction_id IS NULL OR transaction_id = '') 
                   ORDER BY created_at ASC LIMIT 1`,
                  [affiliateIdEffective, userId]
                ) as any[];

                let referralIdToUse: number | undefined = undefined;
                if (pendingRef && pendingRef.length > 0) {
                  referralIdToUse = pendingRef[0].id;
                  await executeQuery(
                    `UPDATE affiliate_referrals 
                     SET commission_amount = ?, commission_rate = ?, transaction_id = ?,
                         status = 'paid', payment_date = NOW(), conversion_date = NOW(), updated_at = NOW()
                     WHERE id = ?`,
                    [commissionAmount, commissionRate, String(session.id), referralIdToUse]
                  );
                } else {
                  const existingRef = await executeQuery(
                    `SELECT id FROM affiliate_referrals 
                     WHERE affiliate_id = ? AND referred_user_id = ? AND transaction_id = ? LIMIT 1`,
                    [affiliateIdEffective, userId, String(session.id)]
                  ) as any[];
                  if (existingRef && existingRef.length > 0) {
                    referralIdToUse = existingRef[0].id;
                    await executeQuery(
                      `UPDATE affiliate_referrals 
                       SET commission_amount = ?, commission_rate = ?,
                           status = 'paid', payment_date = NOW(), conversion_date = NOW(), updated_at = NOW()
                       WHERE id = ?`,
                      [commissionAmount, commissionRate, referralIdToUse]
                    );
                  } else {
                    const ins = await executeQuery(
                      `INSERT INTO affiliate_referrals (
                         affiliate_id, referred_user_id, commission_amount, commission_rate,
                         transaction_id, status, referral_date, conversion_date, payment_date, notes, created_at, updated_at
                       ) VALUES (?, ?, ?, ?, ?, 'paid', NOW(), NOW(), NOW(), ?, NOW(), NOW())`,
                      [affiliateIdEffective, userId, commissionAmount, commissionRate, String(session.id), 'Subscription purchase']
                    ) as any;
                    referralIdToUse = ins.insertId;
                  }
                }

                // Upsert commission row based on referral_id
                if (referralIdToUse) {
                  const userInfoRows = await executeQuery(
                    `SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
                    [userId]
                  ) as any[];
                  const customerName = userInfoRows && userInfoRows.length > 0 ? `${userInfoRows[0].first_name || ''} ${userInfoRows[0].last_name || ''}`.trim() || 'Unknown' : 'Unknown';
                  const customerEmail = userInfoRows && userInfoRows.length > 0 ? userInfoRows[0].email || 'unknown@example.com' : 'unknown@example.com';

                  const existingComm = await executeQuery(
                    `SELECT id FROM affiliate_commissions WHERE referral_id = ? LIMIT 1`,
                    [referralIdToUse]
                  ) as any[];

                  if (existingComm && existingComm.length > 0) {
                    await executeQuery(
                      `UPDATE affiliate_commissions 
                       SET customer_name = ?, customer_email = ?, order_value = ?, commission_rate = ?, commission_amount = ?,
                           commission_level = 1, affiliate_type_at_payout = ?, payer_user_id = ?, subscription_id = ?,
                           status = 'paid', payment_date = NOW(), updated_at = NOW()
                       WHERE id = ?`,
                      [customerName, customerEmail, amount, commissionRate, commissionAmount, affiliateTypeAtPayout, userId, stripeSubscriptionId, existingComm[0].id]
                    );
                  } else {
                    await executeQuery(
                      `INSERT INTO affiliate_commissions (
                         affiliate_id, referral_id, customer_id, customer_name, customer_email,
                         order_value, commission_rate, commission_amount, status, tier, product,
                         commission_level, affiliate_type_at_payout, subscription_id, payer_user_id,
                         order_date, payment_date, tracking_code, commission_type, created_at, updated_at
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'Bronze', 'Subscription', ?, ?, ?, ?, NOW(), NOW(), ?, 'signup', NOW(), NOW())`,
                      [
                        affiliateIdEffective,
                        referralIdToUse,
                        userId,
                        customerName,
                        customerEmail,
                        amount,
                        commissionRate,
                        commissionAmount,
                        1,
                        affiliateTypeAtPayout,
                        stripeSubscriptionId,
                        userId,
                        String(session.id)
                      ]
                    );
                  }
                }
              }
            } catch (refCommissionErr) {
              console.error('⚠️ Error upserting affiliate referral/commission at checkout completion:', refCommissionErr);
            }

        if (userId) {
          const existing = await executeQuery<any[]>(
            'SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1',
            [userId]
          );
              if (Array.isArray(existing) && existing.length > 0) {
                await executeQuery(
                  `UPDATE subscriptions 
                   SET stripe_subscription_id = ?, stripe_customer_id = ?, plan_name = ?, plan_type = ?, status = ?, 
                       current_period_start = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = CURRENT_TIMESTAMP 
                   WHERE user_id = ?`,
                  [
                    stripeSubscriptionId,
                    customerId,
                    planName,
                    billingCycle,
                    normalizedStatus,
                    periodStart ? new Date(periodStart) : null,
                    periodEnd ? new Date(periodEnd) : null,
                    !!stripeSub.cancel_at_period_end,
                    userId
                  ]
                );
              } else {
                await executeQuery(
                  `INSERT INTO subscriptions 
                   (user_id, stripe_subscription_id, stripe_customer_id, plan_name, plan_type, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                  [
                    userId,
                    stripeSubscriptionId,
                    customerId,
                    planName,
                    billingCycle,
                    normalizedStatus,
                    periodStart ? new Date(periodStart) : null,
                    periodEnd ? new Date(periodEnd) : null,
                    !!stripeSub.cancel_at_period_end
                  ]
        );
      }
      }
          console.log('✅ Subscription created/updated via checkout session:', { userId, stripeSubscriptionId, planName, billingCycle });
          if (userId) {
            syncGhlAdminLifecycleTagsInBackground(Number(userId), { paymentFailed: false });
          }

          if (userId) {
            const userRows = await executeQuery(
              'SELECT email, first_name, last_name, company_name, role FROM users WHERE id = ?',
              [userId]
            ) as any[];
            if (userRows && userRows.length > 0 && userRows[0].role === 'admin') {
              const adminAffiliateRows = await executeQuery(
                'SELECT id, email, plan_type FROM affiliates WHERE admin_id = ?',
                [userId]
              ) as any[];
              if (adminAffiliateRows && adminAffiliateRows.length > 0) {
                await executeQuery(
                  'UPDATE affiliates SET plan_type = ?, status = ?, updated_at = NOW() WHERE admin_id = ?',
                  ['paid_partner', 'active', userId]
                );
              } else {
                const baseFirstName = (userRows[0].first_name || 'admin').toString().replace(/\s+/g, '');
                const tempPassword = `${baseFirstName}score8241`;
                const newAffiliate = await createAffiliate({
                  admin_id: userId,
                  email: userRows[0].email,
                  password: tempPassword,
                  first_name: userRows[0].first_name || '',
                  last_name: userRows[0].last_name || '',
                  company_name: userRows[0].company_name || null,
                  commission_rate: 20.0,
                  parent_commission_rate: 10.0,
                  created_by: userId,
                  isPasswordHashed: false
                });
                if (newAffiliate) {
                  await executeQuery(
                    'UPDATE affiliates SET plan_type = ?, status = ?, updated_at = NOW() WHERE id = ?',
                    ['paid_partner', 'active', newAffiliate.id]
                  );
                  try {
                    await emailService.sendAffiliateAccountCreatedEmail({
                      firstName: userRows[0].first_name || 'Admin',
                      email: userRows[0].email,
                      password: tempPassword
                    });
                  } catch {}
                }
              }
            }
          }

          try {
            const commissionService = new CommissionService();
            let amount = 0;
            try {
              const item = (stripeSub as any)?.items?.data?.[0];
              const unit = item?.price?.unit_amount || 0;
              amount = unit / 100;
            } catch {}
            const affiliateIdNumeric = metadata?.affiliateId ? parseInt(String(metadata.affiliateId), 10) : undefined;
            const purchaseResult = await commissionService.processPurchase({
              userId,
              planId: planId || 0,
              amount,
              transactionId: session.id,
              affiliateId: !Number.isNaN(affiliateIdNumeric as any) ? affiliateIdNumeric : undefined,
              paymentMethod: 'stripe'
            });
            if (purchaseResult?.commissionIds && purchaseResult.commissionIds.length > 0) {
              await commissionService.markCommissionsAsPaid(purchaseResult.commissionIds);
              const placeholders = purchaseResult.commissionIds.map(() => '?').join(',');
              await executeQuery(
                `UPDATE affiliate_commissions SET status = 'paid', updated_at = NOW() 
                 WHERE referral_id IN (${placeholders}) AND status = 'pending'`,
                purchaseResult.commissionIds
              );
              await executeQuery(
                `UPDATE affiliate_referrals SET status = 'paid', payment_date = NOW() 
                 WHERE referred_user_id = ? AND status = 'pending'`,
                [userId]
              );
              await executeQuery(
                `UPDATE affiliate_commissions SET status = 'paid', payment_date = NOW(), updated_at = NOW() 
                 WHERE customer_id = ? AND status = 'pending'`,
                [userId]
              );
            }
          } catch (commissionErr) {
          }
        }
      } catch (subErr) {
        console.error('⚠️ Error processing checkout.session.completed:', subErr);
      }
      break;
    }
      
      // Ongoing subscription status updates
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        try {
          const { userId, customerId, normalizedStatus } = await syncSubscriptionFromStripe(stripeSub);
          if (userId) {
            console.log('🔁 Subscription synced via webhook:', { eventType: event.type, userId, status: normalizedStatus });
          } else {
            console.log('ℹ️ No matching user found for subscription sync (customerId:', customerId, ')');
          }
        } catch (updErr) {
          console.error(`⚠️ Error processing ${event.type}:`, updErr);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as any;
        try {
          const paymentIntentId = invoiceAny.payment_intent ? String(invoiceAny.payment_intent) : '';
          if (paymentIntentId) {
            await executeQuery(
              'UPDATE billing_transactions SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
              ['succeeded', paymentIntentId]
            );
          }
          if (invoiceAny.subscription) {
            const stripeSub = await webhookStripe.subscriptions.retrieve(String(invoiceAny.subscription));
            const { userId, normalizedStatus } = await syncSubscriptionFromStripe(stripeSub, { paymentFailed: false });
            if (userId) {
              console.log('💸 Invoice paid synced subscription:', { userId, status: normalizedStatus, invoiceId: invoice.id });
            }
          }
        } catch (invoicePaidErr) {
          console.error('⚠️ Error processing invoice.paid:', invoicePaidErr);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as any;
        try {
          const paymentIntentId = invoiceAny.payment_intent ? String(invoiceAny.payment_intent) : '';
          if (paymentIntentId) {
            await executeQuery(
              'UPDATE billing_transactions SET status = ?, updated_at = NOW() WHERE stripe_payment_intent_id = ?',
              ['failed', paymentIntentId]
            );
          }
          if (invoiceAny.subscription) {
            const stripeSub = await webhookStripe.subscriptions.retrieve(String(invoiceAny.subscription));
            const { userId, normalizedStatus } = await syncSubscriptionFromStripe(stripeSub, { paymentFailed: true });
            if (userId) {
              console.log('⚠️ Invoice payment failed synced subscription:', { userId, status: normalizedStatus, invoiceId: invoice.id });
            }
          }
        } catch (invoiceFailedErr) {
          console.error('⚠️ Error processing invoice.payment_failed:', invoiceFailedErr);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        try {
          const customerId = String(stripeSub.customer);
          const userLookup = await findUserByStripeCustomerId(webhookContext, customerId);
          const userId = userLookup.userId;

          if (userId) {
            await executeQuery(
              'UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
              ['canceled', userId]
            );
            syncGhlAdminLifecycleTagsInBackground(Number(userId));
            console.log('🛑 Subscription canceled via webhook:', { userId });
          }
        } catch (delErr) {
          console.error('⚠️ Error processing customer.subscription.deleted:', delErr);
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
