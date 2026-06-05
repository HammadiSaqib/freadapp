/**
 * Migration: Add missing columns to disputes and clients tables
 * so the V2 code matches the actual MySQL DB schema.
 *
 * Run: node add-missing-db-columns.cjs
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(connection, table, column, definition) {
  if (await columnExists(connection, table, column)) {
    console.log(`  ⏭️  ${table}.${column} already exists`);
    return;
  }
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  ✅  ${table}.${column} added`);
}

async function backfillDisputeDates(connection) {
  const hasDateSubmitted = await columnExists(connection, 'disputes', 'date_submitted');
  const hasDateResolved = await columnExists(connection, 'disputes', 'date_resolved');

  if (hasDateSubmitted) {
    const [result] = await connection.query(`
      UPDATE disputes
      SET filed_date = COALESCE(filed_date, date_submitted, DATE(created_at), CURDATE())
      WHERE filed_date IS NULL
    `);
    console.log(`  ✅  Backfilled disputes.filed_date for ${result.affectedRows} rows`);
  } else {
    const [result] = await connection.query(`
      UPDATE disputes
      SET filed_date = COALESCE(filed_date, DATE(created_at), CURDATE())
      WHERE filed_date IS NULL
    `);
    console.log(`  ✅  Normalized disputes.filed_date for ${result.affectedRows} rows`);
  }

  if (hasDateResolved) {
    const [result] = await connection.query(`
      UPDATE disputes
      SET response_date = COALESCE(response_date, date_resolved)
      WHERE response_date IS NULL AND date_resolved IS NOT NULL
    `);
    console.log(`  ✅  Backfilled disputes.response_date for ${result.affectedRows} rows`);
  }
}

async function backfillDisputeAuditColumns(connection) {
  const [result] = await connection.query(`
    UPDATE disputes d
    INNER JOIN clients c ON c.id = d.client_id
    SET
      d.created_by = COALESCE(d.created_by, c.user_id),
      d.updated_by = COALESCE(d.updated_by, c.user_id)
    WHERE d.created_by IS NULL OR d.updated_by IS NULL
  `);
  console.log(`  ✅  Backfilled disputes.created_by / disputes.updated_by for ${result.affectedRows} rows`);
}

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'creditrepair_db',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
  });

  console.log('Connected to MySQL. Running migrations...\n');

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dispute_letter_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        client_id INT NULL,
        dispute_id INT NULL,
        bureaus JSON NULL,
        negative_item_types JSON NULL,
        dispute_round INT NOT NULL DEFAULT 1,
        templates_used JSON NULL,
        template_count INT NOT NULL DEFAULT 0,
        template_source VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dispute_letter_history_user_id (user_id),
        INDEX idx_dispute_letter_history_client_id (client_id),
        INDEX idx_dispute_letter_history_dispute_id (dispute_id),
        INDEX idx_dispute_letter_history_round (dispute_round),
        INDEX idx_dispute_letter_history_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅  dispute_letter_history table is ready');

    // ── Disputes table ──
    await addColumnIfMissing(connection, 'disputes', 'filed_date', 'DATE NULL');
    await addColumnIfMissing(connection, 'disputes', 'response_date', 'DATE NULL');
    await addColumnIfMissing(connection, 'disputes', 'result', 'TEXT NULL');
    await addColumnIfMissing(connection, 'disputes', 'notes', 'TEXT NULL');
    await addColumnIfMissing(connection, 'disputes', 'created_by', 'INT NULL');
    await addColumnIfMissing(connection, 'disputes', 'updated_by', 'INT NULL');

    // ── Clients table ──
    await addColumnIfMissing(connection, 'clients', 'middle_name', 'VARCHAR(100) NULL');
    await addColumnIfMissing(connection, 'clients', 'street_number_and_name', 'TEXT NULL');
    await addColumnIfMissing(connection, 'clients', 'country', "VARCHAR(100) DEFAULT 'United States'");
    await addColumnIfMissing(connection, 'clients', 'ssn_last_six', 'VARCHAR(6) NULL');
    await addColumnIfMissing(connection, 'clients', 'security_freeze_pin', 'VARCHAR(100) NULL');
    await addColumnIfMissing(connection, 'clients', 'fundable_status', 'VARCHAR(20) DEFAULT NULL');
    await addColumnIfMissing(connection, 'clients', 'fundable_in_tu', 'TINYINT(1) DEFAULT 0');
    await addColumnIfMissing(connection, 'clients', 'fundable_in_ex', 'TINYINT(1) DEFAULT 0');
    await addColumnIfMissing(connection, 'clients', 'fundable_in_eq', 'TINYINT(1) DEFAULT 0');
    await addColumnIfMissing(connection, 'clients', 'dl_or_id_card', 'TEXT NULL');
    await addColumnIfMissing(connection, 'clients', 'poa', 'TEXT NULL');
    await addColumnIfMissing(connection, 'clients', 'ssc', 'TEXT NULL');
    await addColumnIfMissing(connection, 'clients', 'other_documents', 'JSON NULL');

    await backfillDisputeDates(connection);
    await backfillDisputeAuditColumns(connection);

    // Backfill street_number_and_name from address where missing
    if (await columnExists(connection, 'clients', 'street_number_and_name') && await columnExists(connection, 'clients', 'address')) {
      const [result] = await connection.query(`
        UPDATE clients
        SET street_number_and_name = address
        WHERE (street_number_and_name IS NULL OR street_number_and_name = '')
          AND address IS NOT NULL AND address != ''
      `);
      console.log(`\n  ✅  Backfilled street_number_and_name for ${result.affectedRows} rows`);
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  }

  await connection.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
