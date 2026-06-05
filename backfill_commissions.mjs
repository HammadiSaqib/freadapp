import { initializeMySQLPool, executeQuery, closeMySQLPool } from './dist/database/mysqlConfig.js';

function mapStatus(referralStatus) {
  switch (referralStatus) {
    case 'paid':
      return 'paid';
    case 'approved':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'cancelled':
      return 'rejected';
    default:
      return 'pending';
  }
}

async function backfill() {
  console.log('🔄 Starting affiliate_commissions backfill from affiliate_referrals...');
  try {
    await initializeMySQLPool();

    const referrals = await executeQuery(
      `SELECT 
         ar.id as referral_id,
         ar.affiliate_id,
         ar.referred_user_id as customer_id,
         ar.commission_amount,
         ar.commission_rate,
         ar.status,
         u.first_name,
         u.last_name,
         u.email
       FROM affiliate_referrals ar
       JOIN users u ON u.id = ar.referred_user_id
       WHERE ar.commission_amount > 0`
    );

    console.log(`📋 Found ${referrals.length} referral rows with commission_amount > 0`);

    let inserted = 0;
    let skipped = 0;

    for (const row of referrals) {
      const { referral_id, affiliate_id, customer_id, commission_amount, commission_rate, status, first_name, last_name, email } = row;

      const existing = await executeQuery(
        `SELECT COUNT(*) as cnt FROM affiliate_commissions WHERE referral_id = ? AND affiliate_id = ?`,
        [referral_id, affiliate_id]
      );

      const exists = Array.isArray(existing) ? (existing[0]?.cnt || 0) > 0 : false;
      if (exists) {
        skipped++;
        continue;
      }

      // Derive order_value if possible from commission_rate
      let orderValue = commission_amount;
      if (commission_rate && Number(commission_rate) > 0) {
        orderValue = Number(commission_amount) / (Number(commission_rate) / 100);
      }

      const customerName = [first_name, last_name].filter(Boolean).join(' ').trim() || `User ${customer_id}`;
      const mappedStatus = mapStatus(status);

      await executeQuery(
        `INSERT INTO affiliate_commissions (
           affiliate_id, referral_id, customer_id, customer_name, customer_email,
           order_value, commission_rate, commission_amount, status, tier, product,
           order_date, approval_date, payment_date, notes, tracking_code, commission_type,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Bronze', 'Subscription', NOW(), NULL, NULL, NULL, NULL, 'signup', NOW(), NOW())`,
        [
          affiliate_id,
          referral_id,
          customer_id,
          customerName,
          email || 'unknown@example.com',
          orderValue,
          commission_rate || 0,
          commission_amount,
          mappedStatus
        ]
      );

      inserted++;
    }

    console.log(`✅ Backfill complete. Inserted: ${inserted}, Skipped: ${skipped}`);

    // Quick verification
    const verify = await executeQuery(
      `SELECT COUNT(*) as total, COALESCE(SUM(commission_amount),0) as sum_amount FROM affiliate_commissions`
    );
    console.log(`📊 affiliate_commissions: rows=${verify[0]?.total || 0}, sum=${verify[0]?.sum_amount || 0}`);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    try { await closeMySQLPool(); } catch {}
  }
}

// Always run when executed as a script (handle cross-platform path/url differences)
// If imported as a module, this will still execute once; acceptable for one-off backfill usage.
backfill();