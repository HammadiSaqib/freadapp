const mysql = require('mysql2/promise');

async function checkUserSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // Get table schema
    console.log('📋 Users table schema:');
    const [columns] = await connection.execute(
      'DESCRIBE users'
    );
    
    console.table(columns);

    // Get the funding manager user data
    console.log('\n👤 Funding manager user data:');
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE role = "funding_manager" AND email = "funding@creditrepairpro.com"'
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('User columns and values:');
      Object.keys(user).forEach(key => {
        console.log(`${key}: ${user[key]}`);
      });
    } else {
      console.log('❌ No funding manager found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkUserSchema().catch(console.error);