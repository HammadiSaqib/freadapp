const jwt = require('jsonwebtoken');

// Use the same JWT secret as configured in .env
const JWT_SECRET = 'your-super-secret-jwt-key-for-development';

// Generate a test JWT token
const testToken = jwt.sign(
  { 
    id: 1, 
    email: 'test@example.com', 
    role: 'funding_manager'
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Testing /api/banks endpoint...');

async function testBanksEndpoint() {
  try {
    const response = await fetch('http://localhost:3001/api/banks?status=active', {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed data:', data);
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }
  } catch (error) {
    console.error('Error testing banks endpoint:', error);
  }
}

testBanksEndpoint();