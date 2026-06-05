const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function addDebugUser() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔌 Connected to database');
    
    const email = 'xisav87409@filipx.com';
    const password = '12345678';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('🔍 Checking if user exists...');
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      console.log('✅ User already exists:', email);
      console.log('   Current role:', existingUsers[0].role);
      
      // Update password and ensure admin role
      await connection.execute(
        'UPDATE users SET password_hash = ?, role = ? WHERE email = ?',
        [hashedPassword, 'admin', email]
      );
      console.log('✅ Password updated and role set to admin');
    } else {
      // Create new user
      console.log('🆕 Creating new user...');
      await connection.execute(
        `INSERT INTO users (email, password_hash, role, status, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, 'active', 1, NOW(), NOW())`,
        [email, hashedPassword, 'admin']
      );
      console.log('✅ New admin user created:', email);
    }
    
    // Verify user was created/updated
    const [users] = await connection.execute(
      'SELECT id, email, role, created_at FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length > 0) {
      console.log('\n📋 User Details:');
      console.log('   ID:', users[0].id);
      console.log('   Email:', users[0].email);
      console.log('   Role:', users[0].role);
      console.log('   Created:', users[0].created_at);
      console.log('\n🔑 Login Credentials:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('\n✅ Debug user is ready for testing!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('💡 Make sure the users table exists in the database');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addDebugUser();