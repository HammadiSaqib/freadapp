const fetch = require('node-fetch');

async function testApiEndpoint() {
  try {
    console.log('Testing API endpoint: /api/credit-reports/client/33');
    
    const response = await fetch('http://localhost:3001/api/credit-reports/client/33', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Using a simple test without authentication for now
      }
    });

    if (!response.ok) {
      console.log('Response status:', response.status);
      console.log('Response text:', await response.text());
      return;
    }

    const data = await response.json();
    console.log('API Response received successfully!');
    console.log('Response structure:');
    console.log('- success:', data.success);
    console.log('- data keys:', Object.keys(data.data || {}));
    
    if (data.data && data.data.reportData) {
      console.log('- reportData keys:', Object.keys(data.data.reportData));
      
      if (data.data.reportData.Accounts) {
        console.log('- Accounts count:', data.data.reportData.Accounts.length);
        console.log('- First account structure:', Object.keys(data.data.reportData.Accounts[0] || {}));
      }
      
      if (data.data.reportData.Score) {
        console.log('- Score entries:', data.data.reportData.Score.length);
        console.log('- Score structure:', data.data.reportData.Score.map(s => ({
          BureauId: s.BureauId,
          Score: s.Score,
          ScoreType: s.ScoreType
        })));
      }
    }
    
  } catch (error) {
    console.error('Error testing API endpoint:', error.message);
  }
}

testApiEndpoint();