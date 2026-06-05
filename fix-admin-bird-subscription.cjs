const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAdminBirdSubscription() {
  let connection;
  
  try {
    console.log('🔧 Fixing subscription for admin user bird09944@aminating.com...');
    
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    
    // Get user data
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['bird09944@aminating.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('📋 User found:', user.email, '(ID:', user.id, ', Role:', user.role, ')');
    
    // Check if subscription already exists
    const [existingSubscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [user.id]
    );
    
    if (existingSubscriptions.length > 0) {
      console.log('⚠️  User already has subscriptions. Updating existing subscription...');
      
      // Update the most recent subscription to be active
      const [updateResult] = await connection.execute(
        `UPDATE subscriptions 
         SET status = 'active', 
             plan_type = 'premium', 
             amount = 97.00,
             start_date = NOW(),
             end_date = DATE_ADD(NOW(), INTERVAL 1 YEAR),
             updated_at = NOW()
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [user.id]
      );
      
      console.log('✅ Updated existing subscription to active status');
    } else {
      // Create new subscription
      console.log('📝 Creating new subscription...');
      
      const [subscriptionResult] = await connection.execute(
        `INSERT INTO subscriptions (
          user_id, plan_type, status, amount, start_date, end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), NOW(), NOW())`,
        [user.id, 'premium', 'active', 97.00]
      );
      
      console.log('✅ Created new active subscription (ID:', subscriptionResult.insertId, ')');
    }
    
    // Check if billing transaction exists
    const [existingTransactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = ?',
      [user.id]
    );
    
    if (existingTransactions.length === 0) {
      // Create a successful billing transaction
      console.log('📝 Creating successful billing transaction...');
      
      const [transactionResult] = await connection.execute(
        `INSERT INTO billing_transactions (
          user_id, transaction_type, status, amount, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [user.id, 'subscription', 'completed', 97.00, 'Admin Premium Subscription - Manual Setup']
      );
      
      console.log('✅ Created successful billing transaction (ID:', transactionResult.insertId, ')');
    } else {
      console.log('ℹ️  User already has billing transactions');
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    
    const [newSubscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );
    
    if (newSubscriptions.length > 0) {
      const subscription = newSubscriptions[0];
      console.log('✅ Current subscription:');
      console.log('   Plan Type:', subscription.plan_type);
      console.log('   Status:', subscription.status);
      console.log('   Amount:', subscription.amount);
      console.log('   Start Date:', subscription.start_date);
      console.log('   End Date:', subscription.end_date);
    }
    
    const [newTransactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );
    
    if (newTransactions.length > 0) {
      const transaction = newTransactions[0];
      console.log('✅ Latest transaction:');
      console.log('   Type:', transaction.transaction_type);
      console.log('   Status:', transaction.status);
      console.log('   Amount:', transaction.amount);
      console.log('   Description:', transaction.description);
    }
    
    console.log('\n🎉 SUCCESS: Admin user subscription has been fixed!');
    console.log('💡 The user should now have full dashboard access.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

fixAdminBirdSubscription().catch(console.error);