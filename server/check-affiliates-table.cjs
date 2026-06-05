const mysql = require('mysql2/promise');

async function checkAffiliatesTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check if affiliates table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "affiliates"');
    
    if (tables.length === 0) {
      console.log('❌ Affiliates table does not exist');
      await connection.end();
      return;
    }

    console.log('✅ Affiliates table exists');
    
    // Get table structure
    const [structure] = await connection.execute('DESCRIBE affiliates');
    console.log('📋 Affiliates table structure:');
    structure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? '[' + col.Key + ']' : ''}`);
    });

    // Check for specific columns that were mentioned in the error
    const requiredColumns = ['parent_affiliate_id', 'admin_id', 'commission_rate', 'parent_commission_rate', 'total_earnings', 'total_referrals', 'affiliate_level'];
    const existingColumns = structure.map(col => col.Field);
    
    console.log('\n🔍 Checking for required columns:');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`   ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAffiliatesTable();