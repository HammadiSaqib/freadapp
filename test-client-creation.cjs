// Using built-in fetch (Node.js 18+)

async function testClientCreation() {
  try {
    console.log('Testing client creation for bird09944@aminating.com...');
    
    // First, let's try to authenticate and get a token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'bird09944@aminating.com',
        password: 'password123' // You might need to adjust this
      })
    });
    
    if (!loginResponse.ok) {
      console.log('Login failed, status:', loginResponse.status);
      const loginError = await loginResponse.text();
      console.log('Login error:', loginError);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData.success);
    
    const token = loginData.token;
    
    // Now try to create a client
    const clientData = {
      first_name: 'Test',
      last_name: 'Client',
      email: 'testclient' + Date.now() + '@example.com',
      phone: '1234567890',
      status: 'active'
    };
    
    console.log('Attempting to create client with data:', clientData);
    
    const createResponse = await fetch('http://localhost:3001/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(clientData)
    });
    
    console.log('Create client response status:', createResponse.status);
    
    const createResult = await createResponse.json();
    console.log('Create client response:', JSON.stringify(createResult, null, 2));
    
    if (createResponse.status === 403 && createResult.error === 'Client quota exceeded') {
      console.log('✅ Quota validation is working correctly - client creation blocked');
    } else if (createResponse.status === 201 || createResponse.status === 200) {
      console.log('❌ Client creation succeeded - quota validation may not be working');
    } else {
      console.log('🤔 Unexpected response - need to investigate further');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

testClientCreation();