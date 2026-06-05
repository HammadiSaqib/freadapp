const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkFundingManagerPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'creditrepair_db'
  });

  try {
    // Get the funding manager user
    const [rows] = await connection.execute(
      'SELECT id, email, password, role, status FROM users WHERE role = ? AND email = ?',
      ['funding_manager', 'funding@creditrepairpro.com']
    );

    if (rows.length === 0) {
      console.log('❌ No funding manager found');
      return;
    }

    const user = rows[0];
    console.log('✅ Funding manager found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    // Test password verification with common passwords
    const testPasswords = ['password', 'admin', '123456', 'funding123', 'creditrepair'];
    
    console.log('\n🔍 Testing common passwords...');
    for (const testPassword of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPassword, user.password);
        if (isValid) {
          console.log(`✅ Password found: "${testPassword}"`);
          return;
        }
      } catch (error) {
        console.log(`❌ Error testing password "${testPassword}":`, error.message);
      }
    }

    console.log('❌ None of the common passwords worked');
    
    // Let's create a new password hash for testing
    console.log('\n🔧 Creating new password hash for "password123"...');
    const newPasswordHash = await bcrypt.hash('password123', 10);
    
    await connection.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [newPasswordHash, user.id]
    );
    
    console.log('✅ Password updated to "password123"');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkFundingManagerPassword().catch(console.error);