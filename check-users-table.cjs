const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Checking users table...');
    
    // Check if users table exists and has data
    const [users] = await connection.execute('SELECT id, email, role FROM users LIMIT 10');
    
    if (users.length === 0) {
      console.log('❌ No users found in the users table');
    } else {
      console.log('✅ Found users:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    // Check the super admin user specifically
    const [superAdmin] = await connection.execute('SELECT * FROM users WHERE email = ?', ['adrwealthadvisorsllc@gmail.com']);
    
    if (superAdmin.length > 0) {
      console.log('✅ Super admin user found:', superAdmin[0]);
    } else {
      console.log('❌ Super admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsers();