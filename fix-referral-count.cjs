const mysql = require('mysql2/promise');

async function fixReferralCount() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Checking current affiliate stats for a@gmail.com (ID: 31)...\n');

    // Get current affiliate stats
    const [affiliateRows] = await connection.execute(`
      SELECT id, email, total_referrals, paid_referrals_count, total_earnings
      FROM affiliates WHERE id = 31
    `);
    
    console.log('📊 Current Affiliate Stats:');
    console.log(affiliateRows[0]);
    console.log('\n');

    // Count actual referrals
    const [actualReferrals] = await connection.execute(`
      SELECT COUNT(*) as total_count,
             SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
      FROM affiliate_referrals 
      WHERE affiliate_id = 31
    `);
    
    console.log('📈 Actual Referral Counts:');
    console.log(`Total Referrals: ${actualReferrals[0].total_count}`);
    console.log(`Approved Referrals: ${actualReferrals[0].approved_count}`);
    console.log('\n');

    // Calculate correct conversion rate
    const totalReferrals = actualReferrals[0].total_count;
    const approvedReferrals = actualReferrals[0].approved_count;
    const conversionRate = totalReferrals > 0 ? (approvedReferrals / totalReferrals) * 100 : 0;
    
    console.log('🧮 Correct Conversion Rate:');
    console.log(`${conversionRate}% (${approvedReferrals}/${totalReferrals})`);
    console.log('\n');

    // Update the affiliate record with correct counts
    if (affiliateRows[0].total_referrals !== totalReferrals) {
      console.log('🔧 Fixing total_referrals count...');
      
      await connection.execute(`
        UPDATE affiliates 
        SET total_referrals = ?,
            paid_referrals_count = ?,
            updated_at = NOW()
        WHERE id = 31
      `, [totalReferrals, approvedReferrals]);
      
      console.log('✅ Updated affiliate stats successfully!');
      
      // Verify the update
      const [updatedRows] = await connection.execute(`
        SELECT id, email, total_referrals, paid_referrals_count, total_earnings
        FROM affiliates WHERE id = 31
      `);
      
      console.log('\n📊 Updated Affiliate Stats:');
      console.log(updatedRows[0]);
      
      const newConversionRate = updatedRows[0].total_referrals > 0 ? 
        (updatedRows[0].paid_referrals_count / updatedRows[0].total_referrals) * 100 : 0;
      console.log(`\n🎯 New Conversion Rate: ${newConversionRate}%`);
    } else {
      console.log('✅ Referral counts are already correct!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixReferralCount();