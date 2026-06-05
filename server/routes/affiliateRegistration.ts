import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { securityLogger } from '../utils/securityLogger.js';
import { emailService } from '../services/emailService.js';

const router = express.Router();

const AFFILIATE_REFERRAL_COOKIE = 'scoremachine_affiliate_ref';

function normalizeReferralId(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized.length > 0 ? normalized : '';
}

function getCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) {
    return '';
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName !== cookieName) {
      continue;
    }

    const rawValue = rawValueParts.join('=');
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return '';
}

function getReferralIdFromReferrer(referrerHeader: string | undefined) {
  if (!referrerHeader) {
    return '';
  }

  try {
    const referrerUrl = new URL(referrerHeader);
    const queryReferralId = normalizeReferralId(referrerUrl.searchParams.get('ref'));
    if (queryReferralId) {
      return queryReferralId;
    }

    const pathMatch = referrerUrl.pathname.match(/\/ref\/([^/?#]+)/i);
    if (!pathMatch) {
      return '';
    }

    return normalizeReferralId(decodeURIComponent(pathMatch[1]));
  } catch {
    return '';
  }
}

function getReferralCandidate(req: express.Request) {
  const bodyReferralId = normalizeReferralId(req.body?.referrerAffiliateId);
  if (bodyReferralId) {
    return bodyReferralId;
  }

  const queryReferralId = normalizeReferralId(req.query?.ref);
  if (queryReferralId) {
    return queryReferralId;
  }

  const cookieReferralId = normalizeReferralId(getCookieValue(req.headers.cookie, AFFILIATE_REFERRAL_COOKIE));
  if (cookieReferralId) {
    return cookieReferralId;
  }

  return getReferralIdFromReferrer(req.get('referer') || req.get('referrer') || '');
}

// POST /api/affiliate/register - Public affiliate registration
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      password
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, firstName, lastName, password' 
      });
    }

    // Get super admin ID (automatically assign all new affiliates to super admin)
    const superAdminQuery = `
      SELECT id FROM users 
      WHERE role = 'super_admin' AND status = 'active'
      LIMIT 1
    `;
    const superAdmin = await runQuery(superAdminQuery, []);
    
    if (!superAdmin || superAdmin.length === 0) {
      return res.status(500).json({ error: 'System configuration error: No active super admin found' });
    }
    
    const adminId = superAdmin[0].id;

    // Check if email already exists in affiliates table
    const existingAffiliate = await runQuery(
      'SELECT id FROM affiliates WHERE email = ?',
      [email]
    );

    if (existingAffiliate.length > 0) {
      return res.status(409).json({ error: 'Email already registered as affiliate' });
    }

    // Check if email exists in users table
    const existingUser = await runQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already registered in system' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    // Generate unique affiliate code
    const affiliateCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    // Resolve parent affiliate from referral param if provided
    let parentAffiliateId: number | null = null;
    try {
      const refRaw = getReferralCandidate(req);
      if (refRaw) {
        const parsed = parseInt(refRaw, 10);
        if (!Number.isNaN(parsed)) {
          const parentRows = await runQuery(`SELECT id FROM affiliates WHERE id = ? AND status != 'suspended'`, [parsed]);
          if (parentRows && parentRows.length > 0) {
            parentAffiliateId = parsed;
          }
        } else {
          const colRes: any[] = await runQuery(
            `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'referral_slug'`,
            []
          );
          const hasReferralSlug = !!colRes && ((colRes[0]?.cnt || 0) > 0);
          if (hasReferralSlug) {
            const parentRows = await runQuery(
              `SELECT id FROM affiliates WHERE referral_slug = ? AND status != 'suspended' LIMIT 1`,
              [refRaw]
            );
            if (parentRows && parentRows.length > 0) {
              parentAffiliateId = parentRows[0].id;
            }
          }
        }
      }
    } catch {}

    // Create affiliate with active status (default free plan)
    const insertQuery = `
      INSERT INTO affiliates (
        admin_id, parent_affiliate_id, email, password_hash, first_name, last_name, 
        commission_rate, status, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', TRUE, NOW(), NOW())
    `;

    const result = await runQuery(insertQuery, [
      adminId,
      parentAffiliateId,
      email,
      hashedPassword,
      firstName,
      lastName,
      10.00 // Default commission rate, can be updated by super admin
    ]);

    const affiliateId = result.insertId;

    // Log successful registration
    securityLogger.logSecurityEvent('affiliate_registration', {
      affiliateId,
      email,
      adminId,
      assignedToSuperAdmin: true,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate registration successful.',
      data: {
        id: affiliateId,
        email,
        firstName,
        lastName,
        status: 'active',
        emailSent: false
      }
    });

  } catch (error) {
    console.error('Error in affiliate registration:', error);
    securityLogger.logSecurityEvent('affiliate_registration_error', {
      email: req.body?.email,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/affiliate/verify-email - Verify email with code
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate required fields
    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields: email and code' 
      });
    }

    // Find valid verification code
    const codeQuery = `
      SELECT * FROM email_verification_codes 
      WHERE email = ? AND code = ? AND type = 'affiliate_registration' 
      AND used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const verificationRecord = await runQuery(codeQuery, [email, code]);
    
    if (verificationRecord.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification code' 
      });
    }

    // Find the affiliate
    const affiliateQuery = `
      SELECT id, status, email_verified FROM affiliates 
      WHERE email = ?
    `;
    
    const affiliate = await runQuery(affiliateQuery, [email]);
    
    if (affiliate.length === 0) {
      return res.status(404).json({ 
        error: 'Affiliate not found' 
      });
    }

    const affiliateData = affiliate[0];

    // Check if already verified
    if (affiliateData.email_verified) {
      return res.status(400).json({ 
        error: 'Email already verified' 
      });
    }

    // Mark verification code as used
    const markUsedQuery = `
      UPDATE email_verification_codes 
      SET used = TRUE, used_at = NOW() 
      WHERE id = ?
    `;
    
    await runQuery(markUsedQuery, [verificationRecord[0].id]);

    // Update affiliate status to verified and active
    const updateAffiliateQuery = `
      UPDATE affiliates 
      SET email_verified = TRUE, status = 'active', updated_at = NOW() 
      WHERE id = ?
    `;
    
    await runQuery(updateAffiliateQuery, [affiliateData.id]);

    // Get affiliate details for welcome email
    const affiliateDetailsQuery = `
      SELECT first_name, last_name, email FROM affiliates 
      WHERE id = ?
    `;
    
    const affiliateDetails = await runQuery(affiliateDetailsQuery, [affiliateData.id]);
    
    if (affiliateDetails.length > 0) {
      const affiliate = affiliateDetails[0];
      
      // Send welcome email
      try {
        await emailService.sendWelcomeEmail({
          firstName: affiliate.first_name,
          email: affiliate.email,
          userType: 'affiliate'
        });
        console.log('Welcome email sent to:', affiliate.email);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the verification if welcome email fails
      }
    }

    // Log successful verification
    securityLogger.logSecurityEvent('affiliate_email_verified', {
      affiliateId: affiliateData.id,
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Email verified successfully! Your affiliate account is now active.',
      data: {
        id: affiliateData.id,
        email,
        status: 'active',
        email_verified: true
      }
    });

  } catch (error) {
    console.error('Error in email verification:', error);
    securityLogger.logSecurityEvent('affiliate_verification_error', {
      email: req.body?.email,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/affiliate/resend-verification - Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Find the affiliate
    const affiliateQuery = `
      SELECT id, first_name, email_verified, status FROM affiliates 
      WHERE email = ?
    `;
    
    const affiliate = await runQuery(affiliateQuery, [email]);
    
    if (affiliate.length === 0) {
      return res.status(404).json({ 
        error: 'Affiliate not found' 
      });
    }

    const affiliateData = affiliate[0];

    // Check if already verified
    if (affiliateData.email_verified) {
      return res.status(400).json({ 
        error: 'Email already verified' 
      });
    }

    // Check rate limiting - only allow resend every 2 minutes
    const recentCodeQuery = `
      SELECT created_at FROM email_verification_codes 
      WHERE email = ? AND type = 'affiliate_registration' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const recentCode = await runQuery(recentCodeQuery, [email]);
    
    if (recentCode.length > 0) {
      const lastCodeTime = new Date(recentCode[0].created_at);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      if (lastCodeTime > twoMinutesAgo) {
        return res.status(429).json({ 
          error: 'Please wait 2 minutes before requesting a new verification code' 
        });
      }
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

    // Store new verification code
    const codeQuery = `
      INSERT INTO email_verification_codes (email, code, type, expires_at)
      VALUES (?, ?, 'affiliate_registration', ?)
    `;
    
    await runQuery(codeQuery, [email, verificationCode, expiresAt]);

    // Send verification email
    const emailSent = await emailService.sendVerificationCode(email, verificationCode, affiliateData.first_name);
    
    if (!emailSent) {
      console.error('Failed to resend verification email to:', email);
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
    }

    // Log resend event
    securityLogger.logSecurityEvent('affiliate_verification_resent', {
      affiliateId: affiliateData.id,
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Verification code sent successfully. Please check your email.',
      data: {
        email,
        emailSent: true
      }
    });

  } catch (error) {
    console.error('Error resending verification code:', error);
    securityLogger.logSecurityEvent('affiliate_verification_resend_error', {
      email: req.body?.email,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
  }
});

// GET /api/affiliate/admins - Get list of available admins for registration
router.get('/admins', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        company_name,
        created_at
      FROM users 
      WHERE role = 'admin' AND status = 'active'
      ORDER BY first_name, last_name
    `;
    
    const admins = await runQuery(query);
    
    const transformedAdmins = admins.map((admin: any) => ({
      id: admin.id,
      email: admin.email,
      name: `${admin.first_name} ${admin.last_name}`,
      companyName: admin.company_name,
      memberSince: admin.created_at
    }));
    
    res.json({ success: true, data: transformedAdmins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch available admins' });
  }
});

// GET /api/affiliate/link/:affiliateId - Generate unique affiliate link
router.get('/link/:affiliateId', async (req, res) => {
  try {
    const { affiliateId } = req.params;
    
    // Verify affiliate exists and is active
    const affiliateQuery = `
      SELECT id, email, first_name, last_name, status, admin_id
      FROM affiliates 
      WHERE id = ?
    `;
    
    const affiliate = await runQuery(affiliateQuery, [affiliateId]);
    
    if (!affiliate || affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const affiliateData = affiliate[0];
    
    if (affiliateData.status !== 'active') {
      return res.status(403).json({ error: 'Affiliate account is not active' });
    }
    
    // Generate unique referral link
    const baseUrl = process.env.CLIENT_URL || 'https://thescoremachine.com';
    const referralLink = `${baseUrl}/pricing?ref=${affiliateId}`;
    
    res.json({
      success: true,
      data: {
        affiliateId: affiliateData.id,
        affiliateName: `${affiliateData.first_name} ${affiliateData.last_name}`,
        referralLink,
        status: affiliateData.status
      }
    });
    
  } catch (error) {
    console.error('Error generating affiliate link:', error);
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

export default router;
