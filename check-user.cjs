const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkUser() {
  let connection;
  
  try {
    console.log('🔍 Checking super admin user...');
    
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    
    // Get user data
    const [users] = await connection.execute(
      'SELECT id, email, role, status, password_hash FROM users WHERE email = ?',
      ['adrwealthadvisorsllc@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('📋 User data:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Password Hash:', user.password_hash);
    
    // Test password comparison
    const testPassword = 'Adr04212025!$';
    console.log('\n🔐 Testing password comparison...');
    console.log('   Test Password:', testPassword);
    
    const isMatch = bcrypt.compareSync(testPassword, user.password_hash);
    console.log('   Password Match:', isMatch);
    
    // Test with different bcrypt rounds
    console.log('\n🧪 Testing different hash methods...');
    const hash10 = bcrypt.hashSync(testPassword, 10);
    const hash12 = bcrypt.hashSync(testPassword, 12);
    
    console.log('   Hash with 10 rounds:', hash10);
    console.log('   Hash with 12 rounds:', hash12);
    
    console.log('   Compare with 10 rounds:', bcrypt.compareSync(testPassword, hash10));
    console.log('   Compare with 12 rounds:', bcrypt.compareSync(testPassword, hash12));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkUser()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });