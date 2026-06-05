const mysql = require('mysql2/promise');

async function addSampleData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // Update affiliate basic data
    await conn.execute('UPDATE affiliates SET total_earnings = 425.50, total_referrals = 3 WHERE id = 1');
    console.log('✅ Updated affiliate basic data');

    // Add commission data
    await conn.execute(`
      INSERT IGNORE INTO affiliate_commissions (affiliate_id, referral_id, commission_amount, status, created_at) 
      VALUES 
        (1, 1, 150.00, 'paid', NOW()),
        (1, 2, 200.00, 'paid', NOW()),
        (1, 3, 75.50, 'pending', NOW())
    `);
    console.log('✅ Added commission data');

    // Add referral data (check if table exists first)
    try {
      await conn.execute(`
        INSERT IGNORE INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, status, created_at) 
        VALUES 
          (1, 1, 150.00, 'converted', NOW()),
          (1, 2, 200.00, 'converted', NOW()),
          (1, 3, 75.50, 'pending', NOW())
      `);
      console.log('✅ Added referral data');
    } catch (err) {
       console.log('⚠️ Referral table might not exist or have different schema:', err.message);
     }

    console.log('🎉 Sample data added successfully! Refresh your dashboard.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

addSampleData();