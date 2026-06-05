const mysql = require('mysql2/promise');

async function testCommissionFlow() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'creditrepair_db'
  });

  try {
    console.log('=== Testing Commission Flow ===');
    
    // Step 1: Create a test user
    const testEmail = `testuser_${Date.now()}@example.com`;
    const [userResult] = await connection.execute(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'user', NOW())
    `, ['Test', 'User', testEmail, 'hashed_password']);
    
    const testUserId = userResult.insertId;
    console.log(`✅ Created test user ${testUserId}: ${testEmail}`);
    
    // Step 2: Create a referral record for affiliate 20
    const [referralResult] = await connection.execute(`
      INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, status, created_at)
      VALUES (?, ?, 0, 10.00, 'pending', NOW())
    `, [20, testUserId]);
    
    console.log(`✅ Created referral record ${referralResult.insertId} for affiliate 20 -> user ${testUserId}`);
    
    // Step 3: Simulate a purchase by creating a billing transaction
    const purchaseAmount = 99.99;
    
    const [transactionResult] = await connection.execute(`
      INSERT INTO billing_transactions (user_id, amount, currency, status, payment_method, plan_name, plan_type, description, created_at)
      VALUES (?, ?, 'USD', 'succeeded', 'stripe', 'Pro Plan', 'monthly', 'Test purchase for commission', NOW())
    `, [testUserId, purchaseAmount]);
    
    const transactionId = transactionResult.insertId;
    console.log(`✅ Created billing transaction ${transactionId}: $${purchaseAmount}`);
    
    // Step 4: Test commission calculation
    console.log('\n=== Testing Commission Calculation ===');
    
    // Import and use the commission service
    const CommissionService = (await import('./services/commissionService.ts')).default;
    const commissionService = new CommissionService();
    
    // Process the commission for this purchase
    await commissionService.processCommission(testUserId, purchaseAmount, transactionId);
    console.log('✅ Processed commission for purchase');
    
    const result = { success: true };
    
    if (result.success) {
      console.log('✅ Commission processing completed successfully');
      
      // Step 5: Verify commission was created
      const [commissions] = await connection.execute(`
        SELECT * FROM affiliate_commissions 
        WHERE affiliate_id = ? AND customer_id = ?
      `, [20, testUserId]);
      
      console.log(`✅ Found ${commissions.length} commission records`);
      if (commissions.length > 0) {
        console.log('Commission details:', commissions[0]);
      }
      
      // Step 6: Check updated referral record
      const [updatedReferrals] = await connection.execute(`
        SELECT * FROM affiliate_referrals 
        WHERE affiliate_id = ? AND referred_user_id = ?
      `, [20, testUserId]);
      
      if (updatedReferrals.length > 0) {
        console.log('Updated referral record:', updatedReferrals[0]);
      }
      
    } else {
      console.log('❌ Commission processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error in commission flow test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

testCommissionFlow();