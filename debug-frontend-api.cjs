const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testFrontendAPI() {
  try {
    console.log('Testing frontend API calls...\n');

    // First, login to get the token
    console.log('1. Logging in as super admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/super-admin/login`, {
      email: 'demo@creditrepairpro.com',
      password: '12345678'
    });

    if (!loginResponse.data.token) {
      console.error('Login failed:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✓ Login successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test sales chat analytics
    console.log('\n2. Testing sales chat analytics...');
    try {
      const salesChatResponse = await axios.get(`${BASE_URL}/api/super-admin/analytics/sales-chat`, { headers });
      console.log('Sales Chat Response Status:', salesChatResponse.status);
      console.log('Sales Chat Response Data:', JSON.stringify(salesChatResponse.data, null, 2));
    } catch (error) {
      console.error('Sales Chat Error:', error.response?.data || error.message);
    }

    // Test report pulling analytics
    console.log('\n3. Testing report pulling analytics...');
    try {
      const reportPullingResponse = await axios.get(`${BASE_URL}/api/super-admin/analytics/report-pulling`, { headers });
      console.log('Report Pulling Response Status:', reportPullingResponse.status);
      console.log('Report Pulling Response Data:', JSON.stringify(reportPullingResponse.data, null, 2));
    } catch (error) {
      console.error('Report Pulling Error:', error.response?.data || error.message);
    }

    // Test recent alerts
    console.log('\n4. Testing recent alerts...');
    try {
      const alertsResponse = await axios.get(`${BASE_URL}/api/super-admin/analytics/recent-alerts`, { headers });
      console.log('Alerts Response Status:', alertsResponse.status);
      console.log('Alerts Response Data:', JSON.stringify(alertsResponse.data, null, 2));
    } catch (error) {
      console.error('Alerts Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Error during API testing:', error.message);
    console.error('Error details:', error.code);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testFrontendAPI();