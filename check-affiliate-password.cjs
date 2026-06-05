const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'creditrepair_db',
  charset: 'utf8mb4'
};

async function checkAffiliatePassword() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    const email = 'testaffiliate@example.com';
    const password = 'testpassword123';
    
    // Get the affiliate from database
    const [affiliates] = await connection.execute(
      'SELECT id, email, password_hash, status FROM affiliates WHERE email = ?',
      [email]
    );
    
    if (affiliates.length === 0) {
      console.log('❌ Affiliate not found');
      return;
    }
    
    const affiliate = affiliates[0];
    console.log('✅ Affiliate found:');
    console.log('ID:', affiliate.id);
    console.log('Email:', affiliate.email);
    console.log('Status:', affiliate.status);
    console.log('Password hash:', affiliate.password_hash);
    
    // Test password comparison
    const passwordMatch = await bcrypt.compare(password, affiliate.password_hash);
    console.log('\n🔐 Password comparison result:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('❌ Password does not match. Let\'s update it...');
      
      // Hash the password correctly
      const newHashedPassword = await bcrypt.hash(password, 10);
      console.log('New hash:', newHashedPassword);
      
      // Update the password
      await connection.execute(
        'UPDATE affiliates SET password_hash = ? WHERE id = ?',
        [newHashedPassword, affiliate.id]
      );
      
      console.log('✅ Password updated successfully');
      
      // Test again
      const testMatch = await bcrypt.compare(password, newHashedPassword);
      console.log('✅ New password test:', testMatch);
    } else {
      console.log('✅ Password matches correctly');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkAffiliatePassword();