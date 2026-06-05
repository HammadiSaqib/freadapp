const fetch = require('node-fetch');

async function testSupportTicketsAPI() {
  try {
    console.log('🔐 Logging in as support user...');
    
    // First, login as a support user to get a token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'support@creditrepair.com',
        password: 'Support123!'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      console.error('❌ No token received from login');
      return;
    }
    
    console.log('✅ Login successful, token received');
    
    // Now test the tickets API with the token
    console.log('🎫 Testing tickets API...');
    
    const ticketsResponse = await fetch('http://localhost:3001/api/support/tickets?page=1&limit=50', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ticketsResponse.ok) {
      console.error('❌ Tickets API failed:', await ticketsResponse.text());
      return;
    }
    
    const ticketsData = await ticketsResponse.json();
    console.log('✅ Tickets API successful!');
    console.log('📊 Response:', JSON.stringify(ticketsData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSupportTicketsAPI();