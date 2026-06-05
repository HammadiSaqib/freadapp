import { executeQuery, initializeMySQLPool } from './server/database/mysqlConfig.ts';

async function addCardColumns() {
  try {
    console.log('Initializing MySQL connection...');
    await initializeMySQLPool();
    
    console.log('Adding new columns to cards table...');
    
    // Add the three new columns
    await executeQuery(`
      ALTER TABLE cards 
      ADD COLUMN amount_approved DECIMAL(15,2) DEFAULT NULL COMMENT 'Amount approved for this card',
      ADD COLUMN no_of_usage INT DEFAULT 0 COMMENT 'Number of times this card has been used',
      ADD COLUMN average_amount DECIMAL(15,2) DEFAULT NULL COMMENT 'Average amount per usage'
    `);
    
    console.log('✅ Columns added successfully!');
    
    // Add indexes for better performance
    await executeQuery('CREATE INDEX idx_cards_amount_approved ON cards(amount_approved)');
    await executeQuery('CREATE INDEX idx_cards_no_of_usage ON cards(no_of_usage)');
    await executeQuery('CREATE INDEX idx_cards_average_amount ON cards(average_amount)');
    
    console.log('✅ Indexes added successfully!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Columns already exist');
    } else {
      console.error('❌ Error adding columns:', error.message);
    }
  }
  
  process.exit(0);
}

addCardColumns();