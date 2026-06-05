const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createSupportUser() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('Connected to database');
    
    // First, let's check the table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('\nUsers table structure:');
    console.table(columns);
    
    // Update the users table to add support role if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('user', 'admin', 'support') NOT NULL DEFAULT 'user'
      `);
      console.log('✅ Updated users table to include support role');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('support')) {
        console.log('ℹ️  Support role already exists in users table');
      } else {
        console.log('⚠️  Error updating users table:', error.message);
      }
    }
    
    // Check if support user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ? OR role = ?',
      ['support@creditrepair.com', 'support']
    );
    
    if (existingUsers.length > 0) {
      console.log('Support user already exists:');
      console.table(existingUsers);
      return;
    }
    
    // Hash password
    const password = 'support123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create support user with only the columns that exist
    const [result] = await connection.execute(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        company_name, 
        role
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'support@creditrepair.com',
      hashedPassword,
      'Support',
      'Team',
      'Credit Repair Support',
      'support'
    ]);
    
    console.log('✅ Support user created successfully!');
    console.log('📧 Email: support@creditrepair.com');
    console.log('🔑 Password: support123');
    console.log('🆔 User ID:', result.insertId);
    
    // Verify the user was created
    const [newUser] = await connection.execute(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
      [result.insertId]
    );
    
    console.log('\nCreated user details:');
    console.table(newUser);
    
  } catch (error) {
    console.error('❌ Error creating support user:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the function
createSupportUser().catch(console.error);