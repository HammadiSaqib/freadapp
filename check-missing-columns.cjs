const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'creditrepair_db',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function checkMissingColumns() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check admin_subscriptions table structure
    console.log('\n📋 Checking admin_subscriptions table structure:');
    const [adminSubsColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'creditrepair_db' 
      AND TABLE_NAME = 'admin_subscriptions'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Current columns in admin_subscriptions:');
    adminSubsColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    const hasBillingCycle = adminSubsColumns.some(col => col.COLUMN_NAME === 'billing_cycle');
    console.log(`\n❓ Has billing_cycle column: ${hasBillingCycle}`);
    
    // Check affiliates table structure
    console.log('\n📋 Checking affiliates table structure:');
    const [affiliatesColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'creditrepair_db' 
      AND TABLE_NAME = 'affiliates'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Current columns in affiliates:');
    affiliatesColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    const hasParentAffiliateId = affiliatesColumns.some(col => col.COLUMN_NAME === 'parent_affiliate_id');
    const hasPlanType = affiliatesColumns.some(col => col.COLUMN_NAME === 'plan_type');
    
    console.log(`\n❓ Has parent_affiliate_id column: ${hasParentAffiliateId}`);
    console.log(`❓ Has plan_type column: ${hasPlanType}`);
    
    console.log('\n✅ Database structure check completed');
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMissingColumns();