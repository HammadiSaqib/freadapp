const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  let connection;
  try {
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db',
      ssl: false
    };

    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('Connected.');

    // Ensure affiliates table exists before adding foreign key
    const [affTable] = await connection.execute(
      `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'affiliates'`,
      [config.database]
    );
    if (affTable[0].count === 0) {
      throw new Error("affiliates table does not exist. Create it before running this migration.");
    }

    const createSql = `
      CREATE TABLE IF NOT EXISTS affiliate_password_reset_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_affiliate_id (affiliate_id),
        INDEX idx_code (code),
        INDEX idx_expires_at (expires_at),
        UNIQUE KEY unique_affiliate_active_code (affiliate_id, used),
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    console.log('Creating affiliate_password_reset_codes table if missing...');
    await connection.execute(createSql);
    console.log('Table ensured.');

    // Show table structure
    const [desc] = await connection.execute(`DESCRIBE affiliate_password_reset_codes`);
    console.log('\nTable structure:');
    for (const col of desc) {
      console.log(`  - ${col.Field} ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    }

    // Show full CREATE TABLE
    const [showCreate] = await connection.execute(`SHOW CREATE TABLE affiliate_password_reset_codes`);
    console.log('\nSHOW CREATE TABLE:');
    console.log(showCreate[0]['Create Table']);

    console.log('\n✅ Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
}

main();