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

async function recreateTestAffiliate() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    const email = 'testaffiliate@example.com';
    const password = 'testpassword123';
    
    // First, delete existing affiliate if it exists
    console.log('🗑️ Deleting existing test affiliate...');
    await connection.execute('DELETE FROM affiliate_payment_settings WHERE affiliate_id IN (SELECT id FROM affiliates WHERE email = ?)', [email]);
    await connection.execute('DELETE FROM affiliate_notification_settings WHERE affiliate_id IN (SELECT id FROM affiliates WHERE email = ?)', [email]);
    await connection.execute('DELETE FROM affiliates WHERE email = ?', [email]);
    
    // Hash the password properly
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hash created:', hashedPassword);
    
    // Test the hash immediately
    const testMatch = await bcrypt.compare(password, hashedPassword);
    console.log('Hash test result:', testMatch);
    
    // Create the affiliate
    console.log('👤 Creating new test affiliate...');
    const [result] = await connection.execute(
      `INSERT INTO affiliates (
        admin_id, email, password_hash, first_name, last_name, 
        company_name, phone, status, email_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        1, // admin_id - using 1 as default admin
        email,
        hashedPassword,
        'Test',
        'Affiliate',
        'Test Company',
        '555-0123',
        'active',
        1
      ]
    );
    
    const affiliateId = result.insertId;
    console.log('✅ Test affiliate created successfully');
    console.log('ID:', affiliateId);
    console.log('Email:', email);
    console.log('Password:', password);
    
    // Create notification settings
    await connection.execute(
      `INSERT INTO affiliate_notification_settings (
        affiliate_id, email_notifications, sms_notifications, 
        push_notifications, commission_alerts, referral_updates,
        weekly_reports, monthly_reports, marketing_emails, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [affiliateId, 1, 0, 1, 1, 1, 1, 1, 0]
    );
    
    // Create payment settings
    await connection.execute(
      `INSERT INTO affiliate_payment_settings (
        affiliate_id, payment_method, paypal_email, minimum_payout,
        payout_frequency, w9_submitted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [affiliateId, 'paypal', email, '50.00', 'monthly', 0]
    );
    
    console.log('✅ Affiliate settings created successfully');
    
    // Verify the created affiliate by testing login
    console.log('🔍 Verifying created affiliate...');
    const [affiliateCheck] = await connection.execute(
      'SELECT id, email, password_hash, status FROM affiliates WHERE email = ?',
      [email]
    );
    
    if (affiliateCheck.length > 0) {
      const affiliate = affiliateCheck[0];
      console.log('Found affiliate:', affiliate.email);
      console.log('Status:', affiliate.status);
      
      // Test password comparison
      const passwordTest = await bcrypt.compare(password, affiliate.password_hash);
      console.log('Password verification test:', passwordTest);
      
      if (passwordTest) {
        console.log('🎉 Test affiliate is ready for login!');
      } else {
        console.log('❌ Password verification failed!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

recreateTestAffiliate();