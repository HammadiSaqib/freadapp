const mysql = require('mysql2/promise');

async function checkUserRole() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'creditrepair'
    });
    
    const [rows] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['xisav87409@filipx.com']
    );
    
    console.log('User data:', rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserRole();