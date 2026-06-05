import { executeQuery, executeTransaction } from './mysqlConfig.js';

export async function recreateAffiliateTables(): Promise<void> {
  try {
    console.log('🔄 Recreating affiliate tables...');
    
    // Drop existing tables
    await executeQuery('DROP TABLE IF EXISTS affiliate_commissions');
    await executeQuery('DROP TABLE IF EXISTS commission_tiers');
    console.log('✅ Dropped existing affiliate tables');
    
    // Create affiliate commissions table
    const affiliateCommissionsTable = `
      CREATE TABLE affiliate_commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL,
        referral_id INT NULL,
        customer_id INT NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        commission_rate DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'approved', 'paid', 'rejected') NOT NULL DEFAULT 'pending',
        tier VARCHAR(50) NOT NULL DEFAULT 'Bronze',
        product VARCHAR(255) NOT NULL,
        order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        approval_date DATETIME NULL,
        payment_date DATETIME NULL,
        notes TEXT,
        tracking_code VARCHAR(100),
        commission_type ENUM('signup', 'monthly', 'upgrade', 'bonus') NOT NULL DEFAULT 'signup',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_affiliate_id (affiliate_id),
        INDEX idx_customer_id (customer_id),
        INDEX idx_referral_id (referral_id),
        INDEX idx_status (status),
        INDEX idx_tier (tier),
        INDEX idx_order_date (order_date),
        INDEX idx_tracking_code (tracking_code),
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        FOREIGN KEY (referral_id) REFERENCES affiliate_referrals(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    // Create commission tiers table
    const commissionTiersTable = `
      CREATE TABLE commission_tiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        min_referrals INT NOT NULL DEFAULT 0,
        commission_rate DECIMAL(5,2) NOT NULL,
        bonuses JSON,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_min_referrals (min_referrals),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    // Execute table creation
    await executeTransaction(async (connection) => {
      await connection.execute(affiliateCommissionsTable);
      await connection.execute(commissionTiersTable);
    });
    
    console.log('✅ Affiliate tables recreated successfully');
    
  } catch (error) {
    console.error('❌ Error recreating affiliate tables:', error);
    throw error;
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  recreateAffiliateTables().then(() => {
    console.log('Affiliate tables recreation complete');
    process.exit(0);
  }).catch((error) => {
    console.error('Affiliate tables recreation failed:', error);
    process.exit(1);
  });
}