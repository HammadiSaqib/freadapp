import { Request, Response } from 'express';
import { z } from 'zod';
import { executeQuery } from '../database/mysqlConfig.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const US_STATE_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];
const STATE_OR_COUNTRY_CODES = [...US_STATE_CODES, 'USA'] as const;

// Validation schemas
const createBankSchema = z.object({
  name: z.string().min(1).max(100),
  logo: z.string().url().optional().or(z.literal('')),
  state: z.enum(STATE_OR_COUNTRY_CODES).optional(),
  states: z.array(z.enum(STATE_OR_COUNTRY_CODES)).min(1).optional(),
  credit_bureaus: z.array(z.enum(['Experian', 'Equifax', 'TransUnion'] as const)).min(1),
  primary_bureau: z.enum(['Experian', 'Equifax', 'TransUnion'] as const).optional(),
  funding_manager_id: z.number().int().positive().optional(),
  is_recommended: z.boolean().optional(),
})
  .refine((data) => !!data.state || !!data.states, { message: 'state or states is required' })
  .refine((data) => (data.credit_bureaus.length > 1 ? !!data.primary_bureau : true), {
    message: 'primary_bureau is required when multiple credit bureaus are selected',
    path: ['primary_bureau'],
  })
  .refine((data) => (!data.primary_bureau ? true : data.credit_bureaus.includes(data.primary_bureau)), {
    message: 'primary_bureau must be one of credit_bureaus',
    path: ['primary_bureau'],
  });

const updateBankSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional().or(z.literal('')),
  state: z.enum(STATE_OR_COUNTRY_CODES).optional(),
  states: z.array(z.enum(STATE_OR_COUNTRY_CODES)).min(1).optional(),
  credit_bureaus: z.array(z.enum(['Experian', 'Equifax', 'TransUnion'] as const)).min(1).optional(),
  primary_bureau: z.enum(['Experian', 'Equifax', 'TransUnion'] as const).optional(),
  is_active: z.boolean().optional(),
  is_recommended: z.boolean().optional(),
}).refine((data) => (!data.primary_bureau || !data.credit_bureaus || data.credit_bureaus.includes(data.primary_bureau)), {
  message: 'primary_bureau must be one of credit_bureaus',
  path: ['primary_bureau'],
});

const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const BANK_OPTIONAL_COLUMNS = ['state', 'credit_bureaus', 'primary_bureau', 'is_recommended'] as const;

async function getExistingColumns(columnNames: readonly string[]): Promise<Set<string>> {
  if (columnNames.length === 0) {
    return new Set<string>();
  }

  const placeholders = columnNames.map(() => '?').join(', ');
  const rows = await executeQuery<Array<{ COLUMN_NAME: string }>>(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'banks'
        AND COLUMN_NAME IN (${placeholders})
    `,
    [...columnNames],
  );

  return new Set((rows || []).map((row) => String(row.COLUMN_NAME)));
}

function selectOptionalColumn(columnName: string, availableColumns: Set<string>): string {
  return availableColumns.has(columnName)
    ? `${columnName} AS ${columnName}`
    : `NULL AS ${columnName}`;
}

// Get all banks with filtering and pagination
export async function getBanks(req: Request, res: Response) {
  try {
    const availableColumns = await getExistingColumns(BANK_OPTIONAL_COLUMNS);
    const { page = 1, limit = 10, search, status } = querySchema.parse(req.query);
    // Sanitize and cap pagination values, then inline into SQL to avoid ER_WRONG_ARGUMENTS
    const pageNum = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
    const limitNum = Math.max(1, Math.min(5000, Number.isFinite(limit) ? Number(limit) : 10));
    const offsetNum = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active');
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM banks ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0]?.total || 0;

    const bankProjection = [
      'id',
      'name',
      'logo',
      selectOptionalColumn('state', availableColumns),
      selectOptionalColumn('credit_bureaus', availableColumns),
      selectOptionalColumn('primary_bureau', availableColumns),
      'is_active',
      selectOptionalColumn('is_recommended', availableColumns),
      'created_at',
      'updated_at',
    ].join(', ');

    // Get banks with pagination
    const query = `
      SELECT ${bankProjection}
      FROM banks 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    
    const banks = await executeQuery(query, params);

    res.json({
      banks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
}

// Get single bank by ID
export async function getBank(req: Request, res: Response) {
  try {
    const availableColumns = await getExistingColumns(BANK_OPTIONAL_COLUMNS);
    const { id } = req.params;

    const bankProjection = [
      'id',
      'name',
      'logo',
      selectOptionalColumn('state', availableColumns),
      selectOptionalColumn('credit_bureaus', availableColumns),
      selectOptionalColumn('primary_bureau', availableColumns),
      'is_active',
      selectOptionalColumn('is_recommended', availableColumns),
      'created_at',
      'updated_at',
    ].join(', ');
    
    const query = `SELECT ${bankProjection} FROM banks WHERE id = ?`;
    const result = await executeQuery(query, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching bank:', error);
    res.status(500).json({ error: 'Failed to fetch bank' });
  }
}

// Create new bank
export async function createBank(req: Request, res: Response) {
  try {
    const validatedData = createBankSchema.parse(req.body);
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Determine funding_manager_id based on the authenticated user
    let fundingManagerId: number | null = null;
    if (user.role === 'funding_manager') {
      fundingManagerId = user.id;
    } else if (user.role === 'admin') {
      // Allow admins to optionally set who this bank belongs to; fallback to admin id
      fundingManagerId = validatedData.funding_manager_id ?? user.id;
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const query = `
      INSERT INTO banks (funding_manager_id, name, logo, state, credit_bureaus, primary_bureau, is_active, is_recommended, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, true, ?, NOW(), NOW())
    `;
    
    const statesArr = Array.isArray(validatedData.states) && validatedData.states.length > 0
      ? validatedData.states
      : (validatedData.state ? [validatedData.state] : []);
    const stateValue = statesArr.length > 1 ? JSON.stringify(statesArr) : (statesArr[0] || null);

    const primaryBureau = validatedData.primary_bureau ?? (validatedData.credit_bureaus.length === 1 ? validatedData.credit_bureaus[0] : null);
    const result = await executeQuery(query, [
      fundingManagerId,
      validatedData.name,
      validatedData.logo || null,
      stateValue,
      JSON.stringify(validatedData.credit_bureaus),
      primaryBureau,
      validatedData.is_recommended ?? false,
    ]);
    
    const bankId = (result as any).insertId;
    
    // Fetch the created bank
    const createdBank = await executeQuery(
      'SELECT id, name, logo, state, credit_bureaus, primary_bureau, is_active, is_recommended, created_at, updated_at FROM banks WHERE id = ?',
      [bankId]
    );
    
    res.status(201).json(createdBank[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error('Error creating bank:', error);
    res.status(500).json({ error: 'Failed to create bank' });
  }
}

// Update bank
export async function updateBank(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = updateBankSchema.parse(req.body);
    
    // Check if bank exists
    const existingBank = await executeQuery('SELECT id FROM banks WHERE id = ?', [id]);
    if (existingBank.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (validatedData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(validatedData.name);
    }
    
    if (validatedData.logo !== undefined) {
      updateFields.push('logo = ?');
      updateValues.push(validatedData.logo || null);
    }
    if (validatedData.states !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(
        validatedData.states.length > 1 ? JSON.stringify(validatedData.states) : (validatedData.states[0] || null)
      );
    } else if (validatedData.state !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(validatedData.state);
    }
    if (validatedData.credit_bureaus !== undefined) {
      updateFields.push('credit_bureaus = ?');
      updateValues.push(JSON.stringify(validatedData.credit_bureaus));
    }
    if (validatedData.primary_bureau !== undefined) {
      updateFields.push('primary_bureau = ?');
      updateValues.push(validatedData.primary_bureau || null);
    }
    
    if (validatedData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(validatedData.is_active);
    }
    if (validatedData.is_recommended !== undefined) {
      updateFields.push('is_recommended = ?');
      updateValues.push(validatedData.is_recommended);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);
    
    const query = `UPDATE banks SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(query, updateValues);
    
    // Fetch updated bank
    const updatedBank = await executeQuery(
      'SELECT id, name, logo, state, credit_bureaus, primary_bureau, is_active, is_recommended, created_at, updated_at FROM banks WHERE id = ?',
      [id]
    );
    
    res.json(updatedBank[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error('Error updating bank:', error);
    res.status(500).json({ error: 'Failed to update bank' });
  }
}

// Delete bank
export async function deleteBank(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if bank exists
    const existingBank = await executeQuery('SELECT id FROM banks WHERE id = ?', [id]);
    if (existingBank.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    await executeQuery('DELETE FROM banks WHERE id = ?', [id]);
    
    res.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank:', error);
    res.status(500).json({ error: 'Failed to delete bank' });
  }
}

// Get bank statistics
export async function getBankStats(req: Request, res: Response) {
  try {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive
      FROM banks
    `);
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching bank stats:', error);
    res.status(500).json({ error: 'Failed to fetch bank statistics' });
  }
}

export async function exportBanksCSV(req: Request, res: Response) {
  try {
    const { page = '1', limit = '100', search, status } = querySchema.parse(req.query);
    const pageNum = Math.max(1, Number.isFinite(Number(page)) ? Number(page) : 1);
    const limitNum = Math.max(1, Math.min(10000, Number.isFinite(Number(limit)) ? Number(limit) : 100));
    const offsetNum = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (search) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    if (status) {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active');
    }

    const query = `
      SELECT id, name, logo, is_active, created_at, updated_at 
      FROM banks 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    const rows = await executeQuery(query, params);
    const header = ['id','name','logo','is_active','created_at','updated_at'];
    const csvRows = [header.join(',')];
    rows.forEach((r: any) => {
      const values = [r.id, r.name || '', r.logo || '', r.is_active ? 'true' : 'false', r.created_at, r.updated_at];
      const line = values.map((v) => {
        const s = String(v ?? '');
        const needsQuote = /[",\n]/.test(s);
        const escaped = s.replace(/"/g, '""');
        return needsQuote ? `"${escaped}"` : escaped;
      }).join(',');
      csvRows.push(line);
    });
    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="banks_export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting banks:', error);
    res.status(500).json({ error: 'Failed to export banks' });
  }
}

export async function importBanksCSV(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    let fundingManagerId: number | null = null;
    if (user.role === 'funding_manager') {
      fundingManagerId = user.id;
    } else if (user.role === 'admin') {
      fundingManagerId = user.id;
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const content = (req as any).file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV has no data' });
    }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);

    let inserted = 0;
    let updated = 0;

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < raw.length; c++) {
        const ch = raw[c];
        if (ch === '"') {
          if (inQuotes && raw[c + 1] === '"') { current += '"'; c++; } else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          cols.push(current); current = '';
        } else { current += ch; }
      }
      cols.push(current);

      const get = (name: string) => {
        const j = idx(name);
        return j >= 0 ? cols[j] : '';
      };

      const idVal = parseInt(get('id'));
      const nameVal = get('name');
      const logoVal = get('logo');
      const activeStr = get('is_active');
      const isActiveVal = String(activeStr).toLowerCase() === 'true';

      if (!nameVal) continue;

      if (Number.isFinite(idVal)) {
        const existing = await executeQuery('SELECT id FROM banks WHERE id = ?', [idVal]);
        if (existing.length > 0) {
          await executeQuery('UPDATE banks SET name = ?, logo = ?, is_active = ?, updated_at = NOW() WHERE id = ?', [nameVal, logoVal || null, isActiveVal, idVal]);
          updated += 1;
          continue;
        }
      }

      const result = await executeQuery('INSERT INTO banks (funding_manager_id, name, logo, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', [fundingManagerId, nameVal, logoVal || null, isActiveVal]);
      if ((result as any).insertId) inserted += 1;
    }

    res.json({ message: 'Import completed', inserted, updated });
  } catch (error) {
    console.error('Error importing banks:', error);
    res.status(500).json({ error: 'Failed to import banks' });
  }
}
