const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'creditrepair_db',
  charset: 'utf8mb4'
};

async function checkAffiliates() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    // Check if affiliates table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'affiliates'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Affiliates table does not exist');
      return;
    }
    
    console.log('✅ Affiliates table exists');
    
    // Get all affiliates
    const [affiliates] = await connection.execute(
      'SELECT id, email, first_name, last_name, status, created_at FROM affiliates ORDER BY id'
    );
    
    console.log('\n📊 Affiliates in database:');
    console.table(affiliates);
    
    console.log(`\n📈 Total affiliates: ${affiliates.length}`);
    
    // Check affiliate settings tables
    const [notificationTables] = await connection.execute(
      "SHOW TABLES LIKE 'affiliate_notification_settings'"
    );
    
    const [paymentTables] = await connection.execute(
      "SHOW TABLES LIKE 'affiliate_payment_settings'"
    );
    
    console.log(`\n📋 Affiliate notification settings table exists: ${notificationTables.length > 0 ? 'Yes' : 'No'}`);
    console.log(`📋 Affiliate payment settings table exists: ${paymentTables.length > 0 ? 'Yes' : 'No'}`);
    
    if (affiliates.length > 0) {
      const firstAffiliateId = affiliates[0].id;
      
      // Check if settings exist for first affiliate
      if (notificationTables.length > 0) {
        const [notificationSettings] = await connection.execute(
          'SELECT * FROM affiliate_notification_settings WHERE affiliate_id = ?',
          [firstAffiliateId]
        );
        console.log(`\n📋 Notification settings for affiliate ${firstAffiliateId}:`, notificationSettings);
      }
      
      if (paymentTables.length > 0) {
        const [paymentSettings] = await connection.execute(
          'SELECT * FROM affiliate_payment_settings WHERE affiliate_id = ?',
          [firstAffiliateId]
        );
        console.log(`📋 Payment settings for affiliate ${firstAffiliateId}:`, paymentSettings);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('\n💡 Make sure your MySQL server is running and the database exists.');
    console.log('   You may need to update the database configuration in this script.');
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkAffiliates();