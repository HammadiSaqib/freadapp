const mysql = require('mysql2/promise');

async function debugRecentCancellations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('✅ Connected to MySQL database');

    // First, check the subscriptions table structure
    const [tableInfo] = await connection.execute(`DESCRIBE subscriptions`);
    console.log('\n📋 Subscriptions table structure:');
    tableInfo.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check all subscriptions
    const [allSubs] = await connection.execute(`
      SELECT id, user_id, status, plan_name, updated_at, created_at
      FROM subscriptions
      ORDER BY updated_at DESC
    `);

    console.log('\n📊 All subscriptions:');
    allSubs.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id}, Status: '${sub.status}', Plan: ${sub.plan_name}, Updated: ${sub.updated_at}`);
    });

    // Test the exact query from the API with different approaches
    console.log('\n🔍 Testing API query variations:');

    // Test 1: Direct string comparison
    const [test1] = await connection.execute(`
      SELECT s.*, u.first_name, u.last_name, u.email,
             DATEDIFF(NOW(), s.updated_at) as days_since_cancellation
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'canceled'
        AND s.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY s.updated_at DESC
      LIMIT 10 OFFSET 0
    `);
    console.log('Test 1 (direct string): Found', test1.length, 'records');

    // Test 2: Parameterized query (as used in API)
    const [test2] = await connection.execute(`
      SELECT s.*, u.first_name, u.last_name, u.email,
             DATEDIFF(NOW(), s.updated_at) as days_since_cancellation
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = ?
        AND s.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY s.updated_at DESC
      LIMIT ? OFFSET ?
    `, ['canceled', 30, 10, 0]);
    console.log('Test 2 (parameterized): Found', test2.length, 'records');

    // Test 3: Check if there are any records with different status spellings
    const [statusVariations] = await connection.execute(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `);
    console.log('\n📈 Status variations in database:');
    statusVariations.forEach(row => {
      console.log(`  '${row.status}': ${row.count} records`);
    });

    // Test 4: Check date ranges
    const [dateTest] = await connection.execute(`
      SELECT 
        COUNT(*) as total_canceled,
        COUNT(CASE WHEN s.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_canceled,
        MIN(s.updated_at) as oldest_update,
        MAX(s.updated_at) as newest_update
      FROM subscriptions s
      WHERE s.status = 'canceled'
    `);
    console.log('\n📅 Date analysis for canceled subscriptions:');
    console.log('  Total canceled:', dateTest[0].total_canceled);
    console.log('  Recent (30 days):', dateTest[0].recent_canceled);
    console.log('  Oldest update:', dateTest[0].oldest_update);
    console.log('  Newest update:', dateTest[0].newest_update);

    // Test 5: Check if users table join is working
    const [joinTest] = await connection.execute(`
      SELECT s.id, s.status, s.user_id, u.first_name, u.last_name
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'canceled'
    `);
    console.log('\n👥 Join test (canceled subscriptions with users):');
    joinTest.forEach((row, index) => {
      console.log(`${index + 1}. Sub ID: ${row.id}, User ID: ${row.user_id}, Name: ${row.first_name} ${row.last_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

debugRecentCancellations();