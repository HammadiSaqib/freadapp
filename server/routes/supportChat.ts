import { Router, Request, Response } from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { ChatMessage } from '../database/mysqlSchema.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);


// Get chat messages between two users
router.get('/messages/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Sanitize and inline pagination values to avoid LIMIT/OFFSET placeholders
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const offsetNum = Math.max(0, parseInt(String(offset), 10) || 0);

    // Get messages between current user and specified user
    const messages = await executeQuery<ChatMessage[]>(
      `SELECT cm.*, 
              u1.first_name as sender_first_name, u1.last_name as sender_last_name,
              u2.first_name as receiver_first_name, u2.last_name as receiver_last_name,
              t.title as ticket_title
       FROM chat_messages cm
       LEFT JOIN users u1 ON cm.sender_id = u1.id
       LEFT JOIN users u2 ON cm.receiver_id = u2.id
       LEFT JOIN tickets t ON cm.ticket_reference_id = t.id
       WHERE (cm.sender_id = ? AND cm.receiver_id = ?) 
          OR (cm.sender_id = ? AND cm.receiver_id = ?)
       ORDER BY cm.created_at ASC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [currentUserId, userId, userId, currentUserId]
    );

    // Mark messages as read where current user is receiver
    await executeQuery(
      `UPDATE chat_messages 
       SET is_read = TRUE 
       WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE`,
      [currentUserId, userId]
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat messages' });
  }
});

// Send a new chat message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { receiver_id, message, ticket_reference_id } = req.body;
    const sender_id = (req as any).user.id;

    if (!receiver_id || !message) {
      return res.status(400).json({ success: false, message: 'Receiver ID and message are required' });
    }

    // Verify receiver exists and is not super admin
    const receiver = await executeQuery(
      'SELECT id, role FROM users WHERE id = ? AND role != "super_admin"',
      [receiver_id]
    );

    if (!receiver || receiver.length === 0) {
      return res.status(404).json({ success: false, message: 'Receiver not found or invalid' });
    }

    // Insert new message
    const result = await executeQuery(
      `INSERT INTO chat_messages (sender_id, receiver_id, message, ticket_reference_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [sender_id, receiver_id, message, ticket_reference_id || null]
    );

    // Get the inserted message with user details
    const newMessage = await executeQuery(
      `SELECT cm.*, 
              u1.first_name as sender_first_name, u1.last_name as sender_last_name,
              u2.first_name as receiver_first_name, u2.last_name as receiver_last_name,
              t.title as ticket_title
       FROM chat_messages cm
       LEFT JOIN users u1 ON cm.sender_id = u1.id
       LEFT JOIN users u2 ON cm.receiver_id = u2.id
       LEFT JOIN tickets t ON cm.ticket_reference_id = t.id
       WHERE cm.id = ?`,
      [(result as any).insertId]
    );

    res.json({ success: true, message: newMessage[0] });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Get list of users available for chat (admins and support, excluding super admins)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;

    let query = '';
    let params: any[] = [];

    if (currentUserRole === 'support') {
      // Support can chat with admins only
      query = `SELECT id, first_name, last_name, email, role, status
               FROM users 
               WHERE role = 'admin' AND status = 'active' AND id != ?
               ORDER BY first_name, last_name`;
      params = [currentUserId];
    } else if (currentUserRole === 'admin') {
      // Admins can chat with support and other admins
      query = `SELECT id, first_name, last_name, email, role, status
               FROM users 
               WHERE role IN ('admin', 'support') AND status = 'active' AND id != ?
               ORDER BY role, first_name, last_name`;
      params = [currentUserId];
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const users = await executeQuery(query, params);

    // Get unread message counts for each user
    const usersWithUnreadCounts = await Promise.all(
      users.map(async (user: any) => {
        const unreadCount = await executeQuery(
          `SELECT COUNT(*) as count 
           FROM chat_messages 
           WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
          [user.id, currentUserId]
        );
        return {
          ...user,
          unread_count: unreadCount[0]?.count || 0
        };
      })
    );

    res.json({ success: true, users: usersWithUnreadCounts });
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get chat conversations list with last message
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;

    const conversations = await executeQuery(
      `SELECT DISTINCT
         CASE 
           WHEN cm.sender_id = ? THEN cm.receiver_id 
           ELSE cm.sender_id 
         END as user_id,
         u.first_name,
         u.last_name,
         u.role,
         (
           SELECT message 
           FROM chat_messages cm2 
           WHERE (cm2.sender_id = ? AND cm2.receiver_id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END)
              OR (cm2.receiver_id = ? AND cm2.sender_id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END)
           ORDER BY cm2.created_at DESC 
           LIMIT 1
         ) as last_message,
         (
           SELECT created_at 
           FROM chat_messages cm2 
           WHERE (cm2.sender_id = ? AND cm2.receiver_id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END)
              OR (cm2.receiver_id = ? AND cm2.sender_id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END)
           ORDER BY cm2.created_at DESC 
           LIMIT 1
         ) as last_message_time,
         (
           SELECT COUNT(*) 
           FROM chat_messages cm2 
           WHERE cm2.sender_id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END
             AND cm2.receiver_id = ? 
             AND cm2.is_read = FALSE
         ) as unread_count
       FROM chat_messages cm
       JOIN users u ON u.id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END
       WHERE cm.sender_id = ? OR cm.receiver_id = ?
       ORDER BY last_message_time DESC`,
      [
        currentUserId, currentUserId, currentUserId, currentUserId, currentUserId,
        currentUserId, currentUserId, currentUserId, currentUserId,
        currentUserId, currentUserId, currentUserId, currentUserId, currentUserId
      ]
    );

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

export default router;