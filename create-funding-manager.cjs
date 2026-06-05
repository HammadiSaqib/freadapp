const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createFundingManager() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('Connected to database...');

    // First, update the role enum to include funding_manager
    console.log('Updating role enum...');
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('user', 'admin', 'support', 'super_admin', 'funding_manager') 
      NOT NULL DEFAULT 'user'
    `);
    console.log('✅ Role enum updated successfully');

    // Hash the password
    const password = 'FundingManager123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert funding manager user
    console.log('Creating funding manager user...');
    const [result] = await connection.execute(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        status, 
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'funding@creditrepairpro.com',
      hashedPassword,
      'Funding',
      'Manager',
      'funding_manager',
      'active',
      1
    ]);

    console.log('✅ Funding manager user created successfully!');
    console.log('📧 Email: funding@creditrepairpro.com');
    console.log('🔑 Password: FundingManager123!');
    console.log('🆔 User ID:', result.insertId);

    // Verify the user was created
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, role, status FROM users WHERE role = ?',
      ['funding_manager']
    );
    
    console.log('\n📋 Funding manager users in database:');
    console.table(users);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️  Funding manager user already exists');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

createFundingManager();