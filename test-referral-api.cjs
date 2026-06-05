const mysql = require('mysql2/promise');

async function testReferralAPI() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('=== Testing Referral API Query for Affiliate ID 31 ===');

    // Simulate the exact query from the API
    const affiliateId = 31;
    const [referrals] = await connection.execute(`
      SELECT 
        ar.id,
        u.first_name,
        u.last_name,
        u.email,
        ar.created_at as signup_date,
        ar.conversion_date,
        u.status as user_status,
        ar.status as referral_status,
        COALESCE(ac.commission_amount, 0) as commission_earned,
        'basic' as subscription_plan,
        CASE 
          WHEN ar.status = 'approved' THEN 'paid'
          WHEN ar.status = 'converted' THEN 'paid'
          WHEN u.status = 'inactive' THEN 'cancelled'
          ELSE 'unpaid'
        END as final_status
      FROM affiliate_referrals ar
      JOIN users u ON ar.referred_user_id = u.id
      LEFT JOIN affiliate_commissions ac ON ar.id = ac.referral_id AND ac.affiliate_id = ?
      WHERE ar.affiliate_id = ?
      ORDER BY ar.created_at DESC
    `, [affiliateId, affiliateId]);

    console.log('API Query Results:');
    referrals.forEach((ref, index) => {
      console.log(`${index + 1}. ID: ${ref.id}, Email: ${ref.email}, Commission: $${ref.commission_earned}, Status: ${ref.final_status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testReferralAPI();