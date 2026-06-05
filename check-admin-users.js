import mysql from 'mysql2/promise';

async function checkAdminUsers() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check all users
    const [allUsers] = await connection.execute('SELECT id, email, first_name, last_name, role, status FROM users');
    console.log('\n📊 All users in database:');
    console.table(allUsers);

    // Check specifically for admin users
    const [adminUsers] = await connection.execute('SELECT id, email, first_name, last_name, role, status FROM users WHERE role = "admin"');
    console.log('\n👑 Admin users:');
    console.table(adminUsers);

    console.log(`\n📈 Total users: ${allUsers.length}`);
    console.log(`📈 Admin users: ${adminUsers.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkAdminUsers();