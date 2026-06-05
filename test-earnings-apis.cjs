const mysql = require('mysql2/promise');

async function testEarningsAPIs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  console.log('=== Testing Earnings API Logic ===');
  
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
  
  console.log('\n=== Testing /api/affiliate/earnings/stats API Logic ===');
  
  // Total earnings (paid only) - from earnings/stats endpoint
  const totalEarningsQuery = `
    SELECT COALESCE(SUM(commission_amount), 0) as total_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? AND status = 'paid'
  `;
  
  // Monthly earnings (paid only) - from earnings/stats endpoint
  const monthlyEarningsQuery = `
    SELECT COALESCE(SUM(commission_amount), 0) as monthly_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? 
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      AND status = 'paid'
  `;
  
  const [totalResult] = await connection.execute(totalEarningsQuery, [affiliateId]);
  const [monthlyResult] = await connection.execute(monthlyEarningsQuery, [affiliateId]);
  
  console.log('Total Earnings (paid only):', totalResult[0].total_earnings);
  console.log('Monthly Earnings (paid only):', monthlyResult[0].monthly_earnings);
  
  console.log('\n=== Testing /api/affiliate/dashboard/stats API Logic ===');
  
  // Monthly earnings (paid + pending) - from dashboard/stats endpoint
  const monthlyEarningsWithPendingQuery = `
    SELECT COALESCE(SUM(commission_amount), 0) as monthly_earnings
    FROM affiliate_commissions 
    WHERE affiliate_id = ? 
      AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      AND status IN ('paid', 'pending')
  `;
  
  const [monthlyWithPendingResult] = await connection.execute(monthlyEarningsWithPendingQuery, [affiliateId]);
  
  console.log('Monthly Earnings (paid + pending):', monthlyWithPendingResult[0].monthly_earnings);
  
  console.log('\n=== Summary ===');
  console.log('The discrepancy is caused by different API endpoints using different status filters:');
  console.log('- Total Earnings API (/earnings/stats): Only counts "paid" commissions');
  console.log('- Monthly Earnings API (/dashboard/stats): Counts both "paid" and "pending" commissions');
  console.log('');
  console.log('Current data:');
  console.log('- Paid commission: $20.00 (ID 63)');
  console.log('- Pending commission: $9.90 (ID 62)');
  console.log('- Total Earnings (paid only): $20.00 - but showing as $9.90 in UI');
  console.log('- Monthly Earnings (paid + pending): $29.90');
  
  await connection.end();
}

testEarningsAPIs().catch(console.error);