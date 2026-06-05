import express from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to ensure user is admin or super_admin
const requireAdminOrSuperAdmin = async (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'support') {
    return res.status(403).json({ error: 'Access denied. Requires admin, super_admin, or support role.' });
  }
  next();
};

// ==========================================
// LETTER CATEGORIES ROUTES
// ==========================================

// GET /api/letter-management/categories
router.get('/categories', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const categories = await executeQuery(
      'SELECT * FROM letter_categories ORDER BY name ASC'
    );
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching letter categories:', error);
    res.status(500).json({ error: 'Failed to fetch letter categories' });
  }
});

// POST /api/letter-management/categories
router.post('/categories', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result: any = await executeQuery(
      'INSERT INTO letter_categories (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );

    const newCategory = await executeQuery(
      'SELECT * FROM letter_categories WHERE id = ?',
      [result.insertId]
    );

    res.json({ success: true, data: (newCategory as any[])[0] });
  } catch (error) {
    console.error('Error creating letter category:', error);
    res.status(500).json({ error: 'Failed to create letter category' });
  }
});

// PUT /api/letter-management/categories/:id
router.put('/categories/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await executeQuery(
      'UPDATE letter_categories SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    const updatedCategory = await executeQuery(
      'SELECT * FROM letter_categories WHERE id = ?',
      [id]
    );

    res.json({ success: true, data: (updatedCategory as any[])[0] });
  } catch (error) {
    console.error('Error updating letter category:', error);
    res.status(500).json({ error: 'Failed to update letter category' });
  }
});

// DELETE /api/letter-management/categories/:id
router.delete('/categories/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    const templates = await executeQuery(
      'SELECT COUNT(*) as count FROM letter_templates WHERE category_id = ?',
      [id]
    );

    if ((templates as any[])[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category containing templates' });
    }

    await executeQuery('DELETE FROM letter_categories WHERE id = ?', [id]);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting letter category:', error);
    res.status(500).json({ error: 'Failed to delete letter category' });
  }
});

// ==========================================
// LETTER TEMPLATES ROUTES
// ==========================================

// GET /api/letter-management/templates
router.get('/templates', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const templates = await executeQuery(`
      SELECT t.*, c.name as category_name 
      FROM letter_templates t
      LEFT JOIN letter_categories c ON t.category_id = c.id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching letter templates:', error);
    res.status(500).json({ error: 'Failed to fetch letter templates' });
  }
});

// POST /api/letter-management/templates
router.post('/templates', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const { name, description, content, category_id } = req.body;
    if (!name || !content || !category_id) {
      return res.status(400).json({ error: 'Name, content, and category are required' });
    }

    const result: any = await executeQuery(
      'INSERT INTO letter_templates (name, description, content, category_id, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, description, content, category_id, req.user.id]
    );

    const newTemplate = await executeQuery(
      'SELECT * FROM letter_templates WHERE id = ?',
      [result.insertId]
    );

    res.json({ success: true, data: (newTemplate as any[])[0] });
  } catch (error) {
    console.error('Error creating letter template:', error);
    res.status(500).json({ error: 'Failed to create letter template' });
  }
});

// PUT /api/letter-management/templates/:id
router.put('/templates/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, category_id } = req.body;

    await executeQuery(
      'UPDATE letter_templates SET name = ?, description = ?, content = ?, category_id = ? WHERE id = ?',
      [name, description, content, category_id, id]
    );

    const updatedTemplate = await executeQuery(
      'SELECT * FROM letter_templates WHERE id = ?',
      [id]
    );

    res.json({ success: true, data: (updatedTemplate as any[])[0] });
  } catch (error) {
    console.error('Error updating letter template:', error);
    res.status(500).json({ error: 'Failed to update letter template' });
  }
});

// DELETE /api/letter-management/templates/:id
router.delete('/templates/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM letter_templates WHERE id = ?', [id]);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting letter template:', error);
    res.status(500).json({ error: 'Failed to delete letter template' });
  }
});

export default router;
