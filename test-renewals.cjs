const https = require('https');
const http = require('http');
const { URL } = require('url');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

const BASE_URL = 'http://localhost:3001';

async function testUpcomingRenewals() {
  try {
    console.log('🔍 Testing upcoming renewals endpoint...');
    
    // Step 1: Try to register a test user (might already exist)
    console.log('📝 Attempting to register test user...');
    try {
      const registerResponse = await makeRequest(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testadmin@example.com',
          password: 'TestAdmin123!',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'admin'
        })
      });
      
      if (registerResponse.ok) {
        console.log('✅ User registered successfully');
      } else {
        console.log('ℹ️ User might already exist, continuing...');
      }
    } catch (error) {
      console.log('ℹ️ User might already exist, continuing...');
    }

    // Step 2: Login to get token
    console.log('🔐 Attempting to login...');
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testadmin@example.com',
        password: 'TestAdmin123!'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Login failed:', loginResponse.status, errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    if (!loginData.token) {
      console.error('❌ No token received from login');
      return;
    }

    // Step 3: Test the upcoming renewals endpoint
    console.log('🔍 Testing upcoming renewals endpoint...');
    const renewalsResponse = await makeRequest(`${BASE_URL}/api/super-admin/subscriptions/upcoming-renewals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', renewalsResponse.status);
    console.log('📊 Response status text:', renewalsResponse.statusText);
    
    if (renewalsResponse.ok) {
      const responseData = await renewalsResponse.json();
      console.log('✅ Upcoming renewals endpoint working!');
      console.log('📊 Response data:', JSON.stringify(responseData, null, 2));
    } else {
      const errorText = await renewalsResponse.text();
      console.error('❌ Upcoming renewals endpoint failed');
      console.error('Status:', renewalsResponse.status);
      console.error('Status Text:', renewalsResponse.statusText);
      console.error('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testUpcomingRenewals();