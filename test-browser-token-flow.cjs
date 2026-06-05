const axios = require('axios');

// Simulate the exact browser token flow
async function testBrowserTokenFlow() {
  console.log('Testing browser token flow simulation...\n');
  
  try {
    // Step 1: Login and store token in "localStorage" (simulated)
    console.log('1. Simulating funding manager login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/funding-manager/login', {
      email: 'funding@creditrepairpro.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    const token = loginResponse.data.token;
    console.log('Token received:', token.substring(0, 30) + '...');
    
    // Simulate localStorage.setItem('token', token)
    const simulatedLocalStorage = { token };
    console.log('Token stored in simulated localStorage');
    
    // Step 2: Create axios instance with interceptor (like the frontend)
    const frontendApi = axios.create({
      baseURL: 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add the same interceptor as the frontend
    frontendApi.interceptors.request.use((config) => {
      const storedToken = simulatedLocalStorage.token;
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
        console.log('Interceptor added Authorization header:', config.headers.Authorization.substring(0, 30) + '...');
      }
      return config;
    });
    
    // Step 3: Test profile endpoint using the frontend-style API
    console.log('\n2. Testing profile endpoint with frontend-style API...');
    const profileResponse = await frontendApi.get('/api/auth/profile');
    
    console.log('Profile request successful!');
    console.log('User data:', JSON.stringify(profileResponse.data, null, 2));
    
    // Step 4: Test what happens if token is removed from localStorage
    console.log('\n3. Testing after token removal from localStorage...');
    delete simulatedLocalStorage.token;
    
    try {
      await frontendApi.get('/api/auth/profile');
      console.log('ERROR: Request succeeded without token!');
    } catch (error) {
      console.log('Expected failure without token:', error.response?.status, error.response?.data?.message);
    }
    
    // Step 5: Test with corrupted token
    console.log('\n4. Testing with corrupted token...');
    simulatedLocalStorage.token = 'corrupted-token-data';
    
    try {
      await frontendApi.get('/api/auth/profile');
      console.log('ERROR: Request succeeded with corrupted token!');
    } catch (error) {
      console.log('Expected failure with corrupted token:', error.response?.status, error.response?.data?.message);
    }
    
    console.log('\n✅ All token flow tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testBrowserTokenFlow();