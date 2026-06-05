import { executeQuery, initializeMySQLPool } from './server/database/mysqlConfig.ts';

async function addCardStateColumn() {
  try {
    console.log('Initializing MySQL connection...');
    await initializeMySQLPool();

    console.log('Adding state column to cards table...');

    await executeQuery(`
      ALTER TABLE cards 
      ADD COLUMN state CHAR(2) NULL AFTER credit_bureaus
    `);

    console.log('✅ State column added successfully!');

    await executeQuery('CREATE INDEX idx_cards_state ON cards(state)');
    console.log('✅ State index added successfully!');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  State column already exists');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  State index already exists');
    } else {
      console.error('❌ Error adding state column:', error.message);
    }
  }

  process.exit(0);
}

addCardStateColumn();