const mysql = require('mysql2/promise');

async function checkAdminUsers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('🔍 Checking for admin/super admin users...');
    
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, role FROM users WHERE role IN ("admin", "super_admin")'
    );
    
    console.log('Admin/Super Admin users:', JSON.stringify(users, null, 2));
    
    if (users.length === 0) {
      console.log('❌ No admin or super admin users found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminUsers();