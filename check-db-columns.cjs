require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'creditrepair_db',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
  });

  // Check platform column type
  const [platformCol] = await c.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'platform'"
  );
  console.log('Platform column:', platformCol);

  // Check disputes.status column type
  const [disputeStatusCol] = await c.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'disputes' AND COLUMN_NAME = 'status'"
  );
  console.log('Disputes status column:', disputeStatusCol);

  // Check disputes.bureau column type
  const [disputeBureauCol] = await c.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'disputes' AND COLUMN_NAME = 'bureau'"
  );
  console.log('Disputes bureau column:', disputeBureauCol);

  await c.end();
})();
