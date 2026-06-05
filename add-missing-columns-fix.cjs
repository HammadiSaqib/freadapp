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

async function addMissingColumns() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔧 Adding missing columns...\n');
    
    // Add billing_cycle column to admin_subscriptions table
    console.log('1️⃣ Adding billing_cycle column to admin_subscriptions table...');
    try {
      await connection.execute(`
        ALTER TABLE admin_subscriptions 
        ADD COLUMN billing_cycle ENUM('monthly', 'yearly', 'lifetime') NOT NULL DEFAULT 'monthly'
        AFTER plan_id
      `);
      console.log('✅ billing_cycle column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ billing_cycle column already exists');
      } else {
        throw error;
      }
    }
    
    // Add parent_affiliate_id column to affiliates table
    console.log('\n2️⃣ Adding parent_affiliate_id column to affiliates table...');
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN parent_affiliate_id INT NULL
        AFTER admin_id
      `);
      console.log('✅ parent_affiliate_id column added successfully');
      
      // Add index and foreign key separately
      try {
        await connection.execute(`
          ALTER TABLE affiliates 
          ADD INDEX idx_parent_affiliate_id (parent_affiliate_id)
        `);
        console.log('✅ parent_affiliate_id index added successfully');
      } catch (indexError) {
        if (indexError.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️ parent_affiliate_id index already exists');
        } else {
          console.log('⚠️ Could not add index:', indexError.message);
        }
      }
      
      try {
        await connection.execute(`
          ALTER TABLE affiliates 
          ADD FOREIGN KEY (parent_affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL
        `);
        console.log('✅ parent_affiliate_id foreign key added successfully');
      } catch (fkError) {
        console.log('ℹ️ Foreign key constraint may already exist or cannot be added:', fkError.message);
      }
      
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ parent_affiliate_id column already exists');
      } else {
        throw error;
      }
    }
    
    // Add plan_type column to affiliates table
    console.log('\n3️⃣ Adding plan_type column to affiliates table...');
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN plan_type ENUM('free', 'paid_partner') NOT NULL DEFAULT 'free'
        AFTER zip_code
      `);
      console.log('✅ plan_type column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ plan_type column already exists');
      } else {
        throw error;
      }
    }
    
    // Add missing columns that are referenced in the schema but not in the current table
    console.log('\n4️⃣ Adding additional missing columns to affiliates table...');
    
    // Add avatar column
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN avatar VARCHAR(500) NULL
        AFTER zip_code
      `);
      console.log('✅ avatar column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ avatar column already exists');
      } else {
        throw error;
      }
    }

    // Add logo_url column
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN logo_url VARCHAR(500) NULL
        AFTER avatar
      `);
      console.log('✅ logo_url column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ logo_url column already exists');
      } else {
        throw error;
      }
    }
    
    // Add paid_referrals_count column
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN paid_referrals_count INT NOT NULL DEFAULT 0
        AFTER plan_type
      `);
      console.log('✅ paid_referrals_count column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ paid_referrals_count column already exists');
      } else {
        throw error;
      }
    }
    
    // Add parent_commission_rate column
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN parent_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00
        AFTER commission_rate
      `);
      console.log('✅ parent_commission_rate column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ parent_commission_rate column already exists');
      } else {
        throw error;
      }
    }
    
    // Add affiliate_level column
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN affiliate_level INT NOT NULL DEFAULT 1
        AFTER parent_commission_rate
      `);
      console.log('✅ affiliate_level column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ affiliate_level column already exists');
      } else {
        throw error;
      }
    }
    
    // Add created_by column
    try {
      await connection.execute(`
        ALTER TABLE affiliates 
        ADD COLUMN created_by INT NULL
        AFTER updated_by
      `);
      console.log('✅ created_by column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ created_by column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 All missing columns have been added successfully!');
    console.log('\n📊 Verifying the changes...');
    
    // Verify admin_subscriptions table
    const [adminSubsColumns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'creditrepair_db' 
      AND TABLE_NAME = 'admin_subscriptions'
      AND COLUMN_NAME = 'billing_cycle'
    `);
    console.log(`✅ admin_subscriptions.billing_cycle: ${adminSubsColumns.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Verify affiliates table
    const [affiliatesColumns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'creditrepair_db' 
      AND TABLE_NAME = 'affiliates'
      AND COLUMN_NAME IN ('parent_affiliate_id', 'plan_type')
    `);
    console.log(`✅ affiliates.parent_affiliate_id: ${affiliatesColumns.some(col => col.COLUMN_NAME === 'parent_affiliate_id') ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ affiliates.plan_type: ${affiliatesColumns.some(col => col.COLUMN_NAME === 'plan_type') ? 'EXISTS' : 'MISSING'}`);
    
  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addMissingColumns();
