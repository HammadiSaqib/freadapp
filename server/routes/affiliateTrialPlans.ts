import { Router, Request, Response } from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All routes require super_admin authentication (enforced at mount point in index.ts)

/**
 * Compute the effective display status of a trial plan based on stored status + dates.
 * - 'draft'  → always 'draft'
 * - 'active' + no dates → 'active' (permanent)
 * - stored status + dates: if now < start → 'scheduled', within window → 'active', past end → 'expired'
 */
function computeEffectiveStatus(
  status: string,
  startDate: string | null,
  endDate: string | null
): string {
  if (status === 'draft') return 'draft';

  const now = new Date();

  if (!startDate && !endDate) {
    // Permanent active plan
    return status === 'active' ? 'active' : status;
  }

  if (startDate && new Date(startDate) > now) return 'scheduled';
  if (endDate && new Date(endDate) < now) return 'expired';

  return 'active';
}

// GET /api/super-admin/affiliate-trial-plans
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rows = await executeQuery<any[]>(`
      SELECT
        atp.*,
        a.first_name AS affiliate_first_name,
        a.last_name  AS affiliate_last_name,
        a.email      AS affiliate_email,
        a.company_name AS affiliate_company
      FROM affiliates_trial_plans atp
      JOIN affiliates a ON a.id = atp.affiliate_id
      ORDER BY atp.created_at DESC
    `, []);

    const plans = (rows || []).map((p) => ({
      ...p,
      effective_status: computeEffectiveStatus(p.status, p.start_date, p.end_date),
    }));

    return res.json({ success: true, plans });
  } catch (err: any) {
    console.error('Error fetching affiliate trial plans:', err);
    return res.status(500).json({ error: 'Failed to fetch affiliate trial plans' });
  }
});

// GET /api/super-admin/affiliate-trial-plans/affiliates – list affiliates for the dropdown
router.get('/affiliates', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rows = await executeQuery<any[]>(
      `SELECT id, first_name, last_name, email, company_name FROM affiliates WHERE status != 'suspended' ORDER BY first_name, last_name`,
      []
    );
    return res.json({ success: true, affiliates: rows || [] });
  } catch (err: any) {
    console.error('Error fetching affiliates for trial plans:', err);
    return res.status(500).json({ error: 'Failed to fetch affiliates' });
  }
});

// POST /api/super-admin/affiliate-trial-plans
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).user?.id;
    const { affiliate_id, duration_months, max_clients, max_users, status, start_date, end_date } = req.body;

    if (!affiliate_id || !duration_months) {
      return res.status(400).json({ error: 'affiliate_id and duration_months are required' });
    }

    if (typeof duration_months !== 'number' || duration_months < 1) {
      return res.status(400).json({ error: 'duration_months must be a positive integer' });
    }

    const allowedStatuses = ['active', 'scheduled', 'draft'];
    const planStatus = allowedStatuses.includes(status) ? status : 'active';

    // Validate schedule dates when status is 'scheduled'
    if (planStatus === 'scheduled') {
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required for scheduled plans' });
      }
      if (new Date(end_date) <= new Date(start_date)) {
        return res.status(400).json({ error: 'end_date must be after start_date' });
      }
    }

    const result = await executeQuery<any>(
      `INSERT INTO affiliates_trial_plans
        (affiliate_id, duration_months, max_clients, max_users, status, start_date, end_date, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        affiliate_id,
        duration_months,
        max_clients != null ? Number(max_clients) : null,
        max_users != null ? Number(max_users) : null,
        planStatus,
        start_date || null,
        end_date || null,
        superAdminId,
      ]
    );

    const newId = result.insertId;
    const [newPlan] = await executeQuery<any[]>(
      `SELECT atp.*, a.first_name AS affiliate_first_name, a.last_name AS affiliate_last_name,
              a.email AS affiliate_email, a.company_name AS affiliate_company
       FROM affiliates_trial_plans atp
       JOIN affiliates a ON a.id = atp.affiliate_id
       WHERE atp.id = ?`,
      [newId]
    );

    return res.status(201).json({
      success: true,
      plan: {
        ...newPlan,
        effective_status: computeEffectiveStatus(newPlan.status, newPlan.start_date, newPlan.end_date),
      },
    });
  } catch (err: any) {
    console.error('Error creating affiliate trial plan:', err);
    return res.status(500).json({ error: 'Failed to create affiliate trial plan' });
  }
});

// PUT /api/super-admin/affiliate-trial-plans/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { affiliate_id, duration_months, max_clients, max_users, status, start_date, end_date } = req.body;

    if (!affiliate_id || !duration_months) {
      return res.status(400).json({ error: 'affiliate_id and duration_months are required' });
    }

    if (typeof duration_months !== 'number' || duration_months < 1) {
      return res.status(400).json({ error: 'duration_months must be a positive integer' });
    }

    const allowedStatuses = ['active', 'scheduled', 'draft', 'expired'];
    const planStatus = allowedStatuses.includes(status) ? status : 'active';

    if (planStatus === 'scheduled') {
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required for scheduled plans' });
      }
      if (new Date(end_date) <= new Date(start_date)) {
        return res.status(400).json({ error: 'end_date must be after start_date' });
      }
    }

    const result = await executeQuery<any>(
      `UPDATE affiliates_trial_plans
       SET affiliate_id = ?, duration_months = ?, max_clients = ?, max_users = ?, status = ?, start_date = ?, end_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        affiliate_id,
        duration_months,
        max_clients != null ? Number(max_clients) : null,
        max_users != null ? Number(max_users) : null,
        planStatus,
        start_date || null,
        end_date || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Trial plan not found' });
    }

    const [updated] = await executeQuery<any[]>(
      `SELECT atp.*, a.first_name AS affiliate_first_name, a.last_name AS affiliate_last_name,
              a.email AS affiliate_email, a.company_name AS affiliate_company
       FROM affiliates_trial_plans atp
       JOIN affiliates a ON a.id = atp.affiliate_id
       WHERE atp.id = ?`,
      [id]
    );

    return res.json({
      success: true,
      plan: {
        ...updated,
        effective_status: computeEffectiveStatus(updated.status, updated.start_date, updated.end_date),
      },
    });
  } catch (err: any) {
    console.error('Error updating affiliate trial plan:', err);
    return res.status(500).json({ error: 'Failed to update affiliate trial plan' });
  }
});

// DELETE /api/super-admin/affiliate-trial-plans/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await executeQuery<any>(
      `DELETE FROM affiliates_trial_plans WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Trial plan not found' });
    }

    return res.json({ success: true, message: 'Trial plan deleted' });
  } catch (err: any) {
    console.error('Error deleting affiliate trial plan:', err);
    return res.status(500).json({ error: 'Failed to delete affiliate trial plan' });
  }
});

export default router;
