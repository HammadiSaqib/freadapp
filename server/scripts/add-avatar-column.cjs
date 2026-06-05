const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAvatarColumn() {
  let connection;
  
  try {
    // Create connection to MySQL database
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });

    console.log('Connected to MySQL database');

    // Check if avatar column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
    `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);

    if (columns.length > 0) {
      console.log('Avatar column already exists in users table');
      return;
    }

    // Add avatar column to users table
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN avatar VARCHAR(500) NULL 
      AFTER password_changed_at
    `);

    console.log('Successfully added avatar column to users table');

    // Verify the column was added
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
    `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);

    if (newColumns.length > 0) {
      console.log('Avatar column details:', newColumns[0]);
    }

  } catch (error) {
    console.error('Error adding avatar column:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
addAvatarColumn();