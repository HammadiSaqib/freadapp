const mysql = require('mysql2/promise');

async function testMySQLDirect() {
  let connection;
  try {
    // Create connection using the same config as the server
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    
    // Test the exact query from the support users API
    const query = `
      SELECT 
        c.id,
        CONCAT(c.first_name, ' ', c.last_name) as name,
        c.email,
        c.phone,
        c.status,
        c.credit_score,
        c.created_at as joinDate,
        c.notes,
        u.id as admin_id,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        u.email as admin_email,
        u.company_name as admin_department
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
      ORDER BY c.created_at DESC LIMIT 50 OFFSET 0
    `;
    
    console.log('🔍 Executing query:', query);
    
    const [results] = await connection.execute(query);
    
    console.log('📊 Query results:');
    console.log('Number of rows:', results.length);
    
    if (results.length > 0) {
      console.log('First few results:');
      results.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          id: row.id,
          name: row.name,
          email: row.email,
          status: row.status,
          admin_id: row.admin_id,
          admin_name: row.admin_name
        });
      });
    } else {
      console.log('❌ No results found');
      
      // Let's check if clients table has data
      const [clientCheck] = await connection.execute('SELECT COUNT(*) as count FROM clients');
      console.log('Total clients in database:', clientCheck[0].count);
      
      // Let's check if users table has data
      const [userCheck] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('Total users in database:', userCheck[0].count);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

testMySQLDirect();