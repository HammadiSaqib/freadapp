const mysql = require('mysql2/promise');

async function testCommissionCreation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'creditrepair_db'
  });

  try {
    console.log('=== Testing Direct Commission Creation ===');
    
    // Step 1: Create a test user
    const testEmail = `testuser_${Date.now()}@example.com`;
    const [userResult] = await connection.execute(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'user', NOW())
    `, ['Test', 'User', testEmail, 'hashed_password']);
    
    const userId = userResult.insertId;
    console.log(`✅ Created test user ${userId}: ${testEmail}`);
    
    // Step 2: Create a referral record for affiliate 20
    const [referralResult] = await connection.execute(`
      INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, status, created_at)
      VALUES (?, ?, 0, 10.00, 'pending', NOW())
    `, [20, userId]);
    
    const referralId = referralResult.insertId;
    console.log(`✅ Created referral record ${referralId} for affiliate 20 -> user ${userId}`);
    
    // Step 3: Create a billing transaction
    const purchaseAmount = 99.99;
    const [transactionResult] = await connection.execute(`
      INSERT INTO billing_transactions (user_id, amount, currency, status, payment_method, plan_name, plan_type, description, created_at)
      VALUES (?, ?, 'USD', 'succeeded', 'stripe', 'Pro Plan', 'monthly', 'Test purchase for commission', NOW())
    `, [userId, purchaseAmount]);
    
    const transactionId = transactionResult.insertId;
    console.log(`✅ Created billing transaction ${transactionId}: $${purchaseAmount}`);
    
    // Step 4: Manually create commission record (simulating what the service would do)
    const commissionRate = 10.00; // 10%
    const commissionAmount = (purchaseAmount * commissionRate / 100).toFixed(2);
    
    const [commissionResult] = await connection.execute(`
      INSERT INTO affiliate_commissions (
        affiliate_id, referral_id, customer_id, customer_name, customer_email,
        order_value, commission_rate, commission_amount, status, tier, product,
        order_date, commission_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'Tier 1', 'Pro Plan', NOW(), 'signup', NOW())
    `, [20, referralId, userId, 'Test User', testEmail, purchaseAmount, commissionRate, commissionAmount]);
    
    const commissionId = commissionResult.insertId;
    console.log(`✅ Created commission record ${commissionId}: $${commissionAmount} (${commissionRate}%)`);
    
    // Step 5: Update the referral record with commission details
    await connection.execute(`
      UPDATE affiliate_referrals 
      SET commission_amount = ?, status = 'approved', conversion_date = NOW()
      WHERE id = ?
    `, [commissionAmount, referralId]);
    
    console.log(`✅ Updated referral record ${referralId} with commission amount $${commissionAmount}`);
    
    // Step 6: Update affiliate total earnings
    await connection.execute(`
      UPDATE affiliates 
      SET total_earnings = total_earnings + ?
      WHERE id = ?
    `, [commissionAmount, 20]);
    
    console.log(`✅ Updated affiliate 20 total earnings by $${commissionAmount}`);
    
    // Step 7: Verify the results
    console.log('\n=== Verification ===');
    
    // Check commission record
    const [commissions] = await connection.execute(`
      SELECT * FROM affiliate_commissions 
      WHERE affiliate_id = 20 AND customer_id = ?
    `, [userId]);
    
    console.log(`✅ Found ${commissions.length} commission records for affiliate 20`);
    if (commissions.length > 0) {
      const commission = commissions[0];
      console.log(`   Commission ID: ${commission.id}`);
      console.log(`   Amount: $${commission.commission_amount}`);
      console.log(`   Rate: ${commission.commission_rate}%`);
      console.log(`   Status: ${commission.status}`);
      console.log(`   Order Value: $${commission.order_value}`);
    }
    
    // Check updated referral record
    const [referrals] = await connection.execute(`
      SELECT * FROM affiliate_referrals 
      WHERE affiliate_id = 20 AND referred_user_id = ?
    `, [userId]);
    
    if (referrals.length > 0) {
      const referral = referrals[0];
      console.log(`✅ Updated referral record:`);
      console.log(`   Referral ID: ${referral.id}`);
      console.log(`   Commission Amount: $${referral.commission_amount}`);
      console.log(`   Status: ${referral.status}`);
      console.log(`   Conversion Date: ${referral.conversion_date}`);
    }
    
    // Check affiliate total earnings
    const [affiliates] = await connection.execute(`
      SELECT total_earnings, total_referrals FROM affiliates WHERE id = 20
    `);
    
    if (affiliates.length > 0) {
      const affiliate = affiliates[0];
      console.log(`✅ Affiliate 20 stats:`);
      console.log(`   Total Earnings: $${affiliate.total_earnings}`);
      console.log(`   Total Referrals: ${affiliate.total_referrals}`);
    }
    
    console.log('\n🎉 Commission creation test completed successfully!');
    
  } catch (error) {
    console.error('Error in commission creation test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

testCommissionCreation().catch(console.error);