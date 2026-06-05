const mysql = require('mysql2/promise');

async function checkSupportUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Support users in database:');
    const [rows] = await connection.execute(
      "SELECT id, email, role, status, first_name, last_name FROM users WHERE role = 'support'"
    );
    console.table(rows);
    
    if (rows.length === 0) {
      console.log('No support users found in database.');
    }
  } catch (error) {
    console.error('Error checking support users:', error.message);
  } finally {
    await connection.end();
  }
}

checkSupportUsers();