import express, { Request, Response } from 'express';
import multer from 'multer';
import { body, validationResult, query } from 'express-validator';
import { authenticateToken, requireExactRole } from '../middleware/authMiddleware.js';
import { executeQuery } from '../database/mysqlConfig.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();
router.use(authenticateToken, requireExactRole('funding_manager', 'super_admin'));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Valid US state codes (2-letter)
const US_STATE_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

// Also allow 'USA' to represent nationwide coverage
const STATE_OR_COUNTRY_CODES = [...US_STATE_CODES, 'USA'];

const STATE_NAME_TO_CODE: Record<string, string> = {
  'alabama': 'AL','alaska': 'AK','arizona': 'AZ','arkansas': 'AR','california': 'CA','colorado': 'CO','connecticut': 'CT','delaware': 'DE','florida': 'FL','georgia': 'GA','hawaii': 'HI','idaho': 'ID','illinois': 'IL','indiana': 'IN','iowa': 'IA','kansas': 'KS','kentucky': 'KY','louisiana': 'LA','maine': 'ME','maryland': 'MD','massachusetts': 'MA','michigan': 'MI','minnesota': 'MN','mississippi': 'MS','missouri': 'MO','montana': 'MT','nebraska': 'NE','nevada': 'NV','new hampshire': 'NH','new jersey': 'NJ','new mexico': 'NM','new york': 'NY','north carolina': 'NC','north dakota': 'ND','ohio': 'OH','oklahoma': 'OK','oregon': 'OR','pennsylvania': 'PA','rhode island': 'RI','south carolina': 'SC','south dakota': 'SD','tennessee': 'TN','texas': 'TX','utah': 'UT','vermont': 'VT','virginia': 'VA','washington': 'WA','west virginia': 'WV','wisconsin': 'WI','wyoming': 'WY','usa': 'USA'
};

const CARD_OPTIONAL_COLUMNS = ['credit_bureaus', 'state', 'states', 'amount_approved', 'average_amount', 'no_of_usage'] as const;
const BANK_OPTIONAL_COLUMNS = ['is_recommended'] as const;

async function getExistingColumns(tableName: string, columnNames: readonly string[]): Promise<Set<string>> {
  if (columnNames.length === 0) {
    return new Set<string>();
  }

  const placeholders = columnNames.map(() => '?').join(', ');
  const rows = await executeQuery<RowDataPacket[]>(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME IN (${placeholders})
    `,
    [tableName, ...columnNames],
  );

  return new Set(rows.map((row) => String(row.COLUMN_NAME)));
}

function selectOptionalColumn(tableAlias: string, columnName: string, availableColumns: Set<string>): string {
  return availableColumns.has(columnName)
    ? `${tableAlias}.${columnName} AS ${columnName}`
    : `NULL AS ${columnName}`;
}

function selectMetricOrOptionalColumn(
  tableAlias: string,
  columnName: string,
  metricExpression: string,
  availableColumns: Set<string>,
  fallbackExpression = 'NULL',
): string {
  const sourceExpression = availableColumns.has(columnName)
    ? `${tableAlias}.${columnName}`
    : fallbackExpression;

  return `COALESCE(${metricExpression}, ${sourceExpression}) AS ${columnName}`;
}

// Validation schemas
const createCardValidation = [
  body('card_image')
    .optional({ checkFalsy: true, nullable: true })
    .isURL()
    .withMessage('Card image must be a valid URL'),
  body('bank_id').isInt({ min: 1 }).withMessage('Bank ID is required and must be a positive integer'),
  body('card_name').trim().isLength({ min: 1, max: 255 }).withMessage('Card name is required and must be between 1-255 characters'),
  body('card_link').isURL().withMessage('Card link must be a valid URL'),
  body('card_type').isIn(['business', 'personal']).withMessage('Card type must be either business or personal'),
  body('funding_type').trim().isLength({ min: 1, max: 100 }).withMessage('Funding type is required'),
];

const updateCardValidation = [
  body('card_image')
    .optional({ checkFalsy: true, nullable: true })
    .isURL()
    .withMessage('Card image must be a valid URL'),
  body('bank_id').optional().isInt({ min: 1 }).withMessage('Bank ID must be a positive integer'),
  body('card_name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Card name must be between 1-255 characters'),
  body('card_link').optional().isURL().withMessage('Card link must be a valid URL'),
  body('card_type').optional().isIn(['business', 'personal']).withMessage('Card type must be either business or personal'),
  body('funding_type').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Funding type is required'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

// Get all cards with filtering and pagination
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 2000 }).withMessage('Limit must be between 1-2000'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  query('type').optional().isIn(['business', 'personal']).withMessage('Type must be business or personal'),
  query('bank_id').optional().isInt({ min: 1 }).withMessage('Bank ID must be a positive integer'),
  query('recommended').optional().isIn(['true', 'false']).withMessage('Recommended must be true or false'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const [cardColumns, bankColumns] = await Promise.all([
      getExistingColumns('cards', CARD_OPTIONAL_COLUMNS),
      getExistingColumns('banks', BANK_OPTIONAL_COLUMNS),
    ]);

    const rawPage = parseInt(req.query.page as string);
    const rawLimit = parseInt(req.query.limit as string);
    // Sanitize and cap pagination values, then inline into SQL to avoid ER_WRONG_ARGUMENTS
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 2000) : 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const bankId = req.query.bank_id as string;
    const recommended = req.query.recommended as string;

    let whereConditions = [];
    let queryParams: any[] = [];

    if (search) {
      whereConditions.push('(c.card_name LIKE ? OR b.name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereConditions.push('c.is_active = ?');
      queryParams.push(status === 'active');
    }

    if (type) {
      whereConditions.push('c.card_type = ?');
      queryParams.push(type);
    }

    if (bankId) {
      whereConditions.push('c.bank_id = ?');
      queryParams.push(parseInt(bankId));
    }

    if (recommended === 'true') {
      if (bankColumns.has('is_recommended')) {
        whereConditions.push('b.is_recommended = 1');
      } else {
        whereConditions.push('1 = 0');
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const cardsProjection = [
      'c.id',
      'c.card_image',
      'c.bank_id',
      'b.name as bank_name',
      'b.logo as bank_logo',
      'c.card_name',
      'c.card_link',
      'c.card_type',
      'c.funding_type',
      selectOptionalColumn('c', 'credit_bureaus', cardColumns),
      selectOptionalColumn('c', 'state', cardColumns),
      selectOptionalColumn('c', 'states', cardColumns),
      selectOptionalColumn('c', 'amount_approved', cardColumns),
      selectMetricOrOptionalColumn('c', 'average_amount', 'approval_metrics.average_approved_amount', cardColumns),
      selectMetricOrOptionalColumn('c', 'no_of_usage', 'approval_metrics.approved_count', cardColumns, '0'),
      'c.is_active',
      'c.created_at',
      'c.updated_at',
    ].join(',\n        ');

    const approvalMetricsJoin = `
      LEFT JOIN (
        SELECT
          s.card_id,
          COUNT(*) AS approved_count,
          ROUND(AVG(NULLIF(s.amount_approved, 0)), 2) AS average_approved_amount
        FROM client_funding_submissions s
        WHERE s.status = 'approved'
        GROUP BY s.card_id
      ) approval_metrics ON approval_metrics.card_id = c.id
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM cards c 
      LEFT JOIN banks b ON c.bank_id = b.id 
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, queryParams) as RowDataPacket[];
    const total = countResult[0].total;

    // Get cards with bank information
    const cardsQuery = `
      SELECT 
        ${cardsProjection}
      FROM cards c
      LEFT JOIN banks b ON c.bank_id = b.id
      ${approvalMetricsJoin}
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const cards = await executeQuery(cardsQuery, queryParams) as RowDataPacket[];

    res.json({
      cards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get card statistics (must be before /:id route)
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN card_type = 'business' THEN 1 ELSE 0 END) as business,
        SUM(CASE WHEN card_type = 'personal' THEN 1 ELSE 0 END) as personal
      FROM cards
    `;

    const result = await executeQuery(query) as RowDataPacket[];
    const stats = result[0];

    res.json({
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      inactive: parseInt(stats.inactive) || 0,
      business: parseInt(stats.business) || 0,
      personal: parseInt(stats.personal) || 0
    });
  } catch (error) {
    console.error('Error fetching card stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rawSearch = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const bankId = req.query.bank_id as string;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (rawSearch) {
      whereConditions.push('(c.card_name LIKE ? OR b.name LIKE ?)');
      queryParams.push(`%${rawSearch}%`, `%${rawSearch}%`);
    }
    if (status) {
      whereConditions.push('c.is_active = ?');
      queryParams.push(status === 'active');
    }
    if (type) {
      whereConditions.push('c.card_type = ?');
      queryParams.push(type);
    }
    if (bankId) {
      whereConditions.push('c.bank_id = ?');
      queryParams.push(parseInt(bankId));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        c.id,
        c.card_image,
        c.bank_id,
        b.name as bank_name,
        c.card_name,
        c.card_link,
        c.card_type,
        c.funding_type,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM cards c
      LEFT JOIN banks b ON c.bank_id = b.id
      ${whereClause}
      ORDER BY c.created_at DESC
    `;

    const rows = await executeQuery(query, queryParams) as RowDataPacket[];

    const header = [
      'id','bank_id','bank_name','card_name','card_image','card_link','card_type','funding_type','is_active','created_at','updated_at'
    ];
    const csvRows = [header.join(',')];
    rows.forEach((r) => {
      const values = [
        r.id,
        r.bank_id,
        r.bank_name || '',
        r.card_name || '',
        r.card_image || '',
        r.card_link || '',
        r.card_type || '',
        r.funding_type || '',
        r.is_active ? 'true' : 'false',
        r.created_at,
        r.updated_at
      ];
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
    res.setHeader('Content-Disposition', 'attachment; filename="cards_export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/import', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const content = req.file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV has no data' });
    }
    const header = lines[0]
      .split(',')
      .map(h => h.replace(/^[\uFEFF]/, '').trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);

    let inserted = 0;
    let updated = 0;

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      const cols = [] as string[];
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
      const bankIdVal = parseInt(get('bank_id'));
      const cardNameVal = get('card_name');
      const cardLinkVal = get('card_link');
      const cardTypeVal = get('card_type');
      const fundingTypeVal = get('funding_type');
      const bureausStr = '';
      const statesStr = '';
      const stateStr = '';
      const activeStr = get('is_active');
      const bankNameVal = get('bank_name')?.trim();

      let resolvedBankId = bankIdVal;
      if (!resolvedBankId && bankNameVal) {
        const bankByName = await executeQuery('SELECT id FROM banks WHERE LOWER(name) = LOWER(?) AND is_active = true LIMIT 1', [bankNameVal]) as RowDataPacket[];
        if (bankByName.length > 0) {
          resolvedBankId = parseInt(String(bankByName[0].id));
        }
      }

      if (!resolvedBankId || !cardNameVal || !cardLinkVal || !cardTypeVal || !fundingTypeVal) {
        continue;
      }

      const bankCheck = await executeQuery('SELECT id FROM banks WHERE id = ? AND is_active = true', [resolvedBankId]) as RowDataPacket[];
      if (bankCheck.length === 0) {
        continue;
      }

      let bureaus: string[] = [];

      let statesArr: string[] = [];
      const normalizedStates: string[] = [];
      const stateVal: string | null = null;
      const activeNorm = String(activeStr).toLowerCase();
      const isActiveVal = activeNorm === 'true' || activeNorm === '1' || activeNorm === 'active' || activeNorm === 'yes';

      if (Number.isFinite(idVal)) {
        const existing = await executeQuery('SELECT id FROM cards WHERE id = ?', [idVal]) as RowDataPacket[];
        if (existing.length > 0) {
          await executeQuery(
            'UPDATE cards SET card_image = ?, bank_id = ?, card_name = ?, card_link = ?, card_type = ?, funding_type = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
            [null, resolvedBankId, cardNameVal, cardLinkVal, cardTypeVal, fundingTypeVal, isActiveVal, idVal]
          );
          updated += 1;
          continue;
        }
      }

      const result = await executeQuery(
        'INSERT INTO cards (card_image, bank_id, card_name, card_link, card_type, funding_type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [null, resolvedBankId, cardNameVal, cardLinkVal, String(cardTypeVal).toLowerCase() === 'personal' ? 'personal' : 'business', fundingTypeVal, isActiveVal]
      ) as ResultSetHeader;
      if (result.insertId) inserted += 1;
    }

    res.json({ message: 'Import completed', inserted, updated });
  } catch (error) {
    console.error('Error importing cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single card by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    const query = `
      SELECT 
        c.id,
        c.card_image,
        c.bank_id,
        b.name as bank_name,
        c.card_name,
        c.card_link,
        c.card_type,
        c.funding_type,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM cards c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE c.id = ?
    `;

    const result = await executeQuery(query, [cardId]) as RowDataPacket[];

    if (result.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = result[0];
    res.json({ card });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new card
router.post('/', authenticateToken, createCardValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      card_image,
      bank_id,
      card_name,
      card_link,
      card_type,
      funding_type
    } = req.body;

    // Verify bank exists
    const bankCheck = await executeQuery(
      'SELECT id FROM banks WHERE id = ? AND is_active = true',
      [bank_id]
    ) as RowDataPacket[];

    if (bankCheck.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive bank selected' });
    }

    // Check for duplicate card name within the same bank
    const duplicateCheck = await executeQuery(
      'SELECT id FROM cards WHERE bank_id = ? AND card_name = ?',
      [bank_id, card_name]
    ) as RowDataPacket[];

    if (duplicateCheck.length > 0) {
      return res.status(400).json({ error: 'A card with this name already exists for the selected bank' });
    }

    const query = `
      INSERT INTO cards (
        card_image, bank_id, card_name, card_link, card_type, 
        funding_type, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())
    `;

    const result = await executeQuery(query, [
      (card_image && card_image.length > 0) ? card_image : null,
      bank_id,
      card_name,
      card_link,
      card_type,
      funding_type
    ]) as ResultSetHeader;

    res.status(201).json({
      message: 'Card created successfully',
      card: {
        id: result.insertId,
        card_image,
        bank_id,
        card_name,
        card_link,
      card_type,
      funding_type,
      is_active: true
    }
    });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update card
router.put('/:id', authenticateToken, updateCardValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    // Check if card exists
    const existingCard = await executeQuery(
      'SELECT * FROM cards WHERE id = ?',
      [cardId]
    ) as RowDataPacket[];

    if (existingCard.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updateFields = [];
    const updateValues = [];

    // Build dynamic update query
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (['credit_bureaus','states','state'].includes(key)) {
          return;
        }
        updateFields.push(`${key} = ?`);
        updateValues.push(req.body[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // If updating bank_id or card_name, check for duplicates
    if (req.body.bank_id || req.body.card_name) {
      const checkBankId = req.body.bank_id || existingCard[0].bank_id;
      const checkCardName = req.body.card_name || existingCard[0].card_name;

      const duplicateCheck = await executeQuery(
        'SELECT id FROM cards WHERE bank_id = ? AND card_name = ? AND id != ?',
        [checkBankId, checkCardName, cardId]
      ) as RowDataPacket[];

      if (duplicateCheck.length > 0) {
        return res.status(400).json({ error: 'A card with this name already exists for the selected bank' });
      }
    }

    // If updating bank_id, verify bank exists and is active
    if (req.body.bank_id) {
      const bankCheck = await executeQuery(
        'SELECT id FROM banks WHERE id = ? AND is_active = true',
        [req.body.bank_id]
      ) as RowDataPacket[];

      if (bankCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid or inactive bank selected' });
      }
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(cardId);

    const query = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(query, updateValues);

    res.json({ message: 'Card updated successfully' });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete card
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    const result = await executeQuery(
      'DELETE FROM cards WHERE id = ?',
      [cardId]
    ) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
