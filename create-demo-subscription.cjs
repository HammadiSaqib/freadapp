const mysql = require('mysql2/promise');

async function createDemoSubscription() {
  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check current subscriptions for user 1
    console.log('\n📋 Checking current subscriptions for user 1...');
    const [existingSubscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = 1'
    );
    
    if (existingSubscriptions.length > 0) {
      console.log('✅ User 1 already has subscriptions:', existingSubscriptions.length);
      console.log('Existing subscription:', existingSubscriptions[0]);
      return;
    }

    // Get the billing transaction for user 1 to match the subscription
    console.log('\n📊 Getting billing transaction for user 1...');
    const [transactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1'
    );
    
    if (transactions.length === 0) {
      console.log('❌ No billing transactions found for user 1');
      return;
    }
    
    const transaction = transactions[0];
    console.log('Found transaction:', transaction);

    // Create subscription based on the transaction
    console.log('\n➕ Creating subscription for user 1...');
    
    const currentDate = new Date();
    const nextBillingDate = new Date(currentDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // Add 1 month for monthly plan
    
    const subscriptionData = {
      user_id: 1,
      stripe_subscription_id: null,
      stripe_customer_id: transaction.stripe_customer_id,
      plan_name: transaction.plan_name,
      plan_type: transaction.plan_type,
      status: 'active',
      current_period_start: currentDate.toISOString().slice(0, 19).replace('T', ' '),
      current_period_end: nextBillingDate.toISOString().slice(0, 19).replace('T', ' '),
      cancel_at_period_end: 0,
      created_at: currentDate.toISOString().slice(0, 19).replace('T', ' '),
      updated_at: currentDate.toISOString().slice(0, 19).replace('T', ' ')
    };
    
    const [result] = await connection.execute(
      `INSERT INTO subscriptions 
       (user_id, stripe_subscription_id, stripe_customer_id, plan_name, plan_type, status, 
        current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscriptionData.user_id,
        subscriptionData.stripe_subscription_id,
        subscriptionData.stripe_customer_id,
        subscriptionData.plan_name,
        subscriptionData.plan_type,
        subscriptionData.status,
        subscriptionData.current_period_start,
        subscriptionData.current_period_end,
        subscriptionData.cancel_at_period_end,
        subscriptionData.created_at,
        subscriptionData.updated_at
      ]
    );
    
    console.log('✅ Subscription created successfully!');
    console.log('Subscription ID:', result.insertId);
    console.log('Subscription details:', subscriptionData);
    
    // Update the billing transaction status to succeeded
    console.log('\n🔄 Updating transaction status to succeeded...');
    await connection.execute(
      'UPDATE billing_transactions SET status = "succeeded" WHERE id = ?',
      [transaction.id]
    );
    
    console.log('✅ Transaction status updated to succeeded');
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const [newSubscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = 1'
    );
    const [updatedTransactions] = await connection.execute(
      'SELECT * FROM billing_transactions WHERE user_id = 1'
    );
    
    console.log('New subscriptions:', newSubscriptions.length);
    console.log('Updated transactions:', updatedTransactions.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDemoSubscription();