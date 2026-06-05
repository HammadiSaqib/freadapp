import express from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { SecurityLogger } from '../utils/securityLogger.js';

const router = express.Router();
const securityLogger = new SecurityLogger();

// Middleware to ensure only support staff can access admin management
const requireSupportRole = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'support') {
    securityLogger.logSecurityEvent('unauthorized_admin_access', {
      userId: req.user?.id,
      userRole: req.user?.role,
      endpoint: req.path,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Access denied. Support role required.' });
  }
  next();
};

// GET /api/admin-management - Get all regular admin users with subscription info
router.get('/', authenticateToken, requireSupportRole, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.company_name,
        u.role,
        u.status,
        u.last_login,
        u.created_at,
        u.updated_at,
        s.id as subscription_id,
        s.plan_name,
        s.plan_type,
        s.status as subscription_status,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.role = 'admin' AND u.status != 'deleted'
      ORDER BY u.created_at DESC
    `;
    
    const admins = await executeQuery(query);
    
    // Transform data to match frontend interface
    const transformedAdmins = admins.map((admin: any) => ({
      id: `ADM-${String(admin.id).padStart(3, '0')}`,
      username: admin.email.split('@')[0],
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: 'admin',
      status: admin.status,
      permissions: ['users.read', 'users.write', 'reports.read', 'disputes.read'], // Default permissions
      lastLogin: admin.last_login || '',
      created: admin.created_at,
      createdBy: 'support-user',
      department: admin.company_name || 'Operations',
      phone: '',
      subscription: admin.subscription_id ? {
        id: admin.subscription_id,
        plan_name: admin.plan_name,
        plan_type: admin.plan_type,
        status: admin.subscription_status,
        current_period_start: admin.current_period_start,
        current_period_end: admin.current_period_end,
        cancel_at_period_end: admin.cancel_at_period_end
      } : null
    }));
    
    res.json({ success: true, data: transformedAdmins });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    securityLogger.logSecurityEvent('admin_fetch_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// POST /api/admin-management - Create new admin user
router.post('/', authenticateToken, requireSupportRole, async (req, res) => {
  try {
    const {
      username,
      email,
      firstName,
      lastName,
      department,
      phone,
      permissions
    } = req.body;
    
    // Validate required fields
    if (!username || !email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if email already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    
    // Insert new admin user
    const insertQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, company_name,
        role, status, email_verified,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'admin', 'active', false, NOW(), NOW())
    `;
    
    const result = await executeQuery(insertQuery, [
      email,
      passwordHash,
      firstName,
      lastName,
      department || 'Operations'
    ]);
    
    const newAdminId = result.insertId;
    
    // Log security event
    securityLogger.logSecurityEvent('admin_created', {
      createdBy: req.user.id,
      newAdminId,
      email,
      ip: req.ip
    });
    
    // Return created admin data
    const createdAdmin = {
      id: `ADM-${String(newAdminId).padStart(3, '0')}`,
      username,
      email,
      firstName,
      lastName,
      role: 'admin',
      status: 'active',
      permissions: permissions || ['users.read', 'reports.read'],
      lastLogin: '',
      created: new Date().toISOString(),
      createdBy: `support-${req.user.id}`,
      department: department || 'Operations',
      phone: phone || '',
      tempPassword // Include temp password in response for support staff
    };
    
    res.status(201).json({ success: true, data: createdAdmin });
  } catch (error) {
    console.error('Error creating admin user:', error);
    securityLogger.logSecurityEvent('admin_creation_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// PUT /api/admin-management/:id - Update admin user and subscription
router.put('/:id', authenticateToken, requireSupportRole, async (req, res) => {
  try {
    const adminId = req.params.id.replace('ADM-', ''); // Remove prefix
    const {
      firstName,
      lastName,
      department,
      phone,
      status,
      permissions,
      subscription
    } = req.body;
    
    // Verify admin exists and is not super admin
    const existingAdmin = await executeQuery(
      'SELECT id, role FROM users WHERE id = ? AND role = "admin"',
      [adminId]
    );
    
    if (existingAdmin.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    // Update admin user
    const updateQuery = `
      UPDATE users 
      SET 
        first_name = ?,
        last_name = ?,
        company_name = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ? AND role = 'admin'
    `;
    
    await executeQuery(updateQuery, [
      firstName,
      lastName,
      department,
      status,
      adminId
    ]);
    
    // Update subscription if provided
    if (subscription) {
      const subscriptionUpdateQuery = `
        UPDATE subscriptions 
        SET 
          plan_name = ?,
          plan_type = ?,
          status = ?,
          current_period_end = ?,
          updated_at = NOW()
        WHERE user_id = ?
      `;
      
      await executeQuery(subscriptionUpdateQuery, [
        subscription.plan_name,
        subscription.plan_type,
        subscription.status,
        subscription.current_period_end,
        adminId
      ]);
    }
    
    // Log security event
    securityLogger.logSecurityEvent('admin_updated', {
      updatedBy: req.user.id,
      adminId,
      changes: { firstName, lastName, department, status, subscription },
      ip: req.ip
    });
    
    res.json({ success: true, message: 'Admin user and subscription updated successfully' });
  } catch (error) {
    console.error('Error updating admin user:', error);
    securityLogger.logSecurityEvent('admin_update_error', {
      userId: req.user?.id,
      adminId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

// DELETE /api/admin-management/:id - Deactivate admin user (soft delete)
router.delete('/:id', authenticateToken, requireSupportRole, async (req, res) => {
  try {
    const adminId = req.params.id.replace('ADM-', ''); // Remove prefix
    
    // Verify admin exists and is not super admin
    const existingAdmin = await executeQuery(
      'SELECT id, role, email FROM users WHERE id = ? AND role = "admin"',
      [adminId]
    );
    
    if (existingAdmin.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    // Soft delete by setting status to inactive
    await executeQuery(
      'UPDATE users SET status = "inactive", updated_at = NOW() WHERE id = ? AND role = "admin"',
      [adminId]
    );
    
    // Log security event
    securityLogger.logSecurityEvent('admin_deactivated', {
      deactivatedBy: req.user.id,
      adminId,
      adminEmail: existingAdmin[0].email,
      ip: req.ip
    });
    
    res.json({ success: true, message: 'Admin user deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating admin user:', error);
    securityLogger.logSecurityEvent('admin_deactivation_error', {
      userId: req.user?.id,
      adminId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to deactivate admin user' });
  }
});

// POST /api/admin-management/:id/toggle-status - Toggle admin status
router.post('/:id/toggle-status', authenticateToken, requireSupportRole, async (req, res) => {
  try {
    const adminId = req.params.id.replace('ADM-', ''); // Remove prefix
    
    // Get current status
    const admin = await executeQuery(
      'SELECT id, status, email FROM users WHERE id = ? AND role = "admin"',
      [adminId]
    );
    
    if (admin.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    const currentStatus = admin[0].status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // Update status
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND role = "admin"',
      [newStatus, adminId]
    );
    
    // Log security event
    securityLogger.logSecurityEvent('admin_status_toggled', {
      toggledBy: req.user.id,
      adminId,
      adminEmail: admin[0].email,
      oldStatus: currentStatus,
      newStatus,
      ip: req.ip
    });
    
    res.json({ 
      success: true, 
      message: `Admin user ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      newStatus
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    securityLogger.logSecurityEvent('admin_status_toggle_error', {
      userId: req.user?.id,
      adminId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

// POST /api/admin-management/:id/reset-password - Reset admin password (support only)
router.post('/:id/reset-password', authenticateToken, requireSupportRole, async (req, res) => {
  try {
    const adminId = req.params.id.replace('ADM-', '');
    const { newPassword } = req.body || {};
    const rows = await executeQuery(
      'SELECT id, email FROM users WHERE id = ? AND role = "admin"',
      [adminId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    let nextPassword: string = String(newPassword || '');
    if (!nextPassword || nextPassword.length < 8) {
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
      const gen = (len: number) => Array.from({ length: len }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
      nextPassword = gen(12);
    }
    const passwordHash = await bcrypt.hash(nextPassword, 12);
    await executeQuery(
      `UPDATE users 
       SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = ? AND role = "admin"`,
      [passwordHash, adminId]
    );
    securityLogger.logSecurityEvent('admin_password_reset', {
      resetBy: req.user?.id,
      adminId,
      ip: req.ip
    });
    res.json({
      success: true,
      message: 'Password reset successfully',
      generated: !newPassword,
      newPassword: nextPassword
    });
  } catch (error: any) {
    console.error('Error resetting admin password:', error);
    securityLogger.logSecurityEvent('admin_password_reset_error', {
      userId: req.user?.id,
      adminId: req.params.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
