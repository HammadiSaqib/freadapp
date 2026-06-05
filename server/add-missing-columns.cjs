const mysql = require('mysql2/promise');

async function addMissingColumns() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Add missing columns
    const alterQueries = [
      {
        name: 'parent_affiliate_id',
        query: `ALTER TABLE affiliates ADD COLUMN parent_affiliate_id INT NULL AFTER admin_id, 
                ADD INDEX idx_parent_affiliate_id (parent_affiliate_id),
                ADD FOREIGN KEY (parent_affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL`
      },
      {
        name: 'parent_commission_rate',
        query: `ALTER TABLE affiliates ADD COLUMN parent_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00 AFTER commission_rate`
      },
      {
        name: 'affiliate_level',
        query: `ALTER TABLE affiliates ADD COLUMN affiliate_level INT NOT NULL DEFAULT 1 AFTER total_referrals,
                ADD INDEX idx_affiliate_level (affiliate_level)`
      }
    ];

    for (const alter of alterQueries) {
      try {
        console.log(`🔧 Adding column: ${alter.name}`);
        await connection.execute(alter.query);
        console.log(`✅ Successfully added ${alter.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️  Column ${alter.name} already exists`);
        } else {
          console.error(`❌ Error adding ${alter.name}:`, error.message);
        }
      }
    }

    // Verify the changes
    console.log('\n🔍 Verifying table structure after changes:');
    const [structure] = await connection.execute('DESCRIBE affiliates');
    const requiredColumns = ['parent_affiliate_id', 'parent_commission_rate', 'affiliate_level'];
    const existingColumns = structure.map(col => col.Field);
    
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`   ${col}: ${exists ? '✅ EXISTS' : '❌ STILL MISSING'}`);
    });

    await connection.end();
    console.log('\n✅ Database update completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMissingColumns();