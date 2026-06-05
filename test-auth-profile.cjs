const http = require('http');
const fs = require('fs');
const path = require('path');

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

// Function to get auth token from browser localStorage (simulated)
function getStoredAuthToken() {
  // In a real scenario, we'd need to extract this from the browser
  // For now, let's try to find it in any debug files or logs
  console.log('🔍 Looking for stored auth token...');
  
  // Check if there's a debug auth file
  const debugAuthPath = path.join(__dirname, 'debug-auth.html');
  if (fs.existsSync(debugAuthPath)) {
    const content = fs.readFileSync(debugAuthPath, 'utf8');
    console.log('📄 Found debug-auth.html file');
    // Look for token patterns in the file
    const tokenMatch = content.match(/token["']?\s*[:=]\s*["']([^"']+)["']/i);
    if (tokenMatch) {
      console.log('🎯 Found potential token in debug file');
      return tokenMatch[1];
    }
  }
  
  return null;
}

async function testAuthProfile() {
  console.log('🔍 Testing auth profile endpoint...');
  
  try {
    // Try to get stored token
    const storedToken = getStoredAuthToken();
    if (storedToken) {
      console.log('🔑 Using stored token:', storedToken.substring(0, 20) + '...');
    }

    // Test auth profile endpoint
    console.log('\n👤 Testing /auth/profile:');
    const profileResponse = await makeRequest('/auth/profile', storedToken);
    console.log('Status:', profileResponse.status);
    console.log('Response:', profileResponse.data);

    if (profileResponse.status === 200 && profileResponse.data.user) {
      const user = profileResponse.data.user;
      console.log('\n✅ Authenticated user details:');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.first_name, user.last_name);
      
      // Now test billing endpoints with this valid token
      console.log('\n📊 Testing billing endpoints with valid token:');
      
      const historyResponse = await makeRequest('/billing/history', storedToken);
      console.log('\nBilling History Status:', historyResponse.status);
      console.log('Billing History Response:', historyResponse.data);
      
      const subscriptionResponse = await makeRequest('/billing/subscription', storedToken);
      console.log('\nSubscription Status:', subscriptionResponse.status);
      console.log('Subscription Response:', subscriptionResponse.data);
    }

  } catch (error) {
    console.error('❌ Error testing auth profile:', error.message);
  }
}

testAuthProfile();