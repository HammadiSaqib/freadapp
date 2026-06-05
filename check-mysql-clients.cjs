const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMySQLClients() {
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
    
    // Check clients table structure
    console.log('📋 Checking clients table structure...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);
    
    console.log('   Columns:');
    columns.forEach(col => {
      console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // Check if platform_email and platform_password columns exist
    const hasplatformEmail = columns.some(col => col.COLUMN_NAME === 'platform_email');
    const hasplatformPassword = columns.some(col => col.COLUMN_NAME === 'platform_password');
    
    console.log(`\n🔍 Platform columns check:`);
    console.log(`   platform_email: ${hasplatformEmail ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   platform_password: ${hasplatformPassword ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Get all clients with their credentials
    console.log('\n👥 Client credentials:');
    const clientQuery = hasplatformEmail && hasplatformPassword 
      ? `SELECT id, first_name, last_name, email, platform_email, platform_password, status FROM clients LIMIT 10`
      : `SELECT id, first_name, last_name, email, status FROM clients LIMIT 10`;
    
    const [clients] = await connection.execute(clientQuery);
    console.log(`Found ${clients.length} clients:`);
    
    clients.forEach(client => {
      console.log(`\n  Client ID: ${client.id}`);
      console.log(`  Name: ${client.first_name} ${client.last_name}`);
      console.log(`  Email: ${client.email}`);
      if (hasplatformEmail) console.log(`  Platform Email: ${client.platform_email || 'NULL'}`);
      if (hasplatformPassword) console.log(`  Platform Password: ${client.platform_password || 'NULL'}`);
      console.log(`  Status: ${client.status}`);
    });
    
    // Check credit_report_history table
    console.log('\n📊 Checking credit_report_history table...');
    
    // First check the table structure
    const [reportColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_report_history'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);
    
    console.log('   credit_report_history columns:');
    reportColumns.forEach(col => {
      console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });
    
    const [reportCount] = await connection.execute('SELECT COUNT(*) as count FROM credit_report_history');
    console.log(`\n   Total credit reports: ${reportCount[0].count}`);
    
    if (reportCount[0].count > 0) {
      // Use only columns that exist
      const [reports] = await connection.execute(`
        SELECT client_id, platform, status, report_path, created_at 
        FROM credit_report_history 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('   Recent reports:');
      reports.forEach(report => {
        console.log(`     Client ID: ${report.client_id}, Platform: ${report.platform}, Status: ${report.status}`);
        console.log(`     Path: ${report.report_path}`);
        console.log(`     Created: ${report.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   MySQL server is not running or connection refused');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Access denied - check username/password');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database does not exist');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

checkMySQLClients();