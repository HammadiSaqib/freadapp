import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, type AuthRequest } from '../middleware/authMiddleware.js';
import { executeQuery } from '../database/mysqlConfig.js';
import { emailService } from '../services/emailService.js';
import {
  assertUserCanCheckout,
  ensureKycSchema,
  ensureKycUploadDirectory,
  getUserKycState,
  KYC_SUPPORT_PHONE_DISPLAY,
  KYC_SUPPORT_PHONE_LINK,
  logKycAuditEvent,
  markUserKycRequired,
} from '../utils/kyc.js';

const router = express.Router();
const superAdminRouter = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ensureKycUploadDirectory());
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `kyc-${uniqueSuffix}${path.extname(file.originalname || '.jpg')}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
      return;
    }

    cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP files are allowed.'));
  },
});

function isSuperAdmin(req: AuthRequest) {
  return String(req.user?.role || '').toLowerCase() === 'super_admin';
}

function requireSuperAdmin(req: AuthRequest, res: Response, next: () => void) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!isSuperAdmin(req)) {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  next();
}

function buildImageUrl(recordId: number) {
  return `/api/super-admin/kyc/${recordId}/image`;
}

const effectiveKycStatusSql = `
  CASE
    WHEN latest_kv.id IS NOT NULL THEN CAST(latest_kv.status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
    WHEN u.kyc_required = 1 THEN COALESCE(NULLIF(CONVERT(u.kyc_status USING utf8mb4) COLLATE utf8mb4_unicode_ci, ''), 'not_started')
    ELSE COALESCE(NULLIF(CONVERT(u.kyc_status USING utf8mb4) COLLATE utf8mb4_unicode_ci, ''), 'not_started')
  END
`;

function toKycResponse(state: Awaited<ReturnType<typeof getUserKycState>>) {
  const user = state?.user;
  const latestVerification = state?.latestVerification;
  const kycRequired = Number(user?.kyc_required || 0) === 1;
  const status = String(user?.kyc_status || 'not_started');

  return {
    kyc_required: kycRequired,
    kyc_status: status,
    admin_notes: latestVerification?.admin_notes || null,
    reviewed_at: latestVerification?.reviewed_at || null,
    submitted_at: latestVerification?.created_at || null,
    triggered_at: latestVerification?.triggered_at || null,
    started_at: latestVerification?.started_at || null,
    completed_at: latestVerification?.completed_at || null,
    provider_reference_id: latestVerification?.provider_reference_id || null,
    support_phone: KYC_SUPPORT_PHONE_DISPLAY,
    support_phone_link: KYC_SUPPORT_PHONE_LINK,
  };
}

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const userId = Number(req.user?.id || 0);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const state = await getUserKycState(userId);
    if (!state) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      ...toKycResponse(state),
    });
  } catch (error: any) {
    console.error('Failed to fetch KYC state:', error);
    return res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

router.post('/submit', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const userId = Number(req.user?.id || 0);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'KYC image is required' });
    }

    const state = await getUserKycState(userId);
    if (!state) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingRecordId = Number(state.latestVerification?.id || 0);
    let verificationId = existingRecordId;

    if (existingRecordId > 0 && ['pending', 'failed', 'not_started'].includes(String(state.latestVerification?.status || ''))) {
      await executeQuery(
        `UPDATE kyc_verifications
         SET image_path = ?, mime_type = ?, status = 'pending', admin_notes = NULL,
             reviewed_by = NULL, reviewed_at = NULL, started_at = NOW(), completed_at = NULL, updated_at = NOW()
         WHERE id = ?`,
        [req.file.path, req.file.mimetype || null, existingRecordId],
      );
    } else {
      const result: any = await executeQuery(
        `INSERT INTO kyc_verifications (user_id, image_path, mime_type, status, triggered_at, started_at, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', NOW(), NOW(), NOW(), NOW())`,
        [userId, req.file.path, req.file.mimetype || null],
      );
      verificationId = Number(result?.insertId || 0);
    }

    if (verificationId <= 0) {
      const freshState = await getUserKycState(userId);
      verificationId = Number(freshState?.latestVerification?.id || 0);
    }

    const imageUrl = verificationId > 0 ? buildImageUrl(verificationId) : null;

    if (verificationId > 0) {
      await executeQuery(
        `UPDATE kyc_verifications
         SET image_url = ?, updated_at = NOW()
         WHERE id = ?`,
        [imageUrl, verificationId],
      );
    }

    await markUserKycRequired(userId, true, 'pending');
    await logKycAuditEvent({
      userId,
      verificationId,
      status: 'pending',
      eventType: 'started',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });

    await emailService.sendKycSubmissionReceivedEmail({
      firstName: String(state.user?.first_name || ''),
      email: String(state.user?.email || ''),
      supportPhoneDisplay: KYC_SUPPORT_PHONE_DISPLAY,
      supportPhoneLink: KYC_SUPPORT_PHONE_LINK,
    });

    return res.json({
      success: true,
      message: 'Your KYC has been submitted and is waiting for review.',
      kyc_required: true,
      kyc_status: 'pending',
      support_phone: KYC_SUPPORT_PHONE_DISPLAY,
      support_phone_link: KYC_SUPPORT_PHONE_LINK,
    });
  } catch (error: any) {
    console.error('Failed to submit KYC:', error);
    return res.status(500).json({ error: error?.message || 'Failed to submit KYC' });
  }
});

superAdminRouter.get('/', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const status = String((req.query.status as string) || '').trim();
    const search = String((req.query.search as string) || '').trim();

    const whereParts = [`LOWER(COALESCE(u.role, '')) = 'admin'`];
    const values: any[] = [];

    if (status) {
      whereParts.push(`(${effectiveKycStatusSql}) = ?`);
      values.push(status);
    }

    if (search) {
      whereParts.push(`(
        u.first_name LIKE ?
        OR u.last_name LIKE ?
        OR u.email LIKE ?
      )`);
      const wildcard = `%${search}%`;
      values.push(wildcard, wildcard, wildcard);
    }

    const rows = await executeQuery<any[]>(
      `SELECT
         latest_kv.id,
         u.id AS user_id,
         latest_kv.image_url,
         ${effectiveKycStatusSql} AS status,
         latest_kv.admin_notes,
         latest_kv.reviewed_by,
         latest_kv.reviewed_at,
         latest_kv.created_at,
         latest_kv.updated_at,
         u.first_name,
         u.last_name,
         u.email,
         u.kyc_required,
         u.kyc_status,
         reviewer.first_name AS reviewer_first_name,
         reviewer.last_name AS reviewer_last_name
       FROM users u
       LEFT JOIN (
         SELECT user_id, MAX(id) AS latest_id
         FROM kyc_verifications
         GROUP BY user_id
       ) latest ON latest.user_id = u.id
       LEFT JOIN kyc_verifications latest_kv ON latest_kv.id = latest.latest_id
       LEFT JOIN users reviewer ON reviewer.id = latest_kv.reviewed_by
       WHERE ${whereParts.join(' AND ')}
       ORDER BY
         CASE (${effectiveKycStatusSql})
           WHEN 'pending' THEN 0
           WHEN 'manual_review' THEN 1
           WHEN 'approved' THEN 2
           WHEN 'not_started' THEN 3
           WHEN 'failed' THEN 4
           ELSE 6
         END,
         COALESCE(latest_kv.updated_at, u.updated_at, u.created_at) DESC`,
      values,
    );

    return res.json({
      success: true,
      submissions: Array.isArray(rows)
        ? rows.map((row) => ({
            ...row,
            kyc_required: Number(row.kyc_required || 0) === 1,
            user_name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.email,
          }))
        : [],
    });
  } catch (error: any) {
    console.error('Failed to load KYC submissions:', error);
    return res.status(500).json({ error: 'Failed to load KYC submissions' });
  }
});

superAdminRouter.post('/users/:userId/disable', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const users = await executeQuery<any[]>(
      `SELECT id, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    );

    const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (String(user.role || '').toLowerCase() !== 'admin') {
      return res.status(400).json({ error: 'KYC can only be disabled for admin users' });
    }

    await markUserKycRequired(userId, false, 'not_started');

    return res.json({
      success: true,
      message: 'KYC disabled for this admin successfully.',
    });
  } catch (error: any) {
    console.error('Failed to disable KYC:', error);
    return res.status(500).json({ error: 'Failed to disable KYC' });
  }
});

superAdminRouter.get('/:id/image', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const verificationId = Number(req.params.id || 0);
    if (!verificationId) {
      return res.status(400).json({ error: 'Invalid KYC verification id' });
    }

    const rows = await executeQuery<any[]>(
      `SELECT image_path, mime_type
       FROM kyc_verifications
       WHERE id = ?
       LIMIT 1`,
      [verificationId],
    );

    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!record?.image_path || !fs.existsSync(record.image_path)) {
      return res.status(404).json({ error: 'KYC image not found' });
    }

    if (record.mime_type) {
      res.setHeader('Content-Type', String(record.mime_type));
    }

    if (String(req.query.download || '').toLowerCase() === '1' || String(req.query.download || '').toLowerCase() === 'true') {
      const extension = path.extname(String(record.image_path || '')) || '.jpg';
      res.setHeader('Content-Disposition', `attachment; filename="kyc-${verificationId}${extension}"`);
    }

    return res.sendFile(path.resolve(record.image_path));
  } catch (error: any) {
    console.error('Failed to serve KYC image:', error);
    return res.status(500).json({ error: 'Failed to serve KYC image' });
  }
});

superAdminRouter.post('/:id/approve', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const verificationId = Number(req.params.id || 0);
    const reviewerId = Number(req.user?.id || 0);
    if (!verificationId || !reviewerId) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const rows = await executeQuery<any[]>(
      `SELECT kv.id, kv.user_id, kv.provider_reference_id, u.email, u.first_name
       FROM kyc_verifications kv
       JOIN users u ON u.id = kv.user_id
       WHERE kv.id = ?
       LIMIT 1`,
      [verificationId],
    );

    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!record) {
      return res.status(404).json({ error: 'KYC verification not found' });
    }

    await executeQuery(
      `UPDATE kyc_verifications
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [reviewerId, verificationId],
    );
    await markUserKycRequired(Number(record.user_id), true, 'approved');
    await logKycAuditEvent({
      userId: Number(record.user_id),
      verificationId,
      status: 'approved',
      eventType: 'completed',
      providerReferenceId: record.provider_reference_id || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });

    await emailService.sendKycApprovedEmail({
      firstName: String(record.first_name || ''),
      email: String(record.email || ''),
    });

    return res.json({
      success: true,
      message: 'KYC approved successfully.',
    });
  } catch (error: any) {
    console.error('Failed to approve KYC:', error);
    return res.status(500).json({ error: 'Failed to approve KYC' });
  }
});

superAdminRouter.post('/:id/resubmit', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();

    const verificationId = Number(req.params.id || 0);
    const reviewerId = Number(req.user?.id || 0);
    const adminNotes = String(req.body?.admin_notes || '').trim();

    if (!verificationId || !reviewerId) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const rows = await executeQuery<any[]>(
      `SELECT kv.id, kv.user_id, kv.provider_reference_id, u.email, u.first_name
       FROM kyc_verifications kv
       JOIN users u ON u.id = kv.user_id
       WHERE kv.id = ?
       LIMIT 1`,
      [verificationId],
    );

    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!record) {
      return res.status(404).json({ error: 'KYC verification not found' });
    }

    await executeQuery(
      `UPDATE kyc_verifications
       SET status = 'failed', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW(), completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [adminNotes || null, reviewerId, verificationId],
    );
    await markUserKycRequired(Number(record.user_id), true, 'failed');
    await logKycAuditEvent({
      userId: Number(record.user_id),
      verificationId,
      status: 'failed',
      eventType: 'completed',
      providerReferenceId: record.provider_reference_id || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
      metadata: { admin_notes: adminNotes || null },
    });

    await emailService.sendKycResubmissionRequiredEmail({
      firstName: String(record.first_name || ''),
      email: String(record.email || ''),
      adminNotes: adminNotes || null,
    });

    return res.json({
      success: true,
      message: 'KYC marked for resubmission.',
    });
  } catch (error: any) {
    console.error('Failed to request KYC resubmission:', error);
    return res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

superAdminRouter.post('/:id/manual-review', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureKycSchema();
    const verificationId = Number(req.params.id || 0);
    const reviewerId = Number(req.user?.id || 0);
    const adminNotes = String(req.body?.admin_notes || '').trim();
    if (!verificationId || !reviewerId) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const rows = await executeQuery<any[]>(
      `SELECT id, user_id, provider_reference_id FROM kyc_verifications WHERE id = ? LIMIT 1`,
      [verificationId],
    );
    const record = rows?.[0];
    if (!record) {
      return res.status(404).json({ error: 'KYC verification not found' });
    }

    await executeQuery(
      `UPDATE kyc_verifications
       SET status = 'manual_review', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [adminNotes || null, reviewerId, verificationId],
    );
    await markUserKycRequired(Number(record.user_id), true, 'manual_review');
    await logKycAuditEvent({
      userId: Number(record.user_id),
      verificationId,
      status: 'manual_review',
      eventType: 'status_changed',
      providerReferenceId: record.provider_reference_id || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
      metadata: { admin_notes: adminNotes || null },
    });

    return res.json({ success: true, message: 'KYC moved to manual review.' });
  } catch (error: any) {
    console.error('Failed to move KYC to manual review:', error);
    return res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

export async function enforceKycBeforeSubscriptionCheckout(userId: number) {
  await ensureKycSchema();
  return assertUserCanCheckout(userId);
}

export { superAdminRouter as superAdminKycRoutes };
export default router;
