const mysql = require('mysql2/promise');

async function checkAdminPermissions() {
  try {
    console.log('🔍 Checking admin user permissions for xisav87409@filipx.com...');
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    // Find the admin user
    const [users] = await connection.execute(
      'SELECT id, email, role, created_at FROM users WHERE email = ?',
      ['xisav87409@filipx.com']
    );

    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const user = users[0];
    console.log('👤 Found admin user:', user);

    // Check subscription status
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    console.log('📋 Subscription status:');
    if (subscriptions.length === 0) {
      console.log('  ❌ No subscription found');
    } else {
      console.log('  ✅ Subscription found:', subscriptions[0]);
    }

    // Check billing history
    const [transactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    console.log('💳 Billing history:');
    if (transactions.length === 0) {
      console.log('  ❌ No transactions found');
    } else {
      console.log(`  📊 Found ${transactions.length} transactions:`);
      transactions.forEach((tx, index) => {
        console.log(`    ${index + 1}. ${tx.plan_name} - ${tx.status} - $${tx.amount} - ${tx.created_at}`);
      });
    }

    // Check if there are any active plans
    const [plans] = await connection.execute(
      'SELECT * FROM plans ORDER BY id'
    );

    console.log('📦 Available plans:');
    plans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.price}/${plan.billing_cycle}`);
    });

    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminPermissions();