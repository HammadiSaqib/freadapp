import { Router, Request, Response } from 'express';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { AdminNotification } from '../database/superAdminSchema.js';

const router = Router();

async function resolveAdminRecipientId(req: AuthRequest): Promise<number | null> {
  const db = getDatabaseAdapter();
  const user = req.user;
  if (!user) return null;
  if (user.role === 'admin' || user.role === 'super_admin') return user.id;
  if (['user', 'funding_manager', 'employee'].includes(user.role)) {
    const link = await db.getQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id, 'active']
    );
    if (link && link.admin_id) return link.admin_id;
  }
  return null;
}

// GET /api/admin/notifications - Get admin notifications
router.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = await resolveAdminRecipientId(req);
    if (!adminId) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const { limit = 10, offset = 0, unread_only = false, scope = 'all' } = req.query as any;

    const db = getDatabaseAdapter();
    
    let query = `
      SELECT 
        an.*,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name
      FROM admin_notifications an
      LEFT JOIN users u ON an.sender_id = u.id
      WHERE an.recipient_id = ?
    `;
    
    const params: any[] = [adminId];
    
    if (String(unread_only) === 'true') {
      query += ' AND an.is_read = FALSE';
    }
    if (String(scope).toLowerCase() === 'personal') {
      query += ' AND an.sender_id = ?';
    }
    
    query += ' AND (an.expires_at IS NULL OR an.expires_at > NOW())';
    query += ' ORDER BY an.created_at DESC';
    
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
    // Note: LIMIT and OFFSET cannot use parameter placeholders in MySQL

    const notifications = await db.allQuery(query, String(scope).toLowerCase() === 'personal' ? [...params, adminId] : params);

    // Get unread count
    const unreadCountQuery = `
      SELECT COUNT(*) as count 
      FROM admin_notifications 
      WHERE recipient_id = ? AND is_read = FALSE 
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const unreadResult = await db.getQuery(unreadCountQuery, [adminId]);
    const unreadCount = unreadResult?.count || 0;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// PUT /api/admin/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = await resolveAdminRecipientId(req);
    if (!adminId) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const notificationId = req.params.id;

    const db = getDatabaseAdapter();
    
    const updateQuery = `
      UPDATE admin_notifications 
      SET is_read = TRUE, read_at = NOW() 
      WHERE id = ? AND recipient_id = ?
    `;
    
    await db.executeQuery(updateQuery, [notificationId, adminId]);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// PUT /api/admin/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = await resolveAdminRecipientId(req);
    if (!adminId) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const db = getDatabaseAdapter();
    
    const updateQuery = `
      UPDATE admin_notifications 
      SET is_read = TRUE, read_at = NOW() 
      WHERE recipient_id = ? AND is_read = FALSE
    `;
    
    await db.executeQuery(updateQuery, [adminId]);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

// POST /api/admin/notifications - Create a new admin notification (internal use)
router.post('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      recipient_id,
      title,
      message,
      type = 'info',
      priority = 'medium',
      action_url,
      action_text,
      expires_at
    } = req.body;

    const sender_id = req.user?.id;

    const db = getDatabaseAdapter();
    
    const insertQuery = `
      INSERT INTO admin_notifications (
        recipient_id, sender_id, title, message, type, priority, 
        action_url, action_text, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.executeQuery(insertQuery, [
      recipient_id, sender_id, title, message, type, priority,
      action_url, action_text, expires_at
    ]);

    res.json({ 
      success: true, 
      message: 'Notification created successfully',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error('Error creating admin notification:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
});

export default router;
