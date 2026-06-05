const mysql = require('mysql2/promise');

async function debugBirdUser() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('🔍 Debugging user: bird09944@aminating.com');
    
    // Find the user
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['bird09944@aminating.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log(`✅ Found user ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.email_verified}`);
    console.log(`   Created: ${user.created_at}`);
    
    // Check subscriptions
    console.log('\n📊 Checking subscriptions...');
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [user.id]
    );
    
    console.log(`   Regular subscriptions: ${subscriptions.length}`);
    if (subscriptions.length > 0) {
      subscriptions.forEach((sub, index) => {
        console.log(`   Subscription ${index + 1}: ${sub.plan_name} - ${sub.status}`);
      });
    }
    
    // Check admin subscriptions
    const [adminSubs] = await connection.execute(`
      SELECT 
        asub.status,
        asub.billing_cycle,
        sp.name as plan_name,
        sp.max_clients
      FROM admin_subscriptions asub
      JOIN admin_profiles ap ON ap.id = asub.admin_id
      JOIN subscription_plans sp ON sp.id = asub.plan_id
      WHERE ap.user_id = ? AND asub.status = 'active'
      ORDER BY asub.created_at DESC
      LIMIT 1
    `, [user.id]);
    
    console.log(`   Admin subscriptions: ${adminSubs.length}`);
    if (adminSubs.length > 0) {
      adminSubs.forEach((sub, index) => {
        console.log(`   Admin Subscription ${index + 1}: ${sub.plan_name} - ${sub.status} (Max clients: ${sub.max_clients})`);
      });
    }
    
    // Check client count
    console.log('\n👥 Checking clients...');
    const [clients] = await connection.execute(
      'SELECT * FROM clients WHERE user_id = ?',
      [user.id]
    );
    
    console.log(`   Total clients: ${clients.length}`);
    if (clients.length > 0) {
      clients.forEach((client, index) => {
        console.log(`   Client ${index + 1}: ${client.first_name} ${client.last_name} (${client.email}) - Created: ${client.created_at}`);
      });
    }
    
    // Test the quota validation logic
    console.log('\n🧪 Testing quota validation logic...');
    
    // Simulate the planValidation logic
    const currentClientCount = clients.length;
    const hasActiveSubscription = subscriptions.some(s => s.status === 'active') || adminSubs.some(s => s.status === 'active');
    
    console.log(`   Current client count: ${currentClientCount}`);
    console.log(`   Has active subscription: ${hasActiveSubscription}`);
    
    if (!hasActiveSubscription) {
      const maxClients = 1;
      const canAddClient = currentClientCount < maxClients;
      console.log(`   Max clients allowed (no subscription): ${maxClients}`);
      console.log(`   Can add more clients: ${canAddClient}`);
      
      if (!canAddClient) {
        console.log('   ❌ QUOTA SHOULD BE EXCEEDED - User should not be able to add more clients');
      } else {
        console.log('   ✅ User can still add clients');
      }
    } else {
      console.log('   ✅ User has active subscription, checking plan limits...');
      const activeSub = subscriptions.find(s => s.status === 'active') || adminSubs.find(s => s.status === 'active');
      console.log(`   Max clients from subscription: ${activeSub?.max_clients || 'unlimited'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugBirdUser();