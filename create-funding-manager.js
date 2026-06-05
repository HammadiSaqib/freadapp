const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

console.log('Starting funding manager creation...');

async function createFundingManager() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Connected successfully. Creating user...');
    // Hash password
    const hashedPassword = bcrypt.hashSync('funding123', 10);
    
    // Insert funding manager user
    const [result] = await connection.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [
        'funding@manager.com',
        hashedPassword,
        'Funding',
        'Manager',
        'funding_manager',
        'active',
        1
      ]
    );
    
    console.log('✅ Funding manager user created successfully');
    console.log('Email: funding@manager.com');
    console.log('Password: funding123');
    console.log('User ID:', result.insertId);
    
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️ Funding manager user already exists');
    } else {
      console.error('Error:', err);
    }
  } finally {
    await connection.end();
  }
}

createFundingManager();