import { Request, Response } from 'express';
import { z } from 'zod';
import { runQuery, getQuery, allQuery, runTransaction, logActivity, logAudit } from '../database/databaseAdapter.js';
import { Client } from '../database/enhancedSchema.js';
import { AuthRequest } from '../middleware/securityMiddleware.js';
import { sanitizeInput, validatePasswordStrength } from '../config/security.js';
import { validateClientQuota } from '../utils/planValidation.js';
import { emailService } from '../services/emailService.js';

// Enhanced validation schemas with comprehensive rules
const clientObjectSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  
  email: z.string()
    .email('Valid email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Valid phone number is required')
    .optional(),
  
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 18 && age <= 120;
    }, 'Client must be between 18 and 120 years old')
    .optional(),
  
  ssn_last_four: z.string()
    .regex(/^\d{4}$/, 'SSN last four must be exactly 4 digits')
    .optional(),
  
  employment_status: z.string()
    .max(50, 'Employment status must be less than 50 characters')
    .optional(),
  
  annual_income: z.number()
    .min(0, 'Annual income must be non-negative')
    .max(99999999.99, 'Annual income is too large')
    .optional(),
  
  address: z.string()
    .max(255, 'Address must be less than 255 characters')
    .optional(),
  
  city: z.string()
    .max(100, 'City must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'City contains invalid characters')
    .optional(),
  
  state: z.string()
    .length(2, 'State must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'State must be uppercase letters')
    .optional(),
  
  zip_code: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789')
    .optional(),
  
  status: z.enum(['active', 'inactive', 'pending'], {
    errorMap: () => ({ message: 'Status must be active, inactive, or pending' })
  }).default('active'),
  
  credit_score: z.number()
    .int('Credit score must be an integer')
    .min(300, 'Credit score must be at least 300')
    .max(850, 'Credit score must be at most 850')
    .optional(),
  
  target_score: z.number()
    .int('Target score must be an integer')
    .min(300, 'Target score must be at least 300')
    .max(850, 'Target score must be at most 850')
    .optional(),
  
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
});

const validateTargetScore = (data: any, ctx: z.RefinementCtx) => {
  if (data?.credit_score && data?.target_score && data.target_score < data.credit_score) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Target score must be greater than or equal to current credit score',
      path: ['target_score'],
    });
  }
};

const clientSchema = clientObjectSchema.superRefine(validateTargetScore);
const updateClientSchema = clientObjectSchema.partial().superRefine(validateTargetScore);

// Query parameter validation
const clientQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n <= 100, 'Limit cannot exceed 100').default('20'),
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'first_name', 'last_name', 'credit_score']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Get all clients for the authenticated user with enhanced filtering and security
export async function getClients(req: AuthRequest, res: Response) {
  try {
    // Validate query parameters
    const queryParams = clientQuerySchema.parse(req.query);
    const { page, limit, search, status, sort_by, sort_order } = queryParams;
    
    // Build secure query with parameterized statements (query clients table)
    let query = `
      SELECT 
        id, user_id, first_name, last_name, email, phone, 
        date_of_birth, address, city, state, zip_code, 
        status, credit_score, target_score, notes, created_at, updated_at,
        created_by, updated_by
      FROM clients 
      WHERE 1=1
    `;
    
    let params: any[] = [];
    
    // Add filters with proper sanitization
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchParam = `%${sanitizedSearch}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    // Add sorting with whitelist validation
    const allowedSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'credit_score'];
    const allowedSortOrders = ['asc', 'desc'];
    
    if (allowedSortColumns.includes(sort_by) && allowedSortOrders.includes(sort_order)) {
      query += ` ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    // Note: LIMIT and OFFSET cannot use parameter placeholders in MySQL
    
    const clients = await allQuery(query, params);
    
    // Get total count for pagination (query users table with role='user')
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = ?';
    let countParams: any[] = ['user'];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchParam = `%${sanitizedSearch}%`;
      countParams.push(searchParam, searchParam, searchParam);
    }
    
    const countResult = await getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    // Log activity
    await logActivity(
      'client_list_viewed',
      `Viewed clients list (page ${page}, ${clients.length} results)`,
      req.user!.id,
      undefined,
      undefined,
      { page, limit, search, status, total },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        clients: clients.map(client => ({
          ...client,
          // Mask sensitive data in list view
          ssn_last_four: client.ssn_last_four ? '****' : null
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1
        },
        filters: {
          search,
          status,
          sort_by,
          sort_order
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching clients:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch clients'
    });
  }
}

// Get a specific client with enhanced security checks
export async function getClient(req: AuthRequest, res: Response) {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }
    
    const client = await getQuery(
      `SELECT 
        id, user_id, first_name, last_name, email, phone, date_of_birth,
        ssn_last_four, address, city, state, zip_code, status, credit_score,
        target_score, notes, platform, platform_email, platform_password,
        created_at, updated_at, created_by, updated_by
       FROM clients 
       WHERE id = ? AND user_id = ?`,
      [clientId, req.user!.id]
    );
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found or access denied'
      });
    }
    
    // Get related disputes count
    const disputesCount = await getQuery(
      'SELECT COUNT(*) as count FROM disputes WHERE client_id = ?',
      [clientId]
    );
    
    // Get recent activities
    const recentActivities = await allQuery(
      `SELECT activity_type, description, created_at 
       FROM activities 
       WHERE client_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [clientId]
    );
    
    // Log activity
    await logActivity(
      'client_viewed',
      `Viewed client details: ${client.first_name} ${client.last_name}`,
      req.user!.id,
      clientId,
      undefined,
      undefined,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        client,
        related_data: {
          disputes_count: disputesCount?.count || 0,
          recent_activities: recentActivities
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch client'
    });
  }
}

// Create a new client with enhanced validation and security
export async function createClient(req: AuthRequest, res: Response) {
  try {
    // Validate and sanitize input data
    const clientData = clientSchema.parse(req.body);
    let baseUserId: number = req.user!.id;
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      const employeeLink = await getQuery(
        'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );
      if (employeeLink?.admin_id) {
        baseUserId = employeeLink.admin_id;
      }
    }
    
    // Check client quota before proceeding
    const quotaValidation = await validateClientQuota(baseUserId);
    
    if (!quotaValidation.canAdd) {
      return res.status(403).json({
        success: false,
        error: 'Client quota exceeded',
        message: quotaValidation.error,
        planLimits: quotaValidation.planLimits
      });
    }
    
    // Check for duplicate email within user's clients
    const existingClient = await getQuery(
      'SELECT id FROM clients WHERE email = ? AND user_id = ?',
      [clientData.email, baseUserId]
    );
    
    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Client with this email already exists'
      });
    }
    
    // Prepare transaction queries
    const queries = [
      {
        sql: `INSERT INTO clients (
          user_id, first_name, last_name, email, phone, date_of_birth,
          employment_status, annual_income, ssn_last_four, address, city, state, zip_code, status,
          credit_score, target_score, notes, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          baseUserId,
          sanitizeInput(clientData.first_name),
          sanitizeInput(clientData.last_name),
          clientData.email,
          clientData.phone || null,
          clientData.date_of_birth || null,
          clientData.employment_status || null,
          clientData.annual_income || null,
          clientData.ssn_last_four || null,
          sanitizeInput(clientData.address) || null,
          sanitizeInput(clientData.city) || null,
          clientData.state || null,
          clientData.zip_code || null,
          clientData.status,
          clientData.credit_score || null,
          clientData.target_score || null,
          sanitizeInput(clientData.notes) || null,
          req.user!.id,
          req.user!.id
        ]
      }
    ];
    
    const results = await runTransaction(queries);
    const clientId = results[0];
    
    // Get the created client
    const newClient = await getQuery(
      'SELECT * FROM clients WHERE id = ?',
      [clientId]
    );
    
    // Log activity and audit
    await Promise.all([
      logActivity(
        'client_created',
        `New client created: ${clientData.first_name} ${clientData.last_name}`,
        baseUserId,
        clientId,
        undefined,
        { email: clientData.email, status: clientData.status },
        req.ip,
        req.get('User-Agent')
      ),
      logAudit(
        'clients',
        clientId,
        'INSERT',
        null,
        newClient,
        req.user!.id,
        req.ip,
        req.get('User-Agent')
      )
    ]);
    
    if (req.user && req.user.email) {
      let adminEmail = req.user.email;
      if (baseUserId !== req.user!.id) {
        const adminRecord = await getQuery('SELECT email FROM users WHERE id = ? LIMIT 1', [baseUserId]);
        if (adminRecord?.email) {
          adminEmail = adminRecord.email;
        }
      }
      const clientName = `${clientData.first_name} ${clientData.last_name}`.trim();
      const createdAt = new Date().toISOString();
      const html = `
        <p>A new client has been added to your account.</p>
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Email:</strong> ${clientData.email}</p>
        <p><strong>Status:</strong> ${clientData.status}</p>
        <p><strong>Created At:</strong> ${createdAt}</p>
      `;
      const text = [
        'A new client has been added to your account.',
        `Client: ${clientName}`,
        `Email: ${clientData.email}`,
        `Status: ${clientData.status}`,
        `Created At: ${createdAt}`
      ].join('\n');
      emailService.sendEmail({
        to: adminEmail,
        subject: `New client added: ${clientName}`,
        html,
        text
      }).catch(error => {
        console.error('Failed to send new client admin email:', error);
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        client: {
          ...newClient,
          // Mask sensitive data in response
          ssn_last_four: newClient.ssn_last_four ? '****' : null
        }
      }
    });
    
  } catch (error) {
    console.error('Error creating client:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create client'
    });
  }
}

// Update a client with enhanced validation and audit trail
export async function updateClient(req: AuthRequest, res: Response) {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }
    
    const updates = updateClientSchema.parse(req.body);
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided'
      });
    }
    
    // Get existing client for audit trail
    const existingClient = await getQuery(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.user!.id]
    );
    
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found or access denied'
      });
    }
    
    // Check for email conflicts if email is being updated
    if (updates.email && updates.email !== existingClient.email) {
      const emailConflict = await getQuery(
        'SELECT id FROM clients WHERE email = ? AND user_id = ? AND id != ?',
        [updates.email, req.user!.id, clientId]
      );
      
      if (emailConflict) {
        return res.status(409).json({
          success: false,
          error: 'Another client with this email already exists'
        });
      }
    }
    
    // Build dynamic update query with sanitization
    const fields = Object.keys(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = updates[field as keyof typeof updates];
      // Sanitize string inputs
      if (typeof value === 'string' && ['first_name', 'last_name', 'address', 'city', 'notes'].includes(field)) {
        return sanitizeInput(value);
      }
      return value;
    });
    
    await runQuery(
      `UPDATE clients SET ${setClause}, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [...values, req.user!.id, clientId, req.user!.id]
    );
    
    // Get updated client
    const updatedClient = await getQuery(
      'SELECT * FROM clients WHERE id = ?',
      [clientId]
    );
    
    // Log activity and audit
    await Promise.all([
      logActivity(
        'client_updated',
        `Client updated: ${updatedClient.first_name} ${updatedClient.last_name}`,
        req.user!.id,
        clientId,
        undefined,
        { updated_fields: fields },
        req.ip,
        req.get('User-Agent')
      ),
      logAudit(
        'clients',
        clientId,
        'UPDATE',
        existingClient,
        updatedClient,
        req.user!.id,
        req.ip,
        req.get('User-Agent')
      )
    ]);
    
    res.json({
      success: true,
      message: 'Client updated successfully',
      data: {
        client: {
          ...updatedClient,
          // Mask sensitive data in response
          ssn_last_four: updatedClient.ssn_last_four ? '****' : null
        }
      }
    });
    
  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update client'
    });
  }
}

// Delete a client with enhanced security and cascade handling
export async function deleteClient(req: AuthRequest, res: Response) {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }
    
    // Get existing client for audit trail
    const existingClient = await getQuery(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.user!.id]
    );
    
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found or access denied'
      });
    }
    
    // Check for related disputes
    const disputesCount = await getQuery(
      'SELECT COUNT(*) as count FROM disputes WHERE client_id = ?',
      [clientId]
    );
    
    // Soft delete if there are related disputes, hard delete otherwise
    if (disputesCount?.count > 0) {
      await runQuery(
        'UPDATE clients SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        ['inactive', req.user!.id, clientId, req.user!.id]
      );
      
      await logActivity(
        'client_deactivated',
        `Client deactivated (has ${disputesCount.count} disputes): ${existingClient.first_name} ${existingClient.last_name}`,
        req.user!.id,
        clientId,
        undefined,
        { reason: 'has_disputes', disputes_count: disputesCount.count },
        req.ip,
        req.get('User-Agent')
      );
      
      return res.json({
        success: true,
        message: 'Client deactivated due to existing disputes',
        data: {
          action: 'deactivated',
          reason: 'Client has associated disputes and was deactivated instead of deleted'
        }
      });
    }
    
    // Hard delete if no related disputes
    await runQuery(
      'DELETE FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.user!.id]
    );
    
    // Log activity and audit
    await Promise.all([
      logActivity(
        'client_deleted',
        `Client deleted: ${existingClient.first_name} ${existingClient.last_name}`,
        req.user!.id,
        clientId,
        undefined,
        undefined,
        req.ip,
        req.get('User-Agent')
      ),
      logAudit(
        'clients',
        clientId,
        'DELETE',
        existingClient,
        null,
        req.user!.id,
        req.ip,
        req.get('User-Agent')
      )
    ]);
    
    res.json({
      success: true,
      message: 'Client deleted successfully',
      data: {
        action: 'deleted'
      }
    });
    
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete client'
    });
  }
}

// Get comprehensive client statistics
export async function getClientStats(req: AuthRequest, res: Response) {
  try {
    // Get basic stats (query clients table)
    const basicStats = await getQuery(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_clients,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_clients,
        AVG(CASE WHEN credit_score IS NOT NULL THEN credit_score END) as avg_credit_score,
        MIN(CASE WHEN credit_score IS NOT NULL THEN credit_score END) as min_credit_score,
        MAX(CASE WHEN credit_score IS NOT NULL THEN credit_score END) as max_credit_score
      FROM clients 
    `, []);
    
    // Get recent clients (last 30 days) from clients table
    const recentStats = await getQuery(`
      SELECT 
        COUNT(*) as recent_clients,
        COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as this_week
      FROM clients 
      WHERE created_at >= date('now', '-30 days')
    `, []);
    
    // Get credit score distribution from clients table
    const scoreDistribution = await allQuery(`
      SELECT 
        CASE 
          WHEN credit_score < 580 THEN 'Poor (300-579)'
          WHEN credit_score < 670 THEN 'Fair (580-669)'
          WHEN credit_score < 740 THEN 'Good (670-739)'
          WHEN credit_score < 800 THEN 'Very Good (740-799)'
          ELSE 'Excellent (800-850)'
        END as score_range,
        COUNT(*) as count
      FROM clients 
      WHERE credit_score IS NOT NULL
      GROUP BY 
        CASE 
          WHEN credit_score < 580 THEN 'Poor (300-579)'
          WHEN credit_score < 670 THEN 'Fair (580-669)'
          WHEN credit_score < 740 THEN 'Good (670-739)'
          WHEN credit_score < 800 THEN 'Very Good (740-799)'
          ELSE 'Excellent (800-850)'
        END
      ORDER BY MIN(credit_score)
    `, []);
    
    // Get monthly growth from clients table
    const monthlyGrowth = await allQuery(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_clients
      FROM clients 
      WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `, []);
    
    // Log activity
    await logActivity(
      'client_stats_viewed',
      'Viewed client statistics dashboard',
      req.user!.id,
      undefined,
      undefined,
      undefined,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        overview: {
          ...basicStats,
          avg_credit_score: basicStats?.avg_credit_score ? Math.round(basicStats.avg_credit_score) : null
        },
        recent: recentStats,
        score_distribution: scoreDistribution,
        monthly_growth: monthlyGrowth.reverse(), // Show oldest to newest
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch client statistics'
    });
  }
}

// Bulk operations for clients
export async function bulkUpdateClients(req: AuthRequest, res: Response) {
  try {
    const { client_ids, updates } = req.body;
    
    // Validate input
    if (!Array.isArray(client_ids) || client_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'client_ids must be a non-empty array'
      });
    }
    
    if (client_ids.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update more than 100 clients at once'
      });
    }
    
    // Validate updates
    const validatedUpdates = updateClientSchema.parse(updates);
    
    if (Object.keys(validatedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided'
      });
    }
    
    // Verify all clients belong to the user
    const placeholders = client_ids.map(() => '?').join(',');
    const ownedClients = await allQuery(
      `SELECT id FROM clients WHERE id IN (${placeholders}) AND user_id = ?`,
      [...client_ids, req.user!.id]
    );
    
    if (ownedClients.length !== client_ids.length) {
      return res.status(403).json({
        success: false,
        error: 'Some clients not found or access denied'
      });
    }
    
    // Build update query
    const fields = Object.keys(validatedUpdates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => validatedUpdates[field as keyof typeof validatedUpdates]);
    
    // Perform bulk update
    await runQuery(
      `UPDATE clients SET ${setClause}, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND user_id = ?`,
      [...values, req.user!.id, ...client_ids, req.user!.id]
    );
    
    // Log activity
    await logActivity(
      'clients_bulk_updated',
      `Bulk updated ${client_ids.length} clients`,
      req.user!.id,
      undefined,
      undefined,
      { client_ids, updated_fields: fields, count: client_ids.length },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      message: `Successfully updated ${client_ids.length} clients`,
      data: {
        updated_count: client_ids.length,
        updated_fields: fields
      }
    });
    
  } catch (error) {
    console.error('Error in bulk update:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to perform bulk update'
    });
  }
}
