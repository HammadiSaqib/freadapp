const mysql = require('mysql2/promise');

async function checkUserSubscription() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔍 Checking subscription status for user ID 56 (yotab14930@dwakm.com)');
    
    // Check subscriptions table
    const [subRows] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [56]
    );
    
    console.log(`📊 Subscriptions found: ${subRows.length}`);
    
    if (subRows.length > 0) {
      console.log('\n📋 Subscription details:');
      subRows.forEach((sub, index) => {
        console.log(`  Subscription ${index + 1}:`);
        console.log(`    - ID: ${sub.id}`);
        console.log(`    - Plan Name: ${sub.plan_name}`);
        console.log(`    - Plan Type: ${sub.plan_type}`);
        console.log(`    - Status: ${sub.status}`);
        console.log(`    - Start Date: ${sub.start_date}`);
        console.log(`    - End Date: ${sub.end_date}`);
        console.log(`    - Created: ${sub.created_at}`);
      });
    } else {
      console.log('✅ Confirmed: User has NO subscriptions');
    }
    
    // Also check admin_subscriptions table if it exists
    try {
      const [adminSubRows] = await connection.execute(
        'SELECT * FROM admin_subscriptions WHERE admin_id = ?',
        [56]
      );
      
      console.log(`\n📊 Admin subscriptions found: ${adminSubRows.length}`);
      
      if (adminSubRows.length > 0) {
        console.log('\n📋 Admin subscription details:');
        adminSubRows.forEach((sub, index) => {
          console.log(`  Admin Subscription ${index + 1}:`);
          console.log(`    - ID: ${sub.id}`);
          console.log(`    - Plan ID: ${sub.plan_id}`);
          console.log(`    - Status: ${sub.status}`);
          console.log(`    - Start Date: ${sub.start_date}`);
          console.log(`    - End Date: ${sub.end_date}`);
        });
      } else {
        console.log('✅ Confirmed: User has NO admin subscriptions');
      }
    } catch (error) {
      console.log('ℹ️  admin_subscriptions table may not exist or is empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserSubscription();