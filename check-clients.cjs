const mysql = require('mysql2/promise');

async function checkClients() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('Checking clients table...');
    
    // Check total clients
    const [totalClients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    console.log('Total clients:', totalClients[0]?.count || 0);
    
    if (totalClients[0]?.count > 0) {
      // Get sample clients
      const [clients] = await connection.execute(`
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.status,
          c.user_id,
          u.email as admin_email,
          u.role as admin_role
        FROM clients c
        LEFT JOIN users u ON c.user_id = u.id
        LIMIT 10
      `);
      
      console.log('\nSample clients:');
      console.table(clients);
    } else {
      console.log('No clients found in database.');
      
      // Check if clients table exists
      const [tables] = await connection.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = 'creditrepair_db' AND table_name = 'clients'");
      if (tables.length === 0) {
        console.log('Clients table does not exist!');
      } else {
        console.log('Clients table exists but is empty.');
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error checking clients:', error);
  }
}

checkClients();