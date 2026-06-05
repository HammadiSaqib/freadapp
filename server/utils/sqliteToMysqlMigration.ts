import sqlite3 from 'sqlite3';
import { join } from 'path';
import { 
  initializeMySQLDatabase, 
  executeTransaction, 
  executeQuery,
  getMySQLPool 
} from '../database/mysqlSchema.js';
import { SecurityLogger } from './securityLogger.js';
import { promises as fs } from 'fs';

interface MigrationResult {
  success: boolean;
  tablesProcessed: string[];
  recordsMigrated: { [tableName: string]: number };
  errors: string[];
  warnings: string[];
  duration: number;
}

interface TableMapping {
  sqliteTable: string;
  mysqlTable: string;
  columnMappings: { [sqliteColumn: string]: string };
  dataTransformations?: { [column: string]: (value: any) => any };
  skipColumns?: string[];
}

const securityLogger = new SecurityLogger();

// Table mappings for SQLite to MySQL migration
const TABLE_MAPPINGS: TableMapping[] = [
  {
    sqliteTable: 'users',
    mysqlTable: 'users',
    columnMappings: {
      'id': 'id',
      'email': 'email',
      'password_hash': 'password_hash',
      'first_name': 'first_name',
      'last_name': 'last_name',
      'company_name': 'company_name',
      'role': 'role',
      'status': 'status',
      'email_verified': 'email_verified',
      'failed_login_attempts': 'failed_login_attempts',
      'locked_until': 'locked_until',
      'last_login': 'last_login',
      'last_login_ip': 'last_login_ip',
      'last_login_user_agent': 'last_login_user_agent',
      'password_changed_at': 'password_changed_at',
      'account_type': 'account_type',
      'referred_by_user_id': 'referred_by_user_id',
      'referral_source': 'referral_source',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'created_by': 'created_by',
      'updated_by': 'updated_by'
    },
    dataTransformations: {
      'email_verified': (value: any) => value === 1 || value === true,
      'role': (value: any) => {
        // Map SQLite roles to MySQL ENUM values
        const roleMap: { [key: string]: string } = {
          'admin': 'admin',
          'manager': 'admin', // Map manager to admin
          'agent': 'user',    // Map agent to user
          'user': 'user'
        };
        return roleMap[value] || 'user';
      }
    }
  },
  {
    sqliteTable: 'clients',
    mysqlTable: 'clients',
    columnMappings: {
      'id': 'id',
      'user_id': 'user_id',
      'platform': 'platform',
      'platform_email': 'platform_email',
      'platform_password': 'platform_password',
      'first_name': 'first_name',
      'last_name': 'last_name',
      'email': 'email',
      'phone': 'phone',
      'date_of_birth': 'date_of_birth',
      'ssn_last4': 'ssn_last_four',
      'ssn_last_four': 'ssn_last_four',
      'address': 'address',
      'city': 'city',
      'state': 'state',
      'zip_code': 'zip_code',
      'status': 'status',
      'credit_score': 'credit_score',
      'target_score': 'target_score',
      'notes': 'notes',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'created_by': 'created_by',
      'updated_by': 'updated_by'
    },
    dataTransformations: {
      'created_by': (value: any) => value || 1, // Default to user ID 1 if null
      'updated_by': (value: any) => value || 1
    }
  },
  {
    sqliteTable: 'credit_reports',
    mysqlTable: 'credit_reports',
    columnMappings: {
      'id': 'id',
      'client_id': 'client_id',
      'bureau': 'bureau',
      'score': 'credit_score',
      'credit_score': 'credit_score',
      'report_date': 'report_date',
      'report_data': 'report_data',
      'status': 'status',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'created_by': 'created_by',
      'updated_by': 'updated_by'
    },
    dataTransformations: {
      'report_data': (value: any) => {
        if (typeof value === 'string') {
          try {
            JSON.parse(value); // Validate JSON
            return value;
          } catch {
            return JSON.stringify({ raw_data: value });
          }
        }
        return value ? JSON.stringify(value) : null;
      },
      'created_by': (value: any) => value || 1,
      'updated_by': (value: any) => value || 1
    }
  },
  {
    sqliteTable: 'disputes',
    mysqlTable: 'disputes',
    columnMappings: {
      'id': 'id',
      'client_id': 'client_id',
      'bureau': 'bureau',
      'account_name': 'account_name',
      'dispute_reason': 'dispute_reason',
      'status': 'status',
      'filed_date': 'filed_date',
      'response_date': 'response_date',
      'result': 'result',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'created_by': 'created_by',
      'updated_by': 'updated_by'
    },
    dataTransformations: {
      'created_by': (value: any) => value || 1,
      'updated_by': (value: any) => value || 1
    }
  },
  {
    sqliteTable: 'activities',
    mysqlTable: 'activities',
    columnMappings: {
      'id': 'id',
      'user_id': 'user_id',
      'client_id': 'client_id',
      'type': 'type',
      'description': 'description',
      'metadata': 'metadata',
      'created_at': 'created_at'
    },
    dataTransformations: {
      'metadata': (value: any) => {
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return value;
          } catch {
            return JSON.stringify({ raw_data: value });
          }
        }
        return value ? JSON.stringify(value) : null;
      }
    }
  },
  {
    sqliteTable: 'analytics',
    mysqlTable: 'analytics',
    columnMappings: {
      'id': 'id',
      'user_id': 'user_id',
      'metric_type': 'metric_type',
      'value': 'value',
      'period': 'period',
      'date': 'date',
      'created_at': 'created_at'
    }
  }
];

export class SQLiteToMySQLMigrator {
  private sqliteDb: sqlite3.Database | null = null;
  private migrationResult: MigrationResult;

  constructor() {
    this.migrationResult = {
      success: false,
      tablesProcessed: [],
      recordsMigrated: {},
      errors: [],
      warnings: [],
      duration: 0
    };
  }

  // Initialize SQLite connection
  private async initializeSQLiteConnection(dbPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to SQLite database: ${err.message}`));
        } else {
          console.log('✅ Connected to SQLite database for migration');
          resolve();
        }
      });
    });
  }

  // Get SQLite data
  private async getSQLiteData(tableName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.sqliteDb) {
        reject(new Error('SQLite database not initialized'));
        return;
      }

      this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // Check if SQLite table exists
  private async sqliteTableExists(tableName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.sqliteDb) {
        reject(new Error('SQLite database not initialized'));
        return;
      }

      this.sqliteDb.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }

  // Transform data according to mapping rules
  private transformData(data: any[], mapping: TableMapping): any[] {
    return data.map(row => {
      const transformedRow: any = {};
      
      // Map columns
      for (const [sqliteCol, mysqlCol] of Object.entries(mapping.columnMappings)) {
        if (row.hasOwnProperty(sqliteCol)) {
          let value = row[sqliteCol];
          
          // Apply data transformations
          if (mapping.dataTransformations && mapping.dataTransformations[sqliteCol]) {
            try {
              value = mapping.dataTransformations[sqliteCol](value);
            } catch (error) {
              this.migrationResult.warnings.push(
                `Failed to transform ${sqliteCol} in ${mapping.sqliteTable}: ${error}`
              );
            }
          }
          
          transformedRow[mysqlCol] = value;
        }
      }
      
      return transformedRow;
    });
  }

  // Migrate single table
  private async migrateTable(mapping: TableMapping): Promise<number> {
    try {
      console.log(`📋 Migrating table: ${mapping.sqliteTable} -> ${mapping.mysqlTable}`);
      
      // Check if SQLite table exists
      const tableExists = await this.sqliteTableExists(mapping.sqliteTable);
      if (!tableExists) {
        this.migrationResult.warnings.push(`SQLite table '${mapping.sqliteTable}' does not exist, skipping`);
        return 0;
      }
      
      // Get data from SQLite
      const sqliteData = await this.getSQLiteData(mapping.sqliteTable);
      
      if (sqliteData.length === 0) {
        console.log(`⚠️  No data found in ${mapping.sqliteTable}`);
        return 0;
      }
      
      // Transform data
      const transformedData = this.transformData(sqliteData, mapping);
      
      // Clear existing data in MySQL table (optional - can be configured)
      await executeQuery(`DELETE FROM ${mapping.mysqlTable}`);
      
      // Insert data into MySQL
      let insertedCount = 0;
      
      await executeTransaction(async (connection) => {
        for (const row of transformedData) {
          const columns = Object.keys(row).filter(col => row[col] !== undefined);
          const values = columns.map(col => row[col]);
          const placeholders = columns.map(() => '?').join(', ');
          
          const sql = `INSERT INTO ${mapping.mysqlTable} (${columns.join(', ')}) VALUES (${placeholders})`;
          
          try {
            await connection.execute(sql, values);
            insertedCount++;
          } catch (error) {
            this.migrationResult.errors.push(
              `Failed to insert record into ${mapping.mysqlTable}: ${error}`
            );
          }
        }
      });
      
      console.log(`✅ Migrated ${insertedCount}/${sqliteData.length} records from ${mapping.sqliteTable}`);
      return insertedCount;
      
    } catch (error) {
      const errorMsg = `Failed to migrate table ${mapping.sqliteTable}: ${error}`;
      this.migrationResult.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return 0;
    }
  }

  // Main migration method
  public async migrate(sqliteDbPath?: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting SQLite to MySQL migration...');
      
      await securityLogger.logSecurityEvent({
        type: 'DATABASE_MIGRATION_STARTED',
        message: 'SQLite to MySQL migration started',
        metadata: { sqliteDbPath }
      });
      
      // Determine SQLite database path
      const dbPath = sqliteDbPath || 
                    process.env.DATABASE_PATH || 
                    join(process.cwd(), 'data', 'creditrepair.db') ||
                    './database.sqlite';
      
      // Check if SQLite database exists
      try {
        await fs.access(dbPath);
      } catch {
        throw new Error(`SQLite database not found at: ${dbPath}`);
      }
      
      // Initialize connections
      await this.initializeSQLiteConnection(dbPath);
      await initializeMySQLDatabase();
      
      // Migrate tables in dependency order
      const migrationOrder = ['users', 'clients', 'credit_reports', 'disputes', 'activities', 'analytics'];
      
      for (const tableName of migrationOrder) {
        const mapping = TABLE_MAPPINGS.find(m => m.sqliteTable === tableName);
        if (mapping) {
          const recordCount = await this.migrateTable(mapping);
          this.migrationResult.tablesProcessed.push(tableName);
          this.migrationResult.recordsMigrated[tableName] = recordCount;
        }
      }
      
      // Close SQLite connection
      if (this.sqliteDb) {
        this.sqliteDb.close();
      }
      
      this.migrationResult.duration = Date.now() - startTime;
      this.migrationResult.success = this.migrationResult.errors.length === 0;
      
      // Log migration completion
      await securityLogger.logSecurityEvent({
        type: this.migrationResult.success ? 'DATABASE_MIGRATION_SUCCESS' : 'DATABASE_MIGRATION_PARTIAL',
        message: `SQLite to MySQL migration completed`,
        metadata: {
          tablesProcessed: this.migrationResult.tablesProcessed.length,
          totalRecords: Object.values(this.migrationResult.recordsMigrated).reduce((a, b) => a + b, 0),
          errors: this.migrationResult.errors.length,
          warnings: this.migrationResult.warnings.length,
          duration: this.migrationResult.duration
        }
      });
      
      console.log('\n📊 Migration Summary:');
      console.log(`✅ Tables processed: ${this.migrationResult.tablesProcessed.length}`);
      console.log(`📝 Total records migrated: ${Object.values(this.migrationResult.recordsMigrated).reduce((a, b) => a + b, 0)}`);
      console.log(`⚠️  Warnings: ${this.migrationResult.warnings.length}`);
      console.log(`❌ Errors: ${this.migrationResult.errors.length}`);
      console.log(`⏱️  Duration: ${this.migrationResult.duration}ms`);
      
      if (this.migrationResult.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        this.migrationResult.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
      
      if (this.migrationResult.errors.length > 0) {
        console.log('\n❌ Errors:');
        this.migrationResult.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      return this.migrationResult;
      
    } catch (error) {
      this.migrationResult.duration = Date.now() - startTime;
      this.migrationResult.success = false;
      this.migrationResult.errors.push(`Migration failed: ${error}`);
      
      await securityLogger.logSecurityEvent({
        type: 'DATABASE_MIGRATION_FAILURE',
        message: `SQLite to MySQL migration failed: ${error}`,
        metadata: { error: error instanceof Error ? error.stack : String(error) }
      });
      
      console.error('❌ Migration failed:', error);
      return this.migrationResult;
    }
  }

  // Analyze migration before execution
  public async analyzeMigration(): Promise<{
    totalTables: number;
    totalRecords: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let totalRecords = 0;
    
    try {
      if (!this.sqliteDb) {
        throw new Error('SQLite database not initialized');
      }
      
      for (const mapping of TABLE_MAPPINGS) {
        try {
          // Check if table exists
          const tableExists = await this.sqliteTableExists(mapping.sqliteTable);
          if (!tableExists) {
            warnings.push(`SQLite table '${mapping.sqliteTable}' does not exist`);
            continue;
          }
          
          // Count records in SQLite table
          const data = await this.getSQLiteData(mapping.sqliteTable);
          totalRecords += data.length;
          
          // Check for potential data transformation issues
          if (mapping.dataTransformations) {
            for (const column of Object.keys(mapping.dataTransformations)) {
              warnings.push(`Table ${mapping.sqliteTable}: Column ${column} will be transformed`);
            }
          }
          
        } catch (error) {
          warnings.push(`Unable to analyze table ${mapping.sqliteTable}: ${error}`);
        }
      }
      
      return {
        totalTables: TABLE_MAPPINGS.length,
        totalRecords,
        warnings
      };
      
    } catch (error) {
      throw new Error(`Migration analysis failed: ${error}`);
    }
  }

  // Validate migration results
  public async validateMigration(): Promise<{
    isValid: boolean;
    issues: string[];
    tableCounts: { [tableName: string]: { sqlite: number; mysql: number } };
  }> {
    const issues: string[] = [];
    const tableCounts: { [tableName: string]: { sqlite: number; mysql: number } } = {};
    
    try {
      for (const mapping of TABLE_MAPPINGS) {
        // Get MySQL count
        const [mysqlResult] = await executeQuery<any[]>(
          `SELECT COUNT(*) as count FROM ${mapping.mysqlTable}`
        );
        const mysqlCount = mysqlResult?.count || 0;
        
        tableCounts[mapping.sqliteTable] = {
          sqlite: this.migrationResult.recordsMigrated[mapping.sqliteTable] || 0,
          mysql: mysqlCount
        };
        
        // Check if counts match
        if (tableCounts[mapping.sqliteTable].sqlite !== mysqlCount) {
          issues.push(
            `Record count mismatch for ${mapping.sqliteTable}: ` +
            `SQLite=${tableCounts[mapping.sqliteTable].sqlite}, MySQL=${mysqlCount}`
          );
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        tableCounts
      };
      
    } catch (error) {
      issues.push(`Validation failed: ${error}`);
      return {
        isValid: false,
        issues,
        tableCounts
      };
    }
  }
}

// Convenience function to run migration
export async function migrateSQLiteToMySQL(sqliteDbPath?: string): Promise<MigrationResult> {
  const migrator = new SQLiteToMySQLMigrator();
  return await migrator.migrate(sqliteDbPath);
}

// Export migration result interface
export type { MigrationResult };
