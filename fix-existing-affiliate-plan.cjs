const mysql = require('mysql2/promise');

async function fixAffiliatePlan() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Connected to MySQL database');
    
    const email = '564684684@gmail.com';
    
    // Get user subscription info
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (userRows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userId = userRows[0].id;
    
    // Get subscription info
    const [subscriptionRows] = await connection.execute(
      'SELECT plan_type FROM subscriptions WHERE user_id = ? AND status = "active"',
      [userId]
    );
    
    if (subscriptionRows.length === 0) {
      console.log('No active subscription found');
      return;
    }
    
    const planType = subscriptionRows[0].plan_type;
    
    // Update affiliate plan_type to match subscription plan_type
    const [updateResult] = await connection.execute(
      'UPDATE affiliates SET plan_type = ? WHERE email = ?',
      [planType === 'monthly' || planType === 'yearly' ? 'paid_partner' : 'free', email]
    );
    
    console.log(`Updated affiliate plan_type to "paid_partner" for ${email}`);
    console.log(`Affected rows: ${updateResult.affectedRows}`);
    
    // Verify the update
    const [verifyRows] = await connection.execute(
      'SELECT plan_type FROM affiliates WHERE email = ?',
      [email]
    );
    
    console.log(`Verified affiliate plan_type: "${verifyRows[0].plan_type}"`);
    
    // Also check if we need to update the plan name - but affiliates table doesn't have plan_name column
     const [subscriptionDetails] = await connection.execute(
       'SELECT plan_name FROM subscriptions WHERE user_id = ? AND status = "active"',
       [userId]
     );
     
     if (subscriptionDetails.length > 0) {
       const planName = subscriptionDetails[0].plan_name;
       console.log(`Admin subscription plan: ${planName}`);
       console.log(`Note: Affiliates table doesn't have plan_name column, only plan_type`);
     }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

fixAffiliatePlan();