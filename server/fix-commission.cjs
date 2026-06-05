const mysql = require('mysql2/promise');

async function fixCommission() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  try {
    console.log('🔧 Processing missing commission for affiliate 31...');
    
    // Get affiliate info
    const [affiliate] = await connection.execute(`
      SELECT * FROM affiliates WHERE id = ?
    `, [31]);
    
    if (affiliate.length === 0) {
      console.log('❌ Affiliate not found');
      return;
    }
    
    const affiliateData = affiliate[0];
    console.log('Affiliate:', affiliateData);
    
    // Get referral info
    const [referral] = await connection.execute(`
      SELECT * FROM affiliate_referrals WHERE affiliate_id = ? AND referred_user_id = ?
    `, [31, 65]);
    
    if (referral.length === 0) {
      console.log('❌ Referral not found');
      return;
    }
    
    const referralData = referral[0];
    console.log('Referral:', referralData);
    
    // Get transaction info
    const [transaction] = await connection.execute(`
      SELECT * FROM billing_transactions WHERE user_id = ? AND status = 'succeeded'
      ORDER BY created_at DESC LIMIT 1
    `, [65]);
    
    if (transaction.length === 0) {
      console.log('❌ Transaction not found');
      return;
    }
    
    const transactionData = transaction[0];
    console.log('Transaction:', transactionData);
    
    // Calculate commission (10% for free affiliate)
    const commissionRate = 10.0;
    const orderValue = parseFloat(transactionData.amount);
    const commissionAmount = (orderValue * commissionRate / 100).toFixed(2);
    
    console.log(`💰 Calculating commission: $${orderValue} × ${commissionRate}% = $${commissionAmount}`);
    
    // Create commission record
    const [commissionResult] = await connection.execute(`
      INSERT INTO affiliate_commissions (
        affiliate_id, referral_id, customer_id, customer_name, customer_email,
        order_value, commission_rate, commission_amount, status, tier, product,
        order_date, commission_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'Tier 1', ?, NOW(), 'signup', NOW())
    `, [
      31, // affiliate_id
      referralData.id, // referral_id
      65, // customer_id
      'Referred User', // customer_name
      'user65@example.com', // customer_email (placeholder)
      orderValue, // order_value
      commissionRate, // commission_rate
      commissionAmount, // commission_amount
      transactionData.plan_name // product
    ]);
    
    console.log(`✅ Created commission record ID: ${commissionResult.insertId}`);
    
    // Update referral record
    await connection.execute(`
      UPDATE affiliate_referrals 
      SET commission_amount = ?, status = 'approved', conversion_date = NOW()
      WHERE id = ?
    `, [commissionAmount, referralData.id]);
    
    console.log(`✅ Updated referral record ${referralData.id} with commission $${commissionAmount}`);
    
    // Update affiliate stats
    await connection.execute(`
      UPDATE affiliates 
      SET total_earnings = total_earnings + ?, 
          total_referrals = total_referrals + 1,
          paid_referrals_count = paid_referrals_count + 1
      WHERE id = ?
    `, [commissionAmount, 31]);
    
    console.log(`✅ Updated affiliate stats for ID 31`);
    
    console.log('🎉 Commission processing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error processing commission:', error);
  } finally {
    await connection.end();
  }
}

fixCommission().catch(console.error);