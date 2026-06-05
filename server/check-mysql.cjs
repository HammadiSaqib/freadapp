const mysql = require('mysql2/promise');

async function checkMySQLDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('✅ Connected to MySQL database');
    console.log(`   Host: ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || '3306'}`);
    console.log(`   Database: ${process.env.MYSQL_DATABASE || 'creditrepair_db'}`);
    console.log(`   User: ${process.env.MYSQL_USER || 'root'}\n`);
    
    // Check if database exists and get tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables found:', tables.length);
    
    if (tables.length > 0) {
      console.log('   Tables:', tables.map(t => Object.values(t)[0]).join(', '));
      
      // Check if clients table exists and has data
      const clientsTable = tables.find(t => Object.values(t)[0] === 'clients');
      if (clientsTable) {
        const [clientCount] = await connection.execute('SELECT COUNT(*) as count FROM clients');
        console.log(`\n👥 Total clients: ${clientCount[0].count}`);
        
        if (clientCount[0].count > 0) {
          // Get client status breakdown
          const [statusBreakdown] = await connection.execute(`
            SELECT status, COUNT(*) as count 
            FROM clients 
            GROUP BY status
          `);
          console.log('   Client status breakdown:');
          statusBreakdown.forEach(row => {
            console.log(`     ${row.status}: ${row.count}`);
          });
          
          // Get sample client data
          const [sampleClients] = await connection.execute(`
            SELECT id, first_name, last_name, status, credit_score 
            FROM clients 
            LIMIT 5
          `);
          console.log('\n   Sample clients:');
          sampleClients.forEach(client => {
            console.log(`     ${client.id}: ${client.first_name} ${client.last_name} (${client.status}, score: ${client.credit_score || 'N/A'})`);
          });
        }
      } else {
        console.log('\n❌ No clients table found');
      }
      
      // Check users table
      const usersTable = tables.find(t => Object.values(t)[0] === 'users');
      if (usersTable) {
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`\n👤 Total users: ${userCount[0].count}`);
      }
      
    } else {
      console.log('❌ No tables found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure XAMPP MySQL service is running');
      console.error('   2. Check if MySQL is running on port 3306');
      console.error('   3. Verify MySQL credentials in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. You may need to:');
      console.error('   1. Create the database manually in phpMyAdmin');
      console.error('   2. Run database initialization script');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

checkMySQLDatabase();