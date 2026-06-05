const mysql = require('mysql2/promise');

async function checkFundingTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    const [tables] = await connection.execute('SHOW TABLES LIKE "funding_requests"');
    console.log('Funding requests table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM funding_requests');
      console.log('Number of funding requests:', rows[0].count);
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFundingTable();