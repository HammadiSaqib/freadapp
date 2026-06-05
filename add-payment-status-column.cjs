const mysql = require('mysql2/promise');

async function addPaymentStatusColumn() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'password',
      database: 'creditrepair_db'
    });
    
    console.log('Adding payment_status column to clients table...');
    
    // Add the payment_status column
    await connection.execute(`
      ALTER TABLE clients 
      ADD COLUMN payment_status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'paid'
    `);
    
    // Add index for the new column
    await connection.execute(`
      ALTER TABLE clients 
      ADD INDEX idx_payment_status (payment_status)
    `);
    
    console.log('✅ Successfully added payment_status column to clients table');
    await connection.end();
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ payment_status column already exists');
    } else {
      console.error('❌ Error adding payment_status column:', error.message);
    }
  }
}

addPaymentStatusColumn();