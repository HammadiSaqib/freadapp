const jwt = require('jsonwebtoken');

// Use the CORRECT JWT secret from .env file
const JWT_SECRET = 'your-super-secret-jwt-key-for-development';

console.log('🔍 Testing Authentication with Correct JWT Secret...\n');
console.log('Using JWT_SECRET:', JWT_SECRET);

async function testAuthenticationFlow() {
  try {
    // Step 1: Test login
    console.log('1. Testing login...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'demo@creditrepairpro.com',
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      const errorData = await loginResponse.text();
      console.log('Error:', errorData);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Token received:', loginData.token.substring(0, 50) + '...');

    // Step 2: Verify the token structure
    console.log('\n2. Verifying token structure...');
    try {
      const decoded = jwt.verify(loginData.token, JWT_SECRET);
      console.log('✅ Token verification successful');
      console.log('Decoded token:', {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      return;
    }

    // Step 3: Test protected endpoint
    console.log('\n3. Testing protected endpoint...');
    const profileResponse = await fetch('http://localhost:3001/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Profile endpoint status:', profileResponse.status);
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Profile endpoint successful');
      console.log('User data:', {
        id: profileData.user?.id,
        email: profileData.user?.email,
        role: profileData.user?.role
      });
    } else {
      const errorData = await profileResponse.text();
      console.log('❌ Profile endpoint failed:', errorData);
    }

    // Step 4: Test credit reports fetch endpoint
    console.log('\n4. Testing credit reports fetch endpoint...');
    const fetchResponse = await fetch('http://localhost:3001/api/credit-reports/fetch?platform=myfreecreditreport', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Fetch endpoint status:', fetchResponse.status);
    if (fetchResponse.ok) {
      console.log('✅ Fetch endpoint accessible');
    } else {
      const errorData = await fetchResponse.text();
      console.log('❌ Fetch endpoint failed:', errorData);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAuthenticationFlow();