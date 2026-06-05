const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testCreditReportAPI() {
  try {
    console.log('Testing credit report API endpoint...');
    
    // First, let's test without authentication to see the error
    console.log('\n1. Testing without authentication:');
    const response1 = await makeRequest('http://localhost:3001/api/credit-reports/client/33');
    console.log('Status:', response1.status);
    console.log('Response:', response1.body);
    
    // Test the base API endpoint
    console.log('\n2. Testing base API endpoint:');
    const response2 = await makeRequest('http://localhost:3001/api');
    console.log('Status:', response2.status);
    console.log('Response:', response2.body);
    
    // Test health check
    console.log('\n3. Testing health check:');
    const response3 = await makeRequest('http://localhost:3001/api/health');
    console.log('Status:', response3.status);
    console.log('Response:', response3.body);
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testCreditReportAPI();