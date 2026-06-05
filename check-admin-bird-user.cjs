const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminBirdUser() {
  let connection;
  
  try {
    console.log('🔍 Checking admin user bird09944@aminating.com...');
    
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    
    // 1. Check user data in users table
    console.log('\n📋 Checking user data in users table...');
    const [users] = await connection.execute(
      'SELECT id, email, role, status, email_verified, created_at, updated_at FROM users WHERE email = ?',
      ['bird09944@aminating.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found in users table');
      return;
    }
    
    const user = users[0];
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Email Verified:', user.email_verified);
    console.log('   Created At:', user.created_at);
    console.log('   Updated At:', user.updated_at);
    
    // 2. Check subscription data
    console.log('\n💳 Checking subscription data...');
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    
    if (subscriptions.length === 0) {
      console.log('❌ No subscriptions found for this user');
    } else {
      console.log(`✅ Found ${subscriptions.length} subscription(s):`);
      subscriptions.forEach((sub, index) => {
        console.log(`   Subscription ${index + 1}:`);
        console.log('     ID:', sub.id);
        console.log('     Plan Type:', sub.plan_type);
        console.log('     Status:', sub.status);
        console.log('     Start Date:', sub.start_date);
        console.log('     End Date:', sub.end_date);
        console.log('     Amount:', sub.amount);
        console.log('     Created At:', sub.created_at);
        console.log('     Updated At:', sub.updated_at);
        console.log('');
      });
    }
    
    // 3. Check billing transactions
    console.log('\n💰 Checking billing transactions...');
    const [transactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [user.id]
    );
    
    if (transactions.length === 0) {
      console.log('❌ No billing transactions found for this user');
    } else {
      console.log(`✅ Found ${transactions.length} recent transaction(s):`);
      transactions.forEach((txn, index) => {
        console.log(`   Transaction ${index + 1}:`);
        console.log('     ID:', txn.id);
        console.log('     Type:', txn.transaction_type);
        console.log('     Status:', txn.status);
        console.log('     Amount:', txn.amount);
        console.log('     Description:', txn.description);
        console.log('     Created At:', txn.created_at);
        console.log('');
      });
    }
    
    // 4. Check if user is in affiliates table
    console.log('\n🤝 Checking affiliates table...');
    const [affiliates] = await connection.execute(
      'SELECT * FROM affiliates WHERE email = ?',
      ['bird09944@aminating.com']
    );
    
    if (affiliates.length === 0) {
      console.log('❌ User not found in affiliates table');
    } else {
      const affiliate = affiliates[0];
      console.log('✅ Found in affiliates table:');
      console.log('   ID:', affiliate.id);
      console.log('   Email:', affiliate.email);
      console.log('   Status:', affiliate.status);
      console.log('   Admin ID:', affiliate.admin_id);
      console.log('   Created At:', affiliate.created_at);
    }
    
    // 5. Check user permissions/roles
    console.log('\n🔐 Checking user permissions...');
    console.log('   Current Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Email Verified:', user.email_verified ? 'Yes' : 'No');
    
    // 6. Summary and recommendations
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(50));
    
    if (user.role === 'admin' || user.role === 'super_admin') {
      console.log('✅ User has admin privileges');
    } else {
      console.log('❌ User does not have admin privileges');
    }
    
    if (user.email_verified) {
      console.log('✅ Email is verified');
    } else {
      console.log('❌ Email is not verified');
    }
    
    if (subscriptions.length > 0) {
      const activeSubscription = subscriptions.find(sub => sub.status === 'active');
      if (activeSubscription) {
        console.log('✅ User has active subscription');
      } else {
        console.log('❌ User has no active subscription');
        console.log('💡 RECOMMENDATION: Create or activate a subscription for this admin user');
      }
    } else {
      console.log('❌ User has no subscriptions');
      console.log('💡 RECOMMENDATION: Create a subscription for this admin user');
    }
    
    if (transactions.length > 0) {
      const successfulTransaction = transactions.find(txn => txn.status === 'completed' || txn.status === 'success');
      if (successfulTransaction) {
        console.log('✅ User has successful payment transactions');
      } else {
        console.log('❌ User has no successful payment transactions');
      }
    } else {
      console.log('❌ User has no payment transactions');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkAdminBirdUser().catch(console.error);