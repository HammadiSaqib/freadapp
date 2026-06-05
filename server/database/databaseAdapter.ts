import { EnvironmentConfig } from '../config/environment.js';
import { initializeDatabase as initializeSQLite, runQuery as runSQLiteQuery, getQuery as getSQLiteQuery, allQuery as allSQLiteQuery } from './schema.js';
import { executeQuery, getConnection, closeConnection } from './mysqlConfig.js';
import { initializeMySQLDatabase as initializeMySQL } from './mysqlSchema.js';
import { securityLogger } from '../utils/securityLogger.js';

export type DatabaseType = 'sqlite' | 'mysql';

export interface DatabaseAdapter {
  initialize(): Promise<void>;
  executeQuery(query: string, params?: any[]): Promise<any>;
  getQuery(query: string, params?: any[]): Promise<any>;
  allQuery(query: string, params?: any[]): Promise<any[]>;
  close(): Promise<void>;
  getType(): DatabaseType;
}

class SQLiteAdapter implements DatabaseAdapter {
  private db: any;

  async initialize(): Promise<void> {
    this.db = await initializeSQLite();
    securityLogger.logSecurityEvent({
      level: 2, // INFO
      eventType: 'DATA_ACCESS' as any,
      ip: 'system',
      userAgent: 'database',
      message: 'SQLite adapter initialized',
      metadata: { adapter: 'sqlite' }
    });
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    return runSQLiteQuery(query, params);
  }

  async getQuery(query: string, params?: any[]): Promise<any> {
    return getSQLiteQuery(query, params);
  }

  async allQuery(query: string, params?: any[]): Promise<any[]> {
    return allSQLiteQuery(query, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      securityLogger.logSecurityEvent({
        level: 2, // INFO
        eventType: 'DATA_ACCESS' as any,
        ip: 'system',
        userAgent: 'database',
        message: 'SQLite connection closed',
        metadata: { adapter: 'sqlite' }
      });
    }
  }

  getType(): DatabaseType {
    return 'sqlite';
  }
}

class MySQLAdapter implements DatabaseAdapter {
  async initialize(): Promise<void> {
    await initializeMySQL();
    securityLogger.logSecurityEvent({
      level: 2, // INFO
      eventType: 'DATA_ACCESS' as any,
      ip: 'system',
      userAgent: 'database',
      message: 'MySQL adapter initialized',
      metadata: { adapter: 'mysql' }
    });
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    const safeParams = Array.isArray(params) ? params : [];
    return executeQuery(query, safeParams);
  }

  async getQuery(query: string, params?: any[]): Promise<any> {
    const safeParams = Array.isArray(params) ? params : [];
    const results = await executeQuery(query, safeParams);
    return Array.isArray(results) ? results[0] : results;
  }

  async allQuery(query: string, params?: any[]): Promise<any[]> {
    const safeParams = Array.isArray(params) ? params : [];
    const results = await executeQuery(query, safeParams);
    return Array.isArray(results) ? results : [results];
  }

  async close(): Promise<void> {
    await closeConnection();
    securityLogger.logSecurityEvent({
      level: 2, // INFO
      eventType: 'DATA_ACCESS' as any,
      ip: 'system',
      userAgent: 'database',
      message: 'MySQL connection closed',
      metadata: { adapter: 'mysql' }
    });
  }

  getType(): DatabaseType {
    return 'mysql';
  }
}

// Global database adapter instance
let databaseAdapter: DatabaseAdapter | null = null;

export function createDatabaseAdapter(config: EnvironmentConfig, type?: DatabaseType): DatabaseAdapter {
  // Force MySQL detection if DATABASE_URL contains mysql protocol
  const dbType = type || (config.DATABASE_URL?.startsWith('mysql://') ? 'mysql' : 'sqlite');
  
  if (dbType === 'mysql') {
    return new MySQLAdapter();
  } else {
    return new SQLiteAdapter();
  }
}

export async function initializeDatabaseAdapter(config: EnvironmentConfig, type?: DatabaseType): Promise<DatabaseAdapter> {
  if (databaseAdapter) {
    await databaseAdapter.close();
  }
  
  databaseAdapter = createDatabaseAdapter(config, type);
  
  // Display connection information
  const dbType = databaseAdapter.getType();
  console.log('\n=== DATABASE CONNECTION STATUS ===');
  console.log(`Database Type: ${dbType.toUpperCase()}`);
  
  try {
    await databaseAdapter.initialize();
    console.log(`Connection Status: ✅ SUCCESSFULLY CONNECTED`);
    if (dbType === 'mysql') {
      console.log(`MySQL Host: ${config.MYSQL_HOST}:${config.MYSQL_PORT}`);
      console.log(`MySQL Database: ${config.MYSQL_DATABASE}`);
    }
    console.log('==================================\n');
  } catch (error) {
    console.log(`Connection Status: ❌ CONNECTION FAILED`);
    console.log(`Error: ${error.message}`);
    console.log('==================================\n');
    throw error;
  }
  
  securityLogger.logSecurityEvent({
    level: 2, // INFO
    eventType: 'DATA_ACCESS' as any,
    ip: 'system',
    userAgent: 'database',
    message: 'Database adapter initialized',
    metadata: {
      type: databaseAdapter.getType(),
      timestamp: new Date().toISOString()
    }
  });
  
  return databaseAdapter;
}

export function getDatabaseAdapter(): DatabaseAdapter {
  if (!databaseAdapter) {
    throw new Error('Database adapter not initialized. Call initializeDatabaseAdapter first.');
  }
  return databaseAdapter;
}

export async function closeDatabaseAdapter(): Promise<void> {
  if (databaseAdapter) {
    await databaseAdapter.close();
    databaseAdapter = null;
    securityLogger.logSecurityEvent({
      level: 2, // INFO
      eventType: 'DATA_ACCESS' as any,
      ip: 'system',
      userAgent: 'database',
      message: 'Database adapter closed',
      metadata: {}
    });
  }
}

// Helper functions for backward compatibility
export async function runQuery(query: string, params?: any[]): Promise<any> {
  const adapter = getDatabaseAdapter();
  return adapter.executeQuery(query, params);
}

export async function getQuery(query: string, params?: any[]): Promise<any> {
  const adapter = getDatabaseAdapter();
  return adapter.getQuery(query, params);
}

export async function allQuery(query: string, params?: any[]): Promise<any[]> {
  const adapter = getDatabaseAdapter();
  return adapter.allQuery(query, params);
}

export type TransactionQuery = { sql: string; params?: any[] };

export async function runTransaction(queries: TransactionQuery[]): Promise<any[]> {
  if (!Array.isArray(queries) || queries.length === 0) return [];
  const adapter = getDatabaseAdapter();
  const results: any[] = [];
  try {
    await adapter.executeQuery('BEGIN');
    for (const q of queries) {
      const sql = q?.sql;
      if (!sql) continue;
      const res = await adapter.executeQuery(sql, Array.isArray(q.params) ? q.params : []);
      results.push(res);
    }
    await adapter.executeQuery('COMMIT');
    return results;
  } catch (error) {
    try {
      await adapter.executeQuery('ROLLBACK');
    } catch {}
    throw error;
  }
}

export async function logActivity(
  activityType: string,
  description: string,
  userId?: number,
  clientId?: number,
  disputeId?: number,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await runQuery(
      `INSERT INTO activities (user_id, client_id, dispute_id, activity_type, description, metadata, ip_address, user_agent, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        clientId ?? null,
        disputeId ?? null,
        activityType,
        description,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress ?? null,
        userAgent ?? null,
        userId ?? null,
      ]
    );
  } catch {}
}

export async function logAudit(
  tableName: string,
  recordId: number,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldValues?: any,
  newValues?: any,
  changedBy?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await runQuery(
      `INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tableName,
        recordId,
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        changedBy ?? null,
        ipAddress ?? null,
        userAgent ?? null,
      ]
    );
  } catch {}
}
