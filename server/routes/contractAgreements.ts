import { Router } from 'express';
import { executeQuery, insertRecord, updateRecord } from '../database/mysqlConfig';

const router = Router();

// Get all agreements
router.get('/', async (req, res) => {
  try {
    const agreements = await executeQuery(
      'SELECT * FROM contract_agreements ORDER BY created_at DESC'
    );
    res.json(agreements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agreements' });
  }
});

// Add new agreement
router.post('/', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content required' });
  }
  try {
    const insertId = await insertRecord(
      'INSERT INTO contract_agreements (title, content) VALUES (?, ?)',
      [title, content]
    );
    res.status(201).json({ id: insertId, title, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add agreement' });
  }
});

// Update agreement
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content required' });
  }
  try {
    const affected = await updateRecord(
      'UPDATE contract_agreements SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, id]
    );
    if (affected === 0) return res.status(404).json({ error: 'Agreement not found' });
    res.json({ id, title, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agreement' });
  }
});

// Delete agreement
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const affected = await updateRecord(
      'DELETE FROM contract_agreements WHERE id = ?',
      [id]
    );
    if (affected === 0) return res.status(404).json({ error: 'Agreement not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete agreement' });
  }
});

export default router;
