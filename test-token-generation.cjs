const jwt = require('jsonwebtoken');

// Use the same JWT secret as the server
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create a test super admin user token
const testUser = {
  id: 1,
  email: 'superadmin@test.com',
  role: 'super_admin'
};

// Generate token with the same structure as the server
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });

console.log('Generated test token:');
console.log(token);

// Verify the token can be decoded
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\nDecoded token:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('Token verification failed:', error.message);
}

// Test with fetch
async function testEndpoint() {
  try {
    const response = await fetch('http://localhost:3001/api/super-admin/support-users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\nAPI Response Status:', response.status);
    const data = await response.json();
    console.log('API Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

// Run the test
testEndpoint();