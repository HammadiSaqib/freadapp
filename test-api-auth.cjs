const axios = require('axios');

async function testAPIEndpoints() {
  try {
    console.log('Testing Super Admin Analytics API endpoints...\n');
    
    // First, let's try to login as super admin using the correct endpoint
    console.log('Attempting super admin login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/super-admin/login', {
      email: 'demo@creditrepairpro.com',
      password: '12345678'
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status !== 200 || !loginResponse.data.token) {
      console.log('Super admin login failed, trying alternative credentials...');
      
      // Try with different credentials
      const altLoginResponse = await axios.post('http://localhost:3001/api/auth/super-admin/login', {
        email: 'test@example.com',
        password: '12345678'
      });
      
      console.log('Alt login response status:', altLoginResponse.status);
      console.log('Alt login response data:', JSON.stringify(altLoginResponse.data, null, 2));
      
      if (altLoginResponse.status !== 200 || !altLoginResponse.data.token) {
        console.log('Could not authenticate. Testing without auth...');
        
        // Test endpoints without authentication
        await testEndpointWithoutAuth('/api/super-admin/analytics/sales-chat');
        await testEndpointWithoutAuth('/api/super-admin/analytics/report-pulling');
        return;
      }
      
      console.log('Alternative login successful');
    } else {
      console.log('Super admin login successful');
    }
    
    const token = loginResponse.data.token;
    console.log('Token received:', token.substring(0, 20) + '...');
    
    // Test sales chat analytics endpoint
    console.log('\n=== Testing Sales Chat Analytics ===');
    try {
      const salesChatResponse = await axios.get('http://localhost:3001/api/super-admin/analytics/sales-chat', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Sales Chat Analytics Status:', salesChatResponse.status);
      console.log('Sales Chat Analytics Data:', JSON.stringify(salesChatResponse.data, null, 2));
    } catch (error) {
      console.log('Sales Chat Analytics Error:', error.response?.status, error.response?.data);
    }
    
    // Test report pulling analytics endpoint
    console.log('\n=== Testing Report Pulling Analytics ===');
    try {
      const reportPullingResponse = await axios.get('http://localhost:3001/api/super-admin/analytics/report-pulling', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Report Pulling Analytics Status:', reportPullingResponse.status);
      console.log('Report Pulling Analytics Data:', JSON.stringify(reportPullingResponse.data, null, 2));
    } catch (error) {
      console.log('Report Pulling Analytics Error:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.log('Login error:', error.response?.status, error.response?.data);
  }
}

async function testEndpointWithoutAuth(endpoint) {
  try {
    console.log(`\n=== Testing ${endpoint} without auth ===`);
    const response = await axios.get(`http://localhost:3001${endpoint}`);
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data);
  }
}

testAPIEndpoints();