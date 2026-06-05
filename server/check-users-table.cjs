const mysql = require('mysql2/promise');

async function checkUsersTable() {
  try {
    console.log('🔌 Connecting to MySQL database...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    console.log('\n🔍 Checking users table structure...');
    const [structure] = await connection.execute('DESCRIBE users');
    console.log('📋 Users table structure:');
    structure.forEach(col => {
      const nullable = col.Null === 'NO' ? 'NOT NULL' : 'NULL';
      const key = col.Key ? `[${col.Key}]` : '';
      const defaultVal = col.Default !== null ? `DEFAULT: ${col.Default}` : '';
      console.log(`   ${col.Field}: ${col.Type} ${nullable} ${key} ${defaultVal}`);
    });

    console.log('\n👥 Sample users data:');
    const [users] = await connection.execute('SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY id LIMIT 15');
    users.forEach(user => {
      const active = user.is_active ? '✅' : '❌';
      console.log(`   ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Role: ${user.role}, Active: ${active}`);
    });

    console.log(`\n📊 Showing ${users.length} users (first 15)`);
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM users');
    console.log(`📊 Total users in database: ${count[0].total}`);

    // Check for specific roles
    console.log('\n🔍 Users by role:');
    const [roleCount] = await connection.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC');
    roleCount.forEach(role => {
      console.log(`   ${role.role}: ${role.count} users`);
    });

    // Check for demo user specifically
    console.log('\n🔍 Looking for demo user...');
    const [demoUser] = await connection.execute('SELECT * FROM users WHERE email = ?', ['demo@creditrepairpro.com']);
    if (demoUser.length > 0) {
      const user = demoUser[0];
      console.log(`✅ Demo user found: ID ${user.id}, Role: ${user.role}, Active: ${user.is_active ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Demo user not found');
    }

    await connection.end();
    console.log('\n🔌 Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkUsersTable();