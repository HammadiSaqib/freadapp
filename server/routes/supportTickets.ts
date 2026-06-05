import { Router, Request, Response } from 'express';
import { executeQuery, executeTransaction } from '../database/mysqlConfig.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { Ticket, TicketMessage } from '../database/mysqlSchema.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/support/tickets/my - Get tickets for current user
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const ticketsQuery = `
      SELECT 
        t.id,
        t.title,
        t.priority,
        t.status,
        t.category,
        t.created_at,
        t.updated_at
      FROM tickets t
      WHERE t.customer_id = ?
      ORDER BY t.created_at DESC
    `;

    const tickets = await executeQuery<any[]>(ticketsQuery, [userId]);

    const transformedTickets = tickets.map(ticket => ({
      id: ticket.id.toString(),
      subject: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      category: ticket.category
    }));

    res.json({ tickets: transformedTickets });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/support/tickets - Get all tickets with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = 'all',
      priority = 'all',
      assignee = 'all'
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
    const safeOffset = (pageNum - 1) * limitNum;
    
    // Build WHERE clause based on filters
    let whereConditions = [];
    let queryParams: any[] = [];
    
    if (search) {
      whereConditions.push('(t.title LIKE ? OR t.description LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (status !== 'all') {
      whereConditions.push('t.status = ?');
      queryParams.push(status);
    }
    
    if (priority !== 'all') {
      whereConditions.push('t.priority = ?');
      queryParams.push(priority);
    }
    
    if (assignee !== 'all') {
      if (assignee === 'unassigned') {
        whereConditions.push('t.assignee_id IS NULL');
      } else {
        whereConditions.push('t.assignee_id = ?');
        queryParams.push(assignee);
      }
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get tickets with customer and assignee information
    const ticketsQuery = `
      SELECT 
        t.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        CONCAT(a.first_name, ' ', a.last_name) as assignee_name,
        a.id as assignee_id
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.assignee_id = a.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${limitNum} OFFSET ${safeOffset}
    `;
    
    const tickets = await executeQuery<any[]>(ticketsQuery, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.assignee_id = a.id
      ${whereClause}
    `;
    
    const [countResult] = await executeQuery<any[]>(countQuery, queryParams);
    const total = countResult?.total || 0;
    
    // Transform tickets to match frontend interface
    const transformedTickets = tickets.map(ticket => ({
      id: ticket.id.toString(),
      title: ticket.title,
      description: ticket.description,
      customer: {
        name: ticket.customer_name,
        email: ticket.customer_email,
        id: ticket.customer_id.toString()
      },
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category,
      assignee: ticket.assignee_name ? {
        name: ticket.assignee_name,
        id: ticket.assignee_id.toString()
      } : undefined,
      created: ticket.created_at,
      updated: ticket.updated_at,
      messages: [] // Messages will be loaded separately
    }));
    
    res.json({
      tickets: transformedTickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/support/tickets/:id - Get specific ticket with messages
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get ticket with customer and assignee information
    const ticketQuery = `
      SELECT 
        t.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        CONCAT(a.first_name, ' ', a.last_name) as assignee_name,
        a.id as assignee_id
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.assignee_id = a.id
      WHERE t.id = ?
    `;
    
    const [ticket] = await executeQuery<any[]>(ticketQuery, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Get ticket messages
    const messagesQuery = `
      SELECT 
        tm.*,
        CONCAT(u.first_name, ' ', u.last_name) as author_name
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.author_id = u.id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC
    `;
    
    const messages = await executeQuery<any[]>(messagesQuery, [id]);
    
    // Transform ticket data
    const transformedTicket = {
      id: ticket.id.toString(),
      title: ticket.title,
      description: ticket.description,
      customer: {
        name: ticket.customer_name,
        email: ticket.customer_email,
        id: ticket.customer_id.toString()
      },
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category,
      assignee: ticket.assignee_name ? {
        name: ticket.assignee_name,
        id: ticket.assignee_id.toString()
      } : undefined,
      created: ticket.created_at,
      updated: ticket.updated_at,
      messages: messages.map(msg => ({
        id: msg.id.toString(),
        content: msg.content,
        author: {
          name: msg.author_name,
          type: msg.author_type
        },
        timestamp: msg.created_at
      }))
    };
    
    res.json(transformedTicket);
    
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /api/support/tickets - Create new ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      customer_id,
      priority = 'medium',
      category,
      assignee_id
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !customer_id || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Create ticket
    const insertQuery = `
      INSERT INTO tickets (title, description, customer_id, priority, category, assignee_id, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery<any>(insertQuery, [
      title,
      description,
      customer_id,
      priority,
      category,
      assignee_id || null,
      userId,
      userId
    ]);
    
    const ticketId = result.insertId;
    
    // Get the created ticket
    const [createdTicket] = await executeQuery<any[]>(
      `SELECT 
        t.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        CONCAT(a.first_name, ' ', a.last_name) as assignee_name,
        a.id as assignee_id
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.assignee_id = a.id
      WHERE t.id = ?`,
      [ticketId]
    );
    
    const transformedTicket = {
      id: createdTicket.id.toString(),
      title: createdTicket.title,
      description: createdTicket.description,
      customer: {
        name: createdTicket.customer_name,
        email: createdTicket.customer_email,
        id: createdTicket.customer_id.toString()
      },
      priority: createdTicket.priority,
      status: createdTicket.status,
      category: createdTicket.category,
      assignee: createdTicket.assignee_name ? {
        name: createdTicket.assignee_name,
        id: createdTicket.assignee_id.toString()
      } : undefined,
      created: createdTicket.created_at,
      updated: createdTicket.updated_at,
      messages: []
    };
    
    res.status(201).json(transformedTicket);
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PUT /api/support/tickets/:id - Update ticket
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      category,
      assignee_id
    } = req.body;
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if ticket exists
    const [existingTicket] = await executeQuery<any[]>('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateParams.push(priority);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(category);
    }
    if (assignee_id !== undefined) {
      updateFields.push('assignee_id = ?');
      updateParams.push(assignee_id || null);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push('updated_by = ?');
    updateParams.push(userId);
    updateParams.push(id);
    
    const updateQuery = `UPDATE tickets SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(updateQuery, updateParams);
    
    // Get updated ticket
    const [updatedTicket] = await executeQuery<any[]>(
      `SELECT 
        t.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        CONCAT(a.first_name, ' ', a.last_name) as assignee_name,
        a.id as assignee_id
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users a ON t.assignee_id = a.id
      WHERE t.id = ?`,
      [id]
    );
    
    const transformedTicket = {
      id: updatedTicket.id.toString(),
      title: updatedTicket.title,
      description: updatedTicket.description,
      customer: {
        name: updatedTicket.customer_name,
        email: updatedTicket.customer_email,
        id: updatedTicket.customer_id.toString()
      },
      priority: updatedTicket.priority,
      status: updatedTicket.status,
      category: updatedTicket.category,
      assignee: updatedTicket.assignee_name ? {
        name: updatedTicket.assignee_name,
        id: updatedTicket.assignee_id.toString()
      } : undefined,
      created: updatedTicket.created_at,
      updated: updatedTicket.updated_at,
      messages: [] // Messages loaded separately
    };
    
    res.json(transformedTicket);
    
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// DELETE /api/support/tickets/:id - Delete ticket
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if ticket exists
    const [existingTicket] = await executeQuery<any[]>('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Delete ticket (messages will be deleted automatically due to CASCADE)
    await executeQuery('DELETE FROM tickets WHERE id = ?', [id]);
    
    res.json({ message: 'Ticket deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// POST /api/support/tickets/:id/messages - Add message to ticket
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, author_type = 'support' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if ticket exists
    const [existingTicket] = await executeQuery<any[]>('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Insert message
    const insertQuery = `
      INSERT INTO ticket_messages (ticket_id, content, author_id, author_type)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await executeQuery<any>(insertQuery, [id, content, userId, author_type]);
    const messageId = result.insertId;
    
    // Update ticket's updated_at timestamp
    await executeQuery('UPDATE tickets SET updated_by = ? WHERE id = ?', [userId, id]);
    
    // Get the created message
    const [createdMessage] = await executeQuery<any[]>(
      `SELECT 
        tm.*,
        CONCAT(u.first_name, ' ', u.last_name) as author_name
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.author_id = u.id
      WHERE tm.id = ?`,
      [messageId]
    );
    
    const transformedMessage = {
      id: createdMessage.id.toString(),
      content: createdMessage.content,
      author: {
        name: createdMessage.author_name,
        type: createdMessage.author_type
      },
      timestamp: createdMessage.created_at
    };
    
    res.status(201).json(transformedMessage);
    
  } catch (error) {
    console.error('Error adding message to ticket:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// GET /api/support/tickets/:id/messages - Get ticket messages
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if ticket exists
    const [existingTicket] = await executeQuery<any[]>('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Get messages
    const messagesQuery = `
      SELECT 
        tm.*,
        CONCAT(u.first_name, ' ', u.last_name) as author_name
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.author_id = u.id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC
    `;
    
    const messages = await executeQuery<any[]>(messagesQuery, [id]);
    
    const transformedMessages = messages.map(msg => ({
      id: msg.id.toString(),
      content: msg.content,
      author: {
        name: msg.author_name,
        type: msg.author_type
      },
      timestamp: msg.created_at
    }));
    
    res.json(transformedMessages);
    
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
