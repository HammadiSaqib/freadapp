const mysql = require('mysql2/promise');

async function addPagePermissionsColumn() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('Connected to database');
    
    // Check if table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'subscription_plans'");
    if (tables.length === 0) {
      console.log('subscription_plans table does not exist');
      return;
    }
    
    // Check if column exists
    const [columns] = await connection.execute("SHOW COLUMNS FROM subscription_plans LIKE 'page_permissions'");
    
    if (columns.length === 0) {
      console.log('Adding page_permissions column...');
      await connection.execute('ALTER TABLE subscription_plans ADD COLUMN page_permissions JSON DEFAULT NULL');
      console.log('page_permissions column added successfully');
    } else {
      console.log('page_permissions column already exists');
    }
    
    // Show current table structure
    const [tableColumns] = await connection.execute('DESCRIBE subscription_plans');
    console.log('\nCurrent subscription_plans table structure:');
    tableColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addPagePermissionsColumn();