const mysql = require('mysql2/promise');

async function testRecentCancellations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('✅ Connected to MySQL database');

    // Check current canceled subscriptions
    const [canceledSubs] = await connection.execute(`
      SELECT s.*, u.first_name, u.last_name, u.email,
             DATEDIFF(NOW(), s.updated_at) as days_since_cancellation
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'canceled'
      ORDER BY s.updated_at DESC
    `);

    console.log('\n📊 Current canceled subscriptions:');
    console.log('Total canceled:', canceledSubs.length);
    
    if (canceledSubs.length > 0) {
      console.log('\nCanceled subscriptions details:');
      canceledSubs.forEach((sub, index) => {
        console.log(`${index + 1}. ID: ${sub.id}, User: ${sub.first_name} ${sub.last_name}, Plan: ${sub.plan_name}, Days since: ${sub.days_since_cancellation}`);
      });
    }

    // Test the exact query from the API
    const [recentCancellations] = await connection.execute(`
      SELECT s.*, u.first_name, u.last_name, u.email,
             DATEDIFF(NOW(), s.updated_at) as days_since_cancellation
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'canceled' 
        AND s.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY s.updated_at DESC
      LIMIT ? OFFSET ?
    `, [30, 10, 0]);

    console.log('\n🔍 Recent cancellations (last 30 days):');
    console.log('Count:', recentCancellations.length);
    
    if (recentCancellations.length > 0) {
      console.log('\nRecent cancellations details:');
      recentCancellations.forEach((sub, index) => {
        console.log(`${index + 1}. ID: ${sub.id}, User: ${sub.first_name} ${sub.last_name}, Plan: ${sub.plan_name}, Days since: ${sub.days_since_cancellation}`);
      });
    }

    // Get count
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM subscriptions s
      WHERE s.status = 'canceled' 
        AND s.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [30]);

    console.log('\n📈 Total count for pagination:', countResult[0].total);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testRecentCancellations();