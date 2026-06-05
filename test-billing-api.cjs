const http = require('http');

// Function to make HTTP request
function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testBillingAPI() {
  console.log('🔍 Testing billing API endpoints...');
  
  try {
    // Test without authentication first
    console.log('\n📊 Testing /billing/history without auth:');
    const historyNoAuth = await makeRequest('/billing/history');
    console.log('Status:', historyNoAuth.status);
    console.log('Response:', historyNoAuth.data);

    console.log('\n📋 Testing /billing/subscription without auth:');
    const subscriptionNoAuth = await makeRequest('/billing/subscription');
    console.log('Status:', subscriptionNoAuth.status);
    console.log('Response:', subscriptionNoAuth.data);

    // Test with a dummy token
    console.log('\n📊 Testing /billing/history with dummy token:');
    const historyWithToken = await makeRequest('/billing/history', 'dummy-token');
    console.log('Status:', historyWithToken.status);
    console.log('Response:', historyWithToken.data);

    console.log('\n📋 Testing /billing/subscription with dummy token:');
    const subscriptionWithToken = await makeRequest('/billing/subscription', 'dummy-token');
    console.log('Status:', subscriptionWithToken.status);
    console.log('Response:', subscriptionWithToken.data);

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testBillingAPI();