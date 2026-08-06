/**
 * Database connection utility for ESM environment
 * This file provides a consistent way to connect to the database
 * in Vite's ESM environment
 */

import mysql from 'mysql2/promise';

// Connection pool
let pool = null;

// Import environment configuration
import { ENV_CONFIG } from '../config/environment.js';
import { syncAdminClientToGhlInBackground } from '../services/ghlService.js';
import { syncGhlAdminLifecycleTagsInBackground } from '../services/ghlAdminLifecycleService.js';

// Default database configuration using ENV_CONFIG
const DEFAULT_CONFIG = {
  host: ENV_CONFIG.MYSQL_HOST,
  port: ENV_CONFIG.MYSQL_PORT,
  user: ENV_CONFIG.MYSQL_USER,
  password: ENV_CONFIG.MYSQL_PASSWORD,
  database: ENV_CONFIG.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: ENV_CONFIG.MYSQL_CONNECTION_LIMIT,
  queueLimit: 0,
  // Use supported mysql2 timeout options only.
  connectTimeout: ENV_CONFIG.MYSQL_TIMEOUT || 60000
};

/**
 * Get a database connection
 * @returns {Promise<Object>} Database connection
 */
async function getConnection() {
  // If we already have a pool, return a connection from it
  if (pool) {
    return pool.getConnection();
  }

  // Create a new pool
  pool = mysql.createPool(DEFAULT_CONFIG);
  return pool.getConnection();
}

/**
 * Execute a database query
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function executeQuery(sql, params = []) {
  let connection;
  let isPoolConnection = false;

  try {
    // Get a connection
    connection = await getConnection();
    isPoolConnection = !!pool;

    // Execute the query (use query with timeout to avoid hangs)
    const [results] = await connection.query({ sql, timeout: ENV_CONFIG.MYSQL_TIMEOUT || 60000 }, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    // Release the connection if it's from a pool
    if (connection && isPoolConnection) {
      connection.release();
    } else if (connection) {
      // Close the connection if it's a direct connection
      await connection.end().catch(err => console.error('Error closing connection:', err));
    }
  }
}

function normalizeSsnLastFour(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '';
}

async function persistClientSsnLastFour(clientId, ssnLastFour) {
  const normalizedClientId = Number.parseInt(String(clientId || ''), 10);
  const normalizedSsnLastFour = normalizeSsnLastFour(ssnLastFour);

  if (!Number.isFinite(normalizedClientId) || normalizedClientId <= 0 || !normalizedSsnLastFour) {
    return;
  }

  await executeQuery(
    `UPDATE clients
        SET ssn_last_four = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND (ssn_last_four IS NULL OR TRIM(ssn_last_four) = '')`,
    [normalizedSsnLastFour, normalizedClientId]
  );
}

async function repairCreditReportHistoryIdAutoIncrement(columns = null) {
  const inspectedColumns = columns || await executeQuery(
    `SELECT COLUMN_NAME, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_report_history'`,
    [ENV_CONFIG.MYSQL_DATABASE]
  );
  const idColumn = inspectedColumns.find(c => c.COLUMN_NAME === 'id');

  if (!idColumn) {
    await executeQuery('ALTER TABLE credit_report_history ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST');
    console.log('credit_report_history id column added as AUTO_INCREMENT');
    return true;
  }

  const isAutoIncrement = String(idColumn.EXTRA || '').toLowerCase().includes('auto_increment');
  if (isAutoIncrement) {
    return true;
  }

  const primaryIndexes = await executeQuery("SHOW INDEX FROM credit_report_history WHERE Key_name = 'PRIMARY'");
  const hasPrimaryKey = Array.isArray(primaryIndexes) && primaryIndexes.length > 0;
  const idIsPrimary = String(idColumn.COLUMN_KEY || '').toUpperCase() === 'PRI';

  if (!hasPrimaryKey) {
    await executeQuery('ALTER TABLE credit_report_history ADD PRIMARY KEY (id)');
  } else if (!idIsPrimary) {
    console.warn('credit_report_history.id is not AUTO_INCREMENT and another primary key exists; falling back to explicit IDs for inserts');
    return false;
  }

  await executeQuery('ALTER TABLE credit_report_history MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT');
  console.log('credit_report_history id column repaired to AUTO_INCREMENT');
  return true;
}

/**
 * Create the credit_report_history table if it doesn't exist
 */
async function ensureCreditReportHistoryTable() {
  // Base table creation
  const createSql = `
    CREATE TABLE IF NOT EXISTS credit_report_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id VARCHAR(255) NOT NULL,
      platform VARCHAR(255) NOT NULL,
      report_path VARCHAR(255),
      status VARCHAR(50) DEFAULT 'completed',
      credit_score INT NULL,
      experian_score INT NULL,
      equifax_score INT NULL,
      transunion_score INT NULL,
      report_date DATETIME NULL,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client_platform (client_id, platform),
      INDEX idx_created_at (created_at)
    )
  `;

  try {
    await executeQuery(createSql);
    // Ensure missing columns are added for existing tables
    const columns = await executeQuery(
      `SELECT COLUMN_NAME, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_report_history'`,
      [ENV_CONFIG.MYSQL_DATABASE]
    );
    const existing = new Set(columns.map(c => c.COLUMN_NAME));
    try {
      await repairCreditReportHistoryIdAutoIncrement(columns);
    } catch (repairError) {
      console.warn('Unable to repair credit_report_history.id automatically; inserts will use explicit IDs if needed:', repairError?.message || repairError);
    }
    const adds = [];
    if (!existing.has('credit_score')) adds.push('ADD COLUMN credit_score INT NULL');
    if (!existing.has('experian_score')) adds.push('ADD COLUMN experian_score INT NULL');
    if (!existing.has('equifax_score')) adds.push('ADD COLUMN equifax_score INT NULL');
    if (!existing.has('transunion_score')) adds.push('ADD COLUMN transunion_score INT NULL');
    if (!existing.has('report_date')) adds.push('ADD COLUMN report_date DATETIME NULL');
    if (!existing.has('notes')) adds.push('ADD COLUMN notes TEXT NULL');
    if (adds.length > 0) {
      const alterSql = `ALTER TABLE credit_report_history ${adds.join(', ')}`;
      await executeQuery(alterSql);
      console.log('credit_report_history table updated with missing columns');
    }
    console.log('Credit report history table is ready');
  } catch (error) {
    console.error('Failed to ensure credit_report_history table:', error);
    throw error;
  }
}

function isMissingCreditReportHistoryIdDefault(error) {
  return error?.code === 'ER_NO_DEFAULT_FOR_FIELD'
    && String(error?.sqlMessage || error?.message || '').toLowerCase().includes("field 'id'");
}

async function insertCreditReportHistory(sql, params) {
  try {
    return await executeQuery(sql, params);
  } catch (error) {
    if (!isMissingCreditReportHistoryIdDefault(error)) {
      throw error;
    }

    console.warn('credit_report_history.id is missing AUTO_INCREMENT; attempting repair before retrying insert');
    try {
      await repairCreditReportHistoryIdAutoIncrement();
      return await executeQuery(sql, params);
    } catch (repairOrRetryError) {
      if (!isMissingCreditReportHistoryIdDefault(repairOrRetryError)) {
        throw repairOrRetryError;
      }
    }

    const nextRows = await executeQuery('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM credit_report_history');
    const nextId = Number(Array.isArray(nextRows) ? nextRows[0]?.next_id : nextRows?.next_id) || 1;
    const fallbackSql = `
      INSERT INTO credit_report_history
      (id, client_id, platform, report_path, status, credit_score, experian_score, equifax_score, transunion_score, report_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return executeQuery(fallbackSql, [nextId, ...params]);
  }
}

/**
 * Save a credit report to the history table
 * @param {Object} data - Report data to save
 * @returns {Promise<Object>} Result of the insert operation
 */
async function saveCreditReport(data) {
  // Ensure the table exists
  await ensureCreditReportHistoryTable();

  const sql = `
    INSERT INTO credit_report_history 
    (client_id, platform, report_path, status, credit_score, experian_score, equifax_score, transunion_score, report_date, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.client_id,
    data.platform,
    data.report_path,
    data.status || 'completed',
    data.credit_score || null,
    data.experian_score || null,
    data.equifax_score || null,
    data.transunion_score || null,
    data.report_date || null,
    data.notes || null
  ];

  try {
    const result = await insertCreditReportHistory(sql, params);
    await persistClientSsnLastFour(data.client_id, data.ssn_last_four);
    try {
      const clientId = data.client_id;
      let clientRow = null;
      if (clientId) {
        const rows = await executeQuery(
          'SELECT id, user_id, first_name, last_name, email, phone, integration_id FROM clients WHERE id = ? LIMIT 1',
          [clientId]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          clientRow = rows[0];
        }
      }
      if (clientRow?.user_id) {
        syncGhlAdminLifecycleTagsInBackground(Number(clientRow.user_id));
        syncAdminClientToGhlInBackground(
          Number(clientRow.user_id),
          Number(clientRow.id),
          'report_pulled'
        );
      }
    } catch (ghlError) {
      console.error('GHL sync failed:', ghlError);
    }
    const numericClientId = Number(data.client_id);
    if ((data.status || 'completed') === 'completed' && Number.isFinite(numericClientId) && numericClientId > 0) {
      import('../services/reportPullEmailService.js')
        .then(({ sendClientReportPulledNotificationInBackground }) => {
          sendClientReportPulledNotificationInBackground(numericClientId);
        })
        .catch((notificationError) => {
          console.error('Unable to start client report-pulled notification:', notificationError?.message || notificationError);
        });
    }
    return result;
  } catch (error) {
    console.error('Failed to save credit report history:', error);
    throw error;
  }
}

/**
 * Update client_id in credit report history for reports with 'unknown' client_id
 * @param {string} newClientId - The new client ID to update to
 * @param {Array} reportIds - Array of report IDs to update (optional, if not provided updates all 'unknown' reports)
 * @returns {Promise<Object>} Result of the update operation
 */
async function updateCreditReportClientId(newClientId, reportIds = null) {
  let sql;
  let params;
  
  if (reportIds && reportIds.length > 0) {
    // Update specific report IDs
    const placeholders = reportIds.map(() => '?').join(',');
    sql = `
      UPDATE credit_report_history 
      SET client_id = ? 
      WHERE id IN (${placeholders}) AND client_id = 'unknown'
    `;
    params = [newClientId, ...reportIds];
  } else {
    // Update all reports with 'unknown' client_id
    sql = `
      UPDATE credit_report_history 
      SET client_id = ? 
      WHERE client_id = 'unknown'
    `;
    params = [newClientId];
  }

  try {
    const result = await executeQuery(sql, params);
    console.log(`Updated ${result.affectedRows} credit report(s) with new client ID: ${newClientId}`);
    return result;
  } catch (error) {
    console.error('Failed to update credit report client ID:', error);
    throw error;
  }
}

// Export functions using ESM format
export {
  getConnection,
  executeQuery,
  ensureCreditReportHistoryTable,
  saveCreditReport,
  updateCreditReportClientId
};
