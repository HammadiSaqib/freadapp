const mysql = require('mysql2/promise');

async function checkUserSubscription() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db'
  });

  try {
    console.log('Connected to MySQL database');
    
    // Check user details
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['hammadisaqib@gmail.com']
    );
    
    console.log('User details:', JSON.stringify(users, null, 2));
    
    if (users.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userId = users[0].id;
    
    // Check user's subscription
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );
    
    console.log('User subscriptions:', JSON.stringify(subscriptions, null, 2));
    
    // If user has subscription, get the plan details
    if (subscriptions.length > 0) {
      const planName = subscriptions[0].plan_name;
      
      const [plans] = await connection.execute(
        'SELECT name, page_permissions FROM subscription_plans WHERE name = ?',
        [planName]
      );
      
      console.log('Subscription plan details:', JSON.stringify(plans, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkUserSubscription();