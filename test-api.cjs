const jwt = require('jsonwebtoken');

async function testBillingAPI() {
  try {
    // Create a JWT token for the admin user
    const token = jwt.sign(
      { id: 73, email: '564684684@gmail.com', role: 'admin' },
      'your-super-secret-jwt-key-for-development',
      { expiresIn: '1h' }
    );

    console.log('🔑 Generated token:', token);

    // Make request to billing API
    const response = await fetch('http://localhost:3001/api/billing/subscription', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📋 Response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBillingAPI();