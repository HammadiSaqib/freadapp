const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupInvalidReferrals() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db'
  });

  try {
    console.log('=== Cleaning Up Invalid Referral Records ===');

    // First, let's check what invalid referrals exist
    const [invalidReferrals] = await connection.execute(`
      SELECT r.id, r.affiliate_id, r.referred_user_id, r.status, r.commission_amount
      FROM affiliate_referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE u.id IS NULL
    `);

    console.log(`Found ${invalidReferrals.length} invalid referral records:`);
    invalidReferrals.forEach(ref => {
      console.log(`  - Referral ID ${ref.id}: affiliate ${ref.affiliate_id} -> non-existent user ${ref.referred_user_id} (status: ${ref.status}, commission: $${ref.commission_amount || 0})`);
    });

    if (invalidReferrals.length === 0) {
      console.log('✅ No invalid referral records found!');
      return;
    }

    // Delete invalid referral records
    const [deleteResult] = await connection.execute(`
      DELETE r FROM affiliate_referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE u.id IS NULL
    `);

    console.log(`✅ Deleted ${deleteResult.affectedRows} invalid referral records`);

    // Verify cleanup
    const [remainingInvalid] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM affiliate_referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE u.id IS NULL
    `);

    console.log(`✅ Verification: ${remainingInvalid[0].count} invalid referrals remaining`);

    // Show current valid referrals
    const [validReferrals] = await connection.execute(`
      SELECT r.id, r.affiliate_id, r.referred_user_id, u.email, r.status, r.commission_amount
      FROM affiliate_referrals r
      JOIN users u ON r.referred_user_id = u.id
      ORDER BY r.id DESC
      LIMIT 10
    `);

    console.log(`\n=== Current Valid Referrals (last 10) ===`);
    validReferrals.forEach(ref => {
      console.log(`  - Referral ID ${ref.id}: affiliate ${ref.affiliate_id} -> user ${ref.referred_user_id} (${ref.email}) - status: ${ref.status}, commission: $${ref.commission_amount || 0}`);
    });

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await connection.end();
  }
}

cleanupInvalidReferrals();