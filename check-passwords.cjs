const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkPasswords() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    const [rows] = await connection.execute(
      'SELECT id, email, password_hash FROM users WHERE role IN (?, ?)',
      ['admin', 'super_admin']
    );
    
    console.log('Admin users with password info:');
    
    // Test common passwords
    const commonPasswords = ['password', 'password123', 'admin', '123456', 'demo'];
    
    for (const user of rows) {
      console.log(`\nUser: ${user.email} (ID: ${user.id})`);
      console.log(`Password hash: ${user.password_hash}`);
      
      // Try to match common passwords
      for (const testPassword of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password_hash);
          if (isMatch) {
            console.log(`✅ Password found: '${testPassword}'`);
            break;
          }
        } catch (error) {
          // Skip if bcrypt comparison fails
        }
      }
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPasswords();