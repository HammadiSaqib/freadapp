const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function addSuperAdmin() {
  let connection;
  
  try {
    console.log('🔐 Creating super admin user...');
    
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['adrwealthadvisorsllc@gmail.com']
    );
    
    if (existingUsers.length > 0) {
      console.log('⚠️  User already exists:', existingUsers[0]);
      console.log('Updating existing user to super_admin role...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash('Adr04212025!$', 12);
      
      // Update existing user
      await connection.execute(
        `UPDATE users SET 
         password_hash = ?, 
         role = 'super_admin', 
         status = 'active',
         email_verified = TRUE,
         password_changed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE email = ?`,
        [hashedPassword, 'adrwealthadvisorsllc@gmail.com']
      );
      
      console.log('✅ Updated existing user to super admin');
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash('Adr04212025!$', 12);
      
      // Insert new super admin user
      const [result] = await connection.execute(
        `INSERT INTO users (
          email, 
          password_hash, 
          first_name, 
          last_name, 
          company_name,
          role, 
          status, 
          email_verified,
          failed_login_attempts,
          password_changed_at,
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          'adrwealthadvisorsllc@gmail.com',
          hashedPassword,
          'ADR',
          'Wealth Advisors',
          'ADR Wealth Advisors LLC',
          'super_admin',
          'active',
          true,
          0
        ]
      );
      
      console.log('✅ Super admin user created successfully');
      console.log('📋 User ID:', result.insertId);
    }
    
    // Verify the user was created/updated
    const [verifyUsers] = await connection.execute(
      'SELECT id, email, first_name, last_name, company_name, role, status, email_verified, created_at FROM users WHERE email = ?',
      ['adrwealthadvisorsllc@gmail.com']
    );
    
    if (verifyUsers.length > 0) {
      console.log('🎉 Super admin user details:');
      console.log('   ID:', verifyUsers[0].id);
      console.log('   Email:', verifyUsers[0].email);
      console.log('   Name:', verifyUsers[0].first_name, verifyUsers[0].last_name);
      console.log('   Company:', verifyUsers[0].company_name);
      console.log('   Role:', verifyUsers[0].role);
      console.log('   Status:', verifyUsers[0].status);
      console.log('   Email Verified:', verifyUsers[0].email_verified);
      console.log('   Created At:', verifyUsers[0].created_at);
    }
    
  } catch (error) {
    console.error('❌ Error creating super admin user:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addSuperAdmin()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });