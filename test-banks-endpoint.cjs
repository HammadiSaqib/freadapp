const axios = require('axios');

async function testBanksEndpoint() {
  try {
    // First login to get token
    console.log('Logging in to get token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/funding-manager/login', {
      email: 'funding@creditrepairpro.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Token obtained:', token ? 'Yes' : 'No');
    
    // Test banks endpoint
    console.log('Testing /api/banks endpoint...');
    const banksResponse = await axios.get('http://localhost:3001/api/banks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Banks endpoint response:', banksResponse.status);
    console.log('Banks data:', JSON.stringify(banksResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error details:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testBanksEndpoint();