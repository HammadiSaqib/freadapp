const mysql = require('mysql2/promise');

async function addPlanTypeColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'creditrepair_db'
  });

  try {
    console.log('Adding plan_type column to affiliates table...');
    
    // Add plan_type column
    await connection.execute(
      "ALTER TABLE affiliates ADD COLUMN plan_type ENUM('free', 'paid_partner') NOT NULL DEFAULT 'free' AFTER zip_code"
    );
    console.log('✅ Added plan_type column successfully');
    
    // Add paid_referrals_count column
    await connection.execute(
      "ALTER TABLE affiliates ADD COLUMN paid_referrals_count INT NOT NULL DEFAULT 0 AFTER plan_type"
    );
    console.log('✅ Added paid_referrals_count column successfully');
    
    console.log('🎉 Database schema updated successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️ Columns already exist, skipping...');
    } else {
      console.error('❌ Error updating database schema:', error);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addPlanTypeColumn();