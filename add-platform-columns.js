// Script to add platform credential columns to clients table
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addPlatformColumns() {
  try {
    // Create MySQL connection
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair'
    });

    console.log('Connected to MySQL database');

    // Check if columns already exist
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients' AND COLUMN_NAME IN ('platform', 'platform_email', 'platform_password')",
      [process.env.MYSQL_DATABASE || 'creditrepair']
    );

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add platform column if it doesn't exist
    if (!existingColumns.includes('platform')) {
      console.log('Adding platform column...');
      await connection.execute(
        "ALTER TABLE clients ADD COLUMN platform ENUM('myfreescorenow', 'identityiq', 'smartcredit', 'myscoreiq') DEFAULT NULL"
      );
      console.log('Added platform column');
    } else {
      console.log('platform column already exists');
    }

    // Add platform_email column if it doesn't exist
    if (!existingColumns.includes('platform_email')) {
      console.log('Adding platform_email column...');
      await connection.execute(
        "ALTER TABLE clients ADD COLUMN platform_email VARCHAR(255) DEFAULT NULL"
      );
      console.log('Added platform_email column');
    } else {
      console.log('platform_email column already exists');
    }

    // Add platform_password column if it doesn't exist
    if (!existingColumns.includes('platform_password')) {
      console.log('Adding platform_password column...');
      await connection.execute(
        "ALTER TABLE clients ADD COLUMN platform_password VARCHAR(255) DEFAULT NULL"
      );
      console.log('Added platform_password column');
    } else {
      console.log('platform_password column already exists');
    }

    console.log('All platform columns have been added successfully');
    await connection.end();
  } catch (error) {
    console.error('Error adding platform columns:', error);
    process.exit(1);
  }
}

addPlatformColumns();