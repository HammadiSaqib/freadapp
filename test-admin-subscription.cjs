const mysql = require('mysql2/promise');

async function testAdminSubscription() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔍 Testing admin user subscription and permissions...');
    
    // Find the admin user
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['xisav87409@filipx.com']
    );
    
    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const adminUser = users[0];
    console.log(`👤 Found admin user: ${adminUser.email} (ID: ${adminUser.id}, Role: ${adminUser.role})`);
    
    // Check for subscription
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [adminUser.id]
    );
    
    console.log(`📋 Subscriptions found: ${subscriptions.length}`);
    
    if (subscriptions.length === 0) {
      console.log('❌ No subscription found for admin user');
      console.log('🔧 Expected behavior: usePagePermissions should restrict to ["subscription", "settings"]');
      return;
    }
    
    const subscription = subscriptions[0];
    console.log(`📦 Subscription details:`);
    console.log(`   - Plan: ${subscription.plan_name}`);
    console.log(`   - Status: ${subscription.status}`);
    console.log(`   - Period: ${subscription.current_period_start} to ${subscription.current_period_end}`);
    
    // Get the plan details
    const [plans] = await connection.execute(
      'SELECT * FROM subscription_plans WHERE name = ?',
      [subscription.plan_name]
    );
    
    if (plans.length === 0) {
      console.log(`❌ Plan "${subscription.plan_name}" not found in subscription_plans table`);
      return;
    }
    
    const plan = plans[0];
    const pagePermissions = JSON.parse(plan.page_permissions || '[]');
    
    console.log(`📋 Plan "${plan.name}" permissions:`);
    console.log(`   - Page Permissions (${pagePermissions.length}): ${pagePermissions.join(', ')}`);
    console.log(`   - Expected sidebar behavior: Only these pages should be enabled`);
    
    // Test what usePagePermissions should return
    const expectedPermissions = [...pagePermissions, 'subscription'];
    console.log(`✅ Expected usePagePermissions result: [${expectedPermissions.join(', ')}]`);
    
  } catch (error) {
    console.error('❌ Error testing admin subscription:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testAdminSubscription();