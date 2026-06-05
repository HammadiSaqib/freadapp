const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testCurrentUser() {
  try {
    console.log('=== Testing Current User API ===\n');
    
    // First, let's try to login as the funding manager we know exists
    console.log('1. Logging in as funding manager...');
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/funding-manager/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const loginPostData = JSON.stringify({
      email: 'funding@creditrepairpro.com',
      password: 'password123'
    });

    const loginResponse = await makeRequest(loginOptions, loginPostData);

    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status, loginResponse.data);
      return;
    }

    const loginData = JSON.parse(loginResponse.data);
    console.log('Login successful!');
    console.log('User:', JSON.stringify(loginData.user, null, 2));
    
    const token = loginData.token;
    
    // Now test the banks endpoint
    console.log('\n2. Testing banks endpoint with funding manager token...');
    
    const banksOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/banks',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    };

    const banksResponse = await makeRequest(banksOptions);
    console.log('Banks endpoint status:', banksResponse.status);
    
    if (banksResponse.ok) {
      const banksData = JSON.parse(banksResponse.data);
      console.log('Banks data received successfully!');
      console.log('Number of banks:', banksData.banks?.length || 0);
    } else {
      console.log('Banks endpoint error:', banksResponse.data);
    }

    // Test the stats endpoint too
    console.log('\n3. Testing banks stats endpoint...');
    
    const statsOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/banks/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    };

    const statsResponse = await makeRequest(statsOptions);
    console.log('Stats endpoint status:', statsResponse.status);
    
    if (statsResponse.ok) {
      const statsData = JSON.parse(statsResponse.data);
      console.log('Stats data:', JSON.stringify(statsData, null, 2));
    } else {
      console.log('Stats endpoint error:', statsResponse.data);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCurrentUser();