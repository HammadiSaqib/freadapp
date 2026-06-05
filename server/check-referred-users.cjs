const mysql = require('mysql2/promise');

async function checkReferredUserPurchases() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'creditrepair_db'
  });

  try {
    console.log('=== Checking purchases for referred users 21 and 22 ===');
    
    // Check billing transactions for referred users
    const [transactions] = await connection.execute(`
      SELECT bt.*, u.email, u.first_name, u.last_name
      FROM billing_transactions bt
      JOIN users u ON bt.user_id = u.id
      WHERE bt.user_id IN (21, 22)
      ORDER BY bt.created_at DESC
    `);
    
    console.log('\nBilling transactions for referred users:');
    if (transactions.length === 0) {
      console.log('❌ No billing transactions found for users 21 and 22');
    } else {
      transactions.forEach(t => {
        console.log(`✅ User ${t.user_id} (${t.email}): $${t.amount} - ${t.status} - ${t.created_at}`);
      });
    }
    
    // Check subscriptions for referred users
    const [subscriptions] = await connection.execute(`
      SELECT s.*, u.email, u.first_name, u.last_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id IN (21, 22)
      ORDER BY s.created_at DESC
    `);
    
    console.log('\nSubscriptions for referred users:');
    if (subscriptions.length === 0) {
      console.log('❌ No subscriptions found for users 21 and 22');
    } else {
      subscriptions.forEach(s => {
        console.log(`✅ User ${s.user_id} (${s.email}): ${s.plan_name} - ${s.status} - ${s.created_at}`);
      });
    }
    
    // Check if these users exist at all
    const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name, created_at
      FROM users
      WHERE id IN (21, 22)
      ORDER BY id
    `);
    
    console.log('\nUser information:');
    if (users.length === 0) {
      console.log('❌ Users 21 and 22 do not exist');
    } else {
      users.forEach(u => {
        console.log(`👤 User ${u.id}: ${u.email} (${u.first_name} ${u.last_name}) - Created: ${u.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkReferredUserPurchases();