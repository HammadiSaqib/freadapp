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

async function testBillingWithAuth() {
  console.log('🔍 Testing billing API with authentication...');
  
  try {
    // Step 1: Login with demo credentials
    console.log('\n🔐 Step 1: Logging in with demo credentials...');
    const loginResponse = await makeRequest('/auth/login', 'POST', {
      email: 'demo@creditrepairpro.com',
      password: 'demo123'
    });
    
    console.log('Login Status:', loginResponse.status);
    console.log('Login Response:', loginResponse.data);
    
    if (loginResponse.status !== 200 || !loginResponse.data.token) {
      console.log('❌ Login failed, cannot proceed with billing tests');
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful!');
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Step 2: Test billing history endpoint
    console.log('\n📊 Step 2: Testing billing history endpoint...');
    const historyResponse = await makeRequest('/billing/history', 'GET', null, token);
    console.log('History Status:', historyResponse.status);
    console.log('History Response:', JSON.stringify(historyResponse.data, null, 2));
    
    // Step 3: Test subscription endpoint
    console.log('\n📋 Step 3: Testing subscription endpoint...');
    const subscriptionResponse = await makeRequest('/billing/subscription', 'GET', null, token);
    console.log('Subscription Status:', subscriptionResponse.status);
    console.log('Subscription Response:', JSON.stringify(subscriptionResponse.data, null, 2));
    
    // Step 4: Check if user has billing data
    if (historyResponse.data && historyResponse.data.transactions) {
      console.log('\n✅ Billing history found:', historyResponse.data.transactions.length, 'transactions');
    } else {
      console.log('\n❌ No billing history found for this user');
    }
    
    if (subscriptionResponse.data && subscriptionResponse.data.subscription) {
      console.log('✅ Active subscription found:', subscriptionResponse.data.subscription.plan_name);
    } else {
      console.log('❌ No active subscription found for this user');
    }
    
  } catch (error) {
    console.error('❌ Error testing billing with auth:', error.message);
  }
}

testBillingWithAuth();