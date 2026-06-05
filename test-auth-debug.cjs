const axios = require('axios');

const API_BASE = 'http://localhost:3001'; // Updated to match server port

async function testAuthentication() {
  console.log('🔍 Testing Authentication and Credit Report Fetch...\n');
  
  try {
    // Step 1: Test login to get a valid token
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'demo@creditrepairpro.com', // Using seeded demo credentials
      password: '12345678'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful, token received');
      const token = loginResponse.data.token;
      
      // Step 2: Test token verification
      console.log('\n2. Testing token verification...');
      const verifyResponse = await axios.get(`${API_BASE}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Token verification successful:', verifyResponse.data);
      
      // Step 3: Test platforms endpoint
      console.log('\n3. Testing platforms endpoint...');
      const platformsResponse = await axios.get(`${API_BASE}/api/credit-reports/platforms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Platforms endpoint successful:', platformsResponse.data);
      
      // Step 4: Test credit report fetch endpoint
      console.log('\n4. Testing credit report fetch endpoint...');
      const fetchResponse = await axios.get(`${API_BASE}/api/credit-reports/fetch`, {
        params: {
          platform: 'myfreescorenow',
          username: 'test',
          password: 'test'
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Credit report fetch successful:', fetchResponse.data);
      
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Response data:', error.response?.data);
    
    if (error.response?.status === 403) {
      console.log('\n🔍 403 Error Analysis:');
      console.log('- This indicates authentication/authorization failure');
      console.log('- Check if user is logged in and has valid token');
      console.log('- Verify token is being sent in Authorization header');
      console.log('- Check if user has required permissions');
    }
  }
}

// Test without authentication first
async function testWithoutAuth() {
  console.log('🔍 Testing endpoints without authentication...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/api/credit-reports/fetch`, {
      params: {
        platform: 'myfreescorenow',
        username: 'test',
        password: 'test'
      }
    });
    console.log('✅ Request without auth succeeded (unexpected):', response.data);
  } catch (error) {
    console.log('❌ Request without auth failed (expected):', error.response?.status, error.response?.statusText);
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ This is expected - endpoint requires authentication');
    }
  }
}

async function runTests() {
  await testWithoutAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testAuthentication();
}

runTests().catch(console.error);