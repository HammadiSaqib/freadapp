const mysql = require('mysql2/promise');

async function checkUser4Subscription() {
  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check user 4 details
    console.log('\n👤 Checking user 4 details...');
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = 4'
    );
    
    if (users.length === 0) {
      console.log('❌ User 4 not found');
      return;
    }
    
    console.log('User 4 details:', users[0]);

    // Check subscriptions for user 4
    console.log('\n📋 Checking subscriptions for user 4...');
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = 4'
    );
    
    console.log(`Found ${subscriptions.length} subscriptions for user 4:`);
    subscriptions.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`, sub);
    });

    // Check billing transactions for user 4
    console.log('\n💳 Checking billing transactions for user 4...');
    const [transactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = 4 ORDER BY created_at DESC'
    );
    
    console.log(`Found ${transactions.length} transactions for user 4:`);
    transactions.forEach((trans, index) => {
      console.log(`Transaction ${index + 1}:`, {
        id: trans.id,
        amount: trans.amount,
        status: trans.status,
        plan_name: trans.plan_name,
        created_at: trans.created_at
      });
    });

    // Check if there are any active subscriptions
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    console.log(`\n✅ Active subscriptions: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length > 0) {
      console.log('Active subscription details:', activeSubscriptions[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUser4Subscription();