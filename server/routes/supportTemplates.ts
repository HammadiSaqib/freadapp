import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { executeQuery } from '../database/mysqlConfig.js';

const router = Router();

router.use(authenticateToken, requireRole('support', 'super_admin', 'admin'));

const parseJson = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// GET /categories – list support letter categories
router.get('/categories', async (req, res) => {
  try {
    // Ensure at least one category exists
    await executeQuery(
      'INSERT IGNORE INTO support_letter_categories (name) VALUES (?)',
      ['Late Payments']
    );

    const categories = await executeQuery(
      'SELECT id, name, description FROM support_letter_categories ORDER BY name ASC'
    );
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching support letter categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /categories – create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result: any = await executeQuery(
      'INSERT INTO support_letter_categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    res.json({ success: true, data: { id: result.insertId, name, description } });
  } catch (error: any) {
    console.error('Error creating support letter category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Category already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// PUT /categories/:id – update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await executeQuery(
      'UPDATE support_letter_categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    res.json({ success: true, data: { id: Number(id), name, description } });
  } catch (error) {
    console.error('Error updating support letter category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// DELETE /categories/:id – delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check for templates using this category
    const templates = await executeQuery(
      'SELECT COUNT(*) as count FROM support_letter_templates WHERE category_id = ?',
      [id]
    );

    if ((templates as any[])[0].count > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete category with existing templates' });
    }

    await executeQuery('DELETE FROM support_letter_categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting support letter category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// GET / – list support letter templates with filters
router.get('/', async (req, res) => {
  try {
    const { category_id, bureau, round, goal, tone, status, search, template_type } =
      req.query as Record<string, string>;
    const where: string[] = [];
    const params: any[] = [];

    if (category_id) { where.push('t.category_id = ?'); params.push(Number(category_id)); }
    if (bureau) { where.push('t.bureau = ?'); params.push(bureau); }
    if (round) { where.push('t.round = ?'); params.push(Number(round)); }
    if (goal) { where.push('t.goal = ?'); params.push(goal); }
    if (tone) { where.push('t.tone = ?'); params.push(tone); }
    if (template_type) { where.push('t.template_type = ?'); params.push(template_type); }
    if (status) { where.push('t.status = ?'); params.push(status); }
    if (search) {
      where.push('(t.name LIKE ? OR t.notes LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const templates = await executeQuery(
      `SELECT t.*, c.name AS category_name
       FROM support_letter_templates t
       LEFT JOIN support_letter_categories c ON t.category_id = c.id
       ${whereClause}
       ORDER BY t.updated_at DESC`,
      params
    );

    const mapped = (templates as any[]).map((row) => ({
      ...row,
      tags: parseJson<string[]>(row.tags, []),
      required_law_tags: parseJson<string[]>(row.required_law_tags, []),
      constraints_json: parseJson<Record<string, any>>(row.constraints_json, {}),
      placeholders: parseJson<any[]>(row.placeholders, []),
      blocks: parseJson<any[]>(row.blocks, []),
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error fetching support letter templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// GET /:id – single template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await executeQuery(
      `SELECT t.*, c.name AS category_name
       FROM support_letter_templates t
       LEFT JOIN support_letter_categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (!(rows as any[]).length) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const row = (rows as any[])[0];
    res.json({
      success: true,
      data: {
        ...row,
        tags: parseJson<string[]>(row.tags, []),
        required_law_tags: parseJson<string[]>(row.required_law_tags, []),
        constraints_json: parseJson<Record<string, any>>(row.constraints_json, {}),
        placeholders: parseJson<any[]>(row.placeholders, []),
        blocks: parseJson<any[]>(row.blocks, []),
      },
    });
  } catch (error) {
    console.error('Error fetching support letter template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

// POST / – create template
router.post('/', async (req, res) => {
  try {
    const {
      category_id, name, bureau, round, goal, tone, template_type,
      status, content, notes, tags, required_law_tags, constraints_json, placeholders, blocks,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result: any = await executeQuery(
      `INSERT INTO support_letter_templates 
       (category_id, name, bureau, round, goal, tone, template_type, status, content, notes, tags, required_law_tags, constraints_json, placeholders, blocks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id || null, name, bureau || null, round || 1,
        goal || 'DELETION', tone || 'FIRM', template_type || 'DISPUTE_STANDARD',
        status || 'active', content || null, notes || null,
        JSON.stringify(tags || []), JSON.stringify(required_law_tags || []),
        JSON.stringify(constraints_json || {}),
        JSON.stringify(placeholders || []), JSON.stringify(blocks || []),
        (req as any).user?.id || null,
      ]
    );

    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating support letter template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// PUT /:id – update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const sets: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'category_id', 'name', 'bureau', 'round', 'goal', 'tone', 'template_type',
      'status', 'content', 'notes', 'version',
    ];
    const jsonFields = ['tags', 'required_law_tags', 'constraints_json', 'placeholders', 'blocks'];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        sets.push(`${field} = ?`);
        params.push(fields[field]);
      }
    }
    for (const field of jsonFields) {
      if (fields[field] !== undefined) {
        sets.push(`${field} = ?`);
        params.push(JSON.stringify(fields[field]));
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    await executeQuery(
      `UPDATE support_letter_templates SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating support letter template:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

// DELETE /:id – delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM support_letter_templates WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting support letter template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

export default router;
