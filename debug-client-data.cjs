require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db'
  });

  console.log('🔍 Checking client data...');
  const [clients] = await connection.execute('SELECT id, user_id, first_name, last_name, platform_email FROM clients WHERE id = 33');
  console.log('Client 33:', clients);

  console.log('\n🔍 Checking credit report history...');
  const [reports] = await connection.execute('SELECT id, client_id, platform, status, created_at FROM credit_report_history WHERE client_id = 33');
  console.log('Credit reports for client 33:', reports);

  console.log('\n🔍 Testing the exact query from API...');
  const [apiQuery] = await connection.execute(`
    SELECT 
      crh.id,
      crh.client_id,
      crh.platform,
      crh.report_path,
      crh.status,
      crh.created_at,
      c.first_name,
      c.last_name,
      c.email
    FROM credit_report_history crh
    LEFT JOIN clients c ON crh.client_id = c.id
    WHERE crh.client_id = ? AND (c.id = ? OR c.user_id = ?)
    ORDER BY crh.created_at DESC
    LIMIT 1
  `, [33, 33, 33]);
  console.log('API query result:', apiQuery);

  await connection.end();
}

checkData().catch(console.error);