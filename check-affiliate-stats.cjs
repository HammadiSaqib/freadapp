const mysql = require('mysql2/promise');

async function checkAffiliateStats() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Checking affiliate statistics for a@gmail.com (ID: 31)...\n');

    // Get affiliate details with stats
    const [affiliateRows] = await connection.execute(`
      SELECT * FROM affiliates WHERE id = 31
    `);
    
    console.log('📊 Affiliate Record:');
    console.log(affiliateRows[0]);
    console.log('\n');

    // Get all referrals (both approved and pending)
    const [referralRows] = await connection.execute(`
      SELECT 
        id,
        referred_user_id,
        status,
        commission_amount,
        conversion_date,
        created_at
      FROM referrals 
      WHERE affiliate_id = 31
      ORDER BY created_at DESC
    `);
    
    console.log('📋 All Referrals:');
    console.log(referralRows);
    console.log('\n');

    // Count referrals by status
    const [statusCounts] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM referrals 
      WHERE affiliate_id = 31
      GROUP BY status
    `);
    
    console.log('📈 Referral Status Counts:');
    console.log(statusCounts);
    console.log('\n');

    // Calculate conversion rate manually
    const totalReferrals = referralRows.length;
    const approvedReferrals = referralRows.filter(r => r.status === 'approved').length;
    const conversionRate = totalReferrals > 0 ? (approvedReferrals / totalReferrals) * 100 : 0;
    
    console.log('🧮 Manual Calculation:');
    console.log(`Total Referrals: ${totalReferrals}`);
    console.log(`Approved Referrals: ${approvedReferrals}`);
    console.log(`Calculated Conversion Rate: ${conversionRate}%`);
    console.log('\n');

    // Check if there are any other referrals we might have missed
    const [allUserReferrals] = await connection.execute(`
      SELECT 
        r.*,
        u.email as referred_user_email
      FROM referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE affiliate_id = 31
    `);
    
    console.log('🔍 All Referrals with User Details:');
    console.log(allUserReferrals);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkAffiliateStats();