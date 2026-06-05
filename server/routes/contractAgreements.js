import { Router } from 'express';
import {
  executeQuery,
  insertRecord,
  updateRecord,
} from '../database/mysqlConfig.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const agreements = await executeQuery(
      'SELECT * FROM contract_agreements ORDER BY created_at DESC'
    );
    res.json(agreements);
  } catch (error) {
    console.error('Failed to fetch agreements:', error);
    res.status(500).json({ error: 'Failed to fetch agreements' });
  }
});

router.post('/', async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content required' });
  }

  try {
    const insertId = await insertRecord(
      'INSERT INTO contract_agreements (title, content) VALUES (?, ?)',
      [title, content]
    );
    res.status(201).json({ id: insertId, title, content });
  } catch (error) {
    console.error('Failed to add agreement:', error);
    res.status(500).json({ error: 'Failed to add agreement' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content required' });
  }

  try {
    const affected = await updateRecord(
      'UPDATE contract_agreements SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, id]
    );
    if (affected === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    res.json({ id: Number(id), title, content });
  } catch (error) {
    console.error('Failed to update agreement:', error);
    res.status(500).json({ error: 'Failed to update agreement' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const affected = await updateRecord(
      'DELETE FROM contract_agreements WHERE id = ?',
      [id]
    );
    if (affected === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agreement:', error);
    res.status(500).json({ error: 'Failed to delete agreement' });
  }
});

export default router;
