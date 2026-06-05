import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { executeQuery } from '../database/mysqlConfig.js';

const router = Router();
router.use(authenticateToken, requireRole('support', 'super_admin', 'admin'));

const DEFAULT_BODY_BLOCKS = Array.from({ length: 18 }, (_, i) => `BLOCK_${i + 1}`);
const BLOCK_ORDER = [
  'HEADER',
  'INTRO',
  ...DEFAULT_BODY_BLOCKS,
  'OUTRO',
];
const CONTENT_TYPES = ['BASIC', 'STANDARD', 'ENHANCED', 'ELITE', 'UNLIMITED'] as const;

const contentTypeOrderSql = `FIELD(\`type\`, ${CONTENT_TYPES.map((value) => `'${value}'`).join(',')})`;
let ensureSchemaPromise: Promise<void> | null = null;

type BlockScopeSettingRow = {
  bureau: string;
  category: string;
  type: string;
  block: string;
  block_label?: string | null;
  is_deleted?: number | boolean;
};

const normalizeBlockLabel = (value: unknown) => {
  const label = String(value ?? '').trim();
  return label || null;
};

const normalizeBlockKey = (value: unknown) => String(value ?? '').trim().toUpperCase();

const parseNumericBlockValue = (block: unknown) => {
  const match = normalizeBlockKey(block).match(/^BLOCK_(-?\d+)$/);
  return match ? Number(match[1]) : null;
};

const isValidBlock = (block: unknown) => {
  const normalized = normalizeBlockKey(block);
  return normalized === 'HEADER'
    || normalized === 'INTRO'
    || normalized === 'OUTRO'
    || parseNumericBlockValue(normalized) !== null;
};

const compareContentTypes = (left: unknown, right: unknown) => {
  const leftIndex = CONTENT_TYPES.indexOf((normalizeContentType(left) || 'STANDARD') as (typeof CONTENT_TYPES)[number]);
  const rightIndex = CONTENT_TYPES.indexOf((normalizeContentType(right) || 'STANDARD') as (typeof CONTENT_TYPES)[number]);
  return leftIndex - rightIndex;
};

const compareBlocks = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeBlockKey(left);
  const normalizedRight = normalizeBlockKey(right);

  if (normalizedLeft === normalizedRight) return 0;
  if (normalizedLeft === 'HEADER') return -1;
  if (normalizedRight === 'HEADER') return 1;
  if (normalizedLeft === 'INTRO') return -1;
  if (normalizedRight === 'INTRO') return 1;
  if (normalizedLeft === 'OUTRO') return normalizedRight === 'OUTRO' ? 0 : 1;
  if (normalizedRight === 'OUTRO') return -1;

  const leftNumeric = parseNumericBlockValue(normalizedLeft);
  const rightNumeric = parseNumericBlockValue(normalizedRight);

  if (leftNumeric !== null && rightNumeric !== null) {
    return leftNumeric - rightNumeric;
  }
  if (leftNumeric !== null) return -1;
  if (rightNumeric !== null) return 1;

  return normalizedLeft.localeCompare(normalizedRight);
};

const normalizeContentType = (value: unknown, fallback = 'STANDARD') => {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  return CONTENT_TYPES.includes(normalized as (typeof CONTENT_TYPES)[number])
    ? normalized
    : null;
};

const getBlockScopeKey = (bureau: unknown, category: unknown, type: unknown, block: unknown) =>
  `${String(bureau || '').toUpperCase()}:${String(category || '')}:${String(type || '').toUpperCase()}:${normalizeBlockKey(block)}`;

const upsertBlockScopeSetting = async (params: {
  bureau: string;
  category: string;
  type: string;
  block: string;
  blockLabel?: string | null;
  isDeleted: boolean;
}) => {
  await executeQuery(
    `INSERT INTO dispute_letter_block_scope_settings (bureau, category, \`type\`, block, block_label, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       block_label = COALESCE(VALUES(block_label), block_label),
       is_deleted = VALUES(is_deleted),
       updated_at = CURRENT_TIMESTAMP`,
    [
      String(params.bureau).toUpperCase(),
      String(params.category),
      String(params.type).toUpperCase(),
      normalizeBlockKey(params.block),
      normalizeBlockLabel(params.blockLabel),
      params.isDeleted ? 1 : 0,
    ],
  );
};

const ensureDisputeLetterContentSchema = async () => {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      try {
        const rows = await executeQuery<any[]>('SHOW COLUMNS FROM dispute_letter_content');
        const columns = new Map(
          rows.map((row: any) => [String(row.Field || '').toLowerCase(), String(row.Type || '').toLowerCase()]),
        );

        if (!columns.has('block_label')) {
          await executeQuery(
            'ALTER TABLE dispute_letter_content ADD COLUMN block_label VARCHAR(255) NULL AFTER block',
          );
        }

        if (!columns.has('type')) {
          await executeQuery(
            "ALTER TABLE dispute_letter_content ADD COLUMN `type` VARCHAR(32) NOT NULL DEFAULT 'STANDARD' AFTER category",
          );
        }

        await executeQuery(
          `CREATE TABLE IF NOT EXISTS dispute_letter_block_scope_settings (
             id INT NOT NULL AUTO_INCREMENT,
             bureau VARCHAR(32) NOT NULL,
             category VARCHAR(255) NOT NULL,
             \`type\` VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
             block VARCHAR(32) NOT NULL,
             block_label VARCHAR(255) NULL,
             is_deleted TINYINT(1) NOT NULL DEFAULT 0,
             created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
             updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
             PRIMARY KEY (id),
             UNIQUE KEY uq_dispute_letter_block_scope (bureau, category, \`type\`, block)
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        );

        await executeQuery(
          "UPDATE dispute_letter_content SET `type` = 'STANDARD' WHERE `type` IS NULL OR TRIM(`type`) = ''",
        );

        const clauseContentType = columns.get('clause_content') || '';
        if (clauseContentType && clauseContentType !== 'longtext') {
          await executeQuery(
            'ALTER TABLE dispute_letter_content MODIFY COLUMN clause_content LONGTEXT NOT NULL',
          );
        }
      } catch (error: any) {
        ensureSchemaPromise = null;
        throw error;
      }
    })();
  }

  await ensureSchemaPromise;
};

// GET /categories – list category names from support_letter_categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const rows = await executeQuery<any[]>(
      'SELECT DISTINCT name FROM support_letter_categories ORDER BY name ASC'
    );
    res.json({ success: true, data: rows.map((r: any) => r.name) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET / – list entries with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const { bureau, round, category, type, block } = req.query;
    let sql = 'SELECT * FROM dispute_letter_content WHERE 1=1';
    const params: any[] = [];

    if (bureau) {
      sql += ' AND bureau = ?';
      params.push(String(bureau));
    }
    if (round) {
      sql += ' AND round = ?';
      params.push(Number(round));
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(String(category));
    }
    if (type) {
      const normalizedType = normalizeContentType(type);
      if (!normalizedType) {
        return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
      }
      sql += ' AND `type` = ?';
      params.push(normalizedType);
    }
    if (block) {
      sql += ' AND block = ?';
      params.push(normalizeBlockKey(block));
    }

    sql += ` ORDER BY bureau, round, category, ${contentTypeOrderSql}, id`;
    const rows = await executeQuery<any[]>(sql, params);
    rows.sort((left, right) => {
      const bureauCompare = String(left.bureau || '').localeCompare(String(right.bureau || ''));
      if (bureauCompare !== 0) return bureauCompare;
      const roundCompare = Number(left.round || 0) - Number(right.round || 0);
      if (roundCompare !== 0) return roundCompare;
      const categoryCompare = String(left.category || '').localeCompare(String(right.category || ''));
      if (categoryCompare !== 0) return categoryCompare;
      const typeCompare = compareContentTypes(left.type, right.type);
      if (typeCompare !== 0) return typeCompare;
      const blockCompare = compareBlocks(left.block, right.block);
      if (blockCompare !== 0) return blockCompare;
      return Number(left.id || 0) - Number(right.id || 0);
    });
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /summary – compact list for tree navigator
router.get('/summary', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const { bureau, type } = req.query;
    let sql =
      `SELECT bureau, round, category, \`type\`, block, MAX(NULLIF(block_label, '')) as block_label, COUNT(*) as variant_count
       FROM dispute_letter_content`;
    const params: any[] = [];
    const where: string[] = [];

    if (bureau) {
      where.push('bureau = ?');
      params.push(String(bureau).toUpperCase());
    }
    if (type) {
      const normalizedType = normalizeContentType(type);
      if (!normalizedType) {
        return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
      }
      where.push('`type` = ?');
      params.push(normalizedType);
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    sql += `
       GROUP BY bureau, round, category, \`type\`, block
     ORDER BY bureau, round, category, ${contentTypeOrderSql}`;

    const rows = await executeQuery<any[]>(sql, params);

    let settingsSql = 'SELECT bureau, category, \`type\`, block, block_label, is_deleted FROM dispute_letter_block_scope_settings';
    const settingsParams = [...params];
    if (where.length > 0) {
      settingsSql += ` WHERE ${where.join(' AND ')}`;
    }
    const settingsRows = await executeQuery<BlockScopeSettingRow[]>(settingsSql, settingsParams);
    const settingsByKey = new Map(
      settingsRows.map((row) => [getBlockScopeKey(row.bureau, row.category, row.type, row.block), row] as const),
    );

    const mergedRows = rows.map((row) => {
      const key = getBlockScopeKey(row.bureau, row.category, row.type, row.block);
      const setting = settingsByKey.get(key);
      if (setting) settingsByKey.delete(key);
      return {
        ...row,
        block_label: normalizeBlockLabel(setting?.block_label) || normalizeBlockLabel(row.block_label),
        is_deleted: Boolean(Number(setting?.is_deleted || 0)),
      };
    });

    for (const setting of settingsByKey.values()) {
      if (Boolean(Number(setting.is_deleted || 0))) {
        continue;
      }

      mergedRows.push({
        bureau: String(setting.bureau).toUpperCase(),
        round: 0,
        category: String(setting.category),
        type: normalizeContentType(setting.type) || 'STANDARD',
        block: normalizeBlockKey(setting.block),
        block_label: normalizeBlockLabel(setting.block_label),
        variant_count: 0,
        is_deleted: Boolean(Number(setting.is_deleted || 0)),
      });
    }

    mergedRows.sort((left, right) => {
      const bureauCompare = String(left.bureau || '').localeCompare(String(right.bureau || ''));
      if (bureauCompare !== 0) return bureauCompare;
      const categoryCompare = String(left.category || '').localeCompare(String(right.category || ''));
      if (categoryCompare !== 0) return categoryCompare;
      const typeCompare = compareContentTypes(left.type, right.type);
      if (typeCompare !== 0) return typeCompare;
      const blockCompare = compareBlocks(left.block, right.block);
      if (blockCompare !== 0) return blockCompare;
      return Number(left.round || 0) - Number(right.round || 0);
    });

    res.json({ success: true, data: mergedRows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /block-label – rename a block label
router.put('/block-label', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const { bureau, round, category, type, block, block_label } = req.body;
    if (!bureau || round == null || !category || !type || !block) {
      return res.status(400).json({
        success: false,
        error: 'bureau, round, category, type, and block are required',
      });
    }
    const normalizedBlock = normalizeBlockKey(block);
    if (!isValidBlock(normalizedBlock)) {
      return res.status(400).json({ success: false, error: `Invalid block: ${block}` });
    }
    const normalizedType = normalizeContentType(type);
    if (!normalizedType) {
      return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
    }

    const normalizedLabel = normalizeBlockLabel(block_label);
    const result: any = await executeQuery(
      `UPDATE dispute_letter_content
       SET block_label = ?
       WHERE bureau = ? AND round = ? AND category = ? AND \`type\` = ? AND block = ?`,
      [normalizedLabel, String(bureau).toUpperCase(), Number(round), String(category), normalizedType, normalizedBlock],
    );

    if (Number(result?.affectedRows || 0) === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching block found for that bureau, round, category, type, and block',
      });
    }

    res.json({ success: true, data: { block_label: normalizedLabel, updated: Number(result?.affectedRows || 0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /block-scope – rename across all rounds
router.put('/block-scope', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const { bureau, category, type, block, block_label } = req.body;
    if (!bureau || !category || !type || !block) {
      return res.status(400).json({
        success: false,
        error: 'bureau, category, type, and block are required',
      });
    }
    const normalizedBlock = normalizeBlockKey(block);
    if (!isValidBlock(normalizedBlock)) {
      return res.status(400).json({ success: false, error: `Invalid block: ${block}` });
    }
    const normalizedType = normalizeContentType(type);
    if (!normalizedType) {
      return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
    }

    const normalizedLabel = normalizeBlockLabel(block_label);
    const result: any = await executeQuery(
      `UPDATE dispute_letter_content
       SET block_label = ?
       WHERE bureau = ? AND category = ? AND \`type\` = ? AND block = ?`,
      [normalizedLabel, String(bureau).toUpperCase(), String(category), normalizedType, normalizedBlock],
    );

    await upsertBlockScopeSetting({
      bureau: String(bureau).toUpperCase(),
      category: String(category),
      type: normalizedType,
      block: normalizedBlock,
      blockLabel: normalizedLabel,
      isDeleted: false,
    });

    res.json({ success: true, data: { block_label: normalizedLabel, updated: Number(result?.affectedRows || 0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /block-scope – delete across rounds
router.delete('/block-scope', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const { bureau, category, type, block } = req.body || {};
    if (!bureau || !category || !type || !block) {
      return res.status(400).json({
        success: false,
        error: 'bureau, category, type, and block are required',
      });
    }
    const normalizedBlock = normalizeBlockKey(block);
    if (!isValidBlock(normalizedBlock)) {
      return res.status(400).json({ success: false, error: `Invalid block: ${block}` });
    }
    const normalizedType = normalizeContentType(type);
    if (!normalizedType) {
      return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
    }

    const result: any = await executeQuery(
      `DELETE FROM dispute_letter_content
       WHERE bureau = ? AND category = ? AND \`type\` = ? AND block = ?`,
      [String(bureau).toUpperCase(), String(category), normalizedType, normalizedBlock],
    );

    await executeQuery(
      `DELETE FROM dispute_letter_block_scope_settings
       WHERE bureau = ? AND category = ? AND \`type\` = ? AND block = ?`,
      [String(bureau).toUpperCase(), String(category), normalizedType, normalizedBlock],
    );

    res.json({ success: true, data: { deleted: Number(result?.affectedRows || 0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:id – single entry
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const rows = await executeQuery<any[]>(
      'SELECT * FROM dispute_letter_content WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST / – create a new entry
router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const { clause_content, bureau, round, category, type, block, block_label } = req.body;
    const normalizedBureau = String(bureau || 'ALL').toUpperCase();
    const normalizedType = normalizeContentType(type || 'STANDARD');
    const normalizedBlock = normalizeBlockKey(block);
    if (!clause_content || round == null || !category || !block) {
      return res.status(400).json({
        success: false,
        error: 'clause_content, round, category, and block are required',
      });
    }
    if (!normalizedType) {
      return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
    }
    if (!isValidBlock(normalizedBlock)) {
      return res.status(400).json({ success: false, error: `Invalid block: ${block}` });
    }

    let normalizedLabel = normalizeBlockLabel(block_label);
    if (!normalizedLabel) {
      const existingRows = await executeQuery<any[]>(
        `SELECT MAX(NULLIF(block_label, '')) AS block_label
         FROM dispute_letter_content
         WHERE bureau = ? AND round = ? AND category = ? AND \`type\` = ? AND block = ?`,
        [normalizedBureau, Number(round), String(category), normalizedType, normalizedBlock],
      );
      normalizedLabel = normalizeBlockLabel(existingRows[0]?.block_label);
    }

    if (!normalizedLabel) {
      const settingsRows = await executeQuery<BlockScopeSettingRow[]>(
        `SELECT block_label
         FROM dispute_letter_block_scope_settings
         WHERE bureau = ? AND category = ? AND \`type\` = ? AND block = ?
         LIMIT 1`,
        [normalizedBureau, String(category), normalizedType, normalizedBlock],
      );
      normalizedLabel = normalizeBlockLabel(settingsRows[0]?.block_label);
    }

    const result = await executeQuery<any>(
      `INSERT INTO dispute_letter_content (clause_content, bureau, round, category, \`type\`, block, block_label)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clause_content, normalizedBureau, Number(round), String(category), normalizedType, normalizedBlock, normalizedLabel]
    );

    await upsertBlockScopeSetting({
      bureau: normalizedBureau,
      category: String(category),
      type: normalizedType,
      block: normalizedBlock,
      blockLabel: normalizedLabel,
      isDeleted: false,
    });

    const insertId = result.insertId;
    res.json({ success: true, data: { id: insertId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /:id – update an entry
router.put('/:id', async (req: Request, res: Response) => {
  try {
    await ensureDisputeLetterContentSchema();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    const { clause_content, bureau, round, category, type, block, block_label } = req.body;
    const sets: string[] = [];
    const params: any[] = [];

    if (clause_content !== undefined) {
      sets.push('clause_content = ?');
      params.push(clause_content);
    }
    if (bureau !== undefined) {
      sets.push('bureau = ?');
      params.push(String(bureau).toUpperCase());
    }
    if (round !== undefined) {
      sets.push('round = ?');
      params.push(Number(round));
    }
    if (category !== undefined) {
      sets.push('category = ?');
      params.push(String(category));
    }
    if (type !== undefined) {
      const normalizedType = normalizeContentType(type);
      if (!normalizedType) {
        return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
      }
      sets.push('`type` = ?');
      params.push(normalizedType);
    }
    if (block !== undefined) {
      const normalizedBlock = normalizeBlockKey(block);
      if (!isValidBlock(normalizedBlock)) {
        return res.status(400).json({ success: false, error: `Invalid block: ${block}` });
      }
      sets.push('block = ?');
      params.push(normalizedBlock);
    }
    if (block_label !== undefined) {
      sets.push('block_label = ?');
      params.push(normalizeBlockLabel(block_label));
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    await executeQuery(
      `UPDATE dispute_letter_content SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    const updatedRows = await executeQuery<any[]>(
      'SELECT bureau, category, \`type\`, block, block_label FROM dispute_letter_content WHERE id = ?',
      [id],
    );
    const updatedEntry = updatedRows[0];
    if (updatedEntry) {
      await upsertBlockScopeSetting({
        bureau: String(updatedEntry.bureau).toUpperCase(),
        category: String(updatedEntry.category),
        type: String(updatedEntry.type),
        block: String(updatedEntry.block),
        blockLabel: normalizeBlockLabel(updatedEntry.block_label),
        isDeleted: false,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /:id – delete an entry
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    await executeQuery('DELETE FROM dispute_letter_content WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
