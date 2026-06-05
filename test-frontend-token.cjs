const axios = require('axios');

// Test the frontend token flow
async function testFrontendTokenFlow() {
  console.log('Testing frontend token flow...\n');
  
  try {
    // Step 1: Login to get token
    console.log('1. Logging in to get token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/funding-manager/login', {
      email: 'funding@creditrepairpro.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token received:', loginResponse.data.token.substring(0, 20) + '...');
    
    const token = loginResponse.data.token;
    
    // Step 2: Test profile endpoint with token
    console.log('\n2. Testing profile endpoint with token...');
    const profileResponse = await axios.get('http://localhost:3001/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Profile request successful!');
    console.log('User data:', JSON.stringify(profileResponse.data, null, 2));
    
    // Step 3: Test without token (should fail)
    console.log('\n3. Testing profile endpoint without token (should fail)...');
    try {
      await axios.get('http://localhost:3001/api/auth/profile');
      console.log('ERROR: Request succeeded without token!');
    } catch (error) {
      console.log('Expected failure without token:', error.response?.status, error.response?.data?.message);
    }
    
    // Step 4: Test with invalid token (should fail)
    console.log('\n4. Testing profile endpoint with invalid token (should fail)...');
    try {
      await axios.get('http://localhost:3001/api/auth/profile', {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      });
      console.log('ERROR: Request succeeded with invalid token!');
    } catch (error) {
      console.log('Expected failure with invalid token:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testFrontendTokenFlow();