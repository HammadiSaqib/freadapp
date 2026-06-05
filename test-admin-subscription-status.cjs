require('dotenv').config();
const axios = require('axios');

async function testAdminSubscriptionStatus() {
  try {
    console.log('🔍 Testing admin subscription status API...');
    
    // First, login as admin user
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'bird09944@aminating.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Admin login successful');
      const token = loginResponse.data.token;
      
      // Test the subscription status endpoint
      const subscriptionResponse = await axios.get('http://localhost:3001/api/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📊 Subscription API Response:');
      console.log('Status:', subscriptionResponse.status);
      console.log('Data:', JSON.stringify(subscriptionResponse.data, null, 2));
      
      // Test the user profile endpoint
      const profileResponse = await axios.get('http://localhost:3001/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('👤 Profile API Response:');
      console.log('Status:', profileResponse.status);
      console.log('User Role:', profileResponse.data.user?.role);
      console.log('User Status:', profileResponse.data.user?.status);
      
    } else {
      console.log('❌ Admin login failed:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error testing admin subscription status:', error.response?.data || error.message);
  }
}

testAdminSubscriptionStatus();