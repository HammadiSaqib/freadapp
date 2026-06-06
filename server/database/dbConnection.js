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
import { syncGhlCreditScores } from '../services/ghlService.js';

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
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_report_history'`,
      [ENV_CONFIG.MYSQL_DATABASE]
    );
    const existing = new Set(columns.map(c => c.COLUMN_NAME));
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
    const result = await executeQuery(sql, params);
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
        let integrationRow = null;
        if (clientRow.integration_id) {
          const rows = await executeQuery(
            `SELECT * FROM admin_integrations WHERE id = ? AND admin_id = ? AND provider = 'ghl' AND is_active = 1 LIMIT 1`,
            [clientRow.integration_id, clientRow.user_id]
          );
          if (Array.isArray(rows) && rows.length > 0) {
            integrationRow = rows[0];
          }
        }
        if (!integrationRow) {
          const rows = await executeQuery(
            `SELECT * FROM admin_integrations WHERE admin_id = ? AND provider = 'ghl' AND is_active = 1 ORDER BY id DESC LIMIT 1`,
            [clientRow.user_id]
          );
          if (Array.isArray(rows) && rows.length > 0) {
            integrationRow = rows[0];
          }
        }
        if (integrationRow?.access_token) {
          const integrationId = integrationRow.id;
          const adminId = integrationRow.admin_id || clientRow.user_id;
          const payload = {
            integration: {
              accessToken: integrationRow.access_token,
              locationId: integrationRow.location_id || null,
              businessRecordId: integrationRow.business_record_id || null,
              outboundUrl: integrationRow.outbound_url || null,
              customFieldCreditScore: integrationRow.custom_field_credit_score || null,
              customFieldExperianScore: integrationRow.custom_field_experian_score || null,
              customFieldEquifaxScore: integrationRow.custom_field_equifax_score || null,
              customFieldTransunionScore: integrationRow.custom_field_transunion_score || null,
              customFieldReportDate: integrationRow.custom_field_report_date || null
            },
            email: clientRow?.email || null,
            phone: clientRow?.phone || null,
            firstName: clientRow?.first_name || null,
            lastName: clientRow?.last_name || null,
            scores: {
              creditScore: data.credit_score ?? null,
              experianScore: data.experian_score ?? null,
              equifaxScore: data.equifax_score ?? null,
              transunionScore: data.transunion_score ?? null
            },
            reportDate: data.report_date ? new Date(data.report_date).toISOString().split('T')[0] : null
          };
          void syncGhlCreditScoresWithRetry({
            payload,
            integrationId,
            adminId,
            clientId: clientRow?.id || null
          }).catch(() => {});
        }
      }
    } catch (ghlError) {
      console.error('GHL sync failed:', ghlError);
    }
    return result;
  } catch (error) {
    console.error('Failed to save credit report history:', error);
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logIntegrationActivity({ integrationId, adminId, clientId, status, message }) {
  try {
    await executeQuery(
      `INSERT INTO integration_activity_logs (integration_id, admin_id, direction, event_type, status, message, client_id, created_at)
       VALUES (?, ?, 'outbound', 'score_synced', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [integrationId, adminId, status, message || null, clientId || null]
    );
  } catch {}
}

async function syncGhlCreditScoresWithRetry({ payload, integrationId, adminId, clientId }) {
  const backoffDelays = [5000, 30000, 120000];
  let lastError = null;
  for (let attempt = 0; attempt < backoffDelays.length + 1; attempt += 1) {
    try {
      await syncGhlCreditScores(payload);
      await logIntegrationActivity({
        integrationId,
        adminId,
        clientId,
        status: 'success',
        message: attempt > 0 ? 'Retry succeeded' : 'Report synced to GHL'
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < backoffDelays.length) {
        await sleep(backoffDelays[attempt]);
      }
    }
  }
  await logIntegrationActivity({
    integrationId,
    adminId,
    clientId,
    status: 'failed',
    message: lastError?.message || 'GHL sync failed'
  });
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
