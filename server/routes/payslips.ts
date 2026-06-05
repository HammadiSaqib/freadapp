import { Router, Request, Response } from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { ENV_CONFIG } from '../config/environment.js';

const router = Router();

router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token || '');
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    // Ensure payslip columns exist (compat for MySQL versions without IF NOT EXISTS)
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

    const rows: any[] = await executeQuery(
      `SELECT ap.*, a.first_name, a.last_name, a.email, a.company_name,
              a.bank_name, a.account_holder_name, a.account_number, a.routing_number, a.account_type, a.swift_code, a.iban, a.bank_address,
              u.email AS admin_email, u.company_name AS admin_company_name, COALESCE(u.nmi_gateway_logo, u.avatar) AS admin_logo
       FROM affiliate_payouts ap
       JOIN affiliates a ON a.id = ap.affiliate_id
       JOIN users u ON u.id = ap.admin_user_id
       WHERE ap.payslip_token = ?
       LIMIT 1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payslip not found' });
    }

    const data = rows[0];

    const frontendBase = String(ENV_CONFIG.FRONTEND_URL || '').replace(/\/$/, '');
    const public_url = `${frontendBase}/payslip/${token}`;

    res.json({
      success: true,
      data: {
        payslip_number: data.payslip_number || null,
        commission_month: data.commission_month,
        payout_month: data.payout_month,
        amount: Number(data.amount || 0),
        status: data.status,
        paid_at: data.paid_at || null,
        notes: data.notes || null,
        affiliate: {
          id: data.affiliate_id,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          email: data.email || null,
          company_name: data.company_name || null,
          bank_name: data.bank_name || null,
          account_holder_name: data.account_holder_name || null,
          account_number: data.account_number || null,
          routing_number: data.routing_number || null,
          account_type: data.account_type || null,
          swift_code: data.swift_code || null,
          iban: data.iban || null,
          bank_address: data.bank_address || null,
        },
        sender: {
          email: data.admin_email || null,
          company_name: data.admin_company_name || null,
          logo_url: data.admin_logo || (frontendBase ? `${frontendBase}/image.png` : null),
        },
        public_url
      }
    });
  } catch (error: any) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payslip' });
  }
});

export default router;
