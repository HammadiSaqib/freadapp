import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, authenticateToken, requireExactRole } from '../middleware/authMiddleware.js';
import { executeQuery } from '../database/mysqlConfig.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();

const diySubmissionValidation = [
  body('client_id').isInt({ min: 1 }).withMessage('client_id must be a positive integer'),
  body('card_id').isInt({ min: 1 }).withMessage('card_id must be a positive integer'),
  body('card_type').isIn(['personal', 'business']).withMessage('card_type must be personal or business'),
  body('status').isIn(['approved', 'not_approved']).withMessage('status must be approved or not_approved'),
  body('amount_approved').isFloat({ min: 0 }).withMessage('amount_approved must be a non-negative number'),
  body('admin_percent').isFloat({ min: 0, max: 100 }).withMessage('admin_percent must be between 0 and 100'),
  body('description').optional().isString().isLength({ max: 5000 }).withMessage('description too long'),
  body('credit_bureaus').isArray({ min: 0 }).withMessage('credit_bureaus must be an array'),
  body('credit_bureaus.*').optional().isString().withMessage('credit bureau entries must be strings'),
];

async function getVisibleClientClauses(req: AuthRequest) {
  const user = req.user;
  if (!user?.id) {
    throw new Error('Authentication required');
  }

  let baseUserId = user.id;
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    const employeeRows = await executeQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id, 'active'],
    ) as RowDataPacket[];
    if (employeeRows[0]?.admin_id) {
      baseUserId = Number(employeeRows[0].admin_id);
    }
  }

  return {
    clauses: ['(c.user_id = ? OR c.user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?))'],
    params: [baseUserId, baseUserId, 'active'],
  };
}

router.get('/stats', authenticateToken, requireExactRole('funding_manager', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const visibility = await getVisibleClientClauses(req);
    const where = [...visibility.clauses, "s.status = 'approved'"];
    const sql = `
      SELECT COALESCE(SUM(s.amount_approved), 0) AS total_approved_amount
      FROM client_funding_submissions s
      INNER JOIN clients c ON c.id = s.client_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `;

    const rows = await executeQuery(sql, visibility.params) as RowDataPacket[];
    const totalApprovedAmount = Number(rows[0]?.total_approved_amount || 0);

    res.json({
      success: true,
      data: {
        totalApprovedAmount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching DIY funding submission stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update DIY submission for a given card
// Fetch existing DIY submissions with optional filters
router.get('/', authenticateToken, requireExactRole('funding_manager', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { client_id, card_id } = req.query as { client_id?: string; card_id?: string };
    const visibility = await getVisibleClientClauses(req);

    const where: string[] = [...visibility.clauses];
    const params: any[] = [...visibility.params];

    if (client_id) {
      where.push('s.client_id = ?');
      params.push(parseInt(client_id, 10));
    }
    if (card_id) {
      where.push('s.card_id = ?');
      params.push(parseInt(card_id, 10));
    }

    const sql = `
      SELECT s.id, s.client_id, s.card_id, s.status, s.amount_approved, s.admin_percent, s.description,
             s.credit_bureaus, s.created_by, s.updated_by, s.created_at, s.updated_at
      FROM client_funding_submissions s
      INNER JOIN clients c ON c.id = s.client_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY s.updated_at DESC
    `;

    const rows = await executeQuery(sql, params) as RowDataPacket[];

    // Parse credit_bureaus JSON safely
    const parsed = rows.map((r: any) => ({
      ...r,
      credit_bureaus: (() => { try { return JSON.parse(r.credit_bureaus || '[]'); } catch { return []; } })()
    }));

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error fetching DIY funding submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update DIY submission for a given card
router.post('/', authenticateToken, requireExactRole('funding_manager', 'super_admin'), diySubmissionValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      client_id,
      card_id,
      card_type,
      status,
      amount_approved,
      admin_percent,
      description,
      credit_bureaus,
    } = req.body;

    // Verify client exists and is active
    const clientCheckQuery = `
      SELECT id, status
      FROM clients
      WHERE id = ?
    `;
    const clientRows = await executeQuery(clientCheckQuery, [client_id]) as RowDataPacket[];
    if (!clientRows || clientRows.length === 0) {
      return res.status(400).json({ error: 'Invalid client_id: client not found' });
    }
    const client = clientRows[0];
    if (client.status === 'inactive') {
      return res.status(400).json({ error: 'Client is inactive' });
    }

    // Verify card exists and is active
    const cardCheckQuery = `
      SELECT id, card_type, is_active
      FROM cards
      WHERE id = ?
    `;
    const cardRows = await executeQuery(cardCheckQuery, [card_id]) as RowDataPacket[];
    if (!cardRows || cardRows.length === 0) {
      return res.status(400).json({ error: 'Invalid card_id: card not found' });
    }
    const card = cardRows[0];
    if (card.is_active === 0 || card.is_active === false) {
      return res.status(400).json({ error: 'Card is inactive' });
    }
    // Optional: ensure provided card_type matches card record
    if (card.card_type !== card_type) {
      return res.status(400).json({ error: 'card_type mismatch with card record' });
    }

    const bureausJson = JSON.stringify(credit_bureaus || []);

    // Prevent updates if the submission for this client/card is already approved
    const existingQuery = `
      SELECT id, status, amount_approved, admin_percent, description, credit_bureaus, updated_at
      FROM client_funding_submissions
      WHERE client_id = ? AND card_id = ?
      LIMIT 1
    `;
    const existingRows = await executeQuery(existingQuery, [client_id, card_id]) as RowDataPacket[];
    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0] as any;
      if (String(existing.status) === 'approved') {
        return res.status(409).json({
          error: 'Submission already approved and locked for this card and client',
          existing,
        });
      }
    }

    const upsertQuery = `
      INSERT INTO client_funding_submissions (
        client_id, card_id, status, amount_approved, admin_percent, description, credit_bureaus, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        amount_approved = VALUES(amount_approved),
        admin_percent = VALUES(admin_percent),
        description = VALUES(description),
        credit_bureaus = VALUES(credit_bureaus),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `;

    const result = await executeQuery(upsertQuery, [
      client_id,
      card_id,
      status,
      amount_approved,
      admin_percent,
      description || null,
      bureausJson,
      user.id,
      user.id,
    ]) as ResultSetHeader;

    res.json({
      success: true,
      message: 'Client funding submission saved',
      insertId: result?.insertId || null,
    });
  } catch (error: any) {
    console.error('Error saving DIY funding submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
