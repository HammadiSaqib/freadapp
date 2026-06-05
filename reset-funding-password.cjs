const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetFundingPassword() {
  console.log('=== Resetting Funding Manager Password ===');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // Hash the new password
    const newPassword = 'password123';
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update the funding manager password
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ? AND role = ?',
      [hashedPassword, 'funding@creditrepairpro.com', 'funding_manager']
    );

    if (result.affectedRows > 0) {
      console.log('✅ Password reset successfully!');
      console.log('Email: funding@creditrepairpro.com');
      console.log('New Password: password123');
      
      // Verify the user exists
      const [user] = await connection.execute(
        'SELECT id, email, role, status, first_name, last_name FROM users WHERE email = ?',
        ['funding@creditrepairpro.com']
      );
      
      console.log('User details:');
      console.table(user);
    } else {
      console.log('❌ No user found to update');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await connection.end();
  }
}

resetFundingPassword();