const http = require('http');

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

async function testSubscriptionAPI() {
  try {
    console.log('🔐 Logging in as super admin...');
    
    // Login with super admin credentials
    const loginResponse = await makeRequest('/auth/super-admin/login', 'POST', {
      email: 'demo@creditrepairpro.com',
      password: 'demo123'
    });
    
    console.log('Login Status:', loginResponse.status);
    console.log('Login Response:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status !== 200 || !loginResponse.data.token) {
      console.log('❌ Login failed, cannot test subscription API');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Test subscription list endpoint
    console.log('\n📋 Testing subscription list endpoint...');
    const subscriptionsResponse = await makeRequest('/super-admin/subscriptions?page=1&limit=10', 'GET', null, token);
    console.log('Subscriptions Status:', subscriptionsResponse.status);
    console.log('Subscriptions Response:', JSON.stringify(subscriptionsResponse.data, null, 2));
    
    // Test analytics endpoint
    console.log('\n📊 Testing analytics endpoint...');
    const analyticsResponse = await makeRequest('/super-admin/analytics/subscriptions', 'GET', null, token);
    console.log('Analytics Status:', analyticsResponse.status);
    console.log('Analytics Response:', JSON.stringify(analyticsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing subscription API:', error);
  }
}

testSubscriptionAPI();