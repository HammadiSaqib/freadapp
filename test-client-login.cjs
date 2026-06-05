require('dotenv').config();
const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: () => jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: data });
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

async function testClientLogin() {
  try {
    console.log('🔐 Testing client login...');
    
    // Client credentials from database
    const clientCredentials = {
      email: 'mrbadi1989@gmail.com',
      password: 'BmwNyr09262021!$'
    };
    
    // Step 1: Login as client
    const loginResponse = await makeRequest('http://localhost:3001/api/auth/member/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientCredentials)
    });
    
    const loginData = loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginResponse.ok) {
      console.error('❌ Client login failed');
      return;
    }
    
    const { token, user } = loginData;
    console.log('✅ Client login successful');
    console.log('Client ID:', user.id);
    console.log('Client email:', user.email);
    console.log('Client role:', user.role);
    
    // Step 2: Test credit report access
    console.log('\n📊 Testing credit report access...');
    
    const creditReportResponse = await makeRequest(`http://localhost:3001/api/credit-reports/client/${user.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const creditReportData = creditReportResponse.json();
    console.log('Credit report response status:', creditReportResponse.status);
    console.log('Credit report response:', JSON.stringify(creditReportData, null, 2));
    
    if (creditReportResponse.ok) {
      console.log('✅ Credit report access successful');
    } else {
      console.log('❌ Credit report access failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testClientLogin();