const mysql = require('mysql2/promise');

async function checkUserSubscription() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'creditrepair_db'
    });
    
    console.log('Connected to MySQL database');
    
    // Get user info
    const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['hammadisaqib@gmail.com']);
    console.log('User data:', users);
    
    if (users && users.length > 0) {
      const userId = users[0].id;
      
      // Check subscription
      const [subscriptions] = await connection.execute('SELECT * FROM subscriptions WHERE user_id = ? AND status = ?', [userId, 'active']);
      console.log('User subscription:', subscriptions);
      
      // Check subscription plan details
      if (subscriptions && subscriptions.length > 0) {
        const planName = subscriptions[0].plan_name;
        const [plans] = await connection.execute('SELECT * FROM subscription_plans WHERE name = ?', [planName]);
        console.log('Plan details:', plans);
        
        if (plans && plans.length > 0) {
          console.log('Plan features:', plans[0].features);
          console.log('Page permissions:', plans[0].page_permissions);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserSubscription();