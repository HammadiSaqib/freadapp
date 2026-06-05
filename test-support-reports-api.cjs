const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function testSupportReportsAPI() {
  let connection;
  
  try {
    // Connect to database to get a support user
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('✅ Connected to database');
    
    // Get a support user from database
    const [userRows] = await connection.execute(
      'SELECT id, email, role FROM users WHERE role = ? LIMIT 1',
      ['support']
    );
    
    if (userRows.length === 0) {
      console.error('❌ No support user found in database');
      return;
    }
    
    const supportUser = userRows[0];
    console.log('👤 Found support user:', supportUser.email);
    
    // Create a JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const tokenPayload = {
      userId: supportUser.id,
      email: supportUser.email,
      role: supportUser.role
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'creditrepair-pro',
      audience: 'creditrepair-users'
    });
    
    console.log('🎫 Generated token for API test');
    
    // Test the metrics API endpoint
    const response = await fetch('http://localhost:3001/api/support/reports/metrics?period=7d', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Metrics Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing support reports API:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSupportReportsAPI();