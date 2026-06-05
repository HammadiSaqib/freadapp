const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db'
};

async function createAffiliatePaymentHistoryTable() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Create affiliate_payment_history table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS affiliate_payment_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL,
        transaction_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_date DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_affiliate_id (affiliate_id),
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_payment_date (payment_date),
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ affiliate_payment_history table created successfully');
    
    // Check if table was created
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'affiliate_payment_history'"
    );
    
    if (tables.length > 0) {
      console.log('✅ Table verification successful');
      
      // Show table structure
      const [columns] = await connection.execute(
        'DESCRIBE affiliate_payment_history'
      );
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ Table verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error creating affiliate_payment_history table:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
createAffiliatePaymentHistoryTable().then(() => {
  console.log('✅ Affiliate payment history table creation complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Affiliate payment history table creation failed:', error);
  process.exit(1);
});