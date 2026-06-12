import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import {
  getLatestActiveTsmEliteTemplate,
  getScoreMachineEliteAccessStatus,
} from '../utils/scoreMachineEliteAccess.js';

const router = Router();

router.use(authenticateToken);

const signSchema = z.object({
  signature_text: z.string().optional(),
  signature_image_url: z.string().url().optional(),
});

const tsmEliteSignSchema = z.object({
  signature_image_url: z.string().trim().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, 'Drawn signature is required'),
});

// Get the latest contract for the current admin
router.get('/latest', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const adapter = getDatabaseAdapter();
    const dbType = adapter.getType();

    let contract: any = null;
    if (dbType === 'mysql') {
      const rows = await adapter.allQuery(
        `SELECT c.*, t.content AS template_content
         FROM contracts c
         LEFT JOIN contract_templates t ON c.template_id = t.id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC
         LIMIT 1`,
        [user.id]
      );
      contract = rows && rows.length > 0 ? rows[0] : null;
      // If no contract exists, create one using the admin's active template or fall back to super admin template
      if (!contract) {
        try {
          // Prefer admin's own active template
          let template: any = null;
          const tplRows = await adapter.allQuery(
            `SELECT id, name, content FROM contract_templates WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`,
            [user.id]
          );
          template = tplRows && tplRows.length > 0 ? tplRows[0] : null;

          // Fall back to super admin's active template
          if (!template) {
            const superTplRows = await adapter.allQuery(
              `SELECT t.id, t.name, t.content
               FROM contract_templates t
               JOIN users u ON t.user_id = u.id
               WHERE u.role = 'super_admin' AND t.is_active = 1
               ORDER BY t.id DESC LIMIT 1`
            );
            template = superTplRows && superTplRows.length > 0 ? superTplRows[0] : null;
          }

          const title = 'Admin Onboarding Agreement';
          const body = template?.content || 'By purchasing a subscription, you agree to the Admin Onboarding Agreement.';
          const templateId = template?.id || null;

          // Attribute creation to a super admin if available
          let creatorId = user.id;
          try {
            const superAdmins = await adapter.allQuery(
              `SELECT id FROM users WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1`
            );
            if (superAdmins && superAdmins.length > 0) {
              creatorId = superAdmins[0].id;
            }
          } catch {}

          await adapter.executeQuery(
            `INSERT INTO contracts (user_id, client_id, template_id, title, body, status, sent_at, created_at, updated_at, created_by, updated_by)
             VALUES (?, NULL, ?, ?, ?, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`,
            [user.id, templateId, title, body, creatorId, creatorId]
          );

          const rows2 = await adapter.allQuery(
            `SELECT c.*, t.content AS template_content
             FROM contracts c
             LEFT JOIN contract_templates t ON c.template_id = t.id
             WHERE c.user_id = ?
             ORDER BY c.created_at DESC
             LIMIT 1`,
            [user.id]
          );
          contract = rows2 && rows2.length > 0 ? rows2[0] : null;
        } catch (createErr) {
          console.error('Error creating admin onboarding contract:', createErr);
        }
      }
    } else {
      const rows = await adapter.allQuery(
        `SELECT c.*, t.content_text AS template_content_text, t.content_html AS template_content_html
         FROM contracts c
         LEFT JOIN contract_templates t ON c.template_id = t.id
         WHERE c.admin_id = ?
         ORDER BY c.created_at DESC
         LIMIT 1`,
        [user.id]
      );
      contract = rows && rows.length > 0 ? rows[0] : null;
    }

    if (!contract) {
      return res.status(404).json({ success: false, error: 'No contract found for admin' });
    }

    // Prefer template content; fall back to contract body if template missing
    let content = dbType === 'mysql'
      ? (contract.template_content ?? contract.body ?? null)
      : (contract.template_content_text ?? contract.template_content_html ?? contract.body ?? null);

    // If still missing, try latest active super admin template as preview fallback
    if (!content) {
      try {
        const fallbackRows = await adapter.allQuery(
          dbType === 'mysql'
            ? `SELECT t.content AS content FROM contract_templates t JOIN users u ON t.user_id = u.id WHERE u.role = 'super_admin' AND t.is_active = 1 ORDER BY t.id DESC LIMIT 1`
            : `SELECT COALESCE(t.content_html, t.content_text) AS content FROM contract_templates t JOIN users u ON t.admin_id = u.id WHERE u.role = 'super_admin' AND t.status = 'active' ORDER BY t.id DESC LIMIT 1`
        );
        const fb = fallbackRows && fallbackRows.length > 0 ? fallbackRows[0] : null;
        content = fb?.content ?? null;
      } catch (e) {
        // ignore fallback errors
      }
    }

    res.json({ success: true, data: { id: contract.id, status: contract.status, title: contract.title, content } });
  } catch (error) {
    console.error('Error fetching latest admin contract:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch latest admin contract' });
  }
});

// Sign the latest contract for the current admin
router.post('/latest/sign', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const payload = signSchema.parse(req.body);
    const adapter = getDatabaseAdapter();
    const dbType = adapter.getType();

    // Find latest contract
    let latestRows: any[] | null = null;
    if (dbType === 'mysql') {
      latestRows = await adapter.allQuery(
        'SELECT id, status FROM contracts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );
    } else {
      latestRows = await adapter.allQuery(
        'SELECT id, status FROM contracts WHERE admin_id = ? ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );
    }
    const latest = latestRows && latestRows.length > 0 ? latestRows[0] : null;
    if (!latest) {
      return res.status(404).json({ success: false, error: 'No contract found to sign' });
    }

    const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const user_agent = req.headers['user-agent'] || '';

    if (dbType === 'mysql') {
      const signatureData = JSON.stringify({
        signature_text: payload.signature_text ?? null,
        signature_image_url: payload.signature_image_url ?? null,
      });
      await adapter.executeQuery(
        `INSERT INTO contract_signatures (
           contract_id, signer_type, signer_user_id, signer_client_id, signer_name, signer_email, signature_data, ip_address, signed_at
         ) VALUES (?, 'user', ?, NULL, NULL, NULL, ?, ?, CURRENT_TIMESTAMP)`,
        [latest.id, user.id, signatureData, ip_address]
      );

      await adapter.executeQuery(
        `UPDATE contracts SET status = 'signed', signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [latest.id]
      );
    } else {
      await adapter.executeQuery(
        `INSERT INTO contract_signatures (
           contract_id, signer_type, signer_id, signed_at, ip_address, user_agent, signature_text, signature_image_url, is_signed
         ) VALUES (?, 'admin', ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, 1)`,
        [latest.id, user.id, ip_address, user_agent, payload.signature_text ?? null, payload.signature_image_url ?? null]
      );

      await adapter.executeQuery(
        `UPDATE contracts SET status = 'signed', signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [latest.id]
      );
    }

    res.status(201).json({ success: true, message: 'Contract signed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error signing latest admin contract:', error);
    res.status(500).json({ success: false, error: 'Failed to sign admin contract' });
  }
});

router.get('/tsm-elite/latest', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(403).json({ success: false, error: 'Authentication required' });
    }

    const eligibility = await getScoreMachineEliteAccessStatus(Number(user.id));
    if (!eligibility.hasAccess) {
      return res.status(403).json({ success: false, error: 'The Capsol Elite is not enabled for this account' });
    }

    const template = await getLatestActiveTsmEliteTemplate();
    if (!template) {
      return res.status(404).json({ success: false, error: 'No active The Capsol Elite agreement found' });
    }

    const adapter = getDatabaseAdapter();
    const signature = await adapter.getQuery(
      `SELECT id, signature_text, signature_image_url, signed_at
       FROM tsm_elite_signatures
       WHERE admin_id = ? AND template_id = ?
       ORDER BY signed_at DESC, id DESC
       LIMIT 1`,
      [eligibility.effectiveAdminUserId, template.id]
    );

    const content = template.content_html || template.content_text || null;

    res.json({
      success: true,
      data: {
        id: template.id,
        template_id: template.id,
        status: signature?.signature_image_url ? 'signed' : 'pending_signature',
        title: 'The Capsol Elite Agreement',
        content,
        signature_image_url: signature?.signature_image_url ?? null,
        can_sign: user?.role === 'admin',
      }
    });
  } catch (error) {
    console.error('Error fetching latest The Capsol Elite agreement:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch The Capsol Elite agreement' });
  }
});

router.post('/tsm-elite/latest/sign', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can sign The Capsol Elite agreements' });
    }

    const eligibility = await getScoreMachineEliteAccessStatus(Number(user.id));
    if (!eligibility.hasAccess) {
      return res.status(403).json({ success: false, error: 'The Capsol Elite is not enabled for this admin' });
    }

    const payload = tsmEliteSignSchema.parse(req.body);
    const template = await getLatestActiveTsmEliteTemplate();
    if (!template) {
      return res.status(404).json({ success: false, error: 'No active The Capsol Elite agreement found' });
    }

    const adapter = getDatabaseAdapter();
    const existingSignature = await adapter.getQuery(
      'SELECT id FROM tsm_elite_signatures WHERE admin_id = ? AND template_id = ? LIMIT 1',
      [user.id, template.id]
    );

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    if (existingSignature?.id) {
      await adapter.executeQuery(
        `UPDATE tsm_elite_signatures
         SET signature_text = ?, signature_image_url = ?, ip_address = ?, user_agent = ?, signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['', payload.signature_image_url, ipAddress, userAgent, existingSignature.id]
      );
    } else {
      await adapter.executeQuery(
        `INSERT INTO tsm_elite_signatures (template_id, admin_id, signature_text, signature_image_url, ip_address, user_agent, signed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [template.id, user.id, '', payload.signature_image_url, ipAddress, userAgent]
      );
    }

    res.status(201).json({ success: true, message: 'The Capsol Elite agreement signed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error signing latest The Capsol Elite agreement:', error);
    res.status(500).json({ success: false, error: 'Failed to sign The Capsol Elite agreement' });
  }
});

export default router;
