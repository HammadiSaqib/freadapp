const mysql = require('mysql2/promise');

async function checkClientsColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'creditrepair_db'
  });
  
  const [columns] = await connection.execute('DESCRIBE clients');
  console.log('Clients table columns:');
  columns.forEach(col => {
    console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
  });
  
  // Check if last_login column exists
  const hasLastLogin = columns.some(col => col.Field === 'last_login');
  console.log(`\nHas last_login column: ${hasLastLogin}`);
  
  await connection.end();
}

checkClientsColumns().catch(console.error);