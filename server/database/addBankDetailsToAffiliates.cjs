const mysql = require('mysql2/promise');

const addBankDetailsToAffiliates = async () => {
  let connection;
  try {
    console.log('Adding bank details fields to affiliates table...');
    
    // Create direct connection for migration
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    // Add bank details columns
    const alterQueries = [
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) NULL AFTER website`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255) NULL AFTER bank_name`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) NULL AFTER account_holder_name`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS routing_number VARCHAR(20) NULL AFTER account_number`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS account_type ENUM('checking', 'savings') NULL DEFAULT 'checking' AFTER routing_number`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS swift_code VARCHAR(20) NULL AFTER account_type`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS iban VARCHAR(50) NULL AFTER swift_code`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS bank_address TEXT NULL AFTER iban`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS payment_method ENUM('bank_transfer', 'paypal', 'stripe', 'check') NULL DEFAULT 'bank_transfer' AFTER bank_address`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255) NULL AFTER payment_method`,
      `ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255) NULL AFTER paypal_email`
    ];
    
    for (const query of alterQueries) {
      try {
        await connection.execute(query);
        console.log('✅ Executed:', query.substring(0, 80) + '...');
      } catch (error) {
        // Check if column already exists
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  Column already exists, skipping:', query.substring(0, 80) + '...');
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Bank details fields added to affiliates table successfully');
    
  } catch (error) {
    console.error('❌ Error adding bank details fields:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  addBankDetailsToAffiliates()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addBankDetailsToAffiliates };