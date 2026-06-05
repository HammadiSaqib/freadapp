const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('🔍 Testing API authentication and history endpoint...');
    
    // First login to get token
    console.log('🔍 Step 1: Logging in...');
    const loginData = await makeRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hammadisaqib@gmail.com', password: '12345678' })
    });
    
    console.log('🔍 Login response:', loginData);
    
    if (loginData.token) {
      console.log('🔍 Step 2: Calling history endpoint with token...');
      // Now call the history endpoint with the token
      const historyData = await makeRequest('http://localhost:3001/api/credit-reports/history', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      console.log('🔍 History API response:', historyData);
      console.log('🔍 History data type:', typeof historyData);
      console.log('🔍 History data length:', historyData?.data?.length || 'N/A');
    } else {
      console.error('🔍 No token received from login');
    }
  } catch (error) {
    console.error('🔍 Error:', error);
  }
}

testAPI();