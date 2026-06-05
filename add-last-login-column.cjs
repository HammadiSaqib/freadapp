const mysql = require('mysql2/promise');

async function addLastLoginColumn() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'creditrepair_db'
  });
  
  try {
    console.log('Adding last_login column to clients table...');
    
    await connection.execute(`
      ALTER TABLE clients 
      ADD COLUMN last_login DATETIME NULL
    `);
    
    console.log('✓ Successfully added last_login column to clients table');
    
    // Verify the column was added
    const [columns] = await connection.execute('DESCRIBE clients');
    const hasLastLogin = columns.some(col => col.Field === 'last_login');
    console.log(`✓ Verification: last_login column exists: ${hasLastLogin}`);
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ last_login column already exists');
    } else {
      console.error('Error adding column:', error.message);
    }
  } finally {
    await connection.end();
  }
}

addLastLoginColumn().catch(console.error);