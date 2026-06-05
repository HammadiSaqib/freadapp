import { Response } from "express";
import { z } from "zod";
import { runQuery, getQuery, allQuery, getDatabaseAdapter } from '../database/databaseAdapter.js';
import { Dispute } from "../database/schema.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

const ACTIVE_EMPLOYEE_STATUS = 'active';

async function resolveDisputeBaseUserId(user: AuthRequest['user']): Promise<number | null> {
  if (!user) return 0;
  if (user.role === 'funding_manager') return null;
  if (user.role === 'admin' || user.role === 'super_admin') return user.id;

  const employeeLink = await getQuery(
    'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
    [user.id, ACTIVE_EMPLOYEE_STATUS]
  );

  if (employeeLink?.admin_id) {
    return Number(employeeLink.admin_id);
  }

  return user.id;
}

function getClientAccessScope(alias: string, baseUserId: number | null) {
  if (baseUserId === null) {
    return { clause: '1 = 1', params: [] as any[] };
  }

  return {
    clause: `(${alias}.user_id = ? OR ${alias}.user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?))`,
    params: [baseUserId, baseUserId, ACTIVE_EMPLOYEE_STATUS],
  };
}

// Validation schemas
const disputeSchema = z.object({
  client_id: z.number().positive("Valid client ID is required"),
  bureau: z.enum(["experian", "equifax", "transunion"], {
    errorMap: () => ({
      message: "Bureau must be experian, equifax, or transunion",
    }),
  }),
  account_name: z.string().min(1, "Account name is required"),
  dispute_reason: z.string().min(1, "Dispute reason is required"),
  status: z
    .enum(["draft", "pending", "investigating", "verified", "deleted", "updated"])
    .default("pending"),
  filed_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }).default(() => new Date().toISOString()),
  response_date: z.string().optional(),
  result: z.string().optional(),
});

const updateDisputeSchema = disputeSchema.partial();

// Get all disputes for the authenticated user
export async function getDisputes(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 50, status, bureau, client_id } = req.query;
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('c', baseUserId);

    let query = `
      SELECT d.*, c.first_name, c.last_name, c.email as client_email
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE ${clientScope.clause}
    `;
    const params: any[] = [...clientScope.params];

    if (status) {
      query += " AND d.status = ?";
      params.push(status);
    }

    if (bureau) {
      query += " AND d.bureau = ?";
      params.push(bureau);
    }

    if (client_id) {
      query += " AND d.client_id = ?";
      params.push(client_id);
    }

    query += " ORDER BY d.created_at DESC";

    if (limit !== "all") {
      const offset = (Number(page) - 1) * Number(limit);
      const limitNum = Number(limit);
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;
      // Note: LIMIT and OFFSET cannot use parameter placeholders in MySQL
    }

    const disputes = await allQuery(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE ${clientScope.clause}
    `;
    const countParams: any[] = [...clientScope.params];

    if (status) {
      countQuery += " AND d.status = ?";
      countParams.push(status);
    }

    if (bureau) {
      countQuery += " AND d.bureau = ?";
      countParams.push(bureau);
    }

    if (client_id) {
      countQuery += " AND d.client_id = ?";
      countParams.push(client_id);
    }

    const countResult = await getQuery(countQuery, countParams) as { total: number };
    const total = countResult.total;

    res.json({
      disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get single dispute
export async function getDispute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('c', baseUserId);

    const dispute = await getQuery(`
      SELECT d.*, c.first_name, c.last_name, c.email as client_email
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ? AND ${clientScope.clause}
    `, [id, ...clientScope.params]);

    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    res.json(dispute);
  } catch (error) {
    console.error("Error fetching dispute:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Create new dispute
export async function createDispute(req: AuthRequest, res: Response) {
  try {
    const validatedData = disputeSchema.parse(req.body);
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('clients', baseUserId);

    // Verify that the client exists and belongs to / is accessible by the authenticated user
    const clientExists = await getQuery(
      `SELECT id FROM clients WHERE id = ? AND ${clientScope.clause}`,
      [validatedData.client_id, ...clientScope.params]
    );

    if (!clientExists) {
      return res
        .status(400)
        .json({ error: "Client not found or access denied" });
    }

    // Detect db type to handle schema differences
    const isMysql = getDatabaseAdapter().getType() === 'mysql';
    
    // Normalize filed_date to YYYY-MM-DD for DATE column
    const filedDateNormalized = validatedData.filed_date
      ? new Date(validatedData.filed_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const responseDateNormalized = validatedData.response_date
      ? new Date(validatedData.response_date).toISOString().split('T')[0]
      : null;

    let result: any;
    if (isMysql) {
      result = await runQuery(`
        INSERT INTO disputes (
          client_id, bureau, account_name, dispute_reason, status, filed_date, response_date, result, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        validatedData.client_id,
        validatedData.bureau,
        validatedData.account_name,
        validatedData.dispute_reason,
        validatedData.status,
        filedDateNormalized,
        responseDateNormalized,
        validatedData.result || null,
        req.user!.id,
        req.user!.id,
      ]);
    } else {
      result = await runQuery(`
        INSERT INTO disputes (
          client_id, bureau, account_name, dispute_reason, status, filed_date, response_date, result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        validatedData.client_id,
        validatedData.bureau,
        validatedData.account_name,
        validatedData.dispute_reason,
        validatedData.status,
        filedDateNormalized,
        responseDateNormalized,
        validatedData.result || null,
      ]);
    }

    // Log activity (non-blocking – don't let this crash dispute creation)
    try {
      await runQuery(`
        INSERT INTO activities (user_id, client_id, type, description)
        VALUES (?, ?, ?, ?)
      `, [
        req.user!.id,
        validatedData.client_id,
        "dispute_filed",
        `Dispute filed for ${validatedData.account_name} with ${validatedData.bureau}`,
      ]);
    } catch (activityErr) {
      console.warn("Could not log activity:", activityErr);
    }

    // Get the created dispute with client info
    const insertId = isMysql ? result.insertId : result.lastInsertRowid;
    const newDispute = await getQuery(`
      SELECT d.*, c.first_name, c.last_name, c.email as client_email
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
    `, [insertId]);

    res.status(201).json(newDispute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating dispute:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Update dispute
export async function updateDispute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = updateDisputeSchema.parse(req.body);
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('c', baseUserId);

    // Check if dispute exists and belongs to user's client
    const exists = await getQuery(`
      SELECT d.id 
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ? AND ${clientScope.clause}
    `, [id, ...clientScope.params]);

    if (!exists) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const updateQuery = `UPDATE disputes SET ${updates.join(", ")} WHERE id = ?`;
    await runQuery(updateQuery, values);

    // Get updated dispute with client info
    const updatedDispute = await getQuery(`
      SELECT d.*, c.first_name, c.last_name, c.email as client_email
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
    `, [id]);

    res.json(updatedDispute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating dispute:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Delete dispute
export async function deleteDispute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('clients', baseUserId);

    const result = await runQuery(`
      DELETE FROM disputes 
      WHERE id = ? AND client_id IN (
        SELECT id FROM clients WHERE ${clientScope.clause}
      )
    `, [id, ...clientScope.params]);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    res.json({ message: "Dispute deleted successfully" });
  } catch (error) {
    console.error("Error deleting dispute:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get dispute statistics
export async function getDisputeStats(req: AuthRequest, res: Response) {
  try {
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('c', baseUserId);
    const stats = {
      total: 0,
      pending: 0,
      investigating: 0,
      verified: 0,
      deleted: 0,
      updated: 0,
      success_rate: 0,
      this_month: 0,
    };

    // Total disputes
    const totalResult = await getQuery(`
      SELECT COUNT(*) as count 
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE ${clientScope.clause}
    `, clientScope.params) as { count: number };
    stats.total = totalResult.count;

    // Status breakdown
    const statusResults = await allQuery(`
      SELECT d.status, COUNT(*) as count
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE ${clientScope.clause}
      GROUP BY d.status
    `, clientScope.params) as {
      status: string;
      count: number;
    }[];

    statusResults.forEach(({ status, count }) => {
      if (status in stats) {
        (stats as any)[status] = count;
      }
    });

    // Success rate (deleted + updated / total)
    const successfulDisputes = stats.deleted + stats.updated;
    stats.success_rate =
      stats.total > 0
        ? Math.round((successfulDisputes / stats.total) * 100)
        : 0;

    // This month's disputes
    const thisMonthResult = await getQuery(`
      SELECT COUNT(*) as count 
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE ${clientScope.clause} AND DATE(d.created_at) >= DATE('now', 'start of month')
    `, clientScope.params) as { count: number };
    stats.this_month = thisMonthResult.count;

    res.json(stats);
  } catch (error) {
    console.error("Error fetching dispute stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Generate AI dispute letter (mock implementation)
export async function generateDisputeLetter(req: AuthRequest, res: Response) {
  try {
    const { dispute_id } = req.params;
    const baseUserId = await resolveDisputeBaseUserId(req.user);
    const clientScope = getClientAccessScope('c', baseUserId);

    // Get dispute details with client info
    const dispute = await getQuery(`
      SELECT d.*, c.first_name, c.last_name, c.address
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ? AND ${clientScope.clause}
    `, [dispute_id, ...clientScope.params]);

    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    // Mock AI-generated dispute letter
    const letter = {
      date: new Date().toLocaleDateString(),
      recipient: `${dispute.bureau.charAt(0).toUpperCase() + dispute.bureau.slice(1)} Credit Bureau`,
      client_name: `${dispute.first_name} ${dispute.last_name}`,
      client_address: dispute.address || "Address on file",
      account_name: dispute.account_name,
      dispute_reason: dispute.dispute_reason,
      content: `Dear Credit Bureau,

I am writing to formally dispute the following item on my credit report:

Account Name: ${dispute.account_name}
Reason for Dispute: ${dispute.dispute_reason}

This item is inaccurate and I request that it be investigated and removed from my credit file in accordance with the Fair Credit Reporting Act.

Please conduct a thorough investigation and provide me with the results of your findings.

Thank you for your prompt attention to this matter.

Sincerely,
${dispute.first_name} ${dispute.last_name}`,
      generated_at: new Date().toISOString(),
    };

    res.json({ letter });
  } catch (error) {
    console.error("Error generating dispute letter:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
