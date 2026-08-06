import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { requireSignedAdminContract } from '../middleware/contractGuard.js';
import { getGhlApiErrorDetails, validateGhlCredentials } from '../services/ghlService.js';

const router = Router();

const integrationUpdateSchema = z.object({
  access_token: z.string().min(1),
  location_id: z.string().trim().min(1, 'Location ID is required')
});

async function resolveAdminId(req: AuthRequest): Promise<number | null> {
  const user = req.user;
  if (!user) return null;
  if (user.role === 'admin' || user.role === 'super_admin') return user.id;
  if (['user', 'funding_manager', 'employee'].includes(user.role)) {
    const link = await getQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id, 'active']
    );
    if (link?.admin_id) return Number(link.admin_id);
  }
  return null;
}

function generateIntegrationHash() {
  return crypto.randomBytes(18).toString('base64url');
}

async function logConnectionAttempt(params: {
  integrationId: number;
  adminId: number;
  status: 'success' | 'failed';
  message: string;
  responseCode?: number | null;
  errorMessage?: string | null;
}) {
  await runQuery(
    `INSERT INTO integration_activity_logs
     (integration_id, admin_id, direction, event_type, status, message, response_code,
      error_message, data_fields, retry_status, created_at)
     VALUES (?, ?, 'outbound', 'connection_validation', ?, ?, ?, ?, ?, 'not_applicable', CURRENT_TIMESTAMP)`,
    [
      params.integrationId,
      params.adminId,
      params.status,
      params.message,
      params.responseCode ?? null,
      params.errorMessage ?? null,
      JSON.stringify(['access_token', 'location_id'])
    ]
  );
}

router.use(authenticateToken, requireSignedAdminContract);

router.get('/ghl', async (req: AuthRequest, res) => {
  try {
    const adminId = await resolveAdminId(req);
    if (!adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const integration = await getQuery(
      `SELECT * FROM admin_integrations WHERE admin_id = ? AND provider = 'ghl' ORDER BY id DESC LIMIT 1`,
      [adminId]
    );

    const lastSuccess = await getQuery(
      `SELECT created_at FROM integration_activity_logs
       WHERE admin_id = ? AND direction = 'outbound' AND status = 'success'
         AND event_type <> 'connection_validation'
       ORDER BY created_at DESC LIMIT 1`,
      [adminId]
    );

    const lastError = await getQuery(
      `SELECT created_at, message FROM integration_activity_logs WHERE admin_id = ? AND status = 'failed' ORDER BY created_at DESC LIMIT 1`,
      [adminId]
    );

    let totalClientsReceived = 0;
    if (integration?.id) {
      const countRow = await getQuery(
        `SELECT COUNT(*) as total FROM clients WHERE user_id = ? AND created_via = 'ghl' AND integration_id = ?`,
        [adminId, integration.id]
      );
      totalClientsReceived = Number(countRow?.total || 0);
    }

    res.json({
      success: true,
      data: {
        integrationId: integration?.id || null,
        integrationHash: integration?.integration_hash || null,
        locationId: integration?.location_id || '',
        isActive: integration?.is_active ? true : false,
        hasToken: Boolean(integration?.access_token),
        status: integration?.is_active
          ? (integration?.access_token && integration?.location_id && integration?.verified_at ? 'connected' : 'invalid')
          : (integration?.last_validation_error ? 'invalid' : 'disabled'),
        verifiedAt: integration?.verified_at || null,
        lastSuccessfulSync: lastSuccess?.created_at || null,
        lastError: lastError?.message
          ? { message: lastError.message, timestamp: lastError.created_at }
          : null,
        totalClientsReceived
      }
    });
  } catch (error) {
    console.error('Error fetching GHL integration:', error);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

router.get('/ghl/activity', async (req: AuthRequest, res) => {
  try {
    const adminId = await resolveAdminId(req);
    if (!adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const rawLimit = parseInt(String(req.query.limit || '25'), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 25;

    const logs = await allQuery(
      `SELECT l.id, l.direction, l.event_type, l.status, l.message, l.client_id, l.created_at,
              l.response_code, l.error_message, l.data_fields, l.retry_status,
              c.email as client_email, c.first_name as client_first_name, c.last_name as client_last_name,
              u.email as admin_email,
              u.first_name as admin_first_name, u.last_name as admin_last_name
       FROM integration_activity_logs l
       LEFT JOIN clients c ON l.client_id = c.id
       LEFT JOIN users u ON l.admin_id = u.id
       WHERE l.admin_id = ?
       ORDER BY l.created_at DESC
       LIMIT ${limit}`,
      [adminId]
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching integration activity:', error);
    res.status(500).json({ error: 'Failed to fetch integration activity' });
  }
});

router.post('/ghl', async (req: AuthRequest, res) => {
  try {
    const adminId = await resolveAdminId(req);
    if (!adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payload = integrationUpdateSchema.parse(req.body || {});
    const locationId = payload.location_id.trim();

    const existing = await getQuery(
      `SELECT id, integration_hash FROM admin_integrations WHERE admin_id = ? AND provider = 'ghl' ORDER BY id DESC LIMIT 1`,
      [adminId]
    );

    let integrationId: number;
    let integrationHash: string;
    if (existing?.id) {
      await runQuery(
        `UPDATE admin_integrations
         SET access_token = ?, location_id = ?, is_active = 0, verified_at = NULL,
             last_validation_code = NULL, last_validation_error = NULL,
             updated_at = CURRENT_TIMESTAMP, updated_by = ?
         WHERE id = ?`,
        [payload.access_token.trim(), locationId, adminId, existing.id]
      );
      integrationId = Number(existing.id);
      integrationHash = String(existing.integration_hash);
    } else {
      integrationHash = generateIntegrationHash();
      const result = await runQuery(
        `INSERT INTO admin_integrations
         (admin_id, provider, name, access_token, location_id, integration_hash, is_active,
          verified_at, created_at, updated_at, created_by, updated_by)
         VALUES (?, 'ghl', ?, ?, ?, ?, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`,
        [adminId, 'GoHighLevel', payload.access_token.trim(), locationId, integrationHash, adminId, adminId]
      );
      integrationId = Number(result?.insertId || result?.lastID);
      if (!integrationId) {
        const inserted = await getQuery(
          `SELECT id FROM admin_integrations WHERE admin_id = ? AND provider = 'ghl' ORDER BY id DESC LIMIT 1`,
          [adminId]
        );
        integrationId = Number(inserted?.id);
      }
    }

    try {
      const validation = await validateGhlCredentials(payload.access_token, locationId);
      await runQuery(
        `UPDATE admin_integrations
         SET is_active = 1, verified_at = CURRENT_TIMESTAMP, last_validation_code = ?,
             last_validation_error = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = ?
         WHERE id = ? AND admin_id = ?`,
        [validation.responseCode, adminId, integrationId, adminId]
      );
      await logConnectionAttempt({
        integrationId,
        adminId,
        status: 'success',
        responseCode: validation.responseCode,
        message: validation.locationName
          ? `Connected to GoHighLevel location ${validation.locationName} (${locationId})`
          : `Connected to GoHighLevel location ${locationId}`
      });
      return res.json({
        success: true,
        data: { integrationHash, status: 'connected', verified: true }
      });
    } catch (validationError: any) {
      const details = getGhlApiErrorDetails(validationError);
      await runQuery(
        `UPDATE admin_integrations
         SET is_active = 0, verified_at = NULL, last_validation_code = ?,
             last_validation_error = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
         WHERE id = ? AND admin_id = ?`,
        [details.responseCode, details.message, adminId, integrationId, adminId]
      );
      await logConnectionAttempt({
        integrationId,
        adminId,
        status: 'failed',
        responseCode: details.responseCode,
        message: details.message,
        errorMessage: details.message
      });
      return res.status(details.responseCode && details.responseCode < 500 ? 400 : 502).json({
        success: false,
        error: details.message,
        ghlResponseCode: details.responseCode,
        status: 'invalid'
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error saving GHL integration:', error);
    res.status(500).json({ error: 'Failed to save integration settings' });
  }
});

router.post('/ghl/disable', async (req: AuthRequest, res) => {
  try {
    const adminId = await resolveAdminId(req);
    if (!adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existing = await getQuery(
      `SELECT id FROM admin_integrations WHERE admin_id = ? AND provider = 'ghl' ORDER BY id DESC LIMIT 1`,
      [adminId]
    );
    if (!existing?.id) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await runQuery(
      `UPDATE admin_integrations
       SET is_active = 0, verified_at = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = ?
       WHERE id = ? AND admin_id = ?`,
      [adminId, existing.id, adminId]
    );
    await logConnectionAttempt({
      integrationId: Number(existing.id),
      adminId,
      status: 'success',
      message: 'GoHighLevel integration disabled; outbound transmission stopped'
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error disabling GHL integration:', error);
    res.status(500).json({ error: 'Failed to disable integration' });
  }
});

router.post('/ghl/regenerate-webhook', async (req: AuthRequest, res) => {
  try {
    const adminId = await resolveAdminId(req);
    if (!adminId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existing = await getQuery(
      `SELECT id FROM admin_integrations WHERE admin_id = ? AND provider = 'ghl' ORDER BY id DESC LIMIT 1`,
      [adminId]
    );
    if (!existing?.id) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const newHash = generateIntegrationHash();
    await runQuery(
      `UPDATE admin_integrations SET integration_hash = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
      [newHash, adminId, existing.id]
    );
    res.json({ success: true, data: { integrationHash: newHash } });
  } catch (error) {
    console.error('Error regenerating webhook:', error);
    res.status(500).json({ error: 'Failed to regenerate webhook' });
  }
});

export default router;
