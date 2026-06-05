const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function debugSupportUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // Get the support user with all fields
    console.log('Support user details:');
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = 'support@creditrepair.com'"
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log('User data:', user);
      
      // Test password comparison
      const testPassword = 'support123';
      console.log('\nTesting password comparison:');
      console.log('Stored hash:', user.password_hash);
      console.log('Test password:', testPassword);
      
      if (user.password_hash) {
        const isMatch = bcrypt.compareSync(testPassword, user.password_hash);
        console.log('Password match:', isMatch);
      } else {
        console.log('No password hash found!');
      }
      
      // Check is_active field
      console.log('\nChecking is_active field:');
      console.log('is_active value:', user.is_active);
      console.log('is_active type:', typeof user.is_active);
      
    } else {
      console.log('Support user not found!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

debugSupportUser();