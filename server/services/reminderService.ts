import { emailService } from './emailService.js';
import { runQuery, allQuery } from '../database/databaseAdapter.js';

class ReminderService {
  private checkInterval: NodeJS.Timeout | null = null;

  startThankYouEmails() {
    if (this.checkInterval) return;

    // Payment reminders are disabled. Keep only the non-reminder, post-payment
    // thank-you follow-up running.
    this.checkAndSendThankYouEmails();

    // Then run every 24 hours (86400000 ms).
    this.checkInterval = setInterval(() => {
      this.checkAndSendThankYouEmails();
    }, 24 * 60 * 60 * 1000);
    
    console.log('Post-payment thank-you email scheduler started; automatic reminders are disabled');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public async checkAndSendThankYouEmails() {
    try {
      console.log('Checking for 15-day post-payment thank you emails...');

      // Find successful transactions from ~15 days ago that haven't been thanked
      // We look back between 15 and 20 days to catch any missed ones but avoid spamming ancient history
      const query = `
        SELECT 
          bt.id, 
          bt.amount, 
          bt.created_at, 
          u.email, 
          u.first_name 
        FROM billing_transactions bt
        JOIN users u ON bt.user_id = u.id
        WHERE bt.status = 'succeeded' 
          AND bt.thank_you_email_sent_at IS NULL 
          AND bt.created_at <= DATE_SUB(NOW(), INTERVAL 15 DAY)
          AND bt.created_at >= DATE_SUB(NOW(), INTERVAL 20 DAY)
      `;

      const txs = await allQuery(query);

      if (!txs || !Array.isArray(txs) || txs.length === 0) {
        console.log('No thank you emails to send today.');
        return;
      }

      console.log(`Found ${txs.length} thank you emails to send.`);

      for (const tx of txs) {
        await this.sendThankYouEmail(tx);
      }

    } catch (error) {
      console.error('Error in checkAndSendThankYouEmails:', error);
    }
  }

  private async sendThankYouEmail(tx: any) {
    try {
      const sent = await emailService.sendPaymentThankYouEmail({
        firstName: tx.first_name,
        email: tx.email
      });

      if (sent) {
        // Mark as sent
        await runQuery(
          'UPDATE billing_transactions SET thank_you_email_sent_at = NOW() WHERE id = ?',
          [tx.id]
        );
        console.log(`Sent thank you email to ${tx.email} for transaction ${tx.id}`);
      }
    } catch (error) {
      console.error(`Failed to send thank you email to ${tx.email}:`, error);
    }
  }

}

export const reminderService = new ReminderService();
