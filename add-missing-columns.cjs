const mysql = require('mysql2/promise');

async function addMissingColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Adding missing columns to clients table...');
    
    // Add employment_status column
    console.log('Adding employment_status column...');
    await connection.execute(`
      ALTER TABLE clients 
      ADD COLUMN employment_status VARCHAR(50) NULL 
      AFTER date_of_birth
    `);
    
    // Add annual_income column
    console.log('Adding annual_income column...');
    await connection.execute(`
      ALTER TABLE clients 
      ADD COLUMN annual_income DECIMAL(12,2) NULL 
      AFTER employment_status
    `);
    
    console.log('Successfully added missing columns!');
    
    // Verify the changes
    console.log('\nVerifying table structure...');
    const [columns] = await connection.execute('DESCRIBE clients');
    
    console.log('\nUpdated clients table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await connection.end();
  }
}

addMissingColumns();