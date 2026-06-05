const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function testPasswordHash() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Testing password hashes...\n');
    
    // Get the user's password hash
    const [users] = await connection.execute(`
      SELECT email, password_hash 
      FROM users 
      WHERE email IN ('demo@creditrepairpro.com', 'test@example.com')
    `);
    
    const testPasswords = ['12345678', 'admin123', 'password', 'demo123', 'test123'];
    
    for (const user of users) {
      console.log(`=== Testing passwords for ${user.email} ===`);
      
      for (const password of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(password, user.password_hash);
          if (isMatch) {
            console.log(`✅ MATCH FOUND! Password: "${password}"`);
          } else {
            console.log(`❌ No match: "${password}"`);
          }
        } catch (error) {
          console.log(`❌ Error testing "${password}":`, error.message);
        }
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('Error testing password hashes:', error);
  } finally {
    await connection.end();
  }
}

testPasswordHash();