const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Empty password for XAMPP default
  database: 'creditrepair_db'
};

async function checkAffiliateReferralsSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check the actual structure of affiliate_referrals table
    console.log('\n=== Checking affiliate_referrals table structure ===');
    const [columns] = await connection.execute('DESCRIBE affiliate_referrals');
    
    console.log('Columns in affiliate_referrals table:');
    columns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Check if there are any existing records
    console.log('\n=== Checking existing records ===');
    const [records] = await connection.execute('SELECT COUNT(*) as count FROM affiliate_referrals');
    console.log(`Total records in affiliate_referrals: ${records[0].count}`);

    if (records[0].count > 0) {
      const [sample] = await connection.execute('SELECT * FROM affiliate_referrals LIMIT 3');
      console.log('\nSample records:');
      sample.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, record);
      });
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

checkAffiliateReferralsSchema().catch(console.error);