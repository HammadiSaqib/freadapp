const mysql = require('mysql2/promise');

async function checkClientTableStructure() {
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

    // Get the table structure
    const [columns] = await connection.execute(`
      DESCRIBE clients
    `);

    console.log('\n=== CLIENT TABLE STRUCTURE ===');
    console.log('Column Name\t\tType\t\t\tNull\tKey\tDefault\tExtra');
    console.log('===========================================================================');
    
    columns.forEach(column => {
      console.log(`${column.Field.padEnd(20)}\t${column.Type.padEnd(20)}\t${column.Null}\t${column.Key}\t${column.Default || 'NULL'}\t${column.Extra}`);
    });

    // Check for required columns from the INSERT statement
    const requiredColumns = [
      'user_id',
      'first_name', 
      'last_name',
      'email',
      'phone',
      'address',
      'ssn_last_four',
      'date_of_birth',
      'employment_status',
      'annual_income',
      'status',
      'credit_score',
      'previous_credit_score',
      'notes',
      'platform',
      'platform_email',
      'platform_password'
    ];

    console.log('\n=== COLUMN VERIFICATION ===');
    const existingColumns = columns.map(col => col.Field);
    const missingColumns = [];

    requiredColumns.forEach(reqCol => {
      const exists = existingColumns.includes(reqCol);
      console.log(`${reqCol.padEnd(25)}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
      if (!exists) {
        missingColumns.push(reqCol);
      }
    });

    if (missingColumns.length > 0) {
      console.log('\n=== MISSING COLUMNS ===');
      console.log('The following columns are missing from the clients table:');
      missingColumns.forEach(col => console.log(`- ${col}`));
    } else {
      console.log('\n✓ All required columns exist in the clients table!');
    }

  } catch (error) {
    console.error('Error checking client table structure:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

checkClientTableStructure();