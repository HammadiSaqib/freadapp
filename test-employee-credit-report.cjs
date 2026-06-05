/**
 * Quick test: simulate an employee user accessing a client's credit report
 * to debug the "Forbidden" issue.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db'
  });

  // Find an active employee user
  const [empRows] = await conn.execute(
    "SELECT u.id, u.email, u.role, e.admin_id FROM users u JOIN employees e ON e.user_id = u.id AND e.status = 'active' ORDER BY e.id DESC LIMIT 1"
  );
  if (!empRows.length) {
    console.log('No active employee user found');
    await conn.end();
    return;
  }
  const emp = empRows[0];
  console.log('Employee user:', emp);

  // Find a client belonging to that admin
  const adminId = emp.admin_id;
  const [clientRows] = await conn.execute(
    "SELECT id, user_id, first_name, last_name FROM clients WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    [adminId]
  );
  if (!clientRows.length) {
    console.log('No clients found for admin_id =', adminId);
    await conn.end();
    return;
  }
  const client = clientRows[0];
  console.log('Test client:', client);

  // Generate a JWT token just like the login endpoint would
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  const token = jwt.sign(
    { id: emp.id, email: emp.email, role: emp.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  console.log('Generated token payload: { id:', emp.id, ', email:', emp.email, ', role:', emp.role, '}');

  // Call the credit report endpoint
  const port = 3002; // Vite chose 3002
  const url = `http://localhost:${port}/api/credit-reports/client/${client.id}`;
  console.log('Fetching:', url);

  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Response status:', resp.status, resp.statusText);
  const body = await resp.json();
  console.log('Response body:', JSON.stringify(body, null, 2));

  await conn.end();
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
