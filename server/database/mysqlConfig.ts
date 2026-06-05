import * as mysql from 'mysql2/promise';
import { ENV_CONFIG } from '../config/environment.js';
import { SecurityLogger } from '../utils/securityLogger.js';

// MySQL connection configuration for XAMPP
export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  charset: string;
  timezone: string;
  ssl?: mysql.SslOptions | string | boolean;
}

// Default XAMPP MySQL configuration
const DEFAULT_MYSQL_CONFIG: MySQLConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'creditrepair_db',
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
  acquireTimeout: parseInt(process.env.MYSQL_ACQUIRE_TIMEOUT || '60000', 10),
  timeout: parseInt(process.env.MYSQL_TIMEOUT || '60000', 10),
  reconnect: true,
  charset: 'utf8mb4',
  timezone: '+00:00',
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: false // For self-signed certificates in development
  } : false
};

// Connection pool
let pool: mysql.Pool | null = null;
const securityLogger = new SecurityLogger();

// Initialize MySQL connection pool
export async function initializeMySQLPool(config: Partial<MySQLConfig> = {}): Promise<mysql.Pool> {
  try {
    const finalConfig = { ...DEFAULT_MYSQL_CONFIG, ...config };
    
    // Validate configuration
    validateMySQLConfig(finalConfig);
    
    // Create connection pool
    pool = mysql.createPool({
      host: finalConfig.host,
      port: finalConfig.port,
      user: finalConfig.user,
      password: finalConfig.password,
      database: finalConfig.database,
      waitForConnections: true,
      connectionLimit: finalConfig.connectionLimit,
      queueLimit: 0,
      // acquireTimeout: finalConfig.acquireTimeout, // Remove this as it's not a valid PoolOptions property
      // timeout: finalConfig.timeout, // Remove this as it's not a valid PoolOptions property
      // reconnect: finalConfig.reconnect, // Remove this as it's not a valid PoolOptions property
      charset: finalConfig.charset,
      timezone: finalConfig.timezone,
      ssl: finalConfig.ssl === true ? { rejectUnauthorized: false } : (typeof finalConfig.ssl === 'object' ? finalConfig.ssl : undefined),
      // Additional MySQL-specific options
      multipleStatements: false, // Security: prevent multiple statements
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
      // Connection management
      idleTimeout: 300000, // 5 minutes
      maxIdle: 5,
      // Error handling
      typeCast: function (field: any, next: () => any) {
        if (field.type === 'TINY' && field.length === 1) {
          return (field.string() === '1'); // Convert TINYINT(1) to boolean
        }
        return next();
      }
    });
    
    // Test connection
    await testConnection();
    
    // Log successful connection
    await securityLogger.logSecurityEvent({
      level: 2, // INFO
      eventType: 'DATA_ACCESS' as any,
      ip: 'system',
      userAgent: 'database',
      message: `MySQL connection pool initialized successfully`,
      metadata: {
        host: finalConfig.host,
        port: finalConfig.port,
        database: finalConfig.database,
        connectionLimit: finalConfig.connectionLimit
      }
    });
    
    console.log('✅ MySQL connection pool initialized successfully');
    console.log(`📊 Database: ${finalConfig.database} on ${finalConfig.host}:${finalConfig.port}`);
    console.log(`🔗 Connection limit: ${finalConfig.connectionLimit}`);
    
    return pool;
    
  } catch (error) {
    await securityLogger.logSecurityEvent({
      level: 0, // ERROR
      eventType: 'SECURITY_VIOLATION' as any,
      ip: 'system',
      userAgent: 'database',
      message: `Failed to initialize MySQL connection pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error: error instanceof Error ? error.stack : String(error) }
    });
    
    console.error('❌ Failed to initialize MySQL connection pool:', error);
    throw error;
  }
}

// Validate MySQL configuration
function validateMySQLConfig(config: MySQLConfig): void {
  const errors: string[] = [];
  
  if (!config.host) errors.push('Host is required');
  if (!config.user) errors.push('User is required');
  if (!config.database) errors.push('Database name is required');
  if (config.port < 1 || config.port > 65535) errors.push('Port must be between 1 and 65535');
  if (config.connectionLimit < 1) errors.push('Connection limit must be positive');
  
  if (errors.length > 0) {
    throw new Error(`MySQL configuration validation failed: ${errors.join(', ')}`);
  }
}

// Test database connection
export async function testConnection(): Promise<void> {
  if (!pool) {
    throw new Error('MySQL pool not initialized');
  }
  
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL connection test successful');
  } catch (error) {
    console.error('❌ MySQL connection test failed:', error);
    throw error;
  }
}

// Get connection pool
export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    throw new Error('MySQL pool not initialized. Call initializeMySQLPool() first.');
  }
  return pool;
}

// Execute query with connection management
export async function executeQuery<T = any>(
  sql: string, 
  params: any[] = [],
  options: { timeout?: number } = {}
): Promise<T> {
  const connection = await getMySQLPool().getConnection();
  
  try {
    const startTime = Date.now();
    const useParams: any = params ?? [];
    if (!Array.isArray(params)) {
      console.log('⚠️ MySQL executeQuery non-array params, defaulting to []', { sqlSnippet: sql.substring(0, 120) });
    }
    const paramCount = Array.isArray(useParams) ? useParams.length : 0;
    console.log('🧭 MySQL executeQuery', { paramCount, sqlSnippet: sql.substring(0, 120) });
    const [rows] = Array.isArray(useParams)
      ? await connection.query(sql, useParams)
      : await connection.query(sql);
    const results: any = rows;
    const executionTime = Date.now() - startTime;
    
    // Log slow queries
    if (executionTime > 1000) {
      await securityLogger.logSecurityEvent({
        level: 1, // WARN
        eventType: 'SUSPICIOUS_ACTIVITY' as any,
        ip: 'system',
        userAgent: 'database',
        message: `Slow query detected: ${executionTime}ms`,
        metadata: {
          sql: sql.substring(0, 200),
          executionTime,
          paramCount: Array.isArray(useParams) ? useParams.length : (useParams ? Object.keys(useParams).length : 0)
        }
      });
    }
    
    return results as T;
  } finally {
    connection.release();
  }
}

// Execute transaction
export async function executeTransaction<T>(
  operations: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getMySQLPool().getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await operations(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Get single record
export async function getRecord<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T | null> {
  const results = await executeQuery<T[]>(sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

// Get multiple records
export async function getRecords<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T[]> {
  const results = await executeQuery<T[]>(sql, params);
  return Array.isArray(results) ? results : [];
}

// Insert record and return ID
export async function insertRecord(
  sql: string, 
  params: any[] = []
): Promise<number> {
  const result = await executeQuery<mysql.ResultSetHeader>(sql, params);
  return result.insertId;
}

// Update/Delete records and return affected rows
export async function updateRecord(
  sql: string, 
  params: any[] = []
): Promise<number> {
  const result = await executeQuery<mysql.ResultSetHeader>(sql, params);
  return result.affectedRows;
}

// Check if database exists
export async function checkDatabaseExists(databaseName: string): Promise<boolean> {
  try {
    const result = await executeQuery<any[]>(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [databaseName]
    );
    return result.length > 0;
  } catch (error) {
    return false;
  }
}

// Create database if it doesn't exist
export async function createDatabaseIfNotExists(databaseName: string): Promise<void> {
  try {
    const exists = await checkDatabaseExists(databaseName);
    if (!exists) {
      await executeQuery(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Database '${databaseName}' created successfully`);
    } else {
      console.log(`📊 Database '${databaseName}' already exists`);
    }
  } catch (error) {
    console.error(`❌ Failed to create database '${databaseName}':`, error);
    throw error;
  }
}

// Close connection pool
export async function closeMySQLPool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('✅ MySQL connection pool closed');
      
      await securityLogger.logSecurityEvent({
        level: 2, // INFO
        eventType: 'DATA_ACCESS' as any,
        ip: 'system',
        userAgent: 'database',
        message: 'MySQL connection pool closed successfully'
      });
    } catch (error) {
      console.error('❌ Error closing MySQL connection pool:', error);
      throw error;
    }
  }
}

// Health check for MySQL connection
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connected: boolean;
    poolSize: number;
    activeConnections: number;
    queuedConnections: number;
    error?: string;
  };
}> {
  try {
    if (!pool) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          poolSize: 0,
          activeConnections: 0,
          queuedConnections: 0,
          error: 'Pool not initialized'
        }
      };
    }
    
    // Test connection
    await testConnection();
    
    return {
      status: 'healthy',
      details: {
        connected: true,
        poolSize: (pool as any)._allConnections?.length || 0,
        activeConnections: (pool as any)._acquiringConnections?.length || 0,
        queuedConnections: (pool as any)._connectionQueue?.length || 0
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        poolSize: 0,
        activeConnections: 0,
        queuedConnections: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Export configuration for external use
export { DEFAULT_MYSQL_CONFIG };

// Alias for backward compatibility
export { getMySQLPool as getConnection };
export { closeMySQLPool as closeConnection };