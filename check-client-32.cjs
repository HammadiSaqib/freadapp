const mysql = require('mysql2/promise');

async function checkClient32() {
  try {
    console.log('🔌 Connecting to MySQL database...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check if client 32 exists
    console.log('\n🔍 Checking if client 32 exists...');
    const [clients] = await connection.execute('SELECT * FROM clients WHERE id = ?', [32]);
    
    if (clients.length === 0) {
      console.log('❌ Client 32 not found in database');
      
      // Show available clients
      console.log('\n📋 Available clients:');
      const [allClients] = await connection.execute('SELECT id, first_name, last_name, email FROM clients ORDER BY id LIMIT 20');
      allClients.forEach(client => {
        console.log(`   ID: ${client.id}, Name: ${client.first_name} ${client.last_name}, Email: ${client.email}`);
      });
      
      await connection.end();
      return;
    }

    const client = clients[0];
    console.log(`✅ Client 32 found: ${client.first_name} ${client.last_name} (${client.email})`);

    // Check credit report history for client 32
    console.log('\n🔍 Checking credit report history for client 32...');
    const [reports] = await connection.execute('SELECT * FROM credit_report_history WHERE client_id = ?', [32]);
    
    if (reports.length === 0) {
      console.log('❌ No credit report history found for client 32');
    } else {
      console.log(`✅ Found ${reports.length} credit report(s) for client 32:`);
      reports.forEach((report, index) => {
        console.log(`   Report ${index + 1}:`);
        console.log(`     ID: ${report.id}`);
        console.log(`     Platform: ${report.platform}`);
        console.log(`     Status: ${report.status}`);
        console.log(`     Report Path: ${report.report_path}`);
        console.log(`     Created: ${report.created_at}`);
        console.log(`     Updated: ${report.updated_at}`);
      });
    }

    // Check credit reports table
    console.log('\n🔍 Checking credit_reports table for client 32...');
    const [creditReports] = await connection.execute('SELECT * FROM credit_reports WHERE client_id = ?', [32]);
    
    if (creditReports.length === 0) {
      console.log('❌ No credit reports found for client 32 in credit_reports table');
    } else {
      console.log(`✅ Found ${creditReports.length} credit report(s) in credit_reports table:`);
      creditReports.forEach((report, index) => {
        console.log(`   Report ${index + 1}:`);
        console.log(`     ID: ${report.id}`);
        console.log(`     Platform: ${report.platform}`);
        console.log(`     Status: ${report.status}`);
        console.log(`     JSON Data Length: ${report.json_data ? report.json_data.length : 'null'} characters`);
        console.log(`     Created: ${report.created_at}`);
        console.log(`     Updated: ${report.updated_at}`);
      });
    }

    await connection.end();
    console.log('\n🔌 Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkClient32();