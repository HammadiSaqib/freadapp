const jwt = require('jsonwebtoken');
const axios = require('axios');

// Use the same JWT secret as the server
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development';

async function testDashboardAPI() {
  try {
    console.log('🔍 Testing Dashboard Analytics API...\n');
    
    // Create a JWT token for the admin user (ID: 4, hammadisaqib@gmail.com)
    const token = jwt.sign(
      { 
        id: 4, 
        email: 'hammadisaqib@gmail.com', 
        role: 'admin' 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Generated JWT token for admin user');
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test the dashboard analytics API
    console.log('\n🔍 Testing /api/analytics/dashboard endpoint...');
    
    const response = await axios.get('http://localhost:3001/api/analytics/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 API Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check specifically for client_metrics
    if (response.data && response.data.data && response.data.data.client_metrics) {
      console.log('\n📋 Client Metrics:');
      console.log('Total Clients:', response.data.data.client_metrics.total_clients);
      console.log('Active Clients:', response.data.data.client_metrics.active_clients);
      console.log('Inactive Clients:', response.data.data.client_metrics.inactive_clients);
      console.log('Pending Clients:', response.data.data.client_metrics.pending_clients);
    } else {
      console.log('❌ No client_metrics found in response');
    }
    
  } catch (error) {
    console.error('❌ Error testing dashboard API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDashboardAPI();