const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test user credentials
const testUser = {
  email: 'bird09944@aminating.com',
  password: 'password123'
};

// Function to login and get token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, testUser, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data.token;
  } catch (error) {
    if (error.response) {
      throw new Error(`Login failed: ${error.response.data.error || error.response.statusText}`);
    }
    console.error('Login error:', error.message);
    throw error;
  }
}

// Function to create a client
async function createClient(token, clientNumber) {
  const clientData = {
    first_name: `TestClient${clientNumber}`,
    last_name: `Concurrent${clientNumber}`,
    email: `testclient${clientNumber}@example.com`,
    phone: `555-000-${String(clientNumber).padStart(4, '0')}`,
    status: 'active'
  };

  try {
    const response = await axios.post(`${API_BASE}/api/clients`, clientData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      clientNumber: clientNumber
    };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        data: error.response.data,
        clientNumber: clientNumber
      };
    }
    return {
      success: false,
      error: error.message,
      clientNumber: clientNumber
    };
  }
}

// Function to get current client count
async function getClientCount(token) {
  try {
    const response = await axios.get(`${API_BASE}/api/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (Array.isArray(response.data)) {
      return response.data.length;
    } else {
      console.error('Failed to get client count:', response.data);
      return -1;
    }
  } catch (error) {
    if (error.response) {
      console.error('Failed to get client count:', error.response.data);
    } else {
      console.error('Error getting client count:', error.message);
    }
    return -1;
  }
}

// Main test function
async function testConcurrentClientCreation() {
  console.log('🧪 Testing concurrent client creation to verify quota validation...\n');

  try {
    // Login to get token
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');

    // Get initial client count
    console.log('📊 Getting initial client count...');
    const initialCount = await getClientCount(token);
    console.log(`📈 Initial client count: ${initialCount}\n`);

    // Create multiple concurrent requests (more than the quota limit)
    console.log('🚀 Creating 5 concurrent client creation requests...');
    const concurrentRequests = [];
    
    for (let i = 1; i <= 5; i++) {
      concurrentRequests.push(createClient(token, i));
    }

    // Wait for all requests to complete
    const results = await Promise.all(concurrentRequests);

    // Analyze results
    console.log('\n📋 Results:');
    let successCount = 0;
    let quotaExceededCount = 0;
    let otherErrorCount = 0;

    results.forEach(result => {
      if (result.success) {
        successCount++;
        console.log(`✅ Client ${result.clientNumber}: Created successfully`);
      } else if (result.status === 403) {
        quotaExceededCount++;
        console.log(`🚫 Client ${result.clientNumber}: Quota exceeded (${result.data.message})`);
      } else {
        otherErrorCount++;
        console.log(`❌ Client ${result.clientNumber}: Error - ${result.data?.error || result.error}`);
      }
    });

    // Get final client count
    console.log('\n📊 Getting final client count...');
    const finalCount = await getClientCount(token);
    console.log(`📈 Final client count: ${finalCount}`);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Successful creations: ${successCount}`);
    console.log(`🚫 Quota exceeded responses: ${quotaExceededCount}`);
    console.log(`❌ Other errors: ${otherErrorCount}`);
    console.log(`📈 Client count change: ${finalCount - initialCount}`);

    // Verify the fix worked
    if (finalCount <= initialCount + 1) {
      console.log('\n🎉 SUCCESS: Quota validation is working correctly!');
      console.log('   The transaction fix prevented race conditions.');
    } else {
      console.log('\n⚠️  WARNING: Quota validation may still have issues.');
      console.log('   More clients were created than expected.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testConcurrentClientCreation();