const mysql = require('mysql2/promise');
require('dotenv').config();

async function addEmailVerifiedColumn() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'creditrepair_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to MySQL database');

    // Check if email_verified column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'
    `, [process.env.DB_NAME || 'creditrepair_db']);

    if (columns.length > 0) {
      console.log('ℹ️  email_verified column already exists in users table');
      return;
    }

    // Add the email_verified column
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER role
    `);

    console.log('✅ Successfully added email_verified column to users table');

    // Update existing users to have email_verified = false (default)
    const [result] = await connection.execute(`
      UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL
    `);

    console.log(`✅ Updated ${result.affectedRows} existing users with email_verified = FALSE`);

    // Show the updated table structure
    const [tableInfo] = await connection.execute(`
      DESCRIBE users
    `);

    console.log('\n📋 Updated users table structure:');
    tableInfo.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Default !== null ? `DEFAULT ${column.Default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error adding email_verified column:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addEmailVerifiedColumn()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });