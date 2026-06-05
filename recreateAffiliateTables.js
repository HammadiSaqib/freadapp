import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'creditrepair_db',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function recreateAffiliateTables() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Recreating affiliate tables...');
    
    // Drop existing tables
    await connection.execute('DROP TABLE IF EXISTS affiliate_commissions');
    await connection.execute('DROP TABLE IF EXISTS commission_tiers');
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
    await connection.execute(affiliateCommissionsTable);
    await connection.execute(commissionTiersTable);
    
    console.log('✅ Affiliate tables recreated successfully');
    
    // Seed commission tiers
    const tiers = [
      { name: 'Bronze', min_referrals: 0, commission_rate: 15.00, bonuses: JSON.stringify(['Basic support', 'Monthly reports']) },
      { name: 'Silver', min_referrals: 10, commission_rate: 20.00, bonuses: JSON.stringify(['Priority support', 'Weekly reports', 'Marketing materials']) },
      { name: 'Gold', min_referrals: 25, commission_rate: 25.00, bonuses: JSON.stringify(['Dedicated support', 'Daily reports', 'Custom materials', 'Performance bonuses']) },
      { name: 'Platinum', min_referrals: 50, commission_rate: 30.00, bonuses: JSON.stringify(['VIP support', 'Real-time analytics', 'Custom landing pages', 'Quarterly bonuses', 'Exclusive events']) }
    ];
    
    for (const tier of tiers) {
      await connection.execute(
        'INSERT INTO commission_tiers (name, min_referrals, commission_rate, bonuses) VALUES (?, ?, ?, ?)',
        [tier.name, tier.min_referrals, tier.commission_rate, tier.bonuses]
      );
    }
    
    console.log('✅ Commission tiers seeded successfully');
    
    // Get first affiliate and users for sample data
    const [affiliates] = await connection.execute('SELECT id FROM affiliates LIMIT 1');
    const [users] = await connection.execute('SELECT id, first_name, last_name, email FROM users LIMIT 5');
    
    if (affiliates.length > 0 && users.length > 0) {
      const affiliateId = affiliates[0].id;
      
      // Sample commission data
      const sampleCommissions = [
        {
          affiliate_id: affiliateId,
          customer_id: users[0]?.id || 1,
          customer_name: `${users[0]?.first_name || 'John'} ${users[0]?.last_name || 'Doe'}`,
          customer_email: users[0]?.email || 'john.doe@example.com',
          order_value: 299.99,
          commission_rate: 20.00,
          commission_amount: 59.99,
          status: 'paid',
          tier: 'Silver',
          product: 'Credit Repair Premium',
          commission_type: 'signup',
          tracking_code: 'CR2024001'
        },
        {
          affiliate_id: affiliateId,
          customer_id: users[1]?.id || 2,
          customer_name: `${users[1]?.first_name || 'Jane'} ${users[1]?.last_name || 'Smith'}`,
          customer_email: users[1]?.email || 'jane.smith@example.com',
          order_value: 199.99,
          commission_rate: 15.00,
          commission_amount: 29.99,
          status: 'approved',
          tier: 'Bronze',
          product: 'Credit Repair Basic',
          commission_type: 'signup',
          tracking_code: 'CR2024002'
        },
        {
          affiliate_id: affiliateId,
          customer_id: users[2]?.id || 3,
          customer_name: `${users[2]?.first_name || 'Mike'} ${users[2]?.last_name || 'Johnson'}`,
          customer_email: users[2]?.email || 'mike.johnson@example.com',
          order_value: 499.99,
          commission_rate: 25.00,
          commission_amount: 124.99,
          status: 'pending',
          tier: 'Gold',
          product: 'Credit Repair Enterprise',
          commission_type: 'upgrade',
          tracking_code: 'CR2024003'
        }
      ];
      
      for (const commission of sampleCommissions) {
        await connection.execute(`
          INSERT INTO affiliate_commissions (
            affiliate_id, customer_id, customer_name, customer_email, order_value,
            commission_rate, commission_amount, status, tier, product, commission_type, tracking_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          commission.affiliate_id, commission.customer_id, commission.customer_name,
          commission.customer_email, commission.order_value, commission.commission_rate,
          commission.commission_amount, commission.status, commission.tier,
          commission.product, commission.commission_type, commission.tracking_code
        ]);
      }
      
      console.log('✅ Sample commission data seeded successfully');
    } else {
      console.log('⚠️  No affiliates or users found, skipping sample data');
    }
    
  } catch (error) {
    console.error('❌ Error recreating affiliate tables:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
recreateAffiliateTables().then(() => {
  console.log('Affiliate tables recreation complete');
  process.exit(0);
}).catch((error) => {
  console.error('Affiliate tables recreation failed:', error);
  process.exit(1);
});