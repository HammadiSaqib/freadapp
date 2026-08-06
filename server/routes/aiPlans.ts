import express, { NextFunction, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';

const router = express.Router();
const DEFAULT_CURRENCY = 'usd';

type DbType = 'sqlite' | 'mysql';

let aiPlansTablesReady: Promise<void> | null = null;
let aiStripe: Stripe | null = null;
let aiStripeSecretInUse: string | null = null;

function getSqlNow(dbType: DbType) {
  return dbType === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';
}

function getAiStripeSecretKey() {
  return String(
    process.env.AI_PLANS_STRIPE_SECRET_KEY ||
      process.env.AI_STRIPE_SECRET_KEY ||
      process.env.STRIPE_AI_SECRET_KEY ||
      '',
  ).trim();
}

function getAiStripePublishableKey() {
  return String(
    process.env.AI_PLANS_STRIPE_PUBLISHABLE_KEY ||
      process.env.AI_STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_AI_PUBLISHABLE_KEY ||
      '',
  ).trim();
}

async function getAiStripe() {
  const secretKey = getAiStripeSecretKey();
  if (!secretKey) {
    const error = new Error('AI Plans Stripe secret key is not configured. Set AI_PLANS_STRIPE_SECRET_KEY.');
    (error as Error & { status?: number }).status = 500;
    throw error;
  }

  if (!secretKey.startsWith('sk_')) {
    const error = new Error('AI Plans Stripe secret key must start with sk_. The publishable key starts with pk_ and cannot create checkout sessions.');
    (error as Error & { status?: number }).status = 500;
    throw error;
  }

  if (!aiStripe || aiStripeSecretInUse !== secretKey) {
    aiStripe = new Stripe(secretKey);
    aiStripeSecretInUse = secretKey;
  }

  return aiStripe;
}

async function ensureAiPlansTables() {
  if (!aiPlansTablesReady) {
    aiPlansTablesReady = (async () => {
      const db = getDatabaseAdapter();
      const dbType = db.getType();

      if (dbType === 'sqlite') {
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_name TEXT NOT NULL,
            plan_description TEXT,
            price_cents INTEGER NOT NULL DEFAULT 0,
            credits INTEGER NOT NULL DEFAULT 0,
            prompt_count INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_by INTEGER,
            updated_by INTEGER,
            deleted_at TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
        await db.executeQuery('CREATE INDEX IF NOT EXISTS idx_ai_plans_active ON ai_plans(is_active, deleted_at)', []);
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_prompt_credit_balances (
            owner_user_id INTEGER NOT NULL PRIMARY KEY,
            purchased_prompt_balance INTEGER NOT NULL DEFAULT 0,
            total_purchased_prompts INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_plan_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_id INTEGER NOT NULL,
            stripe_session_id TEXT NOT NULL UNIQUE,
            stripe_payment_intent_id TEXT,
            amount_cents INTEGER NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'usd',
            status TEXT NOT NULL DEFAULT 'pending',
            credits_granted INTEGER NOT NULL DEFAULT 0,
            prompts_granted INTEGER NOT NULL DEFAULT 0,
            metadata TEXT,
            completed_at TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
        await db.executeQuery('CREATE INDEX IF NOT EXISTS idx_ai_plan_purchases_user_id ON ai_plan_purchases(user_id)', []);
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_stripe_customers (
            user_id INTEGER NOT NULL PRIMARY KEY,
            stripe_customer_id TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
        return;
      }

      await db.executeQuery(
        `CREATE TABLE IF NOT EXISTS ai_plans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_name VARCHAR(191) NOT NULL,
          plan_description TEXT NULL,
          price_cents INT NOT NULL DEFAULT 0,
          credits INT NOT NULL DEFAULT 0,
          prompt_count INT NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_by INT NULL,
          updated_by INT NULL,
          deleted_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_ai_plans_active (is_active, deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        [],
      );
      await db.executeQuery(
        `CREATE TABLE IF NOT EXISTS ai_prompt_credit_balances (
          owner_user_id INT NOT NULL PRIMARY KEY,
          purchased_prompt_balance INT NOT NULL DEFAULT 0,
          total_purchased_prompts INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_ai_prompt_credit_balance_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        [],
      );
      await db.executeQuery(
        `CREATE TABLE IF NOT EXISTS ai_plan_purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          plan_id INT NOT NULL,
          stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
          stripe_payment_intent_id VARCHAR(255) NULL,
          amount_cents INT NOT NULL DEFAULT 0,
          currency VARCHAR(10) NOT NULL DEFAULT 'usd',
          status VARCHAR(40) NOT NULL DEFAULT 'pending',
          credits_granted INT NOT NULL DEFAULT 0,
          prompts_granted INT NOT NULL DEFAULT 0,
          metadata JSON NULL,
          completed_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_ai_plan_purchases_user_id (user_id),
          INDEX idx_ai_plan_purchases_plan_id (plan_id),
          INDEX idx_ai_plan_purchases_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        [],
      );
      await db.executeQuery(
        `CREATE TABLE IF NOT EXISTS ai_stripe_customers (
          user_id INT NOT NULL PRIMARY KEY,
          stripe_customer_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        [],
      );
    })().catch((error) => {
      aiPlansTablesReady = null;
      throw error;
    });
  }

  return aiPlansTablesReady;
}

function requireStrictSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (String(req.user.role || '').toLowerCase() !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  return next();
}

function normalizePlan(row: any) {
  const priceCents = Number(row?.price_cents || 0);
  return {
    id: Number(row?.id),
    plan_name: String(row?.plan_name || ''),
    name: String(row?.plan_name || ''),
    plan_description: row?.plan_description ?? '',
    description: row?.plan_description ?? '',
    price_cents: priceCents,
    price: Number((priceCents / 100).toFixed(2)),
    credits: Number(row?.credits || 0),
    prompt_count: Number(row?.prompt_count || 0),
    prompts: Number(row?.prompt_count || 0),
    is_active: Boolean(Number(row?.is_active ?? 1)),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

const aiPlanInputSchema = z.object({
  name: z.string().trim().min(1, 'Plan name is required').max(191),
  description: z.string().trim().max(5000).optional().default(''),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  credits: z.coerce.number().int().min(0, 'Credits must be 0 or more'),
  prompt_count: z.coerce.number().int().min(1, 'Prompt must be at least 1'),
  is_active: z.boolean().optional().default(true),
});

function parsePlanInput(body: any) {
  return aiPlanInputSchema.parse({
    name: body?.plan_name ?? body?.name,
    description: body?.plan_description ?? body?.description ?? '',
    price: body?.price ?? (typeof body?.price_cents !== 'undefined' ? Number(body.price_cents) / 100 : undefined),
    credits: body?.credits,
    prompt_count: body?.prompt_count ?? body?.prompts ?? body?.prompt,
    is_active: typeof body?.is_active === 'undefined' ? true : Boolean(body.is_active),
  });
}

async function getPlanById(planId: number, includeDeleted = false) {
  await ensureAiPlansTables();
  const db = getDatabaseAdapter();
  const row = await db.getQuery(
    `SELECT * FROM ai_plans WHERE id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'} LIMIT 1`,
    [planId],
  );
  return row ? normalizePlan(row) : null;
}

async function getOrCreateAiStripeCustomer(userId: number) {
  await ensureAiPlansTables();
  const db = getDatabaseAdapter();
  const existing = await db.getQuery(
    'SELECT stripe_customer_id FROM ai_stripe_customers WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (existing?.stripe_customer_id) {
    return String(existing.stripe_customer_id);
  }

  const user = await db.getQuery(
    'SELECT id, email, first_name, last_name FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  if (!user) {
    return null;
  }

  const stripe = await getAiStripe();
  const customer = await stripe.customers.create({
    email: String(user.email || ''),
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined,
    metadata: {
      userId: String(userId),
      product: 'ai_plans_credits',
    },
  });

  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO ai_stripe_customers (user_id, stripe_customer_id, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, updated_at = CURRENT_TIMESTAMP`,
      [userId, customer.id],
    );
  } else {
    await db.executeQuery(
      `INSERT INTO ai_stripe_customers (user_id, stripe_customer_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE stripe_customer_id = VALUES(stripe_customer_id), updated_at = NOW()`,
      [userId, customer.id],
    );
  }

  return customer.id;
}

async function grantPromptCredits(userId: number, promptCount: number) {
  if (promptCount <= 0) {
    return;
  }

  await ensureAiPlansTables();
  const db = getDatabaseAdapter();
  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO ai_prompt_credit_balances (owner_user_id, purchased_prompt_balance, total_purchased_prompts, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(owner_user_id) DO UPDATE SET
         purchased_prompt_balance = purchased_prompt_balance + excluded.purchased_prompt_balance,
         total_purchased_prompts = total_purchased_prompts + excluded.total_purchased_prompts,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, promptCount, promptCount],
    );
    return;
  }

  await db.executeQuery(
    `INSERT INTO ai_prompt_credit_balances (owner_user_id, purchased_prompt_balance, total_purchased_prompts)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       purchased_prompt_balance = purchased_prompt_balance + VALUES(purchased_prompt_balance),
       total_purchased_prompts = total_purchased_prompts + VALUES(total_purchased_prompts),
       updated_at = NOW()`,
    [userId, promptCount, promptCount],
  );
}

function getRequestOrigin(req: AuthRequest) {
  const origin = String(req.get('origin') || '').trim();
  if (origin) {
    return origin;
  }

  const host = req.get('host') || 'admin.localhost:3001';
  return `${req.protocol}://${host}`;
}

router.get('/stripe-config', authenticateToken, async (_req: AuthRequest, res: Response) => {
  const publishableKey = getAiStripePublishableKey();
  return res.json({
    success: true,
    publishableKey: publishableKey.startsWith('pk_') ? publishableKey : '',
    configured: Boolean(getAiStripeSecretKey()),
  });
});

router.get('/', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    await ensureAiPlansTables();
    const db = getDatabaseAdapter();
    const rows = await db.allQuery(
      'SELECT * FROM ai_plans WHERE deleted_at IS NULL AND is_active = 1 ORDER BY price_cents ASC, id DESC',
      [],
    );

    return res.json({ success: true, plans: rows.map(normalizePlan) });
  } catch (error: any) {
    console.error('Error loading AI plans:', error);
    return res.status(500).json({ success: false, error: 'Failed to load AI plans' });
  }
});

router.get('/admin', authenticateToken, requireStrictSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    await ensureAiPlansTables();
    const db = getDatabaseAdapter();
    const rows = await db.allQuery(
      'SELECT * FROM ai_plans WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC',
      [],
    );

    return res.json({ success: true, plans: rows.map(normalizePlan) });
  } catch (error: any) {
    console.error('Error loading AI plans for super admin:', error);
    return res.status(500).json({ success: false, error: 'Failed to load AI plans' });
  }
});

router.post('/admin', authenticateToken, requireStrictSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureAiPlansTables();
    const parsed = parsePlanInput(req.body || {});
    const priceCents = Math.round(parsed.price * 100);
    const db = getDatabaseAdapter();
    const result = await db.executeQuery(
      `INSERT INTO ai_plans (plan_name, plan_description, price_cents, credits, prompt_count, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.name,
        parsed.description || null,
        priceCents,
        parsed.credits,
        parsed.prompt_count,
        parsed.is_active ? 1 : 0,
        req.user?.id ?? null,
        req.user?.id ?? null,
      ],
    );
    const id = Number((result as any)?.insertId || (result as any)?.lastID || 0);
    const plan = id ? await getPlanById(id) : null;
    return res.status(201).json({ success: true, plan });
  } catch (error: any) {
    console.error('Error creating AI plan:', error);
    const status = error?.issues ? 400 : 500;
    return res.status(status).json({ success: false, error: error?.issues ? 'Invalid AI plan data' : 'Failed to create AI plan', details: error?.issues });
  }
});

router.put('/admin/:id', authenticateToken, requireStrictSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureAiPlansTables();
    const planId = Number(req.params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid plan id' });
    }

    const existing = await getPlanById(planId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'AI plan not found' });
    }

    const parsed = parsePlanInput(req.body || {});
    const priceCents = Math.round(parsed.price * 100);
    const db = getDatabaseAdapter();
    await db.executeQuery(
      `UPDATE ai_plans
       SET plan_name = ?, plan_description = ?, price_cents = ?, credits = ?, prompt_count = ?, is_active = ?, updated_by = ?, updated_at = ${getSqlNow(db.getType())}
       WHERE id = ?`,
      [
        parsed.name,
        parsed.description || null,
        priceCents,
        parsed.credits,
        parsed.prompt_count,
        parsed.is_active ? 1 : 0,
        req.user?.id ?? null,
        planId,
      ],
    );

    const plan = await getPlanById(planId);
    return res.json({ success: true, plan });
  } catch (error: any) {
    console.error('Error updating AI plan:', error);
    const status = error?.issues ? 400 : 500;
    return res.status(status).json({ success: false, error: error?.issues ? 'Invalid AI plan data' : 'Failed to update AI plan', details: error?.issues });
  }
});

router.delete('/admin/:id', authenticateToken, requireStrictSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureAiPlansTables();
    const planId = Number(req.params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid plan id' });
    }

    const existing = await getPlanById(planId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'AI plan not found' });
    }

    const db = getDatabaseAdapter();
    await db.executeQuery(
      `UPDATE ai_plans SET is_active = 0, deleted_at = ${getSqlNow(db.getType())}, updated_by = ?, updated_at = ${getSqlNow(db.getType())} WHERE id = ?`,
      [req.user?.id ?? null, planId],
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting AI plan:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete AI plan' });
  }
});

router.post('/:id/checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (String(req.user.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can purchase AI Plans & Credits.' });
    }

    const planId = Number(req.params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return res.status(400).json({ error: 'Invalid plan id' });
    }

    const plan = await getPlanById(planId);
    if (!plan || !plan.is_active) {
      return res.status(404).json({ error: 'AI plan not found' });
    }

    const stripe = await getAiStripe();
    const customerId = await getOrCreateAiStripeCustomer(req.user.id);
    if (!customerId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const origin = getRequestOrigin(req);
    const successUrl = `${origin}/ai-coach?ai_plan_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/ai-coach?ai_plan_canceled=1`;
    const currency = DEFAULT_CURRENCY;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      client_reference_id: String(req.user.id),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: plan.price_cents,
            product_data: {
              name: plan.plan_name,
              description: plan.plan_description || `${plan.prompt_count} AI prompts`,
              metadata: {
                aiPlanId: String(plan.id),
                prompts: String(plan.prompt_count),
                credits: String(plan.credits),
              },
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'ai_plans_credits',
        userId: String(req.user.id),
        planId: String(plan.id),
        prompts: String(plan.prompt_count),
        credits: String(plan.credits),
      },
      payment_intent_data: {
        metadata: {
          type: 'ai_plans_credits',
          userId: String(req.user.id),
          planId: String(plan.id),
        },
      },
    });

    const db = getDatabaseAdapter();
    const metadata = JSON.stringify({ type: 'ai_plans_credits', planName: plan.plan_name });
    await db.executeQuery(
      `INSERT INTO ai_plan_purchases (user_id, plan_id, stripe_session_id, amount_cents, currency, status, credits_granted, prompts_granted, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, plan.id, session.id, plan.price_cents, currency, 'pending', plan.credits, plan.prompt_count, metadata],
    );

    return res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating AI plan checkout:', error);
    const status = error?.status || 500;
    return res.status(status).json({ error: error?.message || 'Failed to create AI plan checkout session' });
  }
});

router.post('/finalize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionId = String(req.body?.sessionId || req.body?.session_id || '').trim();
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    await ensureAiPlansTables();
    const stripe = await getAiStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata: any = session.metadata || {};
    const metadataUserId = Number(metadata.userId || session.client_reference_id || 0);

    if (metadataUserId !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Checkout session does not belong to this user' });
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({ error: 'Checkout session is not paid yet' });
    }

    const db = getDatabaseAdapter();
    const purchase = await db.getQuery(
      'SELECT * FROM ai_plan_purchases WHERE stripe_session_id = ? AND user_id = ? LIMIT 1',
      [sessionId, req.user.id],
    );

    if (!purchase) {
      return res.status(404).json({ error: 'AI plan purchase not found' });
    }

    const alreadySucceeded = String(purchase.status || '').toLowerCase() === 'succeeded';
    const promptsGranted = Number(purchase.prompts_granted || metadata.prompts || 0);
    const creditsGranted = Number(purchase.credits_granted || metadata.credits || 0);
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (!alreadySucceeded) {
      await grantPromptCredits(req.user.id, promptsGranted);
      await db.executeQuery(
        `UPDATE ai_plan_purchases
         SET status = ?, stripe_payment_intent_id = ?, completed_at = ${getSqlNow(db.getType())}, updated_at = ${getSqlNow(db.getType())}
         WHERE id = ?`,
        ['succeeded', paymentIntentId, purchase.id],
      );
    }

    const plan = await getPlanById(Number(purchase.plan_id), true);
    return res.json({
      success: true,
      alreadyFinalized: alreadySucceeded,
      promptsGranted,
      creditsGranted,
      plan,
    });
  } catch (error: any) {
    console.error('Error finalizing AI plan checkout:', error);
    const status = error?.status || 500;
    return res.status(status).json({ error: error?.message || 'Failed to finalize AI plan checkout' });
  }
});

export default router;
