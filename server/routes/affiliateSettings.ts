import express from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { SecurityLogger } from '../utils/securityLogger.js';

const router = express.Router();
const securityLogger = new SecurityLogger();

// Middleware to allow affiliates and admins with linked affiliate records
const requireAffiliateRole = (req: any, res: any, next: any) => {
  const role = req.user?.role;
  if (!['affiliate', 'admin', 'super_admin'].includes(role)) {
    securityLogger.logSecurityEvent('unauthorized_affiliate_settings_access', {
      userId: req.user?.id,
      role,
      endpoint: req.path,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Access denied. Affiliate or Admin role required.' });
  }
  next();
};

async function resolveAffiliateId(req: any): Promise<number | null> {
  try {
    if (req.user?.role === 'affiliate') return req.user.id;
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
      const userRows = await executeQuery('SELECT email FROM users WHERE id = ? LIMIT 1', [req.user.id]);
      const adminEmail = userRows && userRows[0]?.email;
      const rows = await executeQuery('SELECT id, email, status, updated_at, created_at FROM affiliates WHERE admin_id = ?', [req.user.id]);
      if (!rows || rows.length === 0) return null;
      let selected = null as any;
      if (adminEmail) {
        selected = rows.find((r: any) => String(r.email || '').toLowerCase() === String(adminEmail).toLowerCase()) || null;
      }
      if (!selected) {
        selected = rows.find((r: any) => r.status === 'active') || null;
      }
      if (!selected) {
        selected = rows.sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
      }
      if (!selected) selected = rows[0];
      return selected?.id || null;
    }
    return null;
  } catch (err) {
    console.error('Error resolving affiliate id for settings:', err);
    return null;
  }
}

// GET /api/affiliate/settings - Get all affiliate settings
router.get('/settings', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    
    // Get affiliate profile information
    const columnCheck = `
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'referral_slug'
    `;
    let hasSlug = false;
    try {
      const colRes: any = await executeQuery(columnCheck, []);
      hasSlug = !!colRes && ((colRes[0]?.cnt || 0) > 0);
    } catch {}
    const profileQuery = `
      SELECT 
        id, email, first_name, last_name, company_name, phone, 
        address, city, state, zip_code, status, email_verified, logo_url,
        partner_monitoring_link, credit_repair_link${hasSlug ? ', referral_slug' : ', NULL as referral_slug'}
      FROM affiliates 
      WHERE id = ?
    `;
    
    const profileResult = await executeQuery(profileQuery, [affiliateId]);
    
    if (!profileResult || profileResult.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const profile = profileResult[0];
    
    // Get notification settings
    const notificationQuery = `
      SELECT 
        email_notifications, sms_notifications, push_notifications,
        commission_alerts, referral_updates, weekly_reports, 
        monthly_reports, marketing_emails
      FROM affiliate_notification_settings 
      WHERE affiliate_id = ?
    `;
    
    let notifications;
    try {
      const notificationResult = await executeQuery(notificationQuery, [affiliateId]);
      notifications = notificationResult[0] || {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        commission_alerts: true,
        referral_updates: true,
        weekly_reports: true,
        monthly_reports: true,
        marketing_emails: false
      };
    } catch {
      notifications = {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        commission_alerts: true,
        referral_updates: true,
        weekly_reports: true,
        monthly_reports: true,
        marketing_emails: false
      };
    }
    
    // Get payment settings
    const paymentQuery = `
      SELECT 
        payment_method, bank_name, account_number, routing_number,
        account_holder_name, paypal_email, stripe_account_id,
        minimum_payout, payout_frequency, tax_id, w9_submitted
      FROM affiliate_payment_settings 
      WHERE affiliate_id = ?
    `;
    
    let payment;
    try {
      const paymentResult = await executeQuery(paymentQuery, [affiliateId]);
      payment = paymentResult[0] || {
        payment_method: 'paypal',
        bank_name: '',
        account_number: '',
        routing_number: '',
        account_holder_name: '',
        paypal_email: '',
        stripe_account_id: '',
        minimum_payout: 50.00,
        payout_frequency: 'monthly',
        tax_id: '',
        w9_submitted: false
      };
    } catch {
      payment = {
        payment_method: 'paypal',
        bank_name: '',
        account_number: '',
        routing_number: '',
        account_holder_name: '',
        paypal_email: '',
        stripe_account_id: '',
        minimum_payout: 50.00,
        payout_frequency: 'monthly',
        tax_id: '',
        w9_submitted: false
      };
    }
    
    // Remove sensitive information from payment settings
    if (payment.account_number) {
      payment.account_number = '****' + payment.account_number.slice(-4);
    }
    if (payment.routing_number) {
      payment.routing_number = '****' + payment.routing_number.slice(-4);
    }
    
    res.json({
      profile,
      notifications,
      payment
    });
    
  } catch (error) {
    console.error('Error fetching affiliate settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/affiliate/settings/profile - Update affiliate profile
router.put('/settings/profile', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const {
      first_name, last_name, company_name, phone,
      address, city, state, zip_code, partner_monitoring_link, credit_repair_link
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    let sanitizedPartnerLink: string | null = partner_monitoring_link || null;
    if (sanitizedPartnerLink) {
      const urlPattern = /^(https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-\.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?)$/i;
      if (!urlPattern.test(sanitizedPartnerLink)) {
        return res.status(400).json({ error: 'Partner link must be a valid URL starting with http:// or https://' });
      }
      if (sanitizedPartnerLink.length > 512) {
        return res.status(400).json({ error: 'Partner link is too long (max 512 characters)' });
      }
    }

    let sanitizedCreditRepairLink: string | null = credit_repair_link || null;
    if (sanitizedCreditRepairLink) {
      const urlPattern = /^(https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-\.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?)$/i;
      if (!urlPattern.test(sanitizedCreditRepairLink)) {
        return res.status(400).json({ error: 'Credit repair link must be a valid URL starting with http:// or https://' });
      }
      if (sanitizedCreditRepairLink.length > 512) {
        return res.status(400).json({ error: 'Credit repair link is too long (max 512 characters)' });
      }
    }

    const updateQuery = `
      UPDATE affiliates 
      SET 
        first_name = ?, last_name = ?, company_name = ?, phone = ?,
        address = ?, city = ?, state = ?, zip_code = ?,
        partner_monitoring_link = ?,
        credit_repair_link = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      first_name, last_name, company_name, phone,
      address, city, state, zip_code,
      sanitizedPartnerLink,
      sanitizedCreditRepairLink,
      affiliateId
    ]);
    
    securityLogger.logSecurityEvent('affiliate_profile_updated', {
      affiliateId,
      updatedFields: Object.keys(req.body),
      ip: req.ip
    });
    
    res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Error updating affiliate profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/affiliate/settings/notifications - Update notification preferences
router.put('/settings/notifications', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const {
      email_notifications, sms_notifications, push_notifications,
      commission_alerts, referral_updates, weekly_reports,
      monthly_reports, marketing_emails
    } = req.body;
    
    const updateQuery = `
      UPDATE affiliate_notification_settings 
      SET 
        email_notifications = ?, sms_notifications = ?, push_notifications = ?,
        commission_alerts = ?, referral_updates = ?, weekly_reports = ?,
        monthly_reports = ?, marketing_emails = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE affiliate_id = ?
    `;
    
    const result = await executeQuery(updateQuery, [
      email_notifications, sms_notifications, push_notifications,
      commission_alerts, referral_updates, weekly_reports,
      monthly_reports, marketing_emails, affiliateId
    ]);
    
    // If no rows were affected, create the record
    if (result.affectedRows === 0) {
      const insertQuery = `
        INSERT INTO affiliate_notification_settings (
          affiliate_id, email_notifications, sms_notifications, push_notifications,
          commission_alerts, referral_updates, weekly_reports,
          monthly_reports, marketing_emails
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(insertQuery, [
        affiliateId, email_notifications, sms_notifications, push_notifications,
        commission_alerts, referral_updates, weekly_reports,
        monthly_reports, marketing_emails
      ]);
    }
    
    res.json({ message: 'Notification preferences updated successfully' });
    
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/affiliate/settings/payment - Update payment settings
router.put('/settings/payment', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const {
      payment_method, bank_name, account_number, routing_number,
      account_holder_name, paypal_email, stripe_account_id,
      minimum_payout, payout_frequency, tax_id
    } = req.body;
    
    // Validate payment method
    const validPaymentMethods = ['bank_transfer', 'paypal', 'stripe'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Validate minimum payout
    if (minimum_payout < 10 || minimum_payout > 1000) {
      return res.status(400).json({ error: 'Minimum payout must be between $10 and $1000' });
    }
    
    const updateQuery = `
      UPDATE affiliate_payment_settings 
      SET 
        payment_method = ?, bank_name = ?, account_number = ?, routing_number = ?,
        account_holder_name = ?, paypal_email = ?, stripe_account_id = ?,
        minimum_payout = ?, payout_frequency = ?, tax_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE affiliate_id = ?
    `;
    
    const result = await executeQuery(updateQuery, [
      payment_method, bank_name, account_number, routing_number,
      account_holder_name, paypal_email, stripe_account_id,
      minimum_payout, payout_frequency, tax_id, affiliateId
    ]);
    
    // If no rows were affected, create the record
    if (result.affectedRows === 0) {
      const insertQuery = `
        INSERT INTO affiliate_payment_settings (
          affiliate_id, payment_method, bank_name, account_number, routing_number,
          account_holder_name, paypal_email, stripe_account_id,
          minimum_payout, payout_frequency, tax_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(insertQuery, [
        affiliateId, payment_method, bank_name, account_number, routing_number,
        account_holder_name, paypal_email, stripe_account_id,
        minimum_payout, payout_frequency, tax_id
      ]);
    }
    
    securityLogger.logSecurityEvent('affiliate_payment_settings_updated', {
      affiliateId,
      paymentMethod: payment_method,
      ip: req.ip
    });
    
    res.json({ message: 'Payment settings updated successfully' });
    
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/affiliate/settings/password - Change password
router.put('/settings/password', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    const { current_password, new_password } = req.body;
    
    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Get current password hash
    const affiliateQuery = 'SELECT password_hash FROM affiliates WHERE id = ?';
    const affiliateResult = await executeQuery(affiliateQuery, [affiliateId]);
    
    if (!affiliateResult || affiliateResult.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const affiliate = affiliateResult[0];
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, affiliate.password_hash);
    if (!isCurrentPasswordValid) {
      securityLogger.logSecurityEvent('affiliate_invalid_password_change_attempt', {
        affiliateId,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Update password
    const updateQuery = `
      UPDATE affiliates 
      SET 
        password_hash = ?,
        password_changed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [newPasswordHash, affiliateId]);
    
    securityLogger.logSecurityEvent('affiliate_password_changed', {
      affiliateId,
      ip: req.ip
    });
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/check-slug', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const { slug } = req.body;
    const currentAffiliateId = await resolveAffiliateId(req);
    if (!currentAffiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }
    const slugRegex = /^[a-z0-9_-]{3,30}$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ error: 'Slug must be 3-30 characters of a-z, 0-9, - or _' });
    }
    const columnCheck = `
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'referral_slug'
    `;
    const colRes: any = await executeQuery(columnCheck, []);
    if (!colRes || (colRes[0]?.cnt || 0) === 0) {
      try {
        await executeQuery(`ALTER TABLE affiliates ADD COLUMN referral_slug VARCHAR(64) UNIQUE`, []);
      } catch {}
    }
    const existing = await executeQuery(
      `SELECT id FROM affiliates WHERE referral_slug = ? AND id != ? LIMIT 1`,
      [slug, currentAffiliateId]
    );
    const available = !existing || existing.length === 0;
    res.json({ success: true, available, slug });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check slug availability' });
  }
});

router.put('/settings/referral-slug', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const { slug } = req.body;
    const affiliateId = await resolveAffiliateId(req);
    if (!affiliateId) {
      return res.status(404).json({ error: 'Affiliate not found for this user' });
    }
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }
    const slugRegex = /^[a-z0-9_-]{3,30}$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ error: 'Slug must be 3-30 characters of a-z, 0-9, - or _' });
    }
    const columnCheck = `
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'referral_slug'
    `;
    const colRes: any = await executeQuery(columnCheck, []);
    if (!colRes || (colRes[0]?.cnt || 0) === 0) {
      try {
        await executeQuery(`ALTER TABLE affiliates ADD COLUMN referral_slug VARCHAR(64) UNIQUE`, []);
      } catch {}
    }
    const existing = await executeQuery(
      `SELECT id FROM affiliates WHERE referral_slug = ? AND id != ? LIMIT 1`,
      [slug, affiliateId]
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Slug already in use' });
    }
    await executeQuery(
      `UPDATE affiliates SET referral_slug = ?, updated_at = NOW() WHERE id = ?`,
      [slug, affiliateId]
    );
    securityLogger.logSecurityEvent('affiliate_referral_slug_updated', {
      affiliateId,
      newSlug: slug,
      ip: req.ip
    });
    res.json({ success: true, slug });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update referral slug' });
  }
});

// POST /api/affiliate/check-username - Check if username is available
router.post('/check-username', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const { username } = req.body;
    const currentAffiliateId = req.user.id;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Validate username format (alphanumeric, underscore, hyphen, 3-30 characters)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens' 
      });
    }
    
    // Check if username exists in affiliates table (excluding current user)
    const checkQuery = `
      SELECT id FROM affiliates 
      WHERE LOWER(CONCAT(REPLACE(REPLACE(first_name, ' ', ''), '-', ''), REPLACE(REPLACE(last_name, ' ', ''), '-', ''))) = LOWER(?)
      AND id != ?
    `;
    
    const existingAffiliate = await executeQuery(checkQuery, [username.replace(/[-_]/g, ''), currentAffiliateId]);
    
    const isAvailable = existingAffiliate.length === 0;
    
    res.json({
      success: true,
      available: isAvailable,
      username: username,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    });
    
  } catch (error) {
    console.error('Error checking username availability:', error);
    securityLogger.logSecurityEvent('username_check_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// PUT /api/affiliate/update-username - Update affiliate username
router.put('/update-username', authenticateToken, requireAffiliateRole, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const affiliateId = req.user.id;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    // Generate username from first and last name
    const username = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    
    // Check if the generated username conflicts with existing ones
    const checkQuery = `
      SELECT id FROM affiliates 
      WHERE LOWER(CONCAT(REPLACE(REPLACE(first_name, ' ', ''), '-', ''), REPLACE(REPLACE(last_name, ' ', ''), '-', ''))) = LOWER(?)
      AND id != ?
    `;
    
    const existingAffiliate = await executeQuery(checkQuery, [username, affiliateId]);
    
    if (existingAffiliate.length > 0) {
      return res.status(409).json({ 
        error: 'This name combination would create a username that already exists. Please choose different names.' 
      });
    }
    
    // Update affiliate names
    const updateQuery = `
      UPDATE affiliates 
      SET first_name = ?, last_name = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [firstName, lastName, affiliateId]);
    
    // Generate new personalized link
    const baseUrl = process.env.CLIENT_URL || 'https://thescoremachine.com';
    const personalizedLink = `${baseUrl}/pricing?ref=${username}`;
    
    securityLogger.logSecurityEvent('affiliate_username_updated', {
      userId: affiliateId,
      newUsername: username,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Username updated successfully',
      username: username,
      personalizedLink: personalizedLink
    });
    
  } catch (error) {
    console.error('Error updating username:', error);
    securityLogger.logSecurityEvent('username_update_error', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to update username' });
  }
});

export default router;
