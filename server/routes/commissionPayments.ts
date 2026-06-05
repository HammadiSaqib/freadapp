import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { executeQuery, getRecords, updateRecord } from '../database/mysqlConfig.js';
import { RowDataPacket } from 'mysql2';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-proofs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed'));
    }
  }
});

interface CommissionPayment extends RowDataPacket {
  id: number;
  affiliate_id: number;
  amount: number;
  transaction_id: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  payment_date: string;
  notes?: string;
  proof_of_payment_url?: string;
  created_at: string;
  updated_at: string;
}

// Get all commission payments (super admin only)
router.get('/', 
  authenticateToken, 
  requireRole('super_admin'), 
  async (req, res) => {
    try {
      const payments = await getRecords<CommissionPayment>(
        `SELECT cp.*, a.first_name, a.last_name, a.email 
         FROM commission_payments cp 
         JOIN affiliates a ON cp.affiliate_id = a.id 
         ORDER BY cp.created_at DESC`
      );
      
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Error fetching commission payments:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch commission payments' });
    }
  }
);

// Get commission payments for a specific affiliate
router.get('/affiliate/:affiliateId', 
  authenticateToken, 
  requireRole('super_admin'), 
  async (req, res) => {
    try {
      const { affiliateId } = req.params;
      
      const payments = await getRecords<CommissionPayment>(
        'SELECT * FROM commission_payments WHERE affiliate_id = ? ORDER BY created_at DESC',
        [affiliateId]
      );
      
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Error fetching affiliate payment history:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
    }
  }
);

// Record a new commission payment
router.post('/', 
  authenticateToken, 
  requireRole('super_admin'),
  upload.single('proof_of_payment'),
  async (req, res) => {
    try {
      const { affiliate_id, amount, transaction_id, payment_method, notes } = req.body;
      const proof_of_payment_url = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;
      
      // Validate required fields
      if (!affiliate_id || !amount || !transaction_id || !payment_method) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: affiliate_id, amount, transaction_id, payment_method' 
        });
      }
      
      // Check if affiliate exists
      const affiliateCheck = await getRecords<RowDataPacket>(
        'SELECT id FROM affiliates WHERE id = ?',
        [affiliate_id]
      );
      
      if (affiliateCheck.length === 0) {
        return res.status(404).json({ success: false, message: 'Affiliate not found' });
      }
      
      // Ensure commission_payments table exists before querying it
      await executeQuery(
        `CREATE TABLE IF NOT EXISTS commission_payments (
           id INT AUTO_INCREMENT PRIMARY KEY,
           affiliate_id INT NOT NULL,
           amount DECIMAL(10, 2) NOT NULL,
           transaction_id VARCHAR(255) NOT NULL UNIQUE,
           payment_method ENUM('bank_transfer','paypal','stripe','check','other','manual') NOT NULL DEFAULT 'bank_transfer',
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

      // Try to add 'manual' to payment_method enum if it doesn't exist
      try {
        await executeQuery(
          `ALTER TABLE commission_payments MODIFY COLUMN payment_method ENUM('bank_transfer','paypal','stripe','check','other','manual') NOT NULL DEFAULT 'bank_transfer'`
        );
      } catch {}

      // Check if transaction ID already exists
      const existingTransaction = await getRecords<RowDataPacket>(
        'SELECT id FROM commission_payments WHERE transaction_id = ?',
        [transaction_id]
      );
      
      if (existingTransaction.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Transaction ID already exists. Please use a unique transaction ID.' 
        });
      }
      
      // Insert each payment as a NEW row (additive — never overwrites previous payments)
      const methodValue = ['bank_transfer', 'paypal', 'stripe', 'check', 'other', 'manual'].includes(payment_method) ? payment_method : 'other';
      await executeQuery(
        `INSERT INTO commission_payments (affiliate_id, amount, transaction_id, payment_method, status, payment_date, notes, proof_of_payment_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'completed', NOW(), ?, ?, NOW(), NOW())`,
        [parseInt(String(affiliate_id), 10), Number(amount), transaction_id, methodValue, notes || null, proof_of_payment_url]
      );

      res.json({ 
        success: true, 
        message: 'Affiliate payout recorded successfully'
      });
    } catch (error) {
      console.error('Error recording commission payment:', error);
      res.status(500).json({ success: false, message: 'Failed to record commission payment' });
    }
  }
);

// Update payment status
router.put('/:paymentId/status', 
  authenticateToken, 
  requireRole('super_admin'), 
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      
      await updateRecord(
        'UPDATE commission_payments SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, paymentId]
      );
      
      res.json({ success: true, message: 'Payment status updated successfully' });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ success: false, message: 'Failed to update payment status' });
    }
  }
);

// Edit a payment record (amount and/or notes)
router.put('/:paymentId',
  authenticateToken,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { amount, notes } = req.body;

      if (amount === undefined && notes === undefined) {
        return res.status(400).json({ success: false, message: 'Provide amount or notes to update' });
      }

      // Verify payment exists
      const existing = await getRecords<RowDataPacket>(
        'SELECT id FROM commission_payments WHERE id = ?',
        [paymentId]
      );
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      const setClauses: string[] = [];
      const params: any[] = [];

      if (amount !== undefined) {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) {
          return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        setClauses.push('amount = ?');
        params.push(numAmount);
      }

      if (notes !== undefined) {
        setClauses.push('notes = ?');
        params.push(notes);
      }

      setClauses.push('updated_at = NOW()');
      params.push(paymentId);

      await updateRecord(
        `UPDATE commission_payments SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );

      res.json({ success: true, message: 'Payment updated successfully' });
    } catch (error) {
      console.error('Error updating payment record:', error);
      res.status(500).json({ success: false, message: 'Failed to update payment' });
    }
  }
);

// Delete a payment record
router.delete('/:paymentId', 
  authenticateToken, 
  requireRole('super_admin'), 
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      
      await executeQuery(
        'DELETE FROM commission_payments WHERE id = ?',
        [paymentId]
      );
      
      res.json({ success: true, message: 'Payment record deleted successfully' });
    } catch (error) {
      console.error('Error deleting payment record:', error);
      res.status(500).json({ success: false, message: 'Failed to delete payment record' });
    }
  }
);

export default router;
