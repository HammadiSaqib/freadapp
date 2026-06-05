import { db } from './mysqlConfig';

export const createCommissionPaymentsTable = async () => {
  try {
    console.log('Creating commission_payments table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS commission_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_id VARCHAR(255) NOT NULL UNIQUE,
        payment_method ENUM('bank_transfer', 'paypal', 'stripe', 'check', 'other') NOT NULL DEFAULT 'bank_transfer',
        status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
        payment_date DATETIME NOT NULL,
        notes TEXT,
        proof_of_payment_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        INDEX idx_affiliate_id (affiliate_id),
        INDEX idx_status (status),
        INDEX idx_payment_date (payment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await db.execute(createTableQuery);
    console.log('✅ commission_payments table created successfully');
    
    // Create uploads directory for payment proofs
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'payment-proofs');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Payment proofs upload directory created');
    }
    
  } catch (error) {
    console.error('❌ Error creating commission_payments table:', error);
    throw error;
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  createCommissionPaymentsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}