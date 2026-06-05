const mysql = require('mysql2/promise');

async function checkReferrals() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  console.log('🔍 Checking referrals for affiliate ID 31 (a@gmail.com)...');
  
  // Check affiliate referrals
  const [referrals] = await connection.execute(`
    SELECT id, affiliate_id, referred_user_id, status, commission_amount, conversion_date, created_at 
    FROM affiliate_referrals 
    WHERE affiliate_id = ?
    ORDER BY created_at DESC
  `, [31]);
  console.log('Referrals:', referrals);
  
  // Check billing transactions for referred users
  if (referrals.length > 0) {
    console.log('\n🔍 Checking billing transactions for referred users...');
    for (const referral of referrals) {
      const [transactions] = await connection.execute(`
        SELECT id, user_id, amount, status, plan_name, created_at 
        FROM billing_transactions 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [referral.referred_user_id]);
      console.log(`Transactions for user ${referral.referred_user_id}:`, transactions);
    }
  }
  
  // Check affiliate commissions
  console.log('\n🔍 Checking affiliate commissions...');
  const [commissions] = await connection.execute(`
    SELECT id, affiliate_id, referral_id, customer_id, order_value, commission_amount, status, created_at
    FROM affiliate_commissions 
    WHERE affiliate_id = ?
    ORDER BY created_at DESC
  `, [31]);
  console.log('Commissions:', commissions);
  
  await connection.end();
}

checkReferrals().catch(console.error);