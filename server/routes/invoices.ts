import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { ENV_CONFIG } from '../config/environment.js';
import { emailService } from '../services/emailService.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

function generateInvoiceNumber(prefix = 'INV'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digits
  return `${prefix}-${year}${month}-${rand}`;
}

function generatePublicToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function computeTotals(lineItems: Array<{ quantity: number; unit_price: number }>, taxRate = 0): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = (lineItems || []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
  const tax = Number(((subtotal * (Number(taxRate) || 0)) / 100).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), tax, total };
}

async function generateInvoicePDFBuffer(invoice: any): Promise<Buffer> {
  const items: Array<{ description?: string; quantity?: number; unit_price?: number }> = (() => {
    try { return JSON.parse(invoice.line_items || '[]'); } catch { return []; }
  })();

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // Header
    doc.fontSize(22).text('Invoice', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number || ''}`);
    doc.text(`Issue Date: ${new Date(invoice.issued_date || Date.now()).toLocaleDateString()}`);
    doc.moveDown(0.5);
    const recipientLine = [invoice.recipient_name, invoice.recipient_email].filter(Boolean).join(' <');
    doc.text(`To: ${recipientLine || 'Client'}`);
    doc.moveDown(1);

    // Items
    doc.fontSize(14).text('Line Items');
    doc.moveDown(0.5);
    doc.fontSize(12);
    items.forEach((item, idx) => {
      const qty = Number(item.quantity || 1);
      const unit = Number(item.unit_price || 0);
      const amount = Number((qty * unit).toFixed(2));
      doc.text(`${idx + 1}. ${item.description || 'Item'}`);
      doc.text(`   Qty: ${qty}   Unit: $${unit.toFixed(2)}   Amount: $${amount.toFixed(2)}`);
      doc.moveDown(0.4);
    });

    doc.moveDown(0.8);
    doc.fontSize(14).text('Summary');
    doc.fontSize(12);
    const totals = computeTotals(items.map(it => ({ quantity: Number(it.quantity || 1), unit_price: Number(it.unit_price || 0) })), Number(invoice.tax_rate || 0));
    doc.text(`Subtotal: $${totals.subtotal.toFixed(2)}`);
    doc.text(`Tax (${Number(invoice.tax_rate || 0)}%): $${totals.tax.toFixed(2)}`);
    doc.text(`Total: $${totals.total.toFixed(2)}`);

    doc.moveDown(1);
    const url = `${ENV_CONFIG.FRONTEND_URL.replace(/\/$/, '')}/invoice/${invoice.public_token}`;
    doc.fillColor('blue').text(`View Invoice Online: ${url}`, { link: url, underline: true });

    doc.end();
  });
}

// List invoices for authenticated admins
router.get('/', authenticateToken, requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '100', status, search } = req.query as any;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    const where: string[] = ['i.user_id = ?'];
    const params: any[] = [userId];

    if (status && typeof status === 'string') {
      where.push('i.status = ?');
      params.push(status);
    }

    if (search && typeof search === 'string') {
      where.push('(i.invoice_number LIKE ? OR i.recipient_name LIKE ? OR i.recipient_email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }

    const baseSelect = `
      SELECT 
        i.id, i.invoice_number, i.user_id, i.client_id, i.recipient_name, i.recipient_email,
        i.status, i.currency, i.subtotal, i.tax, i.total, i.amount_paid, i.balance_due,
        i.tax_rate, i.issued_date, i.due_date, i.paid_at, i.public_token, i.created_at, i.updated_at,
        c.first_name AS client_first_name, c.last_name AS client_last_name, c.email AS client_email
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY i.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const rows = await allQuery(baseSelect, params);

    // Count for pagination (use same join/where to match filters)
    const countSql = `
      SELECT COUNT(*) as total 
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `;
    const countRow = await getQuery(countSql, params);
    const total = Number(countRow?.total || 0);

    // Enhance rows with public_url for convenience
    const frontendBase = String(ENV_CONFIG.FRONTEND_URL || '').replace(/\/$/, '');
    const data = rows.map((r: any) => {
      const clientName = [r.client_first_name, r.client_last_name].filter(Boolean).join(' ').trim() || undefined;
      const finalRecipientName = r.recipient_name || clientName;
      const finalRecipientEmail = r.recipient_email || r.client_email || undefined;
      return {
        ...r,
        recipient_name: finalRecipientName,
        recipient_email: finalRecipientEmail,
        client_name: clientName,
        public_url: r.public_token && frontendBase ? `${frontendBase}/invoice/${r.public_token}` : undefined,
      };
    });

    return res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error listing invoices:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// Create a new invoice (authenticated in future; public for now if needed)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      client_id,
      recipient_name,
      recipient_email,
      currency = 'USD',
      line_items = [],
      tax_rate = 0,
      notes = '',
      due_date
    } = req.body || {};

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const { subtotal, tax, total } = computeTotals(line_items, tax_rate);
    const public_token = generatePublicToken();
    const invoice_number = generateInvoiceNumber();

    const insertSql = `
      INSERT INTO invoices (
        invoice_number, user_id, client_id, recipient_name, recipient_email,
        status, currency, subtotal, tax, total, amount_paid, balance_due, tax_rate,
        line_items, notes, issued_date, due_date, paid_at, payment_provider, payment_transaction_id,
        public_token, created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?, 0.00, ?, ?, ?, ?, NOW(), ?, NULL, NULL, NULL, ?, NOW(), NOW(), ?, NULL)
    `;

    const balance_due = total;
    const params = [
      invoice_number,
      user_id,
      client_id || null,
      recipient_name || null,
      recipient_email || null,
      currency,
      subtotal,
      tax,
      total,
      balance_due,
      tax_rate || 0,
      JSON.stringify(line_items || []),
      notes || null,
      due_date || null,
      public_token,
      user_id || null
    ];

    await runQuery(insertSql, params);

    const public_url = `${ENV_CONFIG.FRONTEND_URL.replace(/\/$/, '')}/invoice/${public_token}`;
    return res.json({ success: true, data: { invoice_number, public_token, public_url, total, currency } });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

// Fetch public invoice by token (no auth)
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const sql = `SELECT * FROM invoices WHERE public_token = ? LIMIT 1`;
    const invoice: any = await getQuery(sql, [token]);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Determine test mode for this invoice's owner
    let test_mode_enabled = false;
    let sender_email: string | null = null;
    let sender_company_name: string | null = null;
    let sender_logo_url: string | null = null;
    try {
      const adminUser: any = await getQuery(
        'SELECT id, email, company_name, avatar, nmi_gateway_logo, nmi_test_mode FROM users WHERE id = ? LIMIT 1',
        [invoice.user_id]
      );
      test_mode_enabled = Boolean(adminUser?.nmi_test_mode ?? ENV_CONFIG.NMI_TEST_MODE === true);
      sender_email = adminUser?.email || null;
      sender_company_name = adminUser?.company_name || null;
      const preferredLogo = adminUser?.nmi_gateway_logo || adminUser?.avatar || null;
      // Fallback to frontend public logo asset
      const frontendBase = String(ENV_CONFIG.FRONTEND_URL || '').replace(/\/$/, '');
      const fallbackLogo = frontendBase ? `${frontendBase}/image.png` : null;
      sender_logo_url = preferredLogo || fallbackLogo;
    } catch (e) {
      // If lookup fails, fall back to env-based test flag
      test_mode_enabled = Boolean(ENV_CONFIG.NMI_TEST_MODE === true);
    }

    const data = {
      ...invoice,
      line_items: (() => {
        try { return JSON.parse(invoice.line_items || '[]'); } catch { return []; }
      })(),
      test_mode_enabled,
      sender: {
        email: sender_email,
        company_name: sender_company_name,
        logo_url: sender_logo_url,
      },
      // Backward-compatible top-level fields (UI may read these directly)
      from_email: sender_email,
      from_company_name: sender_company_name,
      from_logo_url: sender_logo_url,
    };
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// Pay invoice (mock payment; integrates with NMI later)
router.post('/public/:token/pay', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const invoice: any = await getQuery('SELECT * FROM invoices WHERE public_token = ? LIMIT 1', [token]);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.json({ success: true, message: 'Invoice already paid', data: { status: 'paid' } });
    }
    // Resolve admin-specific NMI credentials from the invoice owner (user_id)
    const adminUser: any = await getQuery(
      'SELECT id, nmi_test_mode, nmi_api_key, nmi_username, nmi_password FROM users WHERE id = ? LIMIT 1',
      [invoice.user_id]
    );

    // Determine test mode: prefer admin setting, fallback to environment
    const testModeEnabled: boolean = (adminUser?.nmi_test_mode ?? ENV_CONFIG.NMI_TEST_MODE) === true;

    // Build credential payload: prefer admin API key, else admin username/password, else ENV
    let credentialParams: Record<string, string> = {};
    if (adminUser?.nmi_api_key) {
      credentialParams.security_key = String(adminUser.nmi_api_key);
    } else if (adminUser?.nmi_username && adminUser?.nmi_password) {
      credentialParams.username = String(adminUser.nmi_username);
      credentialParams.password = String(adminUser.nmi_password);
    } else if (ENV_CONFIG.NMI_GATEWAY_USERNAME && ENV_CONFIG.NMI_GATEWAY_PASSWORD) {
      credentialParams.username = String(ENV_CONFIG.NMI_GATEWAY_USERNAME);
      credentialParams.password = String(ENV_CONFIG.NMI_GATEWAY_PASSWORD);
    } else {
      return res.status(400).json({ success: false, error: 'NMI gateway is not configured for this admin. Please add API credentials in Settings.' });
    }

    // Accept payment details from request body
    const { payment_token, ccnumber, ccexp, cvv } = (req.body || {}) as any;
    if (!payment_token && !(ccnumber && ccexp)) {
      return res.status(400).json({ success: false, error: 'Missing payment method. Provide Collect.js payment_token or raw ccnumber+ccexp for testing.' });
    }

    // NMI transact endpoint
    const nmiEndpoint = 'https://secure.networkmerchants.com/api/transact.php';

    // Assemble sale parameters
    const saleParams: Record<string, string> = {
      ...credentialParams,
      type: 'sale',
      amount: String(Number(invoice.total).toFixed(2)),
      currency: String(invoice.currency || 'USD'),
      orderid: String(invoice.invoice_number || ''),
      email: String(invoice.recipient_email || ''),
    };

    if (payment_token) {
      saleParams.payment_token = String(payment_token);
    } else {
      // Raw card input path for testing only
      saleParams.ccnumber = String(ccnumber);
      saleParams.ccexp = String(ccexp); // MMYY
      if (cvv) saleParams.cvv = String(cvv);
    }

    if (testModeEnabled) {
      saleParams.test_mode = '1';
    }

    // Form-encode params
    const form = new URLSearchParams();
    Object.entries(saleParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });

    // Execute NMI transaction
    let nmiRespText = '';
    try {
      const resp = await axios.post(nmiEndpoint, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
      });
      nmiRespText = typeof resp.data === 'string' ? resp.data : String(resp.data);
    } catch (err: any) {
      const msg = err?.response?.data ? String(err.response.data) : (err?.message || 'NMI request failed');
      return res.status(502).json({ success: false, error: 'Gateway error', details: msg });
    }

    // Parse NMI name/value response format
    const parsePairs = (txt: string): Record<string, string> => {
      const out: Record<string, string> = {};
      (txt || '').split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) out[k] = decodeURIComponent((v || '').replace(/\+/g, ' '));
      });
      return out;
    };
    const parsed = parsePairs(nmiRespText);
    const responseCode = parsed.response || parsed.result || '0';
    const responseText = parsed.responsetext || parsed.message || 'Unknown response';
    const transactionId = parsed.transactionid || parsed.txn_id || null;

    if (String(responseCode) === '1') {
      // Success: mark invoice as paid
      const updateSql = `
        UPDATE invoices 
        SET amount_paid = total, balance_due = 0.00, status = 'paid', paid_at = NOW(), 
            payment_provider = 'nmi', payment_transaction_id = ?
        WHERE public_token = ?
      `;
      await runQuery(updateSql, [transactionId, token]);

      return res.json({ success: true, message: 'Payment processed', data: { status: 'paid', transaction_id: transactionId } });
    }

    // Failure
    return res.status(400).json({ success: false, error: 'Payment declined', details: { code: responseCode, message: responseText, raw: parsed } });
  } catch (error: any) {
    console.error('Error paying invoice:', error);
    return res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
});

export default router;

// Send invoice email with link and PDF attachment (no auth required for public token)
router.post('/public/:token/send-email', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const invoice: any = await getQuery('SELECT * FROM invoices WHERE public_token = ? LIMIT 1', [token]);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Resolve recipient details
    let recipientEmail: string | null = invoice.recipient_email || null;
    let recipientName: string | null = invoice.recipient_name || null;

    if (!recipientEmail && invoice.client_id) {
      const client: any = await getQuery('SELECT first_name, last_name, email FROM clients WHERE id = ? LIMIT 1', [invoice.client_id]);
      if (client) {
        recipientEmail = client.email || null;
        recipientName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || null;
      }
    }

    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email is not available for this invoice' });
    }

    const publicUrl = `${ENV_CONFIG.FRONTEND_URL.replace(/\/$/, '')}/invoice/${invoice.public_token}`;
    const subject = `Invoice ${invoice.invoice_number} from Score Machine`;
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #1e293b;">
        <h2 style="margin: 0 0 12px;">Your Funding Invoice</h2>
        <p style="margin: 0 0 8px;">Hello ${recipientName || 'Client'},</p>
        <p style="margin: 0 0 12px;">An invoice has been generated for your recent funding approvals.</p>
        <p style="margin: 0 0 12px;">Invoice Number: <strong>${invoice.invoice_number}</strong></p>
        <p style="margin: 0 0 16px;">
          You can view and pay the invoice online here:
          <a href="${publicUrl}" style="color: #0ea5e9;">${publicUrl}</a>
        </p>
        <a href="${publicUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">View Invoice</a>
        <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">A PDF copy is attached for your records.</p>
      </div>
    `;

    // Generate PDF attachment
    const pdfBuffer = await generateInvoicePDFBuffer(invoice);
    const sent = await emailService.sendEmail({
      to: recipientEmail,
      subject,
      html,
      attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    if (!sent) {
      return res.status(500).json({ success: false, error: 'Failed to send invoice email' });
    }

    return res.json({ success: true, message: 'Invoice email sent', data: { public_url: publicUrl } });
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return res.status(500).json({ success: false, error: 'Failed to send invoice email' });
  }
});
