import express from 'express';
import Stripe from 'stripe';
import { ENV_CONFIG } from '../config/environment.js';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { executeQuery } from '../database/mysqlConfig.js';
import { emailService } from '../services/emailService.js';

const router = express.Router();

let stripe: Stripe | null = null;

async function initStripe(): Promise<void> {
  try {
    // Try to load active config from DB
    let config: any = null;
    try {
      const rows = await executeQuery<any[]>(
        'SELECT * FROM stripe_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
      );
      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.stripe_secret_key) {
        config = rows[0];
      }
    } catch {}
    const secretKey = config?.stripe_secret_key || process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn('⚠️ Stripe secret key not found; public shop checkout will be disabled');
      stripe = null;
      return;
    }
    stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.error('❌ Failed to initialize Stripe for shop routes:', e);
    stripe = null;
  }
}

// Public: list products
router.get('/products', async (_req, res) => {
  try {
    const db = getDatabaseAdapter();
    const products = await db.allQuery(
      `SELECT id, name, description, price, thumbnail_url, stripe_billing_link, created_at, updated_at 
       FROM shop_products ORDER BY created_at DESC`
    );
    const result: any[] = [];
    for (const p of products) {
      const files = await db.allQuery(
        `SELECT id, url, type, source, created_at FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`,
        [p.id]
      );
      result.push({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        thumbnail_url: p.thumbnail_url || null,
        stripe_billing_link: p.stripe_billing_link || null,
        files: files.map((f: any) => ({
          id: f.id,
          url: f.url,
          type: f.type,
          source: f.source
        })),
        created_at: p.created_at,
        updated_at: p.updated_at
      });
    }
    res.json({ products: result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch products' });
  }
});

// Public: start checkout for a product (no auth required)
router.post('/checkout', async (req, res) => {
  try {
    const { product_id, purchaser_name, email, cookie_id } = req.body || {};
    if (!product_id || !cookie_id) {
      return res.status(400).json({ error: 'product_id and cookie_id are required' });
    }
    const safeName = purchaser_name && String(purchaser_name).trim().length ? String(purchaser_name) : 'Guest';
    const safeEmail = email && String(email).trim().length ? String(email) : '';
    const db = getDatabaseAdapter();
    const product = await db.getQuery(
      `SELECT id, name, price FROM shop_products WHERE id = ?`,
      [product_id]
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!stripe) {
      await initStripe();
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    const unitAmount = Math.round(Number(product.price) * 100);
    const successUrl = `${ENV_CONFIG.FRONTEND_URL}/shop/success?session_id={CHECKOUT_SESSION_ID}&product_id=${product.id}`;
    const cancelUrl = `${ENV_CONFIG.FRONTEND_URL}/shop`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: product.name },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_id: String(product.id),
        purchaser_name: String(safeName),
        email: String(safeEmail),
        cookie_id: String(cookie_id),
      },
    }, {
      idempotencyKey: `shop_${product.id}_${safeEmail || 'noemail'}_${cookie_id}_${unitAmount}`,
    });
    // Record pending purchase
    await db.executeQuery(
      `INSERT INTO shop_purchases (product_id, purchaser_name, email, cookie_id, status, stripe_session_id)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [product.id, safeName, safeEmail, cookie_id, session.id]
    );
    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create checkout session', details: error?.message || 'Unknown error' });
  }
});

// Public: finalize checkout after success
router.post('/finalize', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }
    if (!stripe) {
      await initStripe();
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    const session = await stripe.checkout.sessions.retrieve(String(session_id));
    if (!session || session.mode !== 'payment') {
      return res.status(400).json({ error: 'Invalid checkout session' });
    }
    const meta: any = session.metadata || {};
    const productId = meta?.product_id ? parseInt(String(meta.product_id), 10) : undefined;
    const emailMeta = String(meta?.email || '');
    const db = getDatabaseAdapter();
    // Update purchase status
    const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
    await db.executeQuery(
      `UPDATE shop_purchases 
       SET status = 'succeeded', stripe_payment_intent_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE stripe_session_id = ? AND email = ?`,
      [intentId, session.id, emailMeta]
    );
    // Fetch product files to download
    const files = await db.allQuery(
      `SELECT url FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`,
      [productId]
    );
    const fileUrls = files.map((f: any) => String(f.url));
    // Notify purchaser about verification to re-download
    if (emailMeta && emailMeta.trim().length) {
      try {
        await emailService.sendEmail({
          to: emailMeta,
          subject: 'Your purchase is successful – verify to re-download anytime',
          html: `
            <p>You successfully purchased the product. To re-download later, use the "Already Purchased?" option on the Shop and verify your email.</p>
            <p>Keep this email for your records.</p>
          `,
          text: 'Purchase successful. Use "Already Purchased?" on the Shop to re-download by verifying your email.'
        });
      } catch {}
    }
    res.json({ success: true, files: fileUrls });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to finalize purchase', details: error?.message || 'Unknown error' });
  }
});

// Public: request verification code for re-download
router.post('/request-code', async (req, res) => {
  try {
    const { product_id, email } = req.body || {};
    if (!product_id || !email) {
      return res.status(400).json({ error: 'product_id and email are required' });
    }
    const db = getDatabaseAdapter();
    const purchase = await db.getQuery(
      `SELECT id, email FROM shop_purchases WHERE product_id = ? AND email = ? AND status = 'succeeded' ORDER BY created_at DESC LIMIT 1`,
      [product_id, email]
    );
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found for this email' });
    }
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await db.executeQuery(
      `INSERT INTO shop_verification_codes (purchase_id, email, code, expires_at, used)
       VALUES (?, ?, ?, ?, FALSE)`,
      [purchase.id, email, code, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );
    // Send email
    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Your verification code',
        html: `<p>Your code is <b>${code}</b>. It expires in 10 minutes.</p>`,
        text: `Your code is ${code}. It expires in 10 minutes.`
      });
    } catch {}
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send verification code', details: error?.message || 'Unknown error' });
  }
});

// Public: verify code and return file URLs (enforced by cookie + email)
router.post('/verify-code', async (req, res) => {
  try {
    const { product_id, email, code, cookie_id } = req.body || {};
    if (!product_id || !email || !code || !cookie_id) {
      return res.status(400).json({ error: 'product_id, email, code, cookie_id are required' });
    }
    const db = getDatabaseAdapter();
    const purchase = await db.getQuery(
      `SELECT id, cookie_id FROM shop_purchases WHERE product_id = ? AND email = ? AND status = 'succeeded' ORDER BY created_at DESC LIMIT 1`,
      [product_id, email]
    );
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found for this email' });
    }
    if (String(purchase.cookie_id) !== String(cookie_id)) {
      return res.status(403).json({ error: 'Cookie mismatch. Only original purchaser can re-download.' });
    }
    const codeRow = await db.getQuery(
      `SELECT id, expires_at, used FROM shop_verification_codes WHERE purchase_id = ? AND email = ? AND code = ? ORDER BY created_at DESC LIMIT 1`,
      [purchase.id, email, code]
    );
    if (!codeRow) {
      return res.status(404).json({ error: 'Invalid verification code' });
    }
    const now = Date.now();
    const expires = new Date(codeRow.expires_at).getTime();
    if (codeRow.used) {
      return res.status(400).json({ error: 'Code already used' });
    }
    if (expires < now) {
      return res.status(400).json({ error: 'Code expired' });
    }
    await db.executeQuery(
      `UPDATE shop_verification_codes SET used = TRUE WHERE id = ?`,
      [codeRow.id]
    );
    const files = await db.allQuery(
      `SELECT url FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`,
      [product_id]
    );
    const fileUrls = files.map((f: any) => String(f.url));
    res.json({ success: true, files: fileUrls });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to verify code', details: error?.message || 'Unknown error' });
  }
});

// Success page: request verification code for purchase by session_id
router.post('/success-request-code', async (req, res) => {
  try {
    const { session_id, email } = req.body || {};
    if (!session_id || !email) {
      return res.status(400).json({ error: 'session_id and email are required' });
    }
    const db = getDatabaseAdapter();
    const purchase = await db.getQuery(
      `SELECT id, product_id FROM shop_purchases WHERE stripe_session_id = ? AND status = 'succeeded' LIMIT 1`,
      [session_id]
    );
    if (!purchase) {
      return res.status(404).json({ error: 'Completed purchase not found for this session' });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.executeQuery(
      `INSERT INTO shop_verification_codes (purchase_id, email, code, expires_at, used)
       VALUES (?, ?, ?, ?, FALSE)`,
      [purchase.id, email, code, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );
    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Your verification code',
        html: `<p>Your code is <b>${code}</b>. It expires in 10 minutes.</p>`,
        text: `Your code is ${code}. It expires in 10 minutes.`
      });
    } catch {}
    res.json({ success: true, product_id: purchase.product_id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send verification code', details: error?.message || 'Unknown error' });
  }
});

// Success page: verify code and store email on purchase
router.post('/success-verify-code', async (req, res) => {
  try {
    const { session_id, email, code, cookie_id } = req.body || {};
    if (!session_id || !email || !code || !cookie_id) {
      return res.status(400).json({ error: 'session_id, email, code, cookie_id are required' });
    }
    const db = getDatabaseAdapter();
    const purchase = await db.getQuery(
      `SELECT id, product_id, cookie_id FROM shop_purchases WHERE stripe_session_id = ? AND status = 'succeeded' LIMIT 1`,
      [session_id]
    );
    if (!purchase) {
      return res.status(404).json({ error: 'Completed purchase not found for this session' });
    }
    if (String(purchase.cookie_id) !== String(cookie_id)) {
      return res.status(403).json({ error: 'Cookie mismatch. Only original purchaser can verify email.' });
    }
    const codeRow = await db.getQuery(
      `SELECT id, expires_at, used FROM shop_verification_codes WHERE purchase_id = ? AND email = ? AND code = ? ORDER BY created_at DESC LIMIT 1`,
      [purchase.id, email, code]
    );
    if (!codeRow) {
      return res.status(404).json({ error: 'Invalid verification code' });
    }
    const now = Date.now();
    const expires = new Date(codeRow.expires_at).getTime();
    if (codeRow.used) {
      return res.status(400).json({ error: 'Code already used' });
    }
    if (expires < now) {
      return res.status(400).json({ error: 'Code expired' });
    }
    await db.executeQuery(`UPDATE shop_verification_codes SET used = TRUE WHERE id = ?`, [codeRow.id]);
    await db.executeQuery(`UPDATE shop_purchases SET email = ? WHERE id = ?`, [email, purchase.id]);
    const files = await db.allQuery(
      `SELECT url FROM shop_product_files WHERE product_id = ? ORDER BY created_at ASC`,
      [purchase.product_id]
    );
    const fileUrls = files.map((f: any) => String(f.url));
    res.json({ success: true, files: fileUrls });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to verify email', details: error?.message || 'Unknown error' });
  }
});

export default router;
