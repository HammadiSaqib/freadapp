const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    const [rows] = await connection.execute(
      'SELECT id, email, role, status FROM users WHERE role IN (?, ?)',
      ['admin', 'super_admin']
    );
    
    console.log('Admin users in database:');
    console.table(rows);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers();