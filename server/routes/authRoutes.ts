
import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { executeQuery } from '../database/mysqlConfig.js';
import { notifyUserLogin, notifyUserRegistration } from '../middleware/notificationTriggers';

const router = Router();

// Authentication routes
router.get('/google/config', AuthController.getGoogleAuthConfig);
router.post('/google', AuthController.googleLogin);
router.post('/login', notifyUserLogin, AuthController.login);
router.post('/super-admin/login', AuthController.superAdminLogin);
router.post('/support/login', AuthController.supportLogin);
router.post('/affiliate/login', AuthController.affiliateLogin);
router.post('/member/login', AuthController.clientLogin);
router.post('/funding-manager/login', AuthController.fundingManagerLogin);
router.post('/printing-team/login', AuthController.printingTeamLogin);
router.post('/register', notifyUserRegistration, AuthController.register);
router.post('/verify-email', AuthController.verifyEmailAndRegister);
router.post('/verify-user-email', authenticateToken, AuthController.verifyEmail);
router.post('/change-email', authenticateToken, AuthController.changeEmail);
router.post('/resend-verification', authenticateToken, AuthController.resendVerificationCode);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refreshToken);

// Password reset routes
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-reset-code', AuthController.verifyResetCode);
router.post('/reset-password', AuthController.resetPassword);

// Affiliate password reset routes
router.post('/affiliate/forgot-password', AuthController.affiliateForgotPassword);
router.post('/affiliate/verify-reset-code', AuthController.affiliateVerifyResetCode);
router.post('/affiliate/reset-password', AuthController.affiliateResetPassword);

// Protected routes (authentication required)
router.get('/verify', authenticateToken, AuthController.verifyToken);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.post('/login-as-admin', authenticateToken, AuthController.loginAsAdmin);
router.post('/login-as-affiliate', authenticateToken, AuthController.loginAsAffiliate);
router.post('/login-as-support', authenticateToken, AuthController.loginAsSupport);

// GET /api/auth/affiliate/status - Check affiliate status for admin users
router.get('/affiliate/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    
    const userRows: any[] = await executeQuery('SELECT email FROM users WHERE id = ? LIMIT 1', [userId]);
    const adminEmail = userRows && userRows[0]?.email;
    
    const rows: any[] = await executeQuery(
      'SELECT id, email, status, email_verified, plan_type, partner_monitoring_link, created_at, updated_at FROM affiliates WHERE admin_id = ?',
      [userId]
    );
    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        has_access: false,
        status: null,
        email_verified: false,
        plan_type: null,
        affiliate_id: null,
        partner_monitoring_link: null,
        referral_slug: null,
        created_at: null
      });
    }
    let selected = null as any;
    if (adminEmail) {
      selected = rows.find(r => String(r.email || '').toLowerCase() === String(adminEmail).toLowerCase()) || null;
    }
    if (!selected) {
      selected = rows.find(r => r.status === 'active') || null;
    }
    if (!selected) {
      selected = rows.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
    }
    if (!selected) selected = rows[0];

    let referralSlug: string | null = null;
    try {
      const colRes: any[] = await executeQuery(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'referral_slug'`,
        []
      );
      const hasSlug = colRes && (colRes[0]?.cnt || 0) > 0;
      if (hasSlug) {
        const slugRows: any[] = await executeQuery('SELECT referral_slug FROM affiliates WHERE id = ? LIMIT 1', [selected.id]);
        referralSlug = slugRows && slugRows[0]?.referral_slug || null;
      }
    } catch {}

    res.json({
      success: true,
      has_access: true,
      status: selected.status,
      email_verified: selected.email_verified,
      plan_type: selected.plan_type,
      affiliate_id: selected.id,
      partner_monitoring_link: selected.partner_monitoring_link,
      referral_slug: referralSlug,
      created_at: selected.created_at
    });
  } catch (error) {
    console.error('Error checking affiliate status:', error);
    res.status(500).json({ error: 'Failed to check affiliate status' });
  }
});

// GET /api/auth/referral/partner-link - Get partner monitoring link for referred users
router.get('/referral/partner-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const rows: any[] = await executeQuery(
      `SELECT a.partner_monitoring_link
       FROM affiliate_referrals ar
       JOIN affiliates a ON ar.affiliate_id = a.id
       WHERE ar.referred_user_id = ?
       ORDER BY ar.referral_date ASC
       LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.json({ success: true, partnerMonitoringLink: null });
    }

    const partnerMonitoringLink = rows[0]?.partner_monitoring_link || null;
    return res.json({ success: true, partnerMonitoringLink });
  } catch (error) {
    console.error('Error fetching referral partner link:', error);
    return res.status(500).json({ error: 'Failed to fetch referral partner link' });
  }
});

// GET /api/auth/referral/credit-repair-link - Get credit repair link for referred users
router.get('/referral/credit-repair-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const rows: any[] = await executeQuery(
      `SELECT a.credit_repair_link
       FROM affiliate_referrals ar
       JOIN affiliates a ON ar.affiliate_id = a.id
       WHERE ar.referred_user_id = ?
       ORDER BY ar.referral_date ASC
       LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.json({ success: true, creditRepairLink: null });
    }

    const creditRepairLink = rows[0]?.credit_repair_link || null;
    return res.json({ success: true, creditRepairLink });
  } catch (error) {
    console.error('Error fetching referral credit repair link:', error);
    return res.status(500).json({ error: 'Failed to fetch referral credit repair link' });
  }
});

export default router;
