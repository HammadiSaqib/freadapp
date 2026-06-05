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

async function createAffiliateSettingsTables() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Creating affiliate settings tables...');
    
    // Create affiliate notification settings table
    const notificationSettingsTable = `
      CREATE TABLE IF NOT EXISTS affiliate_notification_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL UNIQUE,
        email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
        push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        commission_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        referral_updates BOOLEAN NOT NULL DEFAULT TRUE,
        weekly_reports BOOLEAN NOT NULL DEFAULT TRUE,
        monthly_reports BOOLEAN NOT NULL DEFAULT TRUE,
        marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_affiliate_id (affiliate_id),
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    // Create affiliate payment settings table
    const paymentSettingsTable = `
      CREATE TABLE IF NOT EXISTS affiliate_payment_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL UNIQUE,
        payment_method ENUM('bank_transfer', 'paypal', 'stripe') NOT NULL DEFAULT 'paypal',
        bank_name VARCHAR(255),
        account_number VARCHAR(255),
        routing_number VARCHAR(255),
        account_holder_name VARCHAR(255),
        paypal_email VARCHAR(255),
        stripe_account_id VARCHAR(255),
        minimum_payout DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        payout_frequency ENUM('weekly', 'monthly', 'quarterly') NOT NULL DEFAULT 'monthly',
        tax_id VARCHAR(50),
        w9_submitted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_affiliate_id (affiliate_id),
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    // Execute table creation
    await connection.execute(notificationSettingsTable);
    console.log('✅ Affiliate notification settings table created');
    
    await connection.execute(paymentSettingsTable);
    console.log('✅ Affiliate payment settings table created');
    
    // Create default notification settings for existing affiliates
    const existingAffiliates = await connection.execute('SELECT id FROM affiliates');
    const affiliates = existingAffiliates[0];
    
    for (const affiliate of affiliates) {
      // Insert default notification settings
      await connection.execute(`
        INSERT IGNORE INTO affiliate_notification_settings (affiliate_id) 
        VALUES (?)
      `, [affiliate.id]);
      
      // Insert default payment settings
      await connection.execute(`
        INSERT IGNORE INTO affiliate_payment_settings (affiliate_id) 
        VALUES (?)
      `, [affiliate.id]);
    }
    
    console.log(`✅ Default settings created for ${affiliates.length} existing affiliates`);
    
  } catch (error) {
    console.error('❌ Error creating affiliate settings tables:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createAffiliateSettingsTables().then(() => {
  console.log('Affiliate settings tables creation complete');
  process.exit(0);
}).catch((error) => {
  console.error('Affiliate settings tables creation failed:', error);
  process.exit(1);
});