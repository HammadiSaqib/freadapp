import { Router } from 'express';
import { executeQuery } from '../database/mysqlConfig.js';

const router = Router();

router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    // Check if email already exists
    const existingSubscribers = await executeQuery<any[]>(
      'SELECT id FROM newsletter_subscribers WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingSubscribers) && existingSubscribers.length > 0) {
      return res.status(409).json({ message: 'You are already subscribed to our newsletter.' });
    }

    // Insert new subscriber
    await executeQuery(
      'INSERT INTO newsletter_subscribers (email) VALUES (?)',
      [email]
    );

    return res.status(201).json({ message: 'Successfully subscribed to the newsletter!' });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
});

export default router;
