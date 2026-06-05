import { Router, Response } from 'express';
import { AuthRequest } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { allQuery, getDatabaseAdapter, getQuery, runQuery } from '../database/databaseAdapter.js';
import fs from 'fs';

const router = Router();

const PRINTING_STATUS_OPTIONS = [
  'Action Required',
  'Fail Review',
  'Processing',
  'Invoiced',
  'Awaiting Payment',
  'Printed',
  'Mailed',
  'Regenerates Letters',
] as const;

type PrintingStatus = (typeof PRINTING_STATUS_OPTIONS)[number];

const LEGACY_PRINTING_STATUS_MAP: Record<string, PrintingStatus> = {
  'Printed Awaiting Payment': 'Awaiting Payment',
  'PRINTED and MAILED': 'Mailed',
  'PROCESSING CURRENTLY PAUSED': 'Regenerates Letters',
};

function normalizePrintingStatus(status: unknown): PrintingStatus | null {
  const value = typeof status === 'string' ? status.trim() : '';

  if (!value) {
    return 'Action Required';
  }

  if ((PRINTING_STATUS_OPTIONS as readonly string[]).includes(value)) {
    return value as PrintingStatus;
  }

  return LEGACY_PRINTING_STATUS_MAP[value] || null;
}

/**
 * Middleware: ensure the authenticated user has the printing_team role.
 */
function requirePrintingTeam(req: AuthRequest, res: Response, next: () => void) {
  const role = (req as any).user?.role;
  if (role !== 'printing_team') {
    return res.status(403).json({ error: 'Access denied. Printing team role required.' });
  }
  next();
}

let disputeLetterZipSentToPrintingColumnPromise: Promise<boolean> | null = null;
let disputeLetterZipSenderColumnsPromise: Promise<boolean> | null = null;

async function hasDisputeLetterZipSentToPrintingColumn(): Promise<boolean> {
  if (!disputeLetterZipSentToPrintingColumnPromise) {
    disputeLetterZipSentToPrintingColumnPromise = allQuery(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'dispute_letter_zips'
         AND COLUMN_NAME = 'sent_to_printing_at'`
    )
      .then((columns) => {
        const hasColumn = Array.isArray(columns) && columns.length > 0;
        if (!hasColumn) {
          disputeLetterZipSentToPrintingColumnPromise = null;
        }
        return hasColumn;
      })
      .catch((error) => {
        disputeLetterZipSentToPrintingColumnPromise = null;
        console.warn('Failed to detect dispute_letter_zips.sent_to_printing_at column:', error);
        return false;
      });
  }

  return disputeLetterZipSentToPrintingColumnPromise;
}

async function hasDisputeLetterZipSenderColumns(): Promise<boolean> {
  if (!disputeLetterZipSenderColumnsPromise) {
    disputeLetterZipSenderColumnsPromise = allQuery(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'dispute_letter_zips'
         AND COLUMN_NAME IN ('sender_name', 'sender_email', 'sender_phone')`
    )
      .then((columns) => {
        const hasColumns = Array.isArray(columns) && columns.length === 3;
        if (!hasColumns) {
          disputeLetterZipSenderColumnsPromise = null;
        }
        return hasColumns;
      })
      .catch((error) => {
        disputeLetterZipSenderColumnsPromise = null;
        console.warn('Failed to detect sender columns on dispute_letter_zips:', error);
        return false;
      });
  }

  return disputeLetterZipSenderColumnsPromise;
}

async function ensureDisputeLetterZipSenderColumns(): Promise<boolean> {
  if (await hasDisputeLetterZipSenderColumns()) {
    return true;
  }

  const senderColumns = [
    `ALTER TABLE dispute_letter_zips ADD COLUMN sender_name VARCHAR(255) NULL`,
    `ALTER TABLE dispute_letter_zips ADD COLUMN sender_email VARCHAR(255) NULL`,
    `ALTER TABLE dispute_letter_zips ADD COLUMN sender_phone VARCHAR(50) NULL`,
  ];

  for (const statement of senderColumns) {
    try {
      await runQuery(statement, []);
    } catch (error: any) {
      if (!/duplicate column name|already exists/i.test(String(error?.message || ''))) {
        console.warn('Failed to ensure sender column on dispute_letter_zips:', error);
        return false;
      }
    }
  }

  disputeLetterZipSenderColumnsPromise = null;
  return hasDisputeLetterZipSenderColumns();
}

function buildDisputeLetterSearchClause(search: string, includeSentFilter: boolean, includeSenderFields: boolean) {
  const normalizedSearch = search.trim();
  const completedWhereClause = includeSentFilter
    ? `WHERE z.status = 'completed' AND z.sent_to_printing_at IS NOT NULL`
    : `WHERE z.status = 'completed'`;

  if (!normalizedSearch) {
    return {
      whereClause: completedWhereClause,
      params: [] as string[],
    };
  }

  const adapter = getDatabaseAdapter();
  const isSqlite = adapter.getType() === 'sqlite';
  const clientFullNameExpression = isSqlite
    ? `TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))`
    : `TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')))`;
  const adminDbFullNameExpression = isSqlite
    ? `TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))`
    : `TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))`;
  const adminFullNameExpression = includeSenderFields
    ? `COALESCE(NULLIF(TRIM(COALESCE(z.sender_name, '')), ''), ${adminDbFullNameExpression})`
    : adminDbFullNameExpression;
  const adminEmailExpression = includeSenderFields
    ? `COALESCE(NULLIF(TRIM(COALESCE(z.sender_email, '')), ''), COALESCE(u.email, ''))`
    : `COALESCE(u.email, '')`;
  const adminPhoneExpression = includeSenderFields
    ? `COALESCE(NULLIF(TRIM(COALESCE(z.sender_phone, '')), ''), COALESCE(u.phone, ''))`
    : `COALESCE(u.phone, '')`;
  const likeValue = `%${normalizedSearch}%`;

  return {
    whereClause: `
      ${completedWhereClause}
        AND (
          COALESCE(c.email, '') LIKE ?
          OR ${clientFullNameExpression} LIKE ?
          OR COALESCE(c.first_name, '') LIKE ?
          OR COALESCE(c.last_name, '') LIKE ?
          OR ${adminFullNameExpression} LIKE ?
          OR ${adminEmailExpression} LIKE ?
          OR ${adminPhoneExpression} LIKE ?
          OR COALESCE(z.file_name, '') LIKE ?
        )
    `,
    params: [
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
    ],
  };
}

/**
 * GET /api/printing-team/dispute-letters
 *
 * Returns all lifetime completed dispute-letter ZIP records that were actually
 * sent for printing, along with client & admin info.
 *
 * Query params:
 *   page   – 1-based page number (default 1)
 *   limit  – rows per page (default 20)
 *   search – free-text search across client/admin fields + zip file
 */
router.get('/dispute-letters', authenticateToken, requirePrintingTeam, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'newest';
    const includeSentFilter = await hasDisputeLetterZipSentToPrintingColumn();
    const includeSenderFields = await ensureDisputeLetterZipSenderColumns();
    const { whereClause, params } = buildDisputeLetterSearchClause(search, includeSentFilter, includeSenderFields);

    let orderByClause: string;
    switch (sort) {
      case 'oldest':
        orderByClause = 'ORDER BY z.created_at ASC';
        break;
      case 'largest':
        orderByClause = 'ORDER BY z.letter_count DESC, z.created_at DESC';
        break;
      default:
        orderByClause = 'ORDER BY z.created_at DESC';
        break;
    }

    const countRow = await getQuery(
      `SELECT COUNT(*) AS total
       FROM dispute_letter_zips z
       LEFT JOIN clients c ON c.id = z.client_id
       LEFT JOIN users u ON u.id = z.user_id
       ${whereClause}`,
      params,
    );
    const total = (countRow as any)?.total ?? 0;

    const rows = await allQuery(
      `SELECT
          z.id,
          z.file_name,
          z.file_path,
          z.letter_count,
          z.print_status,
          z.print_note,
          ${includeSentFilter ? 'z.sent_to_printing_at,' : 'NULL AS sent_to_printing_at,'}
          z.created_at,
          c.first_name AS client_first_name,
          c.last_name  AS client_last_name,
          c.email      AS client_email,
          ${includeSenderFields
            ? `CASE
                 WHEN NULLIF(TRIM(COALESCE(z.sender_name, '')), '') IS NOT NULL THEN TRIM(COALESCE(z.sender_name, ''))
                 ELSE u.first_name
               END AS admin_first_name,
               CASE
                 WHEN NULLIF(TRIM(COALESCE(z.sender_name, '')), '') IS NOT NULL THEN NULL
                 ELSE u.last_name
               END AS admin_last_name,
               COALESCE(NULLIF(TRIM(COALESCE(z.sender_email, '')), ''), u.email) AS admin_email,
               COALESCE(NULLIF(TRIM(COALESCE(z.sender_phone, '')), ''), u.phone) AS admin_phone`
            : `u.first_name AS admin_first_name,
               u.last_name  AS admin_last_name,
               u.email      AS admin_email,
               u.phone      AS admin_phone`}
       FROM dispute_letter_zips z
       LEFT JOIN clients c ON c.id = z.client_id
       LEFT JOIN users u ON u.id = z.user_id
       ${whereClause}
       ${orderByClause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        search,
      },
    });
  } catch (error) {
    console.error('printing-team dispute-letters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/printing-team/dispute-letters/:id/status
 *
 * Update the print_status of a specific dispute letter zip.
 * Body: { print_status: string }
 */
router.patch('/dispute-letters/:id/status', authenticateToken, requirePrintingTeam, async (req: AuthRequest, res: Response) => {
  try {
    const zipId = parseInt(req.params.id, 10);
    if (!zipId || isNaN(zipId)) {
      return res.status(400).json({ error: 'Invalid zip ID' });
    }

    const normalizedStatus = normalizePrintingStatus(req.body?.print_status);
    if (!normalizedStatus) {
      return res.status(400).json({
        error: 'Invalid status. Allowed values: ' + PRINTING_STATUS_OPTIONS.join(', '),
      });
    }

    await runQuery(
      `UPDATE dispute_letter_zips SET print_status = ? WHERE id = ?`,
      [normalizedStatus, zipId],
    );

    res.json({ success: true, message: 'Status updated', print_status: normalizedStatus });
  } catch (error) {
    console.error('printing-team update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/printing-team/dispute-letters/:id/note
 *
 * Update the internal note attached to a specific dispute letter zip row.
 * Body: { print_note: string | null }
 */
router.patch('/dispute-letters/:id/note', authenticateToken, requirePrintingTeam, async (req: AuthRequest, res: Response) => {
  try {
    const zipId = parseInt(req.params.id, 10);
    if (!zipId || isNaN(zipId)) {
      return res.status(400).json({ error: 'Invalid zip ID' });
    }

    const rawNote = req.body?.print_note;
    if (rawNote !== null && rawNote !== undefined && typeof rawNote !== 'string') {
      return res.status(400).json({ error: 'print_note must be a string or null' });
    }

    const normalizedNote = typeof rawNote === 'string' ? rawNote.trim() : '';
    if (normalizedNote.length > 2000) {
      return res.status(400).json({ error: 'Notes must be 2000 characters or less' });
    }

    await runQuery(
      `UPDATE dispute_letter_zips SET print_note = ? WHERE id = ?`,
      [normalizedNote || null, zipId],
    );

    res.json({ success: true, message: 'Note updated', print_note: normalizedNote || null });
  } catch (error) {
    console.error('printing-team update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/printing-team/dispute-letters/:id/download
 *
 * Download a specific dispute letter zip. When markProcessing is not false,
 * the download also updates "Action Required" rows to "Processing".
 */
router.get('/dispute-letters/:id/download', authenticateToken, requirePrintingTeam, async (req: AuthRequest, res: Response) => {
  try {
    const zipId = parseInt(req.params.id, 10);
    if (!zipId || isNaN(zipId)) {
      return res.status(400).json({ error: 'Invalid zip ID' });
    }

    const zipRecord = await getQuery(
      `SELECT * FROM dispute_letter_zips WHERE id = ?`,
      [zipId],
    );

    if (!zipRecord) {
      return res.status(404).json({ error: 'ZIP record not found' });
    }

    const filePath = (zipRecord as any).file_path;
    const fileName = (zipRecord as any).file_name;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ZIP file not found on disk' });
    }

    const shouldMarkProcessing = String(req.query.markProcessing || 'true').toLowerCase() !== 'false';
    const currentPrintStatus = normalizePrintingStatus((zipRecord as any).print_status) || 'Action Required';

    if (shouldMarkProcessing && currentPrintStatus === 'Action Required') {
      await runQuery(
        `UPDATE dispute_letter_zips SET print_status = 'Processing' WHERE id = ?`,
        [zipId],
      );
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName || `dispute_letters_${zipId}.zip`}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('printing-team download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
