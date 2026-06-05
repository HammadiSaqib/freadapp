const axios = require('axios');

const baseURL = 'http://localhost:3002';

async function debugFundingAuth() {
    console.log('🔍 Debugging Funding Manager Authentication Issue...\n');
    
    try {
        // Step 1: Test login
        console.log('1. Testing funding manager login...');
        const loginResponse = await axios.post(`${baseURL}/api/auth/funding-manager/login`, {
            email: 'funding@creditrepairpro.com',
            password: 'password123'
        });
        
        console.log('✅ Login successful!');
        console.log('Status:', loginResponse.status);
        console.log('Response data:', JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.token;
        if (!token) {
            console.log('❌ No token received in login response');
            return;
        }
        
        console.log('\n2. Testing profile endpoint with token...');
        
        // Step 2: Test profile endpoint
        const profileResponse = await axios.get(`${baseURL}/api/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Profile fetch successful!');
        console.log('Status:', profileResponse.status);
        console.log('Profile data:', JSON.stringify(profileResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error occurred:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Status Text:', error.response.statusText);
            console.log('Response data:', JSON.stringify(error.response.data, null, 2));
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            console.log('No response received:', error.request);
        } else {
            console.log('Error message:', error.message);
        }
        console.log('Full error:', error);
    }
}

debugFundingAuth();