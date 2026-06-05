const fetch = require('node-fetch');

async function testAffiliateVerification() {
  try {
    console.log('=== Testing Affiliate Verification API ===');
    
    // Test with a pending affiliate email
    const testEmail = 'wanewa6539@dwakm.com'; // From the pending list
    const testCode = '123456'; // Test verification code
    
    console.log(`Testing with email: ${testEmail}`);
    console.log(`Testing with code: ${testCode}`);
    
    const response = await fetch('http://localhost:3002/api/affiliate/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        code: testCode
      }),
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Parsed response:', responseJson);
    } catch (parseError) {
      console.log('Could not parse response as JSON');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAffiliateVerification();