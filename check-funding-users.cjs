const mysql = require('mysql2/promise');

async function checkFundingUsers() {
  console.log('=== Checking Funding Manager Users ===');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // Check for funding manager users
    const [users] = await connection.execute(
      'SELECT id, email, role, status, first_name, last_name FROM users WHERE role LIKE "%funding%" OR role = "funding_manager"'
    );

    if (users.length === 0) {
      console.log('❌ No funding manager users found');
    } else {
      console.log('Funding manager users in database:');
      console.table(users);
    }

    // Also check all users to see available roles
    const [allUsers] = await connection.execute(
      'SELECT id, email, role, status, first_name, last_name FROM users ORDER BY role'
    );

    console.log('\nAll users in database:');
    console.table(allUsers);

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await connection.end();
  }
}

checkFundingUsers();