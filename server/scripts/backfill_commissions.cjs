// Use dynamic import to load ESM dbConnection from CommonJS script
async function getDb() {
  const mod = await import('../database/dbConnection.js');
  return { executeQuery: mod.executeQuery };
}

async function backfill() {
  console.log('🔄 Backfilling affiliate_commissions from affiliate_referrals...');

  try {
    const { executeQuery } = await getDb();
    const rows = await executeQuery(
      `SELECT ar.id as referral_id, ar.affiliate_id, ar.referred_user_id as customer_id,
              ar.purchase_amount as order_value, ar.commission_rate, ar.commission_amount,
              ar.status, ar.created_at, ar.transaction_id, ar.plan_id, u.email as customer_email,
              CONCAT(u.first_name, ' ', u.last_name) as customer_name
       FROM affiliate_referrals ar
       LEFT JOIN users u ON u.id = ar.referred_user_id
       WHERE ar.purchase_amount IS NOT NULL AND ar.purchase_amount > 0`
    );

    let inserted = 0;
    for (const r of rows) {
      // Skip if a commission already exists for this referral and transaction
      const existing = await executeQuery(
        `SELECT id FROM affiliate_commissions
         WHERE referral_id = ? OR (customer_id = ? AND order_value = ? AND tracking_code = ?)`,
        [r.referral_id, r.customer_id, r.order_value, r.transaction_id]
      );

      if (existing && existing.length > 0) continue;

      const statusMap = {
        pending: 'pending',
        approved: 'approved',
        paid: 'paid',
        rejected: 'rejected'
      };

      await executeQuery(
        `INSERT INTO affiliate_commissions (
           affiliate_id, referral_id, customer_id, customer_name, customer_email,
           order_value, commission_rate, commission_amount, status, tier, product,
           order_date, tracking_code, commission_type, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          r.affiliate_id,
          r.referral_id,
          r.customer_id,
          r.customer_name || 'Unknown',
          r.customer_email || 'unknown@example.com',
          r.order_value,
          r.commission_rate,
          r.commission_amount,
          statusMap[r.status] || 'pending',
          'Bronze',
          r.plan_id ? `Plan ${r.plan_id}` : 'Subscription',
          r.created_at,
          r.transaction_id || `referral_${r.referral_id}`,
          'signup'
        ]
      );
      inserted++;
    }

    console.log(`✅ Backfill complete. Inserted ${inserted} commission rows.`);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exitCode = 1;
  }
}

backfill();