import { emailService } from './emailService.js';
import { getQuery, runQuery, allQuery } from '../database/databaseAdapter.js';

class ReminderService {
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.checkInterval) return;

    // Run immediately on startup
    this.checkAndSendReminders();
    this.checkAndSendThankYouEmails();
    this.checkAndSendPaymentReminders();

    // Then run every 24 hours (86400000 ms)
    // To be more robust in a real app, we'd use node-cron to schedule for a specific time.
    // Here we'll just check periodically.
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders();
      this.checkAndSendThankYouEmails();
      this.checkAndSendPaymentReminders();
    }, 24 * 60 * 60 * 1000);
    
    console.log('📅 Reminder service started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public async checkAndSendReminders() {
    try {
      const today = new Date();
      const dayOfMonth = today.getDate();

      console.log(`Checking for payment reminders for day ${dayOfMonth}...`);

      const query = `
        SELECT 
          dp.id,
          dp.account_name, 
          dp.target_utilization, 
          dp.payment_date, 
          c.email, 
          c.first_name,
          c.last_name
        FROM debt_payoff_plans dp 
        JOIN clients c ON dp.client_id = c.id 
        WHERE dp.reminder_enabled = 1 
        AND dp.payment_date = ?
      `;

      // Use allQuery to ensure we get an array of results
      const plansToRemind = await allQuery(query, [dayOfMonth]);

      if (!plansToRemind || !Array.isArray(plansToRemind) || plansToRemind.length === 0) {
        console.log('No reminders to send today.');
        return;
      }

      console.log(`Found ${plansToRemind.length} reminders to send.`);

      for (const plan of plansToRemind) {
        await this.sendReminderEmail(plan);
      }

    } catch (error) {
      console.error('Error in checkAndSendReminders:', error);
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

  public async checkAndSendPaymentReminders() {
    try {
      console.log('Checking for upcoming payment reminders (5 days out)...');

      // Find active subscriptions renewing in 5 days
      // We check for DATEDIFF = 5.
      // We also ensure we haven't sent a reminder recently (e.g. within the last day) to avoid duplicates if the script restarts
      const query = `
        SELECT 
          s.id,
          s.user_id,
          s.plan_name,
          s.plan_type,
          s.current_period_end,
          u.email,
          u.first_name,
          u.last_name
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active'
          AND s.cancel_at_period_end = 0
          AND DATEDIFF(s.current_period_end, NOW()) = 5
          AND (s.last_payment_reminder_sent_at IS NULL OR DATEDIFF(NOW(), s.last_payment_reminder_sent_at) > 1)
      `;

      const subs = await allQuery(query);

      if (!subs || !Array.isArray(subs) || subs.length === 0) {
        console.log('No upcoming payment reminders to send today.');
        return;
      }

      console.log(`Found ${subs.length} upcoming payment reminders to send.`);

      for (const sub of subs) {
        await this.sendPaymentReminder(sub);
      }

    } catch (error) {
      console.error('Error in checkAndSendPaymentReminders:', error);
    }
  }

  private async sendPaymentReminder(sub: any) {
    try {
      // Fetch the last transaction amount to estimate the renewal price
      // We assume the renewal price is the same as the last successful transaction for this user
      // If no transaction found, we might need a fallback or just show 0 (or hide it? template expects number)
      const txQuery = `
        SELECT amount 
        FROM billing_transactions 
        WHERE user_id = ? AND status = 'succeeded' 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const txs = await allQuery(txQuery, [sub.user_id]);
      const amount = (txs && txs.length > 0) ? parseFloat(txs[0].amount) : 0;

      // Format renewal date
      const renewalDate = new Date(sub.current_period_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const sent = await emailService.sendUpcomingPaymentEmail({
        firstName: sub.first_name,
        email: sub.email,
        daysUntilRenewal: 5,
        renewalDate: renewalDate,
        planName: sub.plan_name || 'Subscription',
        amount: amount
      });

      if (sent) {
        // Mark as sent
        await runQuery(
          'UPDATE subscriptions SET last_payment_reminder_sent_at = NOW() WHERE id = ?',
          [sub.id]
        );
        console.log(`Sent payment reminder to ${sub.email} for subscription ${sub.id}`);
      }
    } catch (error) {
      console.error(`Failed to send payment reminder to ${sub.email}:`, error);
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

  private async sendReminderEmail(plan: any) {
    try {
      const subject = `Payment Reminder: ${plan.account_name}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Payment Reminder</h2>
          <p>Hello ${plan.first_name},</p>
          <p>This is a friendly reminder to make a payment on your <strong>${plan.account_name}</strong> account.</p>
          <p>
            <strong>Target Utilization:</strong> ${plan.target_utilization}%<br>
            <strong>Scheduled Payment Date:</strong> Day ${plan.payment_date} of every month
          </p>
          <p>Making consistent payments helps you reach your target utilization faster!</p>
          <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
            <p style="margin: 0; font-size: 0.9em; color: #6b7280;">
              You are receiving this email because you enabled payment reminders for this account.
            </p>
          </div>
        </div>
      `;

      await emailService.sendEmail({
        to: plan.email,
        subject,
        html
      });

      console.log(`Sent reminder email to ${plan.email} for account ${plan.account_name}`);
    } catch (error) {
      console.error(`Failed to send reminder to ${plan.email}:`, error);
    }
  }
}

export const reminderService = new ReminderService();
