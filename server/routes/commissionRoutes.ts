import express from 'express';
import { commissionController } from '../controllers/commissionController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Commission processing routes
router.post('/process-purchase', 
  authenticateToken, 
  commissionController.processPurchase
);

// Affiliate commission routes (require affiliate authentication)
router.get('/summary', 
  authenticateToken, 
  commissionController.getCommissionSummary
);

router.get('/history', 
  authenticateToken, 
  commissionController.getCommissionHistory
);

// Admin commission management routes
router.get('/pending', 
  authenticateToken, 
  requireRole('admin'), 
  commissionController.getPendingCommissions
);

router.post('/mark-paid', 
  authenticateToken, 
  requireRole('admin'), 
  commissionController.markCommissionsAsPaid
);

router.get('/performance', 
  authenticateToken, 
  requireRole('admin'), 
  commissionController.getAffiliatePerformance
);

router.get('/payout-status/:affiliateId',
  authenticateToken,
  requireRole('super_admin'),
  commissionController.getMonthlyPayoutStatus
);

// Public validation route
router.get('/validate/:affiliateId', 
  commissionController.validateReferralLink
);

export default router;
