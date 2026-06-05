import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { executeQuery, executeTransaction } from '../database/mysqlConfig.js';
import { Affiliate, AffiliateReferral, PricingPlan } from '../database/mysqlSchema.js';

interface CommissionCalculation {
  affiliateId: number;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  planId?: number;
  transactionId?: string;
  level: number;
  affiliateTypeAtPayout?: 'free' | 'paid';
}

interface PurchaseData {
  userId: number;
  planId: number;
  amount: number;
  transactionId: string;
  affiliateId?: number;
  paymentMethod?: string;
}

interface CommissionSummary {
  totalEarnings: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalReferrals: number;
  thisMonthEarnings: number;
}

class CommissionService {
  /**
   * Calculate tiered commission rate based on affiliate plan type and referral count
   */
  private calculateTieredCommissionRate(planType: string, paidReferralsCount: number): number {
    if (planType === 'free' || planType === 'starter') {
      // Free plan affiliate: 10% until 100 paid referrals, 15% on 100 or more
      return paidReferralsCount >= 100 ? 15.0 : 10.0;
    } else if (planType === 'pro' || planType === 'premium' || planType === 'partner' || planType === 'paid_partner') {
      // Paid partner: 20% until 100 paid referrals, 25% on 100 or more
      return paidReferralsCount >= 100 ? 25.0 : 20.0;
    }
    
    // Default fallback
    return 10.0;
  }

  private async getCommissionSettings(): Promise<{ level2RateFree: number; level2RatePaid: number }> {
    const defaults = { level2RateFree: 2, level2RatePaid: 5 };
    try {
      const rows = await executeQuery(
        `SELECT setting_key, setting_value 
         FROM system_settings 
         WHERE setting_key IN (?, ?, ?)`,
        [
          'affiliate.commission_level2_rate_free',
          'affiliate.commission_level2_rate_paid',
          'affiliate.commission_level2_rate'
        ]
      ) as any[];
      const map = new Map<string, number>();
      for (const row of rows || []) {
        if (row?.setting_key) {
          const value = Number(row.setting_value);
          if (Number.isFinite(value)) {
            map.set(String(row.setting_key), value);
          }
        }
      }
      const fallbackLevel2 = map.get('affiliate.commission_level2_rate');
      const level2RateFree = map.get('affiliate.commission_level2_rate_free') ?? (fallbackLevel2 ?? defaults.level2RateFree);
      const level2RatePaid = map.get('affiliate.commission_level2_rate_paid') ?? (fallbackLevel2 ?? defaults.level2RatePaid);
      return {
        level2RateFree,
        level2RatePaid
      };
    } catch {
      return defaults;
    }
  }

  private resolveAffiliateType(planType?: string | null): 'free' | 'paid' {
    if (!planType) {
      return 'free';
    }
    const normalized = String(planType).toLowerCase();
    if (normalized === 'paid' || normalized === 'paid_partner' || normalized === 'pro' || normalized === 'premium' || normalized === 'partner') {
      return 'paid';
    }
    return 'free';
  }

  /**
   * Update affiliate's paid referrals count
   */
  private async updateAffiliatePaidReferralsCount(affiliateId: number): Promise<void> {
    try {
      // Count paid referrals for this affiliate
      const countResult = await executeQuery(
        `SELECT COUNT(*) as count FROM affiliate_referrals 
         WHERE affiliate_id = ? AND status = 'paid'`,
        [affiliateId]
      ) as any[];
      
      const paidCount = countResult[0]?.count || 0;
      
      // Update the affiliate's paid_referrals_count
      await executeQuery(
        `UPDATE affiliates SET paid_referrals_count = ? WHERE id = ?`,
        [paidCount, affiliateId]
      );
      
      console.log(`Updated affiliate ${affiliateId} paid referrals count to ${paidCount}`);
    } catch (error) {
      console.error(`Error updating paid referrals count for affiliate ${affiliateId}:`, error);
    }
  }

  /**
   * Resolve an affiliate ID from various referral formats
   * Accepts numeric IDs, emails, or name slugs (first+last)
   */
  async resolveAffiliateId(candidate: string | number): Promise<number | null> {
    try {
      // Normalize candidate
      const raw = String(candidate).trim();
      // Try numeric ID first
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        const rows = await executeQuery(
          'SELECT id FROM affiliates WHERE id = ? AND status = "active"',
          [parsed]
        ) as RowDataPacket[];
        if (rows && rows.length > 0) {
          return rows[0].id as number;
        }
      }

      // Try resolving by email or name slug
      const rows = await executeQuery(
        `SELECT id
         FROM affiliates
         WHERE status = 'active' AND (
           email = ?
           OR LOWER(CONCAT(first_name, last_name)) = LOWER(?)
           OR LOWER(REPLACE(CONCAT(first_name, ' ', last_name), ' ', '')) = LOWER(?)
         )
         ORDER BY id ASC
         LIMIT 1`,
        [raw, raw, raw]
      ) as RowDataPacket[];

      if (rows && rows.length > 0) {
        return rows[0].id as number;
      }

      return null;
    } catch (error) {
      console.error('Error resolving affiliate ID from candidate:', candidate, error);
      return null;
    }
  }

  /**
   * Calculate commission for a purchase
   */
  async calculateCommission(purchaseData: PurchaseData): Promise<CommissionCalculation | null> {
    try {
      // Get affiliate information for the user
      const affiliateResult = await executeQuery(
        `SELECT a.*, u.email as admin_email 
         FROM affiliates a
         JOIN users u ON a.admin_id = u.id
         WHERE a.id IN (
           SELECT affiliate_id FROM affiliate_referrals 
           WHERE referred_user_id = ? 
           ORDER BY created_at ASC 
           LIMIT 1
         )`,
        [purchaseData.userId]
      ) as any[];

      if (affiliateResult.length === 0) {
        return null;
      }

      const affiliate = affiliateResult[0];
      const commissionAmount = (purchaseData.amount * affiliate.commission_rate) / 100;
      const affiliateType = this.resolveAffiliateType(affiliate.plan_type);

      return {
        affiliateId: affiliate.id,
        amount: purchaseData.amount,
        commissionRate: affiliate.commission_rate,
        commissionAmount,
        transactionId: purchaseData.transactionId,
        planId: purchaseData.planId,
        level: 1,
        affiliateTypeAtPayout: affiliateType
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
      return null;
    }
  }

  /**
   * Calculate hierarchical commissions for a purchase using tiered commission system
   */
  /**
   * Calculate hierarchical commissions for a purchase
   * This method handles both explicit affiliate ID and user-based referral lookup
   */
  async calculateHierarchicalCommissions(purchaseData: PurchaseData): Promise<CommissionCalculation[]> {
    try {
      const commissions: CommissionCalculation[] = [];
      const settings = await this.getCommissionSettings();

      // If an explicit affiliateId is provided, traverse hierarchy from that ID
      if (purchaseData.affiliateId) {
        let currentAffiliateId = purchaseData.affiliateId;
        let level = 1;
        const maxLevels = 2;
        let childParentCommissionRate: number | null = null;

        while (currentAffiliateId && level <= maxLevels) {
          const affiliateRows = await executeQuery(
            'SELECT id, parent_affiliate_id, commission_rate, parent_commission_rate, affiliate_level, plan_type, paid_referrals_count FROM affiliates WHERE id = ? AND status = "active"',
            [currentAffiliateId]
          );

          if (!affiliateRows || affiliateRows.length === 0) {
            break;
          }

          const affiliate = affiliateRows[0];
          let commissionRate = 0;
          const affiliateType = this.resolveAffiliateType(affiliate.plan_type);

          if (level === 1) {
            commissionRate = this.calculateTieredCommissionRate(affiliate.plan_type, affiliate.paid_referrals_count || 0);
            childParentCommissionRate = affiliate.parent_commission_rate ?? null;
          } else {
            commissionRate = childParentCommissionRate && childParentCommissionRate > 0
              ? childParentCommissionRate
              : affiliateType === 'paid'
                ? settings.level2RatePaid
                : settings.level2RateFree;
          }

          if (commissionRate > 0) {
            const commissionAmount = (purchaseData.amount * commissionRate) / 100;
            commissions.push({
              affiliateId: affiliate.id,
              amount: purchaseData.amount,
              commissionRate,
              commissionAmount,
              planId: purchaseData.planId,
              transactionId: `${purchaseData.transactionId}_L${level}`,
              level,
              affiliateTypeAtPayout: affiliateType
            });
          }

          currentAffiliateId = affiliate.parent_affiliate_id;
          level++;
        }

        console.log(`Commission attribution via explicit affiliateId=${purchaseData.affiliateId}, levels=${commissions.length}`);
        return commissions;
      }

      // Fallback: derive affiliate hierarchy from the referred user
      const affiliateHierarchy = await this.getAffiliateHierarchy(purchaseData.userId);

      if (affiliateHierarchy.length === 0) {
        console.warn(`No referring affiliate found for userId=${purchaseData.userId}; commissions not attributed.`);
        return commissions;
      }

      for (let i = 0; i < affiliateHierarchy.length; i++) {
        const affiliate = affiliateHierarchy[i];
        let commissionRate = 0;
        const affiliateType = this.resolveAffiliateType(affiliate.plan_type);

        if (i === 0) {
          commissionRate = this.calculateTieredCommissionRate(affiliate.plan_type, affiliate.paid_referrals_count || 0);
        } else {
          const childAffiliate = affiliateHierarchy[i - 1];
          const configuredParentRate = childAffiliate?.parent_commission_rate ?? null;
          commissionRate = configuredParentRate && configuredParentRate > 0
            ? configuredParentRate
            : affiliateType === 'paid'
              ? settings.level2RatePaid
              : settings.level2RateFree;
        }

        if (commissionRate > 0) {
          const commissionAmount = (purchaseData.amount * commissionRate) / 100;
          commissions.push({
            affiliateId: affiliate.id,
            amount: purchaseData.amount,
            commissionRate,
            commissionAmount,
            transactionId: `${purchaseData.transactionId}_L${i + 1}`,
            planId: purchaseData.planId,
            level: i + 1,
            affiliateTypeAtPayout: affiliateType
          });
        }
      }

      console.log(`Commission attribution via referral lookup for userId=${purchaseData.userId}, levels=${commissions.length}`);
      return commissions;
    } catch (error) {
      console.error('Error calculating hierarchical commissions:', error);
      throw error;
    }
  }
  /**
   * Get the affiliate hierarchy for a user (from direct affiliate up to root)
   */
  async getAffiliateHierarchy(userId: number): Promise<any[]> {
    try {
      // First, find the direct affiliate who referred this user
      // Rewrite to avoid LIMIT in subquery for MariaDB compatibility
      const directAffiliateResult = await executeQuery(
        `SELECT a.*, u.email as admin_email 
         FROM affiliates a
         JOIN users u ON a.admin_id = u.id
         JOIN (
           SELECT affiliate_id 
           FROM affiliate_referrals 
           WHERE referred_user_id = ? 
           ORDER BY created_at ASC 
           LIMIT 1
         ) ar ON a.id = ar.affiliate_id`,
        [userId]
      ) as any[];

      if (directAffiliateResult.length === 0) {
        console.log(`No direct affiliate found for user ${userId}. Trying admin-based parent fallback...`);

        // Fallback path: if the purchasing user is an admin who has an affiliate profile,
        // attribute commissions to that affiliate's parent (the recruiter) chain.
        // This covers purchases made inside the dashboard where no referral record exists yet.
        const adminAffiliateRows = await executeQuery(
          `SELECT id, parent_affiliate_id 
           FROM affiliates 
           WHERE admin_id = ? AND status = 'active' 
           ORDER BY created_at ASC 
           LIMIT 1`,
          [userId]
        ) as any[];

        if (!adminAffiliateRows || adminAffiliateRows.length === 0) {
          console.log(`No affiliate profile found for admin user ${userId}; cannot derive parent chain.`);
          return [];
        }

        const parentId = adminAffiliateRows[0]?.parent_affiliate_id;
        if (!parentId || parentId === adminAffiliateRows[0]?.id) {
          console.log(`Admin user ${userId} affiliate profile has no valid parent; stopping attribution.`);
          return [];
        }

        // Load the parent affiliate as the starting point
        const parentRows = await executeQuery(
          `SELECT a.*, u.email as admin_email 
           FROM affiliates a 
           LEFT JOIN users u ON a.admin_id = u.id 
           WHERE a.id = ? AND a.status = 'active' 
           LIMIT 1`,
          [parentId]
        ) as any[];

        if (!parentRows || parentRows.length === 0) {
          console.log(`Parent affiliate ${parentId} not found or inactive for admin user ${userId}.`);
          return [];
        }

        const hierarchy: any[] = [];
        let currentAffiliate = parentRows[0];
        const visitedAffiliates = new Set<number>();
        console.log(`Building fallback hierarchy from parent affiliate ${currentAffiliate.id} for admin user ${userId}`);

        while (currentAffiliate && !visitedAffiliates.has(currentAffiliate.id)) {
          visitedAffiliates.add(currentAffiliate.id);
          hierarchy.push(currentAffiliate);

          if (
            currentAffiliate.parent_affiliate_id &&
            currentAffiliate.parent_affiliate_id !== currentAffiliate.id
          ) {
            const nextRows = await executeQuery(
              `SELECT a.*, u.email as admin_email 
               FROM affiliates a 
               LEFT JOIN users u ON a.admin_id = u.id 
               WHERE a.id = ? AND a.status = 'active' 
               LIMIT 1`,
              [currentAffiliate.parent_affiliate_id]
            ) as any[];

            if (nextRows && nextRows.length > 0) {
              currentAffiliate = nextRows[0];
            } else {
              console.log(
                `Parent affiliate ${currentAffiliate.parent_affiliate_id} not found or already visited, stopping fallback hierarchy`
              );
              break;
            }
          } else {
            console.log(`Reached root affiliate ${currentAffiliate.id} in fallback hierarchy`);
            break;
          }
        }

        console.log(`Built fallback hierarchy with ${hierarchy.length} levels for admin user ${userId}`);
        return hierarchy;
      }

      const hierarchy: any[] = [];
      let currentAffiliate = directAffiliateResult[0];
      const visitedAffiliates = new Set<number>(); // Prevent circular references

      console.log(`Building hierarchy starting from affiliate ${currentAffiliate.id}`);

      // Build the hierarchy from direct affiliate up to root
      while (currentAffiliate && !visitedAffiliates.has(currentAffiliate.id)) {
        visitedAffiliates.add(currentAffiliate.id);
        hierarchy.push(currentAffiliate);
        
        console.log(`Added affiliate ${currentAffiliate.id} to hierarchy (level ${hierarchy.length})`);

        if (currentAffiliate.parent_affiliate_id && currentAffiliate.parent_affiliate_id !== currentAffiliate.id) {
          // Get parent affiliate
          const parentResult = await executeQuery(
            `SELECT a.*, u.email as admin_email 
             FROM affiliates a
             JOIN users u ON a.admin_id = u.id
             WHERE a.id = ? AND a.status = 'active'`,
            [currentAffiliate.parent_affiliate_id]
          ) as any[];

          if (parentResult.length > 0 && !visitedAffiliates.has(parentResult[0].id)) {
            currentAffiliate = parentResult[0];
          } else {
            console.log(`Parent affiliate ${currentAffiliate.parent_affiliate_id} not found or already visited, stopping hierarchy`);
            break;
          }
        } else {
          // Reached root or no parent
          console.log(`Reached root affiliate ${currentAffiliate.id}`);
          break;
        }
      }

      console.log(`Built hierarchy with ${hierarchy.length} levels for user ${userId}`);
      return hierarchy;
    } catch (error) {
      console.error('Error getting affiliate hierarchy:', error);
      return [];
    }
  }

  /**
   * Calculate hierarchical commissions for multi-level affiliates
   */
  /**
   * Record multiple commissions for hierarchical structure
   */
  async recordHierarchicalCommissions(commissions: CommissionCalculation[], userId: number): Promise<number[]> {
    try {
      const commissionIds: number[] = [];

      // Attempt to resolve current subscription_id for the payer user (if any)
      let activeSubscriptionId: string | null = null;
      try {
        const subRows = await executeQuery(
          `SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`,
          [userId]
        ) as any[];
        if (subRows && subRows.length > 0 && subRows[0].stripe_subscription_id) {
          activeSubscriptionId = String(subRows[0].stripe_subscription_id);
        }
      } catch {}

      for (const commission of commissions) {
        // Prefer updating an existing pending referral without transaction_id
        const pendingReferralRows = await executeQuery(
          `SELECT id FROM affiliate_referrals 
           WHERE affiliate_id = ? AND referred_user_id = ? AND (transaction_id IS NULL OR transaction_id = '') 
           ORDER BY created_at ASC LIMIT 1`,
          [commission.affiliateId, userId]
        ) as any[];

        let referralId: number;
        if (pendingReferralRows && pendingReferralRows.length > 0) {
          referralId = pendingReferralRows[0].id;
          await executeQuery(
            `UPDATE affiliate_referrals 
             SET commission_amount = ?, commission_rate = ?, transaction_id = ?, 
                 status = 'paid', payment_date = NOW(), conversion_date = NOW(), notes = ?, updated_at = NOW()
             WHERE id = ?`,
            [
              commission.commissionAmount,
              commission.commissionRate,
              commission.transactionId,
              'Subscription purchase',
              referralId
            ]
          );
        } else {
          // If a referral for this exact transaction exists, reuse it
          const existingReferralRows = await executeQuery(
            `SELECT id FROM affiliate_referrals WHERE affiliate_id = ? AND referred_user_id = ? AND transaction_id = ? LIMIT 1`,
            [commission.affiliateId, userId, commission.transactionId]
          ) as any[];

          if (existingReferralRows && existingReferralRows.length > 0) {
            referralId = existingReferralRows[0].id;
            await executeQuery(
              `UPDATE affiliate_referrals 
               SET commission_amount = ?, commission_rate = ?, 
                   status = 'paid', payment_date = NOW(), conversion_date = NOW(), updated_at = NOW()
               WHERE id = ?`,
              [
                commission.commissionAmount,
                commission.commissionRate,
                referralId
              ]
            );
          } else {
            const result = await executeQuery(
              `INSERT INTO affiliate_referrals (
                 affiliate_id, referred_user_id, commission_amount, commission_rate,
                 transaction_id, status, referral_date, conversion_date, payment_date, notes, created_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, 'paid', NOW(), NOW(), NOW(), ?, NOW(), NOW())`,
              [
                commission.affiliateId,
                userId,
                commission.commissionAmount,
                commission.commissionRate,
                commission.transactionId,
                'Subscription purchase'
              ]
            ) as ResultSetHeader;
            referralId = result.insertId;
          }
        }

        commissionIds.push(referralId);

        const userInfoRows = await executeQuery(
          `SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
          [userId]
        ) as any[];
        const customerName = userInfoRows && userInfoRows.length > 0 ? `${userInfoRows[0].first_name || ''} ${userInfoRows[0].last_name || ''}`.trim() || 'Unknown' : 'Unknown';
        const customerEmail = userInfoRows && userInfoRows.length > 0 ? userInfoRows[0].email || 'unknown@example.com' : 'unknown@example.com';

        const existingCommissionRows = await executeQuery(
          `SELECT id FROM affiliate_commissions WHERE referral_id = ? LIMIT 1`,
          [referralId]
        ) as any[];

        if (!existingCommissionRows || existingCommissionRows.length === 0) {
        await executeQuery(
          `INSERT INTO affiliate_commissions (
             affiliate_id, referral_id, customer_id, customer_name, customer_email,
             order_value, commission_rate, commission_amount, status, tier, product,
             commission_level, affiliate_type_at_payout, subscription_id, payer_user_id,
             order_date, tracking_code, commission_type, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'Bronze', 'Subscription', ?, ?, ?, ?, NOW(), ?, 'signup', NOW(), NOW())`,
            [
              commission.affiliateId,
              referralId,
              userId,
              customerName,
              customerEmail,
              commission.amount,
              commission.commissionRate,
              commission.commissionAmount,
              commission.level,
              commission.affiliateTypeAtPayout || 'free',
              activeSubscriptionId,
              userId,
              commission.transactionId || null
            ]
          );
        }

         // Update affiliate's total earnings and paid referrals count
         await executeQuery(
           'UPDATE affiliates SET total_earnings = total_earnings + ? WHERE id = ?',
           [commission.commissionAmount, commission.affiliateId]
         );
         
         // Update paid referrals count after recording commission
         await this.updateAffiliatePaidReferralsCount(commission.affiliateId);
       }

       return commissionIds;
     } catch (error) {
       console.error('Error recording hierarchical commissions:', error);
       throw error;
     }
   }

  /**
   * Record a commission for a successful purchase
   */
  async recordCommission(calculation: CommissionCalculation, userId: number): Promise<number> {
    try {
      // Validate that the user exists before creating referral record
      const userExists = await executeQuery(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      ) as any[];

      if (userExists.length === 0) {
        throw new Error(`Cannot create referral record: User with ID ${userId} does not exist`);
      }

      // Validate that the affiliate exists
      const affiliateExists = await executeQuery(
        'SELECT id FROM affiliates WHERE id = ?',
        [calculation.affiliateId]
      ) as any[];

      if (affiliateExists.length === 0) {
        throw new Error(`Cannot create referral record: Affiliate with ID ${calculation.affiliateId} does not exist`);
      }

      // Prefer updating an existing pending referral without transaction_id
      const pendingReferralRows = await executeQuery(
        `SELECT id FROM affiliate_referrals 
         WHERE affiliate_id = ? AND referred_user_id = ? AND (transaction_id IS NULL OR transaction_id = '') 
         ORDER BY created_at ASC LIMIT 1`,
        [calculation.affiliateId, userId]
      ) as any[];

      let referralId: number;
      if (pendingReferralRows && pendingReferralRows.length > 0) {
        referralId = pendingReferralRows[0].id;
        await executeQuery(
          `UPDATE affiliate_referrals 
           SET commission_amount = ?, commission_rate = ?, transaction_id = ?, 
               status = 'paid', payment_date = NOW(), conversion_date = NOW(), notes = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            calculation.commissionAmount,
            calculation.commissionRate,
            calculation.transactionId,
            'Subscription purchase',
            referralId
          ]
        );
      } else {
        // If a referral for this exact transaction exists, reuse it
        const existingReferralRows = await executeQuery(
          `SELECT id FROM affiliate_referrals WHERE affiliate_id = ? AND referred_user_id = ? AND transaction_id = ? LIMIT 1`,
          [calculation.affiliateId, userId, calculation.transactionId]
        ) as any[];

        if (existingReferralRows && existingReferralRows.length > 0) {
          referralId = existingReferralRows[0].id;
          await executeQuery(
            `UPDATE affiliate_referrals 
             SET commission_amount = ?, commission_rate = ?, 
                 status = 'paid', payment_date = NOW(), conversion_date = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [
              calculation.commissionAmount,
              calculation.commissionRate,
              referralId
            ]
          );
        } else {
          const result = await executeQuery(
            `INSERT INTO affiliate_referrals (
               affiliate_id, referred_user_id, commission_amount, commission_rate,
               transaction_id, status, referral_date, conversion_date, payment_date, notes, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, 'paid', NOW(), NOW(), NOW(), ?, NOW(), NOW())`,
            [
              calculation.affiliateId,
              userId,
              calculation.commissionAmount,
              calculation.commissionRate,
              calculation.transactionId,
              'Subscription purchase'
            ]
          ) as ResultSetHeader;
          referralId = result.insertId;
        }
      }

      const userInfoRows = await executeQuery(
        `SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1`,
        [userId]
      ) as any[];
      const customerName = userInfoRows && userInfoRows.length > 0 ? `${userInfoRows[0].first_name || ''} ${userInfoRows[0].last_name || ''}`.trim() || 'Unknown' : 'Unknown';
      const customerEmail = userInfoRows && userInfoRows.length > 0 ? userInfoRows[0].email || 'unknown@example.com' : 'unknown@example.com';

      const existingCommissionRows = await executeQuery(
        `SELECT id FROM affiliate_commissions WHERE referral_id = ? LIMIT 1`,
        [referralId]
      ) as any[];

      let activeSubscriptionId: string | null = null;
      try {
        const subRows = await executeQuery(
          `SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`,
          [userId]
        ) as any[];
        if (subRows && subRows.length > 0 && subRows[0].stripe_subscription_id) {
          activeSubscriptionId = String(subRows[0].stripe_subscription_id);
        }
      } catch {}

      if (!existingCommissionRows || existingCommissionRows.length === 0) {
        await executeQuery(
          `INSERT INTO affiliate_commissions (
             affiliate_id, referral_id, customer_id, customer_name, customer_email,
             order_value, commission_rate, commission_amount, status, tier, product,
             commission_level, affiliate_type_at_payout, subscription_id, payer_user_id,
             order_date, tracking_code, commission_type, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'Bronze', 'Subscription', ?, ?, ?, ?, NOW(), ?, 'signup', NOW(), NOW())`,
          [
            calculation.affiliateId,
            referralId,
            userId,
            customerName,
            customerEmail,
            calculation.amount,
            calculation.commissionRate,
            calculation.commissionAmount,
            calculation.level,
            calculation.affiliateTypeAtPayout || 'free',
            activeSubscriptionId,
            userId,
            calculation.transactionId || null
          ]
        );
      }

      // Update affiliate's total earnings
      await executeQuery(
        'UPDATE affiliates SET total_earnings = total_earnings + ? WHERE id = ?',
        [calculation.commissionAmount, calculation.affiliateId]
      );

      return referralId;
    } catch (error) {
      console.error('Error recording commission:', error);
      throw error;
    }
  }

  /**
   * Process a purchase and handle hierarchical commission attribution
   */
  async processPurchase(purchaseData: PurchaseData): Promise<{ success: boolean; commissionIds?: number[]; error?: string }> {
    try {
      const result = await executeTransaction(async (connection) => {
        // Calculate hierarchical commissions if affiliate is involved
        const commissions = await this.calculateHierarchicalCommissions(purchaseData);
        
        let commissionIds: number[] = [];
        
        if (commissions.length > 0) {
          // Record all hierarchical commissions
          commissionIds = await this.recordHierarchicalCommissions(commissions, purchaseData.userId);
          
          // Update affiliate statistics for all involved affiliates
          for (const commission of commissions) {
            await this.updateAffiliateStats(commission.affiliateId);
          }
        }

        // Record the purchase in billing_transactions if not already recorded
        await this.recordPurchaseTransaction(purchaseData);

        return { success: true, commissionIds };
      });

      return result;
    } catch (error) {
      console.error('Error processing purchase:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update affiliate statistics
   */
  private async updateAffiliateStats(affiliateId: number): Promise<void> {
    try {
      await executeQuery(
        `UPDATE affiliates 
         SET total_referrals = (
           SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = ?
         ),
         updated_at = NOW()
         WHERE id = ?`,
        [affiliateId, affiliateId]
      );
    } catch (error) {
      console.error('Error updating affiliate stats:', error);
      throw error;
    }
  }

  /**
   * Record purchase transaction
   */
  private async recordPurchaseTransaction(purchaseData: PurchaseData): Promise<void> {
    try {
      // Check if transaction already exists
      const existingRows = await executeQuery(
        'SELECT id FROM billing_transactions WHERE stripe_payment_intent_id = ?',
        [purchaseData.transactionId]
      ) as RowDataPacket[];

      if (existingRows.length === 0) {
        const allowedMethods = ['stripe', 'manual'];
        const rawMethod = (purchaseData.paymentMethod || 'stripe').toLowerCase();
        const safeMethod = allowedMethods.includes(rawMethod) ? rawMethod : 'stripe';
        // Record new transaction
        await executeQuery(
          `INSERT INTO billing_transactions 
           (user_id, amount, stripe_payment_intent_id, status, payment_method, plan_type, created_at) 
           VALUES (?, ?, ?, 'succeeded', ?, 'monthly', NOW())`,
          [
            purchaseData.userId,
            purchaseData.amount,
            purchaseData.transactionId,
            safeMethod
          ]
        );
      } else {
        // Update pending checkout transaction to succeeded
        const allowedMethods = ['stripe', 'manual'];
        const rawMethod = (purchaseData.paymentMethod || 'stripe').toLowerCase();
        const safeMethod = allowedMethods.includes(rawMethod) ? rawMethod : 'stripe';
        await executeQuery(
          `UPDATE billing_transactions 
           SET status = 'succeeded', amount = ?, payment_method = ?, updated_at = NOW()
           WHERE stripe_payment_intent_id = ?`,
          [purchaseData.amount, safeMethod, purchaseData.transactionId]
        );
      }
    } catch (error) {
      console.error('Error recording purchase transaction:', error);
      throw error;
    }
  }

  /**
   * Get commission summary for an affiliate
   */
  async getCommissionSummary(affiliateId: number): Promise<CommissionSummary> {
    try {
      const summaryRows = await executeQuery(
        `SELECT 
           COALESCE(SUM(commission_amount), 0) as total_earnings,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_commissions,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_commissions,
           COUNT(*) as total_referrals,
           COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN commission_amount ELSE 0 END), 0) as this_month_earnings
         FROM affiliate_referrals 
         WHERE affiliate_id = ?`,
        [affiliateId]
      ) as RowDataPacket[];

      return summaryRows[0] as CommissionSummary;
    } catch (error) {
      console.error('Error getting commission summary:', error);
      throw error;
    }
  }

  /**
   * Get detailed commission history for an affiliate
   */
  async getCommissionHistory(affiliateId: number, limit: number = 50, offset: number = 0): Promise<AffiliateReferral[]> {
    try {
      const limitNum = Math.min(500, Math.max(1, Math.floor(Number(limit) || 50)));
      const offsetNum = Math.max(0, Math.floor(Number(offset) || 0));
      const rows = await executeQuery(
        `SELECT ar.*, u.email as user_email, u.first_name, u.last_name
         FROM affiliate_referrals ar
         LEFT JOIN users u ON ar.referred_user_id = u.id
         WHERE ar.affiliate_id = ?
         ORDER BY ar.created_at DESC
         LIMIT ${limitNum} OFFSET ${offsetNum}`,
        [affiliateId]
      ) as RowDataPacket[];

      return rows as AffiliateReferral[];
    } catch (error) {
      console.error('Error getting commission history:', error);
      throw error;
    }
  }

  /**
   * Mark commissions as paid (for admin use)
   */
  async markCommissionsAsPaid(referralIds: number[]): Promise<boolean> {
    try {
      if (referralIds.length === 0) return true;

      const placeholders = referralIds.map(() => '?').join(',');
      await executeQuery(
        `UPDATE affiliate_referrals 
         SET status = 'paid', payment_date = NOW() 
         WHERE id IN (${placeholders}) AND status = 'pending'`,
        referralIds
      );

      return true;
    } catch (error) {
      console.error('Error marking commissions as paid:', error);
      return false;
    }
  }

  /**
   * Get pending commissions for admin review
   */
  async getPendingCommissions(adminId?: number): Promise<AffiliateReferral[]> {
    try {
      let query = `
        SELECT ar.*, a.first_name as affiliate_first_name, a.last_name as affiliate_last_name,
               a.email as affiliate_email, u.email as user_email, u.first_name as user_first_name,
               u.last_name as user_last_name
        FROM affiliate_referrals ar
        JOIN affiliates a ON ar.affiliate_id = a.id
        LEFT JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.status = 'pending'
      `;
      
      const params: any[] = [];
      
      if (adminId) {
        query += ' AND a.admin_id = ?';
        params.push(adminId);
      }
      
      query += ' ORDER BY ar.created_at DESC';

      const rows = await executeQuery(query, params) as RowDataPacket[];
      return rows as AffiliateReferral[];
    } catch (error) {
      console.error('Error getting pending commissions:', error);
      throw error;
    }
  }

  /**
   * Validate affiliate referral link
   */
  async validateReferralLink(affiliateId: number): Promise<boolean> {
    try {
      const rows = await executeQuery(
        'SELECT id FROM affiliates WHERE id = ? AND status = "active"',
        [affiliateId]
      ) as RowDataPacket[];
      
      return rows.length > 0;
    } catch (error) {
      console.error('Error validating referral link:', error);
      return false;
    }
  }

  /**
   * Process commission for a user purchase with hierarchical distribution
   */
  async processCommission(userId: number, amount: number): Promise<void> {
    try {
      // Create purchase data for hierarchical commission processing
      const purchaseData: PurchaseData = {
        userId,
        amount,
        planId: 0, // Default plan ID
        transactionId: `commission_${Date.now()}_${userId}`,
        paymentMethod: 'manual'
      };

      // Process hierarchical commissions
      const result = await this.processPurchase(purchaseData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process commission');
      }

      console.log(`Processed hierarchical commissions for user ${userId}, amount: $${amount}`);
    } catch (error) {
      console.error('Error processing commission:', error);
      throw error;
    }
  }
}

export const commissionService = new CommissionService();
export default CommissionService;
