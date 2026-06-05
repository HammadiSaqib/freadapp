import { executeQuery, executeTransaction } from '../database/mysqlConfig.ts';
import bcrypt from 'bcryptjs';

class AffiliateUpgradeService {
  /**
   * Upgrades an affiliate to admin user when they purchase a subscription plan
   * @param {string} affiliateEmail - Email of the affiliate to upgrade
   * @param {number} planId - ID of the purchased plan
   * @param {string} planName - Name of the purchased plan
   * @param {string} planType - Type of plan (monthly, yearly, lifetime)
   * @param {number} amount - Amount paid for the plan
   * @returns {Promise<{success: boolean, adminUserId?: number, message: string}>}
   */
  async upgradeAffiliateToAdmin(affiliateEmail, planId, planName, planType, amount, newAdminPassword = null) {
    try {
      console.log(`🔄 Starting affiliate upgrade process for: ${affiliateEmail}`);
      
      // Check if affiliate exists
      const affiliateRows = await executeQuery(
        'SELECT * FROM affiliates WHERE email = ? AND status = "active"',
        [affiliateEmail]
      );
      
      if (!affiliateRows || affiliateRows.length === 0) {
        console.log(`❌ No active affiliate found with email: ${affiliateEmail}`);
        return { success: false, message: 'No active affiliate found with this email' };
      }
      
      const affiliate = affiliateRows[0];
      
      // Check if user already exists in users table
      const existingUserRows = await executeQuery(
        'SELECT id, role, password_hash, email_verified FROM users WHERE email = ?',
        [affiliateEmail]
      );

      // Start transaction to ensure data consistency
      const connection = await executeTransaction(async (connection) => {
        // Determine password to use: either provided new password or affiliate's existing hash
        let passwordHashToUse = affiliate.password_hash;
        if (newAdminPassword && typeof newAdminPassword === 'string') {
          try {
            if (newAdminPassword.length >= 8) {
              const saltRounds = 12;
              passwordHashToUse = await bcrypt.hash(newAdminPassword, saltRounds);
              console.log('🔐 Using newly provided admin password (hashed).');
            } else {
              console.log('⚠️ Provided new admin password is too short; falling back to affiliate password.');
            }
          } catch (hashErr) {
            console.log('⚠️ Failed to hash provided admin password; falling back to affiliate password.', hashErr);
            passwordHashToUse = affiliate.password_hash;
          }
        }

        let adminUserId = null;

        if (existingUserRows && existingUserRows.length > 0) {
          // User exists already (created during payment intent). Upgrade to admin in-place.
          const existingUser = existingUserRows[0];
          adminUserId = existingUser.id;

          // If role is not admin, promote to admin and set email_verified to FALSE so flow can prompt verification
          const shouldUpdatePassword = !existingUser.password_hash || existingUser.password_hash.length < 10 || !!newAdminPassword;
          const updateFields = [];
          const updateValues = [];

          updateFields.push('role = ?');
          updateValues.push('admin');
          updateFields.push('status = ?');
          updateValues.push('active');
          // Force email verification prompt on first login
          updateFields.push('email_verified = ?');
          updateValues.push(false);
          
          if (shouldUpdatePassword) {
            updateFields.push('password_hash = ?');
            updateValues.push(passwordHashToUse);
          }
          
          updateFields.push('updated_at = NOW()');
          
          const updateUserQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
          await connection.execute(updateUserQuery, [...updateValues, adminUserId]);
          console.log(`✅ Promoted existing user ${adminUserId} to admin`);
        } else {
          // Create admin user in users table
          const insertUserQuery = `
            INSERT INTO users (
              email, password_hash, first_name, last_name, company_name, phone,
              role, status, email_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'admin', 'active', FALSE, NOW(), NOW())
          `;
          const userResult = await connection.execute(insertUserQuery, [
            affiliate.email,
            passwordHashToUse,
            affiliate.first_name,
            affiliate.last_name,
            affiliate.company_name || null,
            affiliate.phone || null
          ]);
          adminUserId = userResult[0].insertId;
          console.log(`✅ Created admin user with ID: ${adminUserId}`);
        }
        
        // Create admin profile
        const adminPermissions = JSON.stringify([
          'clients.create', 'clients.read', 'clients.update', 'clients.delete',
          'disputes.create', 'disputes.read', 'disputes.update', 'disputes.delete',
          'reports.view', 'reports.export',
          'analytics.view',
          'affiliate.access'
        ]);
        
        // Create admin profile if not exists
        const existingProfileRows = await connection.execute(
          'SELECT id FROM admin_profiles WHERE user_id = ?',
          [adminUserId]
        );
        const hasProfile = Array.isArray(existingProfileRows[0]) ? existingProfileRows[0].length > 0 : false;
        if (!hasProfile) {
          const insertAdminProfileQuery = `
            INSERT INTO admin_profiles (
              user_id, permissions, access_level, is_active, 
              created_at, updated_at, created_by, updated_by
            ) VALUES (?, ?, 'admin', TRUE, NOW(), NOW(), ?, ?)
          `;
          await connection.execute(insertAdminProfileQuery, [
            adminUserId,
            adminPermissions,
            adminUserId,
            adminUserId
          ]);
          console.log(`✅ Created admin profile for user ID: ${adminUserId}`);
        } else {
          console.log(`ℹ️ Admin profile already exists for user ID: ${adminUserId}`);
        }
        
        // Create subscription
        const now = new Date();
        const endDate = new Date(now);
        if (planType === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (planType === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (planType === 'lifetime') {
          endDate.setFullYear(endDate.getFullYear() + 100);
        }
        
        const upsertSubscriptionQuery = `
          INSERT INTO subscriptions (
            user_id, plan_name, status, current_period_start, 
            current_period_end, plan_type, created_at, updated_at
          ) VALUES (?, ?, 'active', ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            plan_name = VALUES(plan_name),
            status = 'active',
            current_period_start = VALUES(current_period_start),
            current_period_end = VALUES(current_period_end),
            plan_type = VALUES(plan_type),
            cancel_at_period_end = FALSE,
            updated_at = NOW()
        `;
        await connection.execute(upsertSubscriptionQuery, [
          adminUserId,
          planName,
          now,
          endDate,
          planType
        ]);
        console.log(`✅ Upserted subscription for user ID: ${adminUserId}`);
        
        // Update affiliate record to link with admin user and update plan_type
        const updateAffiliateQuery = `
          UPDATE affiliates 
          SET admin_id = ?, status = 'active', plan_type = 'paid_partner', updated_at = NOW()
          WHERE id = ?
        `;
        await connection.execute(updateAffiliateQuery, [adminUserId, affiliate.id]);
        console.log(`✅ Updated affiliate record to link with admin user ID: ${adminUserId}`);
        return adminUserId;
      });
      
      console.log(`🎉 Successfully upgraded affiliate ${affiliateEmail} to admin user`);
      
      return {
        success: true,
        adminUserId: connection,
        message: 'Affiliate successfully upgraded to admin user'
      };
      
    } catch (error) {
      console.error('❌ Error upgrading affiliate to admin:', error);
      return {
        success: false,
        message: `Failed to upgrade affiliate: ${error.message}`
      };
    }
  }
  
  /**
   * Check if a user is an affiliate by email
   * @param {string} email - Email to check
   * @returns {Promise<{isAffiliate: boolean, affiliate?: object}>}
   */
  async checkIfAffiliate(email) {
    try {
      const affiliateRows = await executeQuery(
        'SELECT * FROM affiliates WHERE email = ?',
        [email]
      );
      
      if (affiliateRows && affiliateRows.length > 0) {
        return {
          isAffiliate: true,
          affiliate: affiliateRows[0]
        };
      }
      
      return { isAffiliate: false };
    } catch (error) {
      console.error('Error checking if user is affiliate:', error);
      return { isAffiliate: false };
    }
  }
}

export default AffiliateUpgradeService;