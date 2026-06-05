const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testPlansAPI() {
  console.log('🧪 Testing Plans API specifically...\n');

  try {
    // Step 1: Login to get auth token
    console.log('1. Logging in to get auth token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'testadmin@example.com',
      password: 'TestAdmin123!'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!loginResponse.data.token) {
      throw new Error('No token received from login');
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Step 2: Test Plans API
    console.log('\n2. Testing Plans API...');
    try {
      const plansResponse = await axios.get(`${API_BASE_URL}/api/super-admin/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Plans API Status:', plansResponse.status);
      console.log('✅ Plans API Response:', JSON.stringify(plansResponse.data, null, 2));
      
      if (plansResponse.data && plansResponse.data.length > 0) {
        console.log(`✅ Found ${plansResponse.data.length} plans`);
      } else {
        console.log('ℹ️ No plans found in database');
      }

    } catch (plansError) {
      console.error('❌ Plans API Error:', plansError.response?.status, plansError.response?.data);
      console.error('❌ Full error:', plansError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
  }
}

testPlansAPI();