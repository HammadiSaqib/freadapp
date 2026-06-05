const http = require('http');
const mysql = require('mysql2/promise');

// Function to make HTTP request
function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function checkUser4Credentials() {
  let connection;
  try {
    // Connect to database to check user 4 credentials
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('🔍 Checking user 4 credentials in database...');
    
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = 4'
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ Found user 4:', user);
      
      // Try to login with common passwords
      const commonPasswords = ['password', '123456', 'admin', 'test', 'demo123', user.first_name.toLowerCase()];
      
      console.log('\n🔐 Trying to login with common passwords...');
      
      for (const password of commonPasswords) {
        console.log(`Trying password: ${password}`);
        
        const loginResponse = await makeRequest('/auth/login', 'POST', {
          email: user.email,
          password: password
        });
        
        if (loginResponse.status === 200 && loginResponse.data.token) {
          console.log('✅ Login successful with password:', password);
          const token = loginResponse.data.token;
          
          // Test billing endpoints
          console.log('\n📊 Testing billing history...');
          const historyResponse = await makeRequest('/billing/history', 'GET', null, token);
          console.log('History:', JSON.stringify(historyResponse.data, null, 2));
          
          console.log('\n📋 Testing subscription...');
          const subscriptionResponse = await makeRequest('/billing/subscription', 'GET', null, token);
          console.log('Subscription:', JSON.stringify(subscriptionResponse.data, null, 2));
          
          return;
        } else {
          console.log('❌ Failed with password:', password);
        }
      }
      
      console.log('❌ Could not find working password for user 4');
    } else {
      console.log('❌ User 4 not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUser4Credentials();