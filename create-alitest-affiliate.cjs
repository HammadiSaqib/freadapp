const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db'
};

async function createAlitestAffiliate() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check if we have an admin user to associate affiliates with
    const [adminUsers] = await connection.execute(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }
    
    const adminId = adminUsers[0].id;
    console.log(`✅ Found admin user with ID: ${adminId}`);
    
    // Affiliate data for 'alitest'
    const affiliate = {
      email: 'ali.test@affiliate.com',
      password: 'alitest123',
      first_name: 'Ali',
      last_name: 'Test',
      company_name: 'Ali Test Marketing',
      phone: '(555) 999-0001',
      commission_rate: 20.00
    };
    
    console.log('🌱 Creating alitest affiliate account...');
    
    // Check if affiliate already exists
    const [existing] = await connection.execute(
      'SELECT id FROM affiliates WHERE email = ? OR (LOWER(CONCAT(first_name, last_name)) = LOWER(?))',
      [affiliate.email, 'alitest']
    );
    
    if (existing.length > 0) {
      console.log(`ℹ️  Affiliate with email ${affiliate.email} or username 'alitest' already exists, skipping...`);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(affiliate.password, 12);
    
    // Insert affiliate
    const [result] = await connection.execute(`
      INSERT INTO affiliates (
        admin_id, email, password_hash, first_name, last_name, 
        company_name, phone, commission_rate, status, email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', true)
    `, [
      adminId,
      affiliate.email,
      hashedPassword,
      affiliate.first_name,
      affiliate.last_name,
      affiliate.company_name,
      affiliate.phone,
      affiliate.commission_rate
    ]);
    
    const affiliateId = result.insertId;
    
    console.log(`✅ Created affiliate: ${affiliate.first_name} ${affiliate.last_name}`);
    console.log(`   📧 Email: ${affiliate.email}`);
    console.log(`   🔗 Referral Link: http://localhost:3001/ref/alitest`);
    console.log(`   🔑 Password: ${affiliate.password}`);
    console.log(`   🆔 Affiliate ID: ${affiliateId}`);
    console.log('');
    
    console.log('🎉 Alitest affiliate creation completed!');
    console.log('💡 You can now test the referral landing page at: http://localhost:3001/ref/alitest');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('');
    console.log('💡 Make sure your MySQL server is running and the database exists.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createAlitestAffiliate();