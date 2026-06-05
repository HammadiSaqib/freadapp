const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-here';

async function testBillingFix() {
  try {
    console.log('🧪 Testing billing fix for user yotab14930@dwakm.com...');
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    // Find the user
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['yotab14930@dwakm.com']
    );

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users[0];
    console.log('👤 Found user:', user);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('🔑 Generated token for user');

    // Test billing endpoints
    const baseUrl = 'http://localhost:3001';
    
    console.log('📊 Testing billing history endpoint...');
    const historyResponse = await fetch(`${baseUrl}/api/billing/history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 History Response Status:', historyResponse.status);
    const historyText = await historyResponse.text();
    console.log('📊 History Response Body:', historyText);

    // Test if response can be parsed as JSON
    try {
      const historyData = JSON.parse(historyText);
      console.log('✅ History response parsed successfully:', historyData);
    } catch (parseError) {
      console.log('❌ Failed to parse history response as JSON:', parseError.message);
    }

    console.log('📋 Testing subscription endpoint...');
    const subscriptionResponse = await fetch(`${baseUrl}/api/billing/subscription`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📋 Subscription Response Status:', subscriptionResponse.status);
    const subscriptionText = await subscriptionResponse.text();
    console.log('📋 Subscription Response Body:', subscriptionText);

    // Test if response can be parsed as JSON
    try {
      const subscriptionData = JSON.parse(subscriptionText);
      console.log('✅ Subscription response parsed successfully:', subscriptionData);
    } catch (parseError) {
      console.log('❌ Failed to parse subscription response as JSON:', parseError.message);
    }

    // Test localStorage scenarios that could cause issues
    console.log('🧪 Testing localStorage scenarios...');
    
    // Simulate the scenarios that could cause JSON.parse errors
    const testCases = [
      { name: 'null value', value: null },
      { name: 'undefined value', value: undefined },
      { name: 'string "undefined"', value: 'undefined' },
      { name: 'string "null"', value: 'null' },
      { name: 'empty string', value: '' },
      { name: 'valid JSON', value: '{"test": true}' }
    ];

    testCases.forEach(testCase => {
      console.log(`\n🔍 Testing ${testCase.name}:`);
      try {
        // Simulate the old unsafe parsing
        if (testCase.value) {
          const parsed = JSON.parse(testCase.value);
          console.log(`  ✅ Old method would succeed:`, parsed);
        } else {
          console.log(`  ⚠️  Old method would skip (falsy value)`);
        }
      } catch (error) {
        console.log(`  ❌ Old method would fail:`, error.message);
      }

      try {
        // Simulate the new safe parsing
        if (testCase.value && testCase.value !== 'undefined') {
          const parsed = JSON.parse(testCase.value);
          console.log(`  ✅ New method would succeed:`, parsed);
        } else {
          console.log(`  ✅ New method would safely skip`);
        }
      } catch (error) {
        console.log(`  ❌ New method would still fail:`, error.message);
      }
    });

    await connection.end();
    console.log('\n🎉 Billing fix test completed!');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

testBillingFix();