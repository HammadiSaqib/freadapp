const mysql = require('mysql2/promise');

async function checkUsersSchema() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔌 Connected to MySQL database');
    
    // Check users table schema
    console.log('\n📋 Users table schema:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // Check if subscription-related columns exist
    console.log('\n🔍 Checking for subscription-related columns...');
    const subscriptionColumns = columns.filter(col => 
      col.Field.toLowerCase().includes('subscription') || 
      col.Field.toLowerCase().includes('status')
    );
    
    if (subscriptionColumns.length > 0) {
      console.log('Found subscription-related columns:');
      subscriptionColumns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    } else {
      console.log('No subscription-related columns found in users table');
    }
    
    // Sample some user data to see available fields
    console.log('\n📊 Sample user data (first 3 records):');
    const [users] = await connection.execute('SELECT * FROM users LIMIT 3');
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, Object.keys(user).join(', '));
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkUsersSchema();