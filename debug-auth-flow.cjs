// Use built-in fetch in Node.js 18+
async function debugAuthFlow() {
  try {
    console.log('🔍 Testing authentication flow...');
    
    // First, let's try to login
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'demo@creditrepairpro.com',
        password: 'demo123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('🔑 Login response:', loginData);
    
    if (!loginData.success) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginData.token;
    console.log('🎫 Token:', token);
    
    // Now get the profile
    const profileResponse = await fetch('http://localhost:3001/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('👤 Profile response:', profileData);
    
    if (profileData.success && profileData.user) {
      const userId = profileData.user.id;
      console.log(`\n🎯 User ID from profile: ${userId}`);
      
      // Try to fetch credit report for this user ID
      const creditReportResponse = await fetch(`http://localhost:3001/api/credit-reports/client/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const creditReportData = await creditReportResponse.json();
      console.log(`📊 Credit report response for client ${userId}:`, creditReportData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAuthFlow();