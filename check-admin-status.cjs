const mysql = require('mysql2/promise');

async function checkAdminStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('🔍 Checking admin user status values...');
    
    const [rows] = await connection.execute(
      'SELECT id, first_name, last_name, email, role, status FROM users WHERE role IN ("admin", "super_admin")'
    );

    console.log('\n📊 Admin Users in Database:');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminStatus();