const mysql = require('mysql2/promise');

async function addMissingColumn() {
  let connection;
  
  try {
    // Create connection to MySQL database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('Connected to MySQL database');

    // Check if ssn_last_four column exists
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM clients LIKE 'ssn_last_four'
    `);

    if (columns.length === 0) {
      console.log('Adding ssn_last_four column to clients table...');
      
      // Add the missing column
      await connection.execute(`
        ALTER TABLE clients 
        ADD COLUMN ssn_last_four VARCHAR(4) NULL 
        AFTER ssn_last4
      `);
      
      console.log('✓ Successfully added ssn_last_four column');
      
      // Copy data from ssn_last4 to ssn_last_four if ssn_last4 has data
      const [updateResult] = await connection.execute(`
        UPDATE clients 
        SET ssn_last_four = ssn_last4 
        WHERE ssn_last4 IS NOT NULL AND ssn_last_four IS NULL
      `);
      
      console.log(`✓ Copied ${updateResult.affectedRows} records from ssn_last4 to ssn_last_four`);
      
    } else {
      console.log('✓ ssn_last_four column already exists');
    }

    // Verify the column was added
    const [finalColumns] = await connection.execute(`
      DESCRIBE clients
    `);

    console.log('\n=== UPDATED CLIENT TABLE STRUCTURE ===');
    const ssnColumns = finalColumns.filter(col => 
      col.Field.includes('ssn') || 
      col.Field === 'ssn_last_four' || 
      col.Field === 'ssn_last4'
    );
    
    ssnColumns.forEach(column => {
      console.log(`${column.Field.padEnd(20)}\t${column.Type.padEnd(20)}\t${column.Null}\t${column.Key}\t${column.Default || 'NULL'}`);
    });

  } catch (error) {
    console.error('Error adding missing column:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addMissingColumn();