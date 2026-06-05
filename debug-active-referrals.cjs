const mysql = require('mysql2/promise');

async function debugActiveReferrals() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    const affiliateId = 31;
    
    console.log('🔍 Debugging active referrals calculation for affiliate ID:', affiliateId);
    
    // Check the exact query used in the backend
    const activeReferralsQuery = `
      SELECT COUNT(DISTINCT ar.id) as active_referrals
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      WHERE ar.affiliate_id = ? 
        AND (ar.status = 'converted' OR u.status = 'active')
    `;
    
    console.log('\n📊 Executing active referrals query:', activeReferralsQuery);
    const [activeResult] = await connection.execute(activeReferralsQuery, [affiliateId]);
    console.log('Active referrals result:', activeResult);
    
    // Let's also check the detailed breakdown
    const detailedQuery = `
      SELECT ar.id, ar.status as referral_status, ar.referred_user_id, 
             u.status as user_status, u.email as user_email,
             (ar.status = 'converted' OR u.status = 'active') as is_active
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      WHERE ar.affiliate_id = ?
    `;
    
    console.log('\n📋 Detailed breakdown:');
    const [detailedResult] = await connection.execute(detailedQuery, [affiliateId]);
    detailedResult.forEach(row => {
      console.log(`- Referral ID: ${row.id}, Status: ${row.referral_status}, User: ${row.user_email}, User Status: ${row.user_status}, Is Active: ${row.is_active}`);
    });
    
    // Check current affiliate stats
    const affiliateQuery = `
      SELECT total_referrals, paid_referrals_count, conversion_rate
      FROM affiliates 
      WHERE id = ?
    `;
    
    console.log('\n📈 Current affiliate stats:');
    const [affiliateResult] = await connection.execute(affiliateQuery, [affiliateId]);
    console.log('Affiliate stats:', affiliateResult[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

debugActiveReferrals();