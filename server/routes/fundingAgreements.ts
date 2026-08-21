import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken, type AuthRequest } from '../middleware/authMiddleware.js';
import { allQuery, getQuery, runQuery } from '../database/databaseAdapter.js';

const router = Router();
router.use(authenticateToken);

const DEFAULT_TITLE = 'Client Funding Assistance Agreement';
const DEFAULT_CONTENT = `
<h2>Client Funding Assistance Agreement</h2>
<p>By signing this Agreement, the Client authorizes the internal Funding Team to assist with the funding process and, where permitted, to assist with funding applications.</p>
<p>The Client understands that funding approval, terms, limits, and timing are determined by third-party financial institutions and are not guaranteed.</p>
<p>The Client agrees to cooperate, respond promptly, and provide complete and accurate information and documents.</p>
<p>The Client agrees to pay the configured funding success fee shown below when funding is successfully obtained. The current expected success-fee range is 8%–10%, and the exact percentage accepted by the Client is recorded with this Agreement.</p>
<p>The Client consents to electronic signatures and electronic records. Any ACH or other payment authorization applies only when a separate, valid authorization and payment setup exists.</p>`;

const templateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content_html: z.string().trim().min(1),
  success_fee_percentage: z.coerce.number().min(0).max(100),
});

const signSchema = z.object({
  signature: z.string().trim().min(2).max(255),
  source: z.enum(['admin_dashboard', 'member_dashboard']).default('member_dashboard'),
});

async function ensureTables() {
  await runQuery(`CREATE TABLE IF NOT EXISTS funding_agreement_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version INT NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content_html LONGTEXT NOT NULL,
    success_fee_percentage DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await runQuery(`CREATE TABLE IF NOT EXISTS client_funding_agreements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    template_id INT NOT NULL,
    agreement_version INT NOT NULL,
    title_snapshot VARCHAR(255) NOT NULL,
    content_snapshot LONGTEXT NOT NULL,
    success_fee_percentage DECIMAL(5,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_signature',
    funding_team_status VARCHAR(40) NOT NULL DEFAULT 'agreement_required',
    signature_text VARCHAR(255) NULL,
    signer_name VARCHAR(255) NULL,
    signed_at DATETIME NULL,
    signed_ip VARCHAR(100) NULL,
    signed_source VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_client_funding_agreement (client_id)
  )`);

  const active = await getQuery("SELECT id FROM funding_agreement_templates WHERE status = 'active' LIMIT 1");
  if (!active) {
    await runQuery(
      `INSERT INTO funding_agreement_templates
       (version, title, content_html, success_fee_percentage, status)
       VALUES (1, ?, ?, 8.00, 'active')`,
      [DEFAULT_TITLE, DEFAULT_CONTENT],
    );
  }
}

async function getAuthorizedClient(req: AuthRequest, clientId: number) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'client') {
    return Number(req.user?.id) === clientId
      ? getQuery('SELECT * FROM clients WHERE id = ?', [clientId])
      : null;
  }
  if (role === 'super_admin' || role === 'funding_manager') {
    return getQuery('SELECT * FROM clients WHERE id = ?', [clientId]);
  }
  if (role === 'admin') {
    return getQuery('SELECT * FROM clients WHERE id = ? AND user_id = ?', [clientId, req.user?.id]);
  }
  const employee = await getQuery(
    `SELECT c.* FROM clients c
     JOIN employees e ON e.admin_id = c.user_id
     WHERE c.id = ? AND e.user_id = ? AND e.status = 'active' LIMIT 1`,
    [clientId, req.user?.id],
  );
  return employee || null;
}

async function getOrCreateAgreement(clientId: number) {
  let agreement = await getQuery(
    'SELECT * FROM client_funding_agreements WHERE client_id = ? LIMIT 1',
    [clientId],
  );
  if (agreement) return agreement;

  const template = await getQuery(
    "SELECT * FROM funding_agreement_templates WHERE status = 'active' ORDER BY version DESC LIMIT 1",
  );
  const result = await runQuery(
    `INSERT INTO client_funding_agreements
     (client_id, template_id, agreement_version, title_snapshot, content_snapshot, success_fee_percentage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clientId, template.id, template.version, template.title, template.content_html, template.success_fee_percentage],
  );
  agreement = await getQuery(
    'SELECT * FROM client_funding_agreements WHERE id = ? OR client_id = ? LIMIT 1',
    [(result as any)?.insertId || (result as any)?.lastID || 0, clientId],
  );
  return agreement;
}

router.get('/template', async (req: AuthRequest, res: Response) => {
  if (String(req.user?.role || '') !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required' });
  try {
    await ensureTables();
    const template = await getQuery(
      "SELECT * FROM funding_agreement_templates WHERE status = 'active' ORDER BY version DESC LIMIT 1",
    );
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Failed to load funding agreement template:', error);
    res.status(500).json({ error: 'Failed to load funding agreement template' });
  }
});

router.put('/template', async (req: AuthRequest, res: Response) => {
  if (String(req.user?.role || '') !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required' });
  try {
    await ensureTables();
    const payload = templateSchema.parse(req.body);
    const latest = await getQuery('SELECT COALESCE(MAX(version), 0) AS version FROM funding_agreement_templates');
    const nextVersion = Number(latest?.version || 0) + 1;
    await runQuery("UPDATE funding_agreement_templates SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'");
    await runQuery(
      `INSERT INTO funding_agreement_templates
       (version, title, content_html, success_fee_percentage, status, created_by)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [nextVersion, payload.title, payload.content_html, payload.success_fee_percentage, req.user?.id],
    );
    const template = await getQuery('SELECT * FROM funding_agreement_templates WHERE version = ?', [nextVersion]);
    res.json({ success: true, data: template });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid agreement template', details: error.errors });
    console.error('Failed to publish funding agreement template:', error);
    res.status(500).json({ error: 'Failed to publish funding agreement template' });
  }
});

router.get('/client/:clientId', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTables();
    const clientId = Number(req.params.clientId);
    const client = Number.isFinite(clientId) ? await getAuthorizedClient(req, clientId) : null;
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const isFundable = String(client.fundable_status || '').toLowerCase() === 'fundable';
    const agreement = isFundable ? await getOrCreateAgreement(clientId) : null;
    res.json({
      success: true,
      data: {
        client_id: clientId,
        client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        is_fundable: isFundable,
        agreement,
        funding_progress: agreement?.status === 'signed' ? 'Submitted to Funding Team' : isFundable ? 'Agreement required' : 'Not funding-ready',
      },
    });
  } catch (error) {
    console.error('Failed to load client funding agreement:', error);
    res.status(500).json({ error: 'Failed to load client funding agreement' });
  }
});

router.post('/client/:clientId/sign', async (req: AuthRequest, res: Response) => {
  if (String(req.user?.role || '') !== 'client') {
    return res.status(403).json({ error: 'The actual client must sign this agreement from the Member Dashboard' });
  }
  try {
    await ensureTables();
    const clientId = Number(req.params.clientId);
    const client = await getAuthorizedClient(req, clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (String(client.fundable_status || '').toLowerCase() !== 'fundable') {
      return res.status(409).json({ error: 'This client is not currently marked Fundable' });
    }
    const payload = signSchema.parse(req.body);
    const agreement = await getOrCreateAgreement(clientId);
    if (String(agreement.status) !== 'signed') {
      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const ip = forwarded || req.ip || req.socket.remoteAddress || '';
      await runQuery(
        `UPDATE client_funding_agreements
         SET status = 'signed', funding_team_status = 'ready_for_funding_team', signature_text = ?,
             signer_name = ?, signed_at = CURRENT_TIMESTAMP, signed_ip = ?, signed_source = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status <> 'signed'`,
        [payload.signature, `${client.first_name || ''} ${client.last_name || ''}`.trim(), ip, payload.source, agreement.id],
      );

      const recipients = await allQuery("SELECT id FROM users WHERE role IN ('super_admin', 'funding_manager') AND status = 'active'");
      for (const recipient of recipients) {
        try {
          await runQuery(
            `INSERT INTO admin_notifications
             (recipient_id, sender_id, title, message, type, priority, action_url, action_text)
             VALUES (?, NULL, ?, ?, 'success', 'high', ?, 'Open Funding Queue')`,
            [recipient.id, 'Client Ready for Funding Team', `${client.first_name} ${client.last_name} signed Funding Agreement v${agreement.agreement_version}.`, '/funding-manager/clients'],
          );
        } catch (notificationError) {
          console.warn('Funding-team notification failed:', notificationError);
        }
      }
    }
    const signed = await getQuery('SELECT * FROM client_funding_agreements WHERE client_id = ?', [clientId]);
    res.json({ success: true, data: signed });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid signature', details: error.errors });
    console.error('Failed to sign funding agreement:', error);
    res.status(500).json({ error: 'Failed to sign funding agreement' });
  }
});

export default router;
