import { Router } from 'express';
import { z } from 'zod';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { reminderService } from '../services/reminderService.js';

const router = Router();

// Validation schema for creating/updating a payoff plan
const payoffPlanSchema = z.object({
  client_id: z.number().int(),
  account_id: z.string(),
  account_name: z.string(),
  target_utilization: z.number().min(0).max(100),
  payoff_timeline_months: z.number().int().min(1),
  payment_date: z.number().int().min(1).max(31),
  reminder_enabled: z.boolean(),
  track_enabled: z.boolean()
});

// Get all payoff plans for a client
router.get('/:clientId', authenticateToken, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const plans = await allQuery(
      'SELECT * FROM debt_payoff_plans WHERE client_id = ?',
      [clientId]
    );

    res.json(plans);
  } catch (error) {
    console.error('Error fetching payoff plans:', error);
    res.status(500).json({ error: 'Failed to fetch payoff plans' });
  }
});

// Create or update a payoff plan
router.post('/', authenticateToken, async (req, res) => {
  try {
    const validatedData = payoffPlanSchema.parse(req.body);

    // Check if plan exists
    const existingPlan = await getQuery(
      'SELECT id FROM debt_payoff_plans WHERE client_id = ? AND account_id = ?',
      [validatedData.client_id, validatedData.account_id]
    );

    if (existingPlan) {
      // Update existing plan
      await runQuery(
        `UPDATE debt_payoff_plans 
         SET target_utilization = ?, 
             payoff_timeline_months = ?, 
             payment_date = ?, 
             reminder_enabled = ?, 
             track_enabled = ? 
         WHERE id = ?`,
        [
          validatedData.target_utilization,
          validatedData.payoff_timeline_months,
          validatedData.payment_date,
          validatedData.reminder_enabled ? 1 : 0,
          validatedData.track_enabled ? 1 : 0,
          existingPlan.id
        ]
      );

      // Trigger reminder check if enabled
      if (validatedData.reminder_enabled) {
        reminderService.checkAndSendReminders().catch(err => console.error('Error triggering reminders:', err));
      }

      res.json({ message: 'Payoff plan updated successfully', id: existingPlan.id });
    } else {
      // Create new plan
      const result = await runQuery(
        `INSERT INTO debt_payoff_plans 
         (client_id, account_id, account_name, target_utilization, payoff_timeline_months, payment_date, reminder_enabled, track_enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          validatedData.client_id,
          validatedData.account_id,
          validatedData.account_name,
          validatedData.target_utilization,
          validatedData.payoff_timeline_months,
          validatedData.payment_date,
          validatedData.reminder_enabled ? 1 : 0,
          validatedData.track_enabled ? 1 : 0
        ]
      );

      // Trigger reminder check if enabled
      if (validatedData.reminder_enabled) {
        reminderService.checkAndSendReminders().catch(err => console.error('Error triggering reminders:', err));
      }

      res.json({ message: 'Payoff plan created successfully', id: result.insertId });
    }
  } catch (error) {
    console.error('Error saving payoff plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to save payoff plan' });
  }
});

// Delete a payoff plan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    await runQuery('DELETE FROM debt_payoff_plans WHERE id = ?', [id]);
    res.json({ message: 'Payoff plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting payoff plan:', error);
    res.status(500).json({ error: 'Failed to delete payoff plan' });
  }
});

export default router;
