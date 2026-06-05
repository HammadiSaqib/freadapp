const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testFundingManagerLogin() {
    console.log('🔍 Testing Funding Manager Login and Token Generation...\n');

    try {
        // Test funding manager login
        console.log('1. Testing funding manager login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/funding-manager-login`, {
            username: 'funding_manager',
            password: 'funding123'
        });

        console.log('✅ Login successful');
        console.log('Response status:', loginResponse.status);
        console.log('Response data:', JSON.stringify(loginResponse.data, null, 2));

        const { token, user } = loginResponse.data;
        
        if (!token) {
            console.log('❌ No token received from login');
            return;
        }

        // Validate JWT format
        console.log('\n2. Validating JWT token format...');
        const tokenParts = token.split('.');
        console.log(`Token parts: ${tokenParts.length} (should be 3)`);
        console.log(`Token length: ${token.length} characters`);
        console.log(`Token preview: ${token.substring(0, 50)}...`);

        if (tokenParts.length !== 3) {
            console.log('❌ Invalid JWT format - should have 3 parts separated by dots');
            return;
        }

        // Decode JWT header and payload
        try {
            const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            
            console.log('✅ JWT format is valid');
            console.log('Header:', JSON.stringify(header, null, 2));
            console.log('Payload:', JSON.stringify(payload, null, 2));

            // Check expiration
            if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                const now = new Date();
                console.log(`Token expires: ${expDate.toISOString()}`);
                console.log(`Current time: ${now.toISOString()}`);
                console.log(`Token valid: ${expDate > now ? '✅ Yes' : '❌ Expired'}`);
            }
        } catch (decodeError) {
            console.log('❌ Failed to decode JWT:', decodeError.message);
            return;
        }

        // Test protected endpoint with the token
        console.log('\n3. Testing protected endpoints with token...');
        
        // Test profile endpoint
        try {
            const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Profile endpoint successful');
            console.log('Profile data:', JSON.stringify(profileResponse.data, null, 2));
        } catch (profileError) {
            console.log('❌ Profile endpoint failed:', profileError.response?.data || profileError.message);
        }

        // Test funding requests endpoint
        try {
            const fundingResponse = await axios.get(`${BASE_URL}/api/funding-requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Funding requests endpoint successful');
            console.log('Funding requests count:', fundingResponse.data.requests?.length || 0);
        } catch (fundingError) {
            console.log('❌ Funding requests endpoint failed:', fundingError.response?.data || fundingError.message);
        }

        // Test funding stats endpoint
        try {
            const statsResponse = await axios.get(`${BASE_URL}/api/funding-requests/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Funding stats endpoint successful');
            console.log('Stats data:', JSON.stringify(statsResponse.data, null, 2));
        } catch (statsError) {
            console.log('❌ Funding stats endpoint failed:', statsError.response?.data || statsError.message);
        }

    } catch (error) {
        console.log('❌ Login failed:', error.response?.data || error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Headers:', error.response.headers);
        }
    }
}

// Run the test
testFundingManagerLogin().catch(console.error);