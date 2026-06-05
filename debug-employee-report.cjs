const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST,
    user: process.env.DB_USER || process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306')
  });

  // 1. Find active employees
  const [employees] = await conn.query(
    'SELECT e.user_id, e.admin_id, u.role, u.email FROM employees e JOIN users u ON e.user_id = u.id WHERE e.status = ? LIMIT 5',
    ['active']
  );
  console.log('Active employees:', JSON.stringify(employees, null, 2));

  if (employees.length === 0) { console.log('No active employees'); process.exit(0); }

  const emp = employees[0];
  console.log('\nUsing employee:', emp.user_id, 'admin:', emp.admin_id, 'role:', emp.role);

  // 2. Find clients belonging to this admin
  const [clients] = await conn.query(
    'SELECT id, first_name, last_name, user_id FROM clients WHERE user_id = ? LIMIT 5',
    [emp.admin_id]
  );
  console.log('\nAdmin clients:', JSON.stringify(clients, null, 2));

  if (clients.length === 0) { console.log('No clients for this admin'); process.exit(0); }

  // 3. Check credit_report_history for these clients
  for (const client of clients) {
    const [reports] = await conn.query(
      'SELECT id, client_id, report_path, status, created_at FROM credit_report_history WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
      [client.id]
    );
    console.log('\nClient', client.id, '(' + client.first_name + '):', reports.length > 0 ? JSON.stringify(reports[0]) : 'NO REPORT');
  }

  // 4. Simulate the auth check as employee
  const testClientId = clients[0].id;
  const baseUserId = emp.admin_id;
  console.log('\n--- Simulating auth check ---');
  console.log('testClientId:', testClientId, 'baseUserId (admin_id):', baseUserId);

  const [accessCheck] = await conn.query(
    'SELECT id FROM clients WHERE id = ? AND (user_id = ? OR user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?)) LIMIT 1',
    [testClientId, baseUserId, baseUserId, 'active']
  );
  console.log('Access check result:', JSON.stringify(accessCheck));

  // 5. Simulate the credit report fetch query
  const [reportRows] = await conn.query(
    `SELECT crh.id, crh.client_id, crh.report_path, crh.status, crh.created_at, c.first_name, c.last_name
     FROM credit_report_history crh
     JOIN clients c ON crh.client_id = c.id
     WHERE crh.client_id = ?
     ORDER BY crh.created_at DESC
     LIMIT 1`,
    [testClientId]
  );
  console.log('\nCredit report query result:', JSON.stringify(reportRows, null, 2));

  if (reportRows.length > 0) {
    const fs = require('fs');
    const path = require('path');
    let reportPath = reportRows[0].report_path;
    if (!path.isAbsolute(reportPath)) {
      if (reportPath.startsWith('scraper-output')) {
        reportPath = path.join(process.cwd(), reportPath);
      } else {
        reportPath = path.join(process.cwd(), 'uploads', 'credit-reports', reportPath);
      }
    }
    console.log('\nReport file path:', reportPath);
    console.log('File exists:', fs.existsSync(reportPath));
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log('File top-level keys:', Object.keys(data));
      console.log('Has reportData:', !!data.reportData);
      if (data.reportData) {
        console.log('reportData keys:', Object.keys(data.reportData));
      }
    }
  } else {
    console.log('\n*** NO REPORT FOUND — this is why the employee sees "Missing bureau report" ***');
    console.log('The client has no credit_report_history row, so the backend returns 404.');
  }

  await conn.end();
})();
