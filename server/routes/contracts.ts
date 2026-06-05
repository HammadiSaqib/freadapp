import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// =====================
// Validation Schemas
// =====================
const templateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  content_html: z.string().optional(),
  content_text: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

const templateUpdateSchema = templateCreateSchema.partial();

const tsmEliteCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  content_html: z.string().optional(),
  content_text: z.string().optional(),
  status: z.enum(['draft', 'active']).default('active'),
});

const tsmEliteUpdateSchema = tsmEliteCreateSchema.partial();

const contractCreateSchema = z.object({
  client_id: z.number().int(),
  admin_id: z.number().int(), // Assigned normal admin
  template_id: z.number().int().optional(),
  title: z.string().optional(),
  due_at: z.string().optional(),
  status: z.enum(['draft', 'pending_signature']).default('pending_signature'),
  metadata: z.any().optional(),
});

const contractUpdateSchema = z.object({
  title: z.string().optional(),
  due_at: z.string().optional(),
  status: z.enum(['draft', 'pending_signature', 'signed', 'void', 'expired']).optional(),
  void_reason: z.string().optional(),
  metadata: z.any().optional(),
});

const signSchema = z.object({
  signature_text: z.string().optional(),
  signature_image_url: z.string().url().optional(),
});

// Helper to normalize inserted ID across SQLite/MySQL
function getInsertedId(result: any): number | null {
  if (!result) return null;
  if (typeof result.insertId === 'number') return result.insertId;
  if (typeof result.lastID === 'number') return result.lastID;
  return null;
}

const tsmEliteSelectFields = `SELECT
  id,
  admin_id,
  name,
  description,
  content_html,
  content_text,
  status,
  created_at,
  updated_at
 FROM tsm_elite`;

// =====================
// Templates
// =====================
router.get('/templates', requireRole('admin', 'super_admin'), async (_req: Request, res: Response) => {
  try {
    // MySQL-only: map columns to expected frontend shape
    const rows = await allQuery(
      `SELECT 
         id,
         user_id AS admin_id,
         name,
         description,
         content AS content_text,
         content AS content_html,
         CASE WHEN is_active = 1 THEN 'active' ELSE 'draft' END AS status,
         created_at,
         updated_at
       FROM contract_templates
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching contract templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.post('/templates', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const payload = templateCreateSchema.parse(req.body);
    const adminId = (req as any).user.id;
    const content = payload.content_html ?? payload.content_text ?? '';
    const is_active = (payload.status ?? 'draft') === 'active' ? 1 : 0;
    const insertResult = await runQuery(
      `INSERT INTO contract_templates (user_id, name, description, content, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        payload.name,
        payload.description ?? null,
        content,
        is_active,
        adminId,
        adminId,
      ]
    );

    const id = getInsertedId(insertResult);
    const row = await getQuery(
      `SELECT 
         id,
         user_id AS admin_id,
         name,
         description,
         content AS content_text,
         content AS content_html,
         CASE WHEN is_active = 1 THEN 'active' ELSE 'draft' END AS status,
         created_at,
         updated_at
       FROM contract_templates WHERE id = ?`,
      [id]
    );
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

router.put('/templates/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const payload = templateUpdateSchema.parse(req.body);
    const { id } = req.params;
    const adminId = (req as any).user.id;
    const fields: string[] = [];
    const params: any[] = [];
    if (typeof payload.name !== 'undefined') {
      fields.push('name = ?');
      params.push(payload.name);
    }
    if (typeof payload.description !== 'undefined') {
      fields.push('description = ?');
      params.push(payload.description);
    }
    // Prefer HTML if provided, else text
    const content = typeof payload.content_html !== 'undefined'
      ? payload.content_html
      : (typeof payload.content_text !== 'undefined' ? payload.content_text : undefined);
    if (typeof content !== 'undefined') {
      fields.push('content = ?');
      params.push(content);
    }
    if (typeof payload.status !== 'undefined') {
      fields.push('is_active = ?');
      params.push(payload.status === 'active' ? 1 : 0);
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    fields.push('updated_by = ?');
    params.push(adminId);
    params.push(id);
    await runQuery(
      `UPDATE contract_templates SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    const row = await getQuery(
      `SELECT 
         id,
         user_id AS admin_id,
         name,
         description,
         content AS content_text,
         content AS content_html,
         CASE WHEN is_active = 1 THEN 'active' ELSE 'draft' END AS status,
         created_at,
         updated_at
       FROM contract_templates WHERE id = ?`,
      [id]
    );
    res.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM contract_templates WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

router.get('/tsm-elite/templates', requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    const rows = await allQuery(`${tsmEliteSelectFields} ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching TSM Elite templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch TSM Elite templates' });
  }
});

router.post('/tsm-elite/templates', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const payload = tsmEliteCreateSchema.parse(req.body);
    const adminId = Number((req as any).user.id);
    const insertResult = await runQuery(
      `INSERT INTO tsm_elite (admin_id, name, description, content_html, content_text, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        payload.name,
        payload.description ?? null,
        payload.content_html ?? '',
        payload.content_text ?? '',
        payload.status ?? 'active',
        adminId,
        adminId,
      ]
    );

    const id = getInsertedId(insertResult);
    const row = await getQuery(`${tsmEliteSelectFields} WHERE id = ?`, [id]);
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error creating TSM Elite template:', error);
    res.status(500).json({ success: false, error: 'Failed to create TSM Elite template' });
  }
});

router.put('/tsm-elite/templates/:id', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const payload = tsmEliteUpdateSchema.parse(req.body);
    const { id } = req.params;
    const adminId = Number((req as any).user.id);
    const fields: string[] = [];
    const params: any[] = [];

    if (typeof payload.name !== 'undefined') {
      fields.push('name = ?');
      params.push(payload.name);
    }
    if (typeof payload.description !== 'undefined') {
      fields.push('description = ?');
      params.push(payload.description);
    }
    if (typeof payload.content_html !== 'undefined') {
      fields.push('content_html = ?');
      params.push(payload.content_html);
    }
    if (typeof payload.content_text !== 'undefined') {
      fields.push('content_text = ?');
      params.push(payload.content_text);
    }
    if (typeof payload.status !== 'undefined') {
      fields.push('status = ?');
      params.push(payload.status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    fields.push('updated_by = ?');
    params.push(adminId, id);

    await runQuery(`UPDATE tsm_elite SET ${fields.join(', ')} WHERE id = ?`, params);

    const row = await getQuery(`${tsmEliteSelectFields} WHERE id = ?`, [id]);
    res.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error updating TSM Elite template:', error);
    res.status(500).json({ success: false, error: 'Failed to update TSM Elite template' });
  }
});

router.delete('/tsm-elite/templates/:id', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM tsm_elite WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting TSM Elite template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete TSM Elite template' });
  }
});

// =====================
// Contracts
// =====================
router.get('/', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query as { clientId?: string };
    const user = (req as any).user;
    let sql = `SELECT c.*, ct.name AS template_name,
                      cl.first_name, cl.last_name
               FROM contracts c
               LEFT JOIN contract_templates ct ON c.template_id = ct.id
               LEFT JOIN clients cl ON c.client_id = cl.id`;
    const params: any[] = [];
    const where: string[] = [];
    if (clientId) {
      where.push('c.client_id = ?');
      params.push(Number(clientId));
    }
    // Admins can only see their assigned contracts
    if (user.role === 'admin') {
      where.push('c.user_id = ?');
      params.push(Number(user.id));
    }
    if (where.length) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY c.created_at DESC';
    const contracts = await allQuery(sql, params);
    const normalized = (contracts as any[]).map((c) => ({
      ...c,
      admin_id: c.user_id,
      due_at: c.expiration_date ?? null,
      status: c.status === 'sent' ? 'pending_signature' : (c.status === 'cancelled' ? 'void' : c.status),
    }));
    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contracts' });
  }
});

router.get('/my', requireRole('client'), async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user.id;
    const contracts = await allQuery(
      `SELECT c.*, ct.name AS template_name
       FROM contracts c
       LEFT JOIN contract_templates ct ON c.template_id = ct.id
       WHERE c.client_id = ?
       ORDER BY c.created_at DESC`,
      [clientId]
    );
    const normalized = (contracts as any[]).map((c) => ({
      ...c,
      admin_id: c.user_id,
      due_at: c.expiration_date ?? null,
      status: c.status === 'sent' ? 'pending_signature' : (c.status === 'cancelled' ? 'void' : c.status),
    }));
    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('Error fetching my contracts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contracts' });
  }
});

router.get('/:id', requireRole('admin', 'super_admin', 'client'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    let contract: any;
    if (user.role === 'client') {
      contract = await getQuery(
        `SELECT c.*, ct.name AS template_name
         FROM contracts c
         LEFT JOIN contract_templates ct ON c.template_id = ct.id
         WHERE c.id = ? AND c.client_id = ?`,
        [id, user.id]
      );
    } else {
      contract = await getQuery(
        `SELECT c.*, ct.name AS template_name
         FROM contracts c
         LEFT JOIN contract_templates ct ON c.template_id = ct.id
         WHERE c.id = ?`,
        [id]
      );
      if (contract && user.role === 'admin' && contract.user_id !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    // Normalize MySQL fields
    contract.admin_id = contract.user_id;
    contract.due_at = contract.expiration_date ?? null;
    contract.status = contract.status === 'sent' ? 'pending_signature' : (contract.status === 'cancelled' ? 'void' : contract.status);
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contract' });
  }
});

router.post('/', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const payload = contractCreateSchema.parse(req.body);
    const metadataStr = typeof payload.metadata !== 'undefined' ? JSON.stringify(payload.metadata) : null;
    const currentUserId = (req as any).user.id; // super_admin creating
    // Map to MySQL columns
    let body: string | null = null;
    if (payload.template_id) {
      const tpl = await getQuery('SELECT content FROM contract_templates WHERE id = ?', [payload.template_id]);
      body = tpl?.content ?? null;
    }
    if (!body) body = 'Contract generated';
    const statusMap: Record<string, string> = {
      draft: 'draft',
      pending_signature: 'sent',
    };
    const status = statusMap[payload.status ?? 'pending_signature'] ?? 'sent';
    const insertResult = await runQuery(
      `INSERT INTO contracts (user_id, client_id, template_id, title, body, status, expiration_date, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.admin_id,
        payload.client_id,
        payload.template_id ?? null,
        payload.title ?? null,
        body,
        status,
        payload.due_at ?? null,
        currentUserId,
        currentUserId,
      ]
    );
    const id = getInsertedId(insertResult);
    let contract = await getQuery('SELECT * FROM contracts WHERE id = ?', [id]);
    if (contract) {
      contract.admin_id = contract.user_id;
      contract.due_at = contract.expiration_date ?? null;
      contract.status = contract.status === 'sent' ? 'pending_signature' : (contract.status === 'cancelled' ? 'void' : contract.status);
    }
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: 'Failed to create contract' });
  }
});

router.put('/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const payload = contractUpdateSchema.parse(req.body);
    const { id } = req.params;
    const user = (req as any).user;

    // Access control: admin can only update own contracts
    if (user.role === 'admin') {
      const existing = await getQuery('SELECT user_id FROM contracts WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }
      if (existing.user_id !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const fields: string[] = [];
    const params: any[] = [];
    if (typeof payload.title !== 'undefined') {
      fields.push('title = ?');
      params.push(payload.title);
    }
    if (typeof payload.due_at !== 'undefined') {
      fields.push('expiration_date = ?');
      params.push(payload.due_at);
    }
    if (typeof payload.status !== 'undefined') {
      const statusMap: Record<string, string> = {
        draft: 'draft',
        pending_signature: 'sent',
        signed: 'signed',
        void: 'cancelled',
        expired: 'cancelled',
      };
      fields.push('status = ?');
      params.push(statusMap[payload.status] ?? 'sent');
    }
    // void_reason and metadata not supported in MySQL schema
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    params.push(id);
    await runQuery(
      `UPDATE contracts SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    let updated = await getQuery('SELECT * FROM contracts WHERE id = ?', [id]);
    if (updated) {
      updated.admin_id = updated.user_id;
      updated.due_at = updated.expiration_date ?? null;
      updated.status = updated.status === 'sent' ? 'pending_signature' : (updated.status === 'cancelled' ? 'void' : updated.status);
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error updating contract:', error);
    res.status(500).json({ success: false, error: 'Failed to update contract' });
  }
});

router.post('/:id/send', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    if (user.role === 'admin') {
      const existing = await getQuery('SELECT user_id FROM contracts WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }
      if (existing.user_id !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    await runQuery(
      `UPDATE contracts SET sent_at = CURRENT_TIMESTAMP, status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    const updated = await getQuery('SELECT * FROM contracts WHERE id = ?', [id]);
    if (updated) {
      updated.admin_id = updated.user_id;
      updated.due_at = updated.expiration_date ?? null;
      updated.status = updated.status === 'sent' ? 'pending_signature' : (updated.status === 'cancelled' ? 'void' : updated.status);
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error sending contract:', error);
    res.status(500).json({ success: false, error: 'Failed to send contract' });
  }
});

router.post('/:id/void', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { void_reason } = req.body as { void_reason?: string };
    const user = (req as any).user;
    if (user.role === 'admin') {
      const existing = await getQuery('SELECT user_id FROM contracts WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }
      if (existing.user_id !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    await runQuery(
      `UPDATE contracts SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    const updated = await getQuery('SELECT * FROM contracts WHERE id = ?', [id]);
    if (updated) {
      updated.admin_id = updated.user_id;
      updated.due_at = updated.expiration_date ?? null;
      updated.status = updated.status === 'sent' ? 'pending_signature' : (updated.status === 'cancelled' ? 'void' : updated.status);
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error voiding contract:', error);
    res.status(500).json({ success: false, error: 'Failed to void contract' });
  }
});

router.post('/:id/sign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const payload = signSchema.parse(req.body);

    const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const signer_type = user.role === 'client' ? 'client' : 'user';
    const signatureData = JSON.stringify({
      signature_text: payload.signature_text ?? null,
      signature_image_url: payload.signature_image_url ?? null,
    });
    const insertResult = await runQuery(
      `INSERT INTO contract_signatures (
         contract_id, signer_type, signer_user_id, signer_client_id, signer_name, signer_email, signature_data, ip_address, signed_at
       ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, CURRENT_TIMESTAMP)`,
      [
        Number(id),
        signer_type,
        user.role === 'client' ? null : user.id,
        user.role === 'client' ? user.id : null,
        signatureData,
        ip_address,
      ]
    );

    await runQuery(
      `UPDATE contracts SET status = 'signed', signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    const signatureId = getInsertedId(insertResult);
    const signature = await getQuery('SELECT * FROM contract_signatures WHERE id = ?', [signatureId]);
    res.status(201).json({ success: true, data: signature });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error signing contract:', error);
    res.status(500).json({ success: false, error: 'Failed to sign contract' });
  }
});

router.get('/:id/signatures', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Access control: clients can only view their own contract signatures
    const contract = await getQuery('SELECT client_id FROM contracts WHERE id = ?', [id]);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    if (user.role === 'client' && contract.client_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const signatures = await allQuery(
      `SELECT * FROM contract_signatures WHERE contract_id = ? ORDER BY signed_at DESC`,
      [id]
    );
    const normalized = (signatures as any[]).map((s) => {
      let parsed: any = {};
      try { parsed = s.signature_data ? JSON.parse(s.signature_data) : {}; } catch {}
      return {
        ...s,
        signature_text: parsed.signature_text ?? null,
        signature_image_url: parsed.signature_image_url ?? null,
      };
    });
    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch signatures' });
  }
});

export default router;