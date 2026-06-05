const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'creditrepair_db'
  });
  
  console.log('Available tables:');
  const [tables] = await connection.execute('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log(tableNames);
  
  // Check for users/clients table
  if (tableNames.includes('users')) {
    console.log('\nChecking users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Users table columns:', columns.map(c => c.Field));
    
    console.log('\nChecking users table for client data:');
    const [users] = await connection.execute('SELECT id, email, role FROM users WHERE role LIKE "%client%" OR role = "user" LIMIT 5');
    console.log(users);
  }
  
  if (tableNames.includes('clients')) {
    console.log('\nChecking clients table:');
    const [clients] = await connection.execute('SELECT * FROM clients LIMIT 5');
    console.log(clients);
  }
  
  // Check credit_reports table
  if (tableNames.includes('credit_reports')) {
    console.log('\nChecking credit_reports table:');
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM credit_reports');
    console.log('Total credit reports:', count[0].total);
    
    if (count[0].total > 0) {
      const [reports] = await connection.execute('SELECT DISTINCT client_id FROM credit_reports LIMIT 10');
      console.log('Available client IDs with reports:', reports);
    }
  }
  
  await connection.end();
}

checkDatabase().catch(console.error);