const axios = require('axios');

async function testFundingManagerAuth() {
  console.log('=== Testing Funding Manager Authentication (Fixed) ===');
  
  const baseURL = 'http://localhost:3002';
  
  try {
    // Step 1: Login as funding manager
    console.log('\n1. Attempting funding manager login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/funding-manager/login`, {
      email: 'funding@creditrepairpro.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response status:', loginResponse.status);
    console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');
    
    const token = loginResponse.data.token;
    if (!token) {
      throw new Error('No token received from login');
    }
    
    // Step 2: Test protected endpoint
    console.log('\n2. Testing protected endpoint access...');
    const protectedResponse = await axios.get(`${baseURL}/api/banks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Protected endpoint access successful!');
    console.log('Response status:', protectedResponse.status);
    console.log('Data received:', protectedResponse.data ? 'Yes' : 'No');
    
    // Step 3: Test token verification
    console.log('\n3. Testing token verification...');
    const verifyResponse = await axios.get(`${baseURL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token verification successful!');
    console.log('User profile:', verifyResponse.data);
    
    console.log('\n🎉 All tests passed! Authentication is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    process.exit(1);
  }
}

testFundingManagerAuth();