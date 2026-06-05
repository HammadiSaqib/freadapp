const jwt = require('jsonwebtoken');

async function testSubscriptionAPI() {
  try {
    // Generate token for debug user
    const token = jwt.sign(
      { id: 57, email: 'xisav87409@filipx.com', role: 'admin' },
      'your-super-secret-jwt-key-for-development',
      { expiresIn: '1h' }
    );
    
    console.log('🔍 Testing subscription API for debug user...');
    
    const response = await fetch('http://localhost:3001/api/billing/subscription', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.subscription) {
      console.log('✅ Subscription found:', data.subscription.plan_name);
      console.log('📋 Subscription status:', data.subscription.status);
    } else if (data.success && !data.subscription) {
      console.log('❌ No subscription found (subscription is null)');
    } else {
      console.log('❌ API error or unexpected response');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSubscriptionAPI();