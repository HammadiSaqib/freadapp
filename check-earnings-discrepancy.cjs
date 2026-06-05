const mysql = require('mysql2/promise');

async function checkEarningsDiscrepancy() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  console.log('=== Checking Earnings Discrepancy ===');
  
  // Get affiliate ID for a@gmail.com
  const [affiliates] = await connection.execute('SELECT id, email FROM affiliates WHERE email = ?', ['a@gmail.com']);
  const affiliate = affiliates[0];
  console.log('Affiliate data:', affiliate);
  
  if (!affiliate) {
    console.log('Affiliate not found');
    await connection.end();
    return;
  }
  
  const affiliateId = affiliate.id;
  
  // Check all commissions for this affiliate
  console.log('\n=== All Commission Records ===');
  const [allCommissions] = await connection.execute(`
    SELECT id, affiliate_id, referral_id, commission_amount, status, created_at
    FROM affiliate_commissions 
    WHERE affiliate_id = ?
    ORDER BY created_at DESC
  `, [affiliateId]);
  
  console.log('All commissions:');
  allCommissions.forEach((comm, index) => {
    console.log(`${index + 1}. ID: ${comm.id}, Referral: ${comm.referral_id}, Amount: $${comm.commission_amount}, Status: ${comm.status}, Date: ${comm.created_at}`);
  });
  
  // Calculate total earnings (paid only)
  console.log('\n=== Total Earnings (Paid Only) ===');
  const [totalPaidResult] = await connection.execute(`
    SELECT COALESCE(SUM(commission_amount), 0) as total_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? AND status = 'paid'
  `, [affiliateId]);
  console.log('Total Paid Earnings:', totalPaidResult[0].total_earnings);
  
  // Calculate monthly earnings (paid only)
  console.log('\n=== Monthly Earnings (Paid Only) ===');
  const [monthlyPaidResult] = await connection.execute(`
    SELECT COALESCE(SUM(commission_amount), 0) as monthly_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? 
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      AND status = 'paid'
  `, [affiliateId]);
  console.log('Monthly Paid Earnings:', monthlyPaidResult[0].monthly_earnings);
  
  // Calculate monthly earnings (paid + pending)
  console.log('\n=== Monthly Earnings (Paid + Pending) ===');
  const [monthlyAllResult] = await connection.execute(`
    SELECT COALESCE(SUM(commission_amount), 0) as monthly_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? 
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      AND status IN ('paid', 'pending')
  `, [affiliateId]);
  console.log('Monthly All Earnings (Paid + Pending):', monthlyAllResult[0].monthly_earnings);
  
  // Check current month commissions by status
  console.log('\n=== Current Month Commissions by Status ===');
  const [monthlyByStatus] = await connection.execute(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(commission_amount), 0) as total_amount
    FROM affiliate_commissions 
    WHERE affiliate_id = ? 
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    GROUP BY status
  `, [affiliateId]);
  
  monthlyByStatus.forEach(row => {
    console.log(`Status: ${row.status}, Count: ${row.count}, Total: $${row.total_amount}`);
  });
  
  await connection.end();
}

checkEarningsDiscrepancy().catch(console.error);