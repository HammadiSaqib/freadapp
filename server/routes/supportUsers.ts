import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { allQuery } from '../database/databaseAdapter.js';

const router = Router();

// Middleware to check if user is support staff
const requireSupport = (req: any, res: Response, next: any) => {
  if (!req.user || req.user.role !== 'support') {
    return res.status(403).json({ error: 'Support access required' });
  }
  next();
};

// Get all clients with their assigned admin information for support team
router.get('/api/support/users', authenticateToken, requireSupport, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, status, adminId } = req.query;
    
    // Sanitize pagination inputs and inline them to avoid LIMIT/OFFSET placeholders
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const safeOffset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT 
        c.id,
        CONCAT(c.first_name, ' ', c.last_name) as name,
        c.email,
        c.phone,
        c.status,
        c.credit_score,
        c.created_at as joinDate,
        c.notes,
        u.id as admin_id,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        u.email as admin_email,
        u.company_name as admin_department
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    
    let params: any[] = [];
    
    // Add filters
    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status as string);
    }
    
    if (adminId) {
      query += ' AND c.user_id = ?';
      params.push(adminId as string);
    }
    
    if (search) {
      query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    // Add pagination (inline sanitized numbers to avoid ER_WRONG_ARGUMENTS)
    query += ` ORDER BY c.created_at DESC LIMIT ${limitNum} OFFSET ${safeOffset}`;
    
    const results = await allQuery(query, params);
    
    // Transform the data to match the frontend interface
    const users = results.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      subscription: {
        plan: 'Basic', // Default for now
        status: 'active',
        expiryDate: '2024-12-31'
      },
      joinDate: row.joinDate,
      lastLogin: new Date().toISOString(), // Mock data
      totalTickets: 0, // Mock data
      openTickets: 0, // Mock data
      creditScore: row.credit_score,
      accountBalance: 0, // Mock data
      notes: row.notes || '',
      assignedAdmin: row.admin_id ? {
        id: row.admin_id.toString(),
        name: row.admin_name,
        email: row.admin_email,
        department: row.admin_department
      } : undefined
    }));
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    let countParams: any[] = [];
    
    if (status && status !== 'all') {
      countQuery += ' AND c.status = ?';
      countParams.push(status as string);
    }
    
    if (adminId) {
      countQuery += ' AND c.user_id = ?';
      countParams.push(adminId as string);
    }
    
    if (search) {
      countQuery += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    const countResult = await allQuery(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching support users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all admins for assignment dropdown
router.get('/api/support/admins', authenticateToken, requireSupport, async (req: Request, res: Response) => {
  try {
    const admins = await allQuery(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email, company_name as department 
       FROM users 
       WHERE role IN ('admin', 'manager') AND status = 'active'
       ORDER BY first_name, last_name`
    );
    
    res.json(admins.map((admin: any) => ({
      id: admin.id.toString(),
      name: admin.name,
      email: admin.email,
      department: admin.department
    })));
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client admin assignment
router.put('/api/support/users/:id/assign-admin', authenticateToken, requireSupport, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }
    
    // Update the client's assigned admin
    await allQuery(
      'UPDATE clients SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [adminId, id]
    );
    
    res.json({ message: 'Admin assignment updated successfully' });
  } catch (error) {
    console.error('Error updating admin assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;