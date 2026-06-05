const mysql = require('mysql2/promise');

async function createCommissionRecord() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('=== Creating Commission Record for Referral ID 63 ===');

    // Insert commission record
    const [result] = await connection.execute(`
      INSERT INTO affiliate_commissions 
      (affiliate_id, referral_id, customer_id, order_value, commission_amount, commission_rate, status, created_at, updated_at)
      VALUES (31, 63, 66, 100.00, 20.00, 0.20, 'paid', NOW(), NOW())
    `);

    console.log('Commission record created:', result);

    // Verify the record was created
    const [commissions] = await connection.execute('SELECT * FROM affiliate_commissions WHERE referral_id = 63');
    console.log('New commission record:', commissions[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createCommissionRecord();