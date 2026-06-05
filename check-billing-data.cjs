const mysql = require('mysql2/promise');

async function checkBillingData() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check billing_transactions table
    console.log('\n📊 Checking billing_transactions table:');
    const [transactions] = await connection.execute('SELECT * FROM billing_transactions LIMIT 10');
    console.log('Transactions count:', transactions.length);
    if (transactions.length > 0) {
      console.log('Sample transaction:', transactions[0]);
    } else {
      console.log('❌ No billing transactions found');
    }

    // Check subscriptions table
    console.log('\n📋 Checking subscriptions table:');
    const [subscriptions] = await connection.execute('SELECT * FROM subscriptions LIMIT 10');
    console.log('Subscriptions count:', subscriptions.length);
    if (subscriptions.length > 0) {
      console.log('Sample subscription:', subscriptions[0]);
    } else {
      console.log('❌ No subscriptions found');
    }

    // Check users table to see if we have users
    console.log('\n👥 Checking users table:');
    const [users] = await connection.execute('SELECT id, email, first_name, last_name FROM users LIMIT 5');
    console.log('Users count:', users.length);
    if (users.length > 0) {
      console.log('Sample users:', users);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkBillingData();