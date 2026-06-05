const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db',
  port: 3306
};

async function checkUserBillingStatus() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL database');
    
    const email = '564684684@gmail.com';
    console.log(`\n=== Checking billing status for: ${email} ===\n`);
    
    // Check users table (main users table)
    console.log('1. USERS TABLE:');
    const [userRows] = await connection.execute(
      'SELECT id, email, first_name, last_name, role, status, stripe_customer_id, created_at FROM users WHERE email = ?',
      [email]
    );
    
    if (userRows.length > 0) {
      const user = userRows[0];
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Stripe Customer ID: ${user.stripe_customer_id}`);
      console.log(`   Created At: ${user.created_at}`);
    } else {
      console.log('   No user found with this email');
    }
    
    // Check affiliates table
    console.log('\n2. AFFILIATES TABLE:');
    const [affiliateRows] = await connection.execute(
      'SELECT id, email, first_name, last_name, status, plan_type, total_earnings, total_referrals, created_at FROM affiliates WHERE email = ?',
      [email]
    );
    
    if (affiliateRows.length > 0) {
      const affiliate = affiliateRows[0];
      console.log(`   ID: ${affiliate.id}`);
      console.log(`   Email: ${affiliate.email}`);
      console.log(`   Name: ${affiliate.first_name} ${affiliate.last_name}`);
      console.log(`   Plan Type: ${affiliate.plan_type}`);
      console.log(`   Total Earnings: ${affiliate.total_earnings}`);
      console.log(`   Total Referrals: ${affiliate.total_referrals}`);
      console.log(`   Account Status: ${affiliate.status}`);
      console.log(`   Created At: ${affiliate.created_at}`);
    } else {
      console.log('   No affiliate found with this email');
    }
    
    // Check billing_transactions table
    console.log('\n3. BILLING_TRANSACTIONS TABLE:');
    try {
      const [billingRows] = await connection.execute(
        'SELECT * FROM billing_transactions WHERE user_id = ?',
        [userRows.length > 0 ? userRows[0].id : null]
      );
      
      if (billingRows.length > 0) {
        billingRows.forEach((billing, index) => {
          console.log(`   Transaction ${index + 1}:`);
          console.log(`     ID: ${billing.id}`);
          console.log(`     User ID: ${billing.user_id}`);
          console.log(`     Amount: ${billing.amount} ${billing.currency}`);
          console.log(`     Status: ${billing.status}`);
          console.log(`     Plan Name: ${billing.plan_name}`);
          console.log(`     Plan Type: ${billing.plan_type}`);
          console.log(`     Payment Method: ${billing.payment_method}`);
          console.log(`     Stripe Payment Intent: ${billing.stripe_payment_intent_id}`);
          console.log(`     Created At: ${billing.created_at}`);
          console.log('');
        });
      } else {
        console.log('   No billing transactions found for this user');
      }
    } catch (error) {
      console.log('   Error querying billing_transactions table:', error.message);
    }

    // Check subscriptions table
    console.log('\n4. SUBSCRIPTIONS TABLE:');
    try {
      const [subscriptionRows] = await connection.execute(
        'SELECT * FROM subscriptions WHERE user_id = ?',
        [userRows.length > 0 ? userRows[0].id : null]
      );
      
      if (subscriptionRows.length > 0) {
        subscriptionRows.forEach((sub, index) => {
          console.log(`   Subscription Record ${index + 1}:`);
          console.log(`     ID: ${sub.id}`);
          console.log(`     User ID: ${sub.user_id}`);
          console.log(`     Plan Name: ${sub.plan_name}`);
          console.log(`     Plan Type: ${sub.plan_type}`);
          console.log(`     Status: ${sub.status}`);
          console.log(`     Stripe Subscription ID: ${sub.stripe_subscription_id}`);
          console.log(`     Current Period Start: ${sub.current_period_start}`);
          console.log(`     Current Period End: ${sub.current_period_end}`);
          console.log(`     Cancel at Period End: ${sub.cancel_at_period_end}`);
          console.log(`     Created At: ${sub.created_at}`);
          console.log('');
        });
      } else {
        console.log('   No subscription records found for this user');
      }
    } catch (error) {
      console.log('   Error querying subscriptions table:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

checkUserBillingStatus();