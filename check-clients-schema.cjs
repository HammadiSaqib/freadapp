const mysql = require('mysql2/promise');

async function checkClientsSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Checking clients table schema...');
    
    // Get table structure
    const [columns] = await connection.execute('DESCRIBE clients');
    
    console.log('\nCurrent clients table columns:');
    console.log('Field\t\t\tType\t\t\tNull\tKey\tDefault\tExtra');
    console.log('='.repeat(80));
    
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)}\t${col.Type.padEnd(20)}\t${col.Null}\t${col.Key}\t${col.Default}\t${col.Extra}`);
    });
    
    // Check what columns the INSERT statement expects
    const expectedColumns = [
      'user_id', 'first_name', 'last_name', 'email', 'phone', 'address', 
      'ssn_last_four', 'date_of_birth', 'employment_status', 'annual_income', 
      'status', 'credit_score', 'previous_credit_score', 'notes', 'platform', 
      'platform_email', 'platform_password'
    ];
    
    console.log('\n\nExpected columns from INSERT statement:');
    expectedColumns.forEach(col => console.log(`- ${col}`));
    
    console.log('\n\nMissing columns:');
    const existingColumns = columns.map(col => col.Field);
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      missingColumns.forEach(col => console.log(`- ${col} (MISSING)`));
    } else {
      console.log('No missing columns found.');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await connection.end();
  }
}

checkClientsSchema();