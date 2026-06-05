const axios = require('axios');

async function testAffiliateLogin() {
  try {
    console.log('🔐 Testing affiliate login...');
    
    // Test affiliate login
    const loginResponse = await axios.post('http://localhost:3001/api/auth/affiliate/login', {
      email: 'testaffiliate@example.com',
      password: 'testpassword123'
    });
    
    console.log('✅ Login successful');
    console.log('Token:', loginResponse.data.token);
    
    const token = loginResponse.data.token;
    
    // Now test the affiliate settings endpoint
    console.log('\n📋 Testing affiliate settings endpoint...');
    
    const settingsResponse = await axios.get('http://localhost:3001/api/affiliate/settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Settings retrieved successfully');
    console.log('Profile data:', JSON.stringify(settingsResponse.data.profile, null, 2));
    console.log('Notifications data:', JSON.stringify(settingsResponse.data.notifications, null, 2));
    console.log('Payment data:', JSON.stringify(settingsResponse.data.payment, null, 2));
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Full error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused - make sure the server is running on port 3001');
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 The affiliate credentials might be incorrect.');
      console.log('   Try logging in with different credentials or create a new affiliate.');
    }
    
    if (error.response?.status === 403) {
      console.log('\n💡 The user might not have affiliate role.');
      console.log('   Make sure the user has "affiliate" role in the database.');
    }
  }
}

testAffiliateLogin();