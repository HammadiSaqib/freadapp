const mysql = require('mysql2/promise');

async function updateConversionRate() {
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

    // Get all referrals with details
    const [referralRows] = await connection.execute(`
      SELECT 
        id,
        referred_user_id,
        status,
        commission_rate,
        referral_date,
        conversion_date
      FROM affiliate_referrals 
      WHERE affiliate_id = 31
      ORDER BY created_at DESC
    `);
    
    console.log('📋 All Referrals:');
    referralRows.forEach((referral, index) => {
      console.log(`${index + 1}. User ID: ${referral.referred_user_id}, Status: ${referral.status}, Date: ${referral.referral_date}`);
    });
    console.log('\n');

    // Count referrals by status
    const totalReferrals = referralRows.length;
    const approvedReferrals = referralRows.filter(r => r.status === 'approved').length;
    const pendingReferrals = referralRows.filter(r => r.status === 'pending').length;
    
    console.log('📈 Referral Breakdown:');
    console.log(`Total Referrals: ${totalReferrals}`);
    console.log(`Approved (Paid) Referrals: ${approvedReferrals}`);
    console.log(`Pending (Unpaid) Referrals: ${pendingReferrals}`);
    console.log('\n');

    // Calculate correct conversion rate
    const conversionRate = totalReferrals > 0 ? (approvedReferrals / totalReferrals) * 100 : 0;
    
    console.log('🧮 Correct Conversion Rate Calculation:');
    console.log(`${conversionRate}% (${approvedReferrals} paid ÷ ${totalReferrals} total)`);
    console.log('\n');

    // Update the affiliate record with correct counts
    console.log('🔧 Updating affiliate stats...');
    
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
    console.log(`Expected: ${conversionRate}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

updateConversionRate();