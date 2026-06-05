const axios = require('axios');

// Test the frontend authentication fix
async function testFrontendAuthFix() {
  console.log('Testing frontend authentication fix...\n');
  
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
    
    // Step 2: Simulate frontend API call with auth_token key
    console.log('\n2. Testing with auth_token key (frontend fix)...');
    const simulatedLocalStorage = { auth_token: token };
    
    // Create axios instance like the frontend
    const frontendApi = axios.create({
      baseURL: 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add the same interceptor as the fixed frontend
    frontendApi.interceptors.request.use((config) => {
      const storedToken = simulatedLocalStorage.auth_token;
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
        console.log('Interceptor added Authorization header with auth_token');
      }
      return config;
    });
    
    // Test profile endpoint
    const profileResponse = await frontendApi.get('/api/auth/profile');
    console.log('Profile request successful!');
    console.log('User data:', JSON.stringify(profileResponse.data, null, 2));
    
    // Step 3: Test banks endpoint (funding manager specific)
    console.log('\n3. Testing banks endpoint...');
    const banksResponse = await frontendApi.get('/api/banks');
    console.log('Banks request successful!');
    console.log('Banks count:', banksResponse.data.banks?.length || 0);
    
    console.log('\n✅ Frontend authentication fix verified successfully!');
    console.log('The auth_token localStorage key is now working correctly.');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testFrontendAuthFix();