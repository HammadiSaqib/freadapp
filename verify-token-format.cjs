const axios = require('axios');
const jwt = require('jsonwebtoken');

async function verifyTokenFormat() {
  console.log('=== Verifying JWT Token Format ===');
  
  const baseURL = 'http://localhost:3002';
  
  try {
    // Step 1: Login and get token
    console.log('\n1. Getting token from login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/funding-manager/login`, {
      email: 'funding@creditrepairpro.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token received');
    console.log('Token length:', token.length);
    console.log('Token starts with:', token.substring(0, 20) + '...');
    
    // Step 2: Decode token without verification
    console.log('\n2. Decoding token structure...');
    const decoded = jwt.decode(token, { complete: true });
    
    console.log('Token header:', decoded.header);
    console.log('Token payload:', decoded.payload);
    
    // Step 3: Verify token structure
    console.log('\n3. Verifying token structure...');
    const payload = decoded.payload;
    
    const requiredFields = ['id', 'email', 'role', 'iat', 'exp'];
    const missingFields = requiredFields.filter(field => !(field in payload));
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields present:', requiredFields);
    } else {
      console.log('❌ Missing fields:', missingFields);
    }
    
    // Step 4: Check token expiration
    console.log('\n4. Checking token expiration...');
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    
    console.log('Current time:', now);
    console.log('Token expires at:', payload.exp);
    console.log('Time until expiry:', timeUntilExpiry, 'seconds');
    console.log('Time until expiry:', Math.floor(timeUntilExpiry / 3600), 'hours');
    
    // Step 5: Test token with API
    console.log('\n5. Testing token with protected API...');
    const apiResponse = await axios.get(`${baseURL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token works with API');
    console.log('User from API:', {
      id: apiResponse.data.id,
      email: apiResponse.data.email,
      role: apiResponse.data.role
    });
    
    console.log('\n🎉 Token format verification completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Token verification failed:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

verifyTokenFormat();