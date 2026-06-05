import { Request, Response } from 'express';
import { commissionService } from '../services/commissionService';
import { RowDataPacket } from 'mysql2';
import { executeQuery } from '../database/mysqlConfig.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    adminId?: number;
  };
}

class CommissionController {
  /**
   * Process a purchase and handle commission attribution
   */
  async processPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { planId, amount, transactionId, affiliateId, paymentMethod } = req.body;
      const userId = req.user?.id;

      if (!userId || !planId || !amount || !transactionId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: planId, amount, transactionId'
        });
        return;
      }

      const purchaseData = {
        userId,
        planId: parseInt(planId),
        amount: parseFloat(amount),
        transactionId,
        affiliateId: affiliateId ? parseInt(affiliateId) : undefined,
        paymentMethod
      };

      const result = await commissionService.processPurchase(purchaseData);

      if (result.success) {
        res.json({
          success: true,
          message: 'Purchase processed successfully',
          commissionId: result.commissionId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to process purchase'
        });
      }
    } catch (error) {
      console.error('Error in processPurchase:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get commission summary for the authenticated affiliate or all affiliates for super admin
   */
  async getCommissionSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { affiliateId } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // For super admin, get summary for specific affiliate or overall summary
      if (userRole === 'super_admin' || userRole === 'admin') {
        if (affiliateId) {
          const summary = await commissionService.getCommissionSummary(parseInt(affiliateId as string));
          res.json({
            success: true,
            data: summary
          });
        } else {
          // Get overall summary for all affiliates
          const summaryRows = await executeQuery(
            `SELECT 
               COALESCE(SUM(commission_amount), 0) as total_earnings,
               COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_commissions,
               COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_commissions,
               COUNT(*) as total_referrals,
               COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN commission_amount ELSE 0 END), 0) as this_month_earnings
             FROM affiliate_commissions`
          ) as RowDataPacket[];
          
          res.json({
            success: true,
            data: summaryRows[0]
          });
        }
        return;
      }

      // For regular affiliate users
      res.status(403).json({
        success: false,
        error: 'Affiliate access not implemented for regular users'
      });
    } catch (error) {
      console.error('Error in getCommissionSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get commission history for the authenticated affiliate or all commissions for super admin
   */
  async getCommissionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { limit = 50, offset = 0, affiliateId } = req.query;
      const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));
      const offsetNum = Math.max(0, parseInt(String(offset), 10) || 0);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // For super admin, get all commissions or specific affiliate commissions
      if (userRole === 'super_admin' || userRole === 'admin') {
        let query = `
          SELECT ac.*, a.first_name as affiliate_first_name, a.last_name as affiliate_last_name,
                 a.email as affiliate_email
          FROM affiliate_commissions ac
          JOIN affiliates a ON ac.affiliate_id = a.id
        `;
        const params: any[] = [];
        
        if (affiliateId !== undefined) {
          const affiliateIdNum = parseInt(String(affiliateId), 10);
          if (!Number.isFinite(affiliateIdNum) || affiliateIdNum <= 0) {
            res.status(400).json({
              success: false,
              error: 'Valid affiliateId query parameter is required'
            });
            return;
          }

          query += ' WHERE ac.affiliate_id = ?';
          params.push(affiliateIdNum);
        }
        
        query += ` ORDER BY ac.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
        
        const rows = await executeQuery(query, params) as RowDataPacket[];
        
        res.json({
          success: true,
          data: rows
        });
        return;
      }

      // For regular affiliate users, find their affiliate record
      // Note: This assumes affiliates have their own authentication system
      // If affiliates are linked to users, this logic would need to be updated
      res.status(403).json({
        success: false,
        error: 'Affiliate access not implemented for regular users'
      });
    } catch (error) {
      console.error('Error in getCommissionHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get pending commissions (Admin only)
   */
  async getPendingCommissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const adminId = req.user?.adminId || req.user?.id;

      if (userRole !== 'super_admin' && userRole !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const pendingCommissions = await commissionService.getPendingCommissions(
        userRole === 'super_admin' ? undefined : adminId
      );

      res.json({
        success: true,
        data: pendingCommissions
      });
    } catch (error) {
      console.error('Error in getPendingCommissions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Mark commissions as paid (Admin only)
   */
  async markCommissionsAsPaid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const { referralIds } = req.body;

      if (userRole !== 'super_admin' && userRole !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      if (!Array.isArray(referralIds) || referralIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid referral IDs provided'
        });
        return;
      }

      const success = await commissionService.markCommissionsAsPaid(referralIds);

      if (success) {
        res.json({
          success: true,
          message: 'Commissions marked as paid successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to mark commissions as paid'
        });
      }
    } catch (error) {
      console.error('Error in markCommissionsAsPaid:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Validate affiliate referral link
   */
  async validateReferralLink(req: Request, res: Response): Promise<void> {
    try {
      const { affiliateId } = req.params;

      if (!affiliateId) {
        res.status(400).json({
          success: false,
          error: 'Affiliate ID is required'
        });
        return;
      }

      const isValid = await commissionService.validateReferralLink(parseInt(affiliateId));

      res.json({
        success: true,
        valid: isValid
      });
    } catch (error) {
      console.error('Error in validateReferralLink:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get affiliate performance metrics (Admin only)
   */
  async getAffiliatePerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const adminId = req.user?.adminId || req.user?.id;
      const { affiliateId, startDate, endDate } = req.query;

      if (userRole !== 'super_admin' && userRole !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      let query = `
        SELECT 
          a.id,
          a.first_name,
          a.last_name,
          a.email,
          a.total_earnings,
          a.total_referrals AS referral_count,
          COUNT(ar.id) as period_referrals,
          COALESCE(SUM(ar.commission_amount), 0) as period_earnings,
          COALESCE(SUM(ac.order_value), 0) as period_sales
        FROM affiliates a
        LEFT JOIN affiliate_referrals ar ON a.id = ar.affiliate_id
        LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      // Filter by admin if not super admin
      if (userRole !== 'super_admin') {
        conditions.push('a.admin_id = ?');
        params.push(adminId);
      }

      // Filter by specific affiliate if provided
      if (affiliateId) {
        conditions.push('a.id = ?');
        params.push(parseInt(affiliateId as string));
      }

      // Filter by date range if provided
      if (startDate) {
        conditions.push('((ar.created_at >= ? OR ar.created_at IS NULL) OR (ac.order_date >= ? OR ac.order_date IS NULL))');
        params.push(startDate, startDate);
      }

      if (endDate) {
        conditions.push('((ar.created_at <= ? OR ar.created_at IS NULL) OR (ac.order_date <= ? OR ac.order_date IS NULL))');
        params.push(endDate, endDate);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY a.id ORDER BY period_earnings DESC';

      const rows = await executeQuery(query, params) as RowDataPacket[];

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Error in getAffiliatePerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get last-month payout status and net earnings for an affiliate
   */
  async getMonthlyPayoutStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const { affiliateId } = req.params as any;
      const idNum = parseInt(String(affiliateId), 10);
      if (!idNum) {
        res.status(400).json({ success: false, error: 'Affiliate ID is required' });
        return;
      }

      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const nextPrev = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const commissionMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
      const payoutMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const startPrevMonthStr = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01 00:00:00`;
      const startThisMonthStr = `${nextPrev.getFullYear()}-${pad(nextPrev.getMonth() + 1)}-01 00:00:00`;
      const startNextMonthStr = `${nextMonthStart.getFullYear()}-${pad(nextMonthStart.getMonth() + 1)}-01 00:00:00`;

      await executeQuery(
        `CREATE TABLE IF NOT EXISTS affiliate_payouts (
           id INT AUTO_INCREMENT PRIMARY KEY,
           affiliate_id INT NOT NULL,
           admin_user_id INT NULL,
           commission_month CHAR(7) NOT NULL,
           payout_month CHAR(7) NOT NULL,
           amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
           invoice_id INT NULL,
           invoice_number VARCHAR(64) NULL,
           invoice_public_token VARCHAR(64) NULL,
           invoice_url VARCHAR(255) NULL,
           status ENUM('generated','emailed','paid','cancelled') DEFAULT 'generated',
           paid_at DATETIME NULL,
           notes VARCHAR(255) NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
           UNIQUE KEY uniq_affiliate_commission_month (affiliate_id, commission_month)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );

      try {
        await executeQuery(
          `ALTER TABLE affiliate_payouts
             ADD COLUMN IF NOT EXISTS payslip_number VARCHAR(64) NULL,
             ADD COLUMN IF NOT EXISTS payslip_token VARCHAR(64) NULL,
             ADD COLUMN IF NOT EXISTS payslip_url VARCHAR(255) NULL`
        );
      } catch (alterErr: any) {
        try { await executeQuery(`ALTER TABLE affiliate_payouts ADD COLUMN payslip_number VARCHAR(64) NULL`); } catch (e: any) {}
        try { await executeQuery(`ALTER TABLE affiliate_payouts ADD COLUMN payslip_token VARCHAR(64) NULL`); } catch (e: any) {}
        try { await executeQuery(`ALTER TABLE affiliate_payouts ADD COLUMN payslip_url VARCHAR(255) NULL`); } catch (e: any) {}
      }

      const payoutRows = await executeQuery<RowDataPacket[]>(
        `SELECT amount, status, invoice_url, payslip_url, commission_month, payout_month
         FROM affiliate_payouts
         WHERE affiliate_id = ? AND commission_month = ?
         LIMIT 1`,
        [idNum, commissionMonth]
      );

      let amount: number = 0;
      let isPaid = false;
      let invoiceUrl: string | undefined = undefined;
      let payslipUrl: string | undefined = undefined;

      if (Array.isArray(payoutRows) && payoutRows.length > 0) {
        isPaid = String(payoutRows[0].status || '').toLowerCase() === 'paid';
        invoiceUrl = payoutRows[0].invoice_url || undefined;
        payslipUrl = payoutRows[0].payslip_url || undefined;
        const amtFromPayout = Number(payoutRows[0].amount || 0);
        if (amtFromPayout > 0) {
          amount = amtFromPayout;
        }
      }

      if (amount <= 0) {
        const colExists = async (table: string, column: string) => {
          try {
            const rows = await executeQuery<RowDataPacket[]>(
              `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
              [table, column]
            );
            return Array.isArray(rows) && rows.length > 0;
          } catch {
            return false;
          }
        };

        let gross = 0;
        const hasCommAmtCC = await colExists('affiliate_commissions', 'commission_amount');
        const hasOrderDateCC = await colExists('affiliate_commissions', 'order_date');
        const hasCreatedCC = await colExists('affiliate_commissions', 'created_at');
        const hasApprovalCC = await colExists('affiliate_commissions', 'approval_date');

        if (hasCommAmtCC && hasOrderDateCC) {
          try {
            const sumOrderRows = await executeQuery<RowDataPacket[]>(
              `SELECT COALESCE(SUM(commission_amount), 0) AS total
               FROM affiliate_commissions
               WHERE affiliate_id = ?
                 AND order_date >= ? AND order_date < ?
                 AND status IN ('pending','approved','paid')`,
              [idNum, startPrevMonthStr, startThisMonthStr]
            );
            gross = sumOrderRows && sumOrderRows[0] ? Number(sumOrderRows[0].total || 0) : 0;
          } catch {}
        }

        if (gross <= 0 && hasCommAmtCC && hasCreatedCC) {
          try {
            const sumCreatedRows = await executeQuery<RowDataPacket[]>(
              `SELECT COALESCE(SUM(commission_amount), 0) AS total
               FROM affiliate_commissions
               WHERE affiliate_id = ?
                 AND created_at >= ? AND created_at < ?
                 AND status IN ('pending','approved','paid')`,
              [idNum, startPrevMonthStr, startThisMonthStr]
            );
            gross = sumCreatedRows && sumCreatedRows[0] ? Number(sumCreatedRows[0].total || 0) : 0;
          } catch {}
        }

        if (gross <= 0 && hasCommAmtCC && hasApprovalCC) {
          try {
            const sumApprovalRows = await executeQuery<RowDataPacket[]>(
              `SELECT COALESCE(SUM(commission_amount), 0) AS total
               FROM affiliate_commissions
               WHERE affiliate_id = ?
                 AND approval_date >= ? AND approval_date < ?
                 AND status IN ('approved','paid')`,
              [idNum, startPrevMonthStr, startThisMonthStr]
            );
            gross = sumApprovalRows && sumApprovalRows[0] ? Number(sumApprovalRows[0].total || 0) : 0;
          } catch {}
        }

        const hasPaymentCC = await colExists('affiliate_commissions', 'payment_date');
        if (gross <= 0 && hasCommAmtCC && hasPaymentCC) {
          try {
            const sumPaymentRows = await executeQuery<RowDataPacket[]>(
              `SELECT COALESCE(SUM(commission_amount), 0) AS total
               FROM affiliate_commissions
               WHERE affiliate_id = ?
                 AND payment_date >= ? AND payment_date < ?
                 AND status IN ('paid')`,
              [idNum, startPrevMonthStr, startThisMonthStr]
            );
            gross = sumPaymentRows && sumPaymentRows[0] ? Number(sumPaymentRows[0].total || 0) : 0;
          } catch {}
        }

        if (gross <= 0) {
          const hasCommAmtAR = await colExists('affiliate_referrals', 'commission_amount');
          const hasReferralDateAR = await colExists('affiliate_referrals', 'referral_date');
          if (hasCommAmtAR && hasReferralDateAR) {
            try {
              const sumRefRows = await executeQuery<RowDataPacket[]>(
                `SELECT COALESCE(SUM(commission_amount), 0) AS total
                 FROM affiliate_referrals
                 WHERE affiliate_id = ?
                   AND referral_date >= ? AND referral_date < ?
                   AND status IN ('pending','approved','paid','converted')`,
                [idNum, startPrevMonthStr, startThisMonthStr]
              );
              gross = sumRefRows && sumRefRows[0] ? Number(sumRefRows[0].total || 0) : 0;
            } catch {}
          }
        }

        amount = Number(gross.toFixed(2));
      }

      if (!isPaid) {
        await executeQuery(
          `CREATE TABLE IF NOT EXISTS commission_payments (
             id INT AUTO_INCREMENT PRIMARY KEY,
             affiliate_id INT NOT NULL,
             amount DECIMAL(10, 2) NOT NULL,
             transaction_id VARCHAR(255) NOT NULL UNIQUE,
             payment_method ENUM('bank_transfer','paypal','stripe','check','other') NOT NULL DEFAULT 'bank_transfer',
             status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
             payment_date DATETIME NOT NULL,
             notes TEXT,
             proof_of_payment_url VARCHAR(500),
             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
             INDEX idx_affiliate_id (affiliate_id),
             INDEX idx_status (status),
             INDEX idx_payment_date (payment_date)
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        );
        const payRows = await executeQuery<RowDataPacket[]>(
          `SELECT id FROM commission_payments
           WHERE affiliate_id = ? AND status = 'completed'
             AND payment_date >= ? AND payment_date < ?
           ORDER BY payment_date DESC LIMIT 1`,
          [idNum, startThisMonthStr, startNextMonthStr]
        );
        isPaid = Array.isArray(payRows) && payRows.length > 0;
      }

      res.json({
        success: true,
        data: {
          isPaid,
          amount,
          commission_month: commissionMonth,
          payout_month: payoutMonth,
          invoice_url: invoiceUrl || null,
          payslip_url: payslipUrl || null
        }
      });
    } catch (error) {
      console.error('Error in getMonthlyPayoutStatus:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export const commissionController = new CommissionController();
export default CommissionController;
