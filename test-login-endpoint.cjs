const jwt = require('jsonwebtoken');

// Use the same JWT_SECRET as the server
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create a valid super admin token
const superAdminToken = jwt.sign(
  { 
    id: 1, 
    email: 'superadmin@example.com', 
    role: 'super_admin' 
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Generated super admin token:', superAdminToken);

// Test the login as support user endpoint
async function testLoginEndpoint() {
  try {
    const response = await fetch('http://localhost:3001/api/super-admin/support-users/6/login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Login as support user endpoint works correctly!');
    } else {
      console.log('❌ Login as support user endpoint failed');
    }
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

testLoginEndpoint();