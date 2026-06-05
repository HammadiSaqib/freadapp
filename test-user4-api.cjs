const mysql = require('mysql2/promise');

async function testUser4API() {
  let connection;
  try {
    // Connect to database to get user 4 password hash
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Get user 4 details including password hash
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = 4'
    );
    
    if (users.length === 0) {
      console.log('❌ User 4 not found');
      return;
    }
    
    const user = users[0];
    console.log('👤 User 4 found:', {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    });
    
    // Try to login with the correct password
    const commonPasswords = ['12345678', 'password', '123456', 'admin', 'test', 'demo123', 'hammad', 'saqib', 'hammadisaqib'];
    let token = null;
    
    console.log('\n🔐 Trying to login with common passwords...');
    
    for (const password of commonPasswords) {
      try {
        console.log(`Trying password: ${password}`);
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            password: password
          })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log('✅ Login successful with password:', password);
          console.log('Token obtained:', token.substring(0, 50) + '...');
          break;
        } else {
          console.log(`❌ Failed with password: ${password}`);
        }
      } catch (error) {
        console.log(`❌ Error with password ${password}:`, error.message);
      }
    }
    
    if (!token) {
      console.log('❌ Could not authenticate user 4 with any common password');
      console.log('💡 You may need to reset the password for user 4 or check the password hash');
      return;
    }
    
    // Test billing endpoints with the token
    console.log('\n📊 Testing billing history endpoint...');
    try {
      const historyResponse = await fetch('http://localhost:3001/api/billing/history', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('History Status:', historyResponse.status);
      const historyData = await historyResponse.json();
      console.log('History Response:', JSON.stringify(historyData, null, 2));
      
      if (historyData.success && historyData.transactions) {
        console.log(`✅ Found ${historyData.transactions.length} transactions`);
      } else {
        console.log('❌ No transactions found or API error');
      }
    } catch (error) {
      console.log('❌ Error testing history endpoint:', error.message);
    }
    
    console.log('\n📋 Testing subscription endpoint...');
    try {
      const subscriptionResponse = await fetch('http://localhost:3001/api/billing/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Subscription Status:', subscriptionResponse.status);
      const subscriptionData = await subscriptionResponse.json();
      console.log('Subscription Response:', JSON.stringify(subscriptionData, null, 2));
      
      if (subscriptionData.success && subscriptionData.subscription) {
        console.log('✅ Active subscription found:', subscriptionData.subscription.plan_name);
      } else {
        console.log('❌ No active subscription found or API error');
      }
    } catch (error) {
      console.log('❌ Error testing subscription endpoint:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testUser4API();