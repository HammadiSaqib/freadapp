import { Request, Response, NextFunction } from 'express';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';

/**
 * Middleware: requireSignedAdminContract
 * Blocks access for admin/super_admin users until their latest admin contract is signed.
 * Responds 403 with metadata to help the frontend redirect to signing.
 */
export async function requireSignedAdminContract(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    // Only enforce for authenticated admin or super_admin
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return next();
    }

    // Super admins are exempt from signing contracts
    if (user.role === 'super_admin') {
      return next();
    }

    const adapter = getDatabaseAdapter();
    const dbType = adapter.getType();

    // Find latest contract for this admin
    let latest: any = null;
    if (dbType === 'mysql') {
      const rows = await adapter.allQuery(
        'SELECT id, status, created_at FROM contracts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );
      latest = rows && rows.length > 0 ? rows[0] : null;
    } else {
      const rows = await adapter.allQuery(
        'SELECT id, status, created_at FROM contracts WHERE admin_id = ? ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );
      latest = rows && rows.length > 0 ? rows[0] : null;
    }

    // Allow if signed
    if (latest && latest.status === 'signed') {
      return next();
    }

    // Grace bypass: allow read-only access and permit creating exactly one client
    const method = (req.method || 'GET').toUpperCase();
    const baseUrl = (req.baseUrl || req.originalUrl || '').toString();

    // Allow all GET requests (read-only) while contract is unsigned
    if (method === 'GET') {
      return next();
    }

    // Allow creating exactly one client while unsigned
    if (baseUrl.startsWith('/api/clients') && method === 'POST') {
      const countRow = await adapter.getQuery(
        'SELECT COUNT(*) as count FROM clients WHERE user_id = ?',
        [user.id]
      );
      const existingCount = (countRow && (countRow.count ?? countRow[0]?.count)) || 0;
      if (Number(existingCount) < 1) {
        return next();
      }

      return res.status(403).json({
        error: 'contract_signature_required_grace_exceeded',
        message: 'Please sign the admin onboarding agreement to add more than one client.',
        requires_signature: true,
        contract_id: latest?.id ?? null,
        status: latest?.status ?? null,
      });
    }

    // Otherwise block and provide helpful metadata
    return res.status(403).json({
      error: 'contract_signature_required',
      message: 'Access blocked until the admin onboarding contract is signed.',
      requires_signature: true,
      contract_id: latest?.id ?? null,
      status: latest?.status ?? null,
    });
  } catch (error: any) {
    console.error('Contract guard error:', error);
    return res.status(500).json({ error: 'contract_guard_failed', details: error.message });
  }
}