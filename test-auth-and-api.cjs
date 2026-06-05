const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testAuthAndAPI() {
  let connection;
  
  try {
    console.log('🔍 Testing Authentication and Recent Cancellations API...\n');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    
    // Get a super admin user
    const [superAdmins] = await connection.execute(
      'SELECT * FROM users WHERE role = "super_admin" AND is_active = 1 LIMIT 1'
    );
    
    if (superAdmins.length === 0) {
      console.log('❌ No active super admin found');
      return;
    }
    
    const superAdmin = superAdmins[0];
    console.log('✅ Found super admin:', superAdmin.email);
    
    // Generate a valid JWT token
    const token = jwt.sign(
      { 
        userId: superAdmin.id, 
        email: superAdmin.email, 
        role: superAdmin.role 
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Generated JWT token');
    
    // Test the recent cancellations API
    console.log('\n🔍 Testing Recent Cancellations API...');
    
    try {
      const response = await axios.get('http://localhost:3001/api/super-admin/subscriptions/recent-cancellations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          limit: 10,
          days: 30
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
      
    } catch (apiError) {
      console.log('❌ API Error:', apiError.response?.status, apiError.response?.data || apiError.message);
      if (apiError.code) {
        console.log('❌ Error Code:', apiError.code);
      }
    }
    
    // Also test the query directly
    console.log('\n🔍 Testing Direct Database Query...');
    
    const [cancellations] = await connection.execute(`
      SELECT s.*, u.first_name, u.last_name, u.email, u.company_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = ? 
      AND s.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY s.updated_at DESC
      LIMIT ?
    `, ['canceled', 30, 10]);
    
    console.log('✅ Direct query found', cancellations.length, 'canceled subscriptions');
    
    if (cancellations.length > 0) {
      console.log('Sample cancellation:', {
        id: cancellations[0].id,
        user_email: cancellations[0].email,
        status: cancellations[0].status,
        updated_at: cancellations[0].updated_at
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testAuthAndAPI();