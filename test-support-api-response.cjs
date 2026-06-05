const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

async function testSupportAPIWithRealToken() {
  let connection;
  
  try {
    // Connect to database to get the actual JWT secret being used
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('✅ Connected to database');
    
    // Use the same JWT secret logic as the server
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    console.log('🔑 Using JWT secret:', JWT_SECRET.substring(0, 20) + '...');
    
    // Get the support user from database
    const [userRows] = await connection.execute(
      'SELECT id, email, role FROM users WHERE role = ? AND status = ?',
      ['support', 'active']
    );
    
    if (userRows.length === 0) {
      console.error('❌ No active support user found in database');
      return;
    }
    
    const supportUser = userRows[0];
    console.log('👤 Found support user:', supportUser.email);
    
    // Create a JWT token with the same structure as the server
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
    
    console.log('🎫 Generated token:', token.substring(0, 50) + '...');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3001/api/support/users?page=1&limit=50&search=&status=all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing support API:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSupportAPIWithRealToken();