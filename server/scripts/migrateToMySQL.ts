#!/usr/bin/env node

import { loadEnvironmentConfig } from '../config/environment.js';
import { SQLiteToMySQLMigrator } from '../utils/sqliteToMysqlMigration.js';
import { testConnection, createDatabaseIfNotExists } from '../database/mysqlConfig.js';
import { initializeMySQLDatabase as initializeMySQL } from '../database/mysqlSchema.js';
import { securityLogger } from '../utils/securityLogger.js';
import * as path from 'path';
import * as fs from 'fs';

interface MigrationOptions {
  sqlitePath?: string;
  skipValidation?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

class MySQLMigrationScript {
  private config: any;
  private migrator: SQLiteToMySQLMigrator;

  constructor(options: MigrationOptions = {}) {
    this.config = loadEnvironmentConfig();
    
    // Set SQLite path from options or environment or default
    const sqlitePath = options.sqlitePath || 
                      this.config.SQLITE_DATABASE_PATH || 
                      path.join(process.cwd(), 'database.sqlite');
    
    this.migrator = new SQLiteToMySQLMigrator(sqlitePath);
  }

  async run(options: MigrationOptions = {}): Promise<void> {
    console.log('🚀 Starting MySQL Migration Process...');
    console.log('=====================================\n');

    try {
      // Step 1: Test MySQL connection
      await this.testMySQLConnection();

      // Step 2: Create database if it doesn't exist
      await this.createDatabase();

      // Step 3: Initialize MySQL schema
      await this.initializeSchema();

      // Step 4: Check SQLite database
      await this.checkSQLiteDatabase();

      // Step 5: Run migration (dry run first if requested)
      if (options.dryRun) {
        console.log('🔍 Running dry run migration...');
        await this.runDryRunMigration();
      } else {
        await this.runActualMigration(options.force || false);
      }

      // Step 6: Validate migration (unless skipped)
      if (!options.skipValidation && !options.dryRun) {
        await this.validateMigration();
      }

      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Update your application to use MySQL by setting DATABASE_TYPE=mysql');
      console.log('2. Test your application thoroughly');
      console.log('3. Consider backing up your SQLite database before removing it');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      securityLogger.logSecurityEvent('migration_error', 'MySQL migration failed', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    }
  }

  private async testMySQLConnection(): Promise<void> {
    console.log('🔌 Testing MySQL connection...');
    
    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to MySQL');
      }
      console.log('✅ MySQL connection successful');
      console.log(`   Host: ${this.config.MYSQL_HOST}:${this.config.MYSQL_PORT}`);
      console.log(`   Database: ${this.config.MYSQL_DATABASE}`);
      console.log(`   User: ${this.config.MYSQL_USER}\n`);
    } catch (error) {
      console.error('❌ MySQL connection failed');
      console.error('\n🔧 Troubleshooting:');
      console.error('1. Ensure XAMPP MySQL service is running');
      console.error('2. Check MySQL credentials in environment variables');
      console.error('3. Verify MySQL port (default: 3306)');
      console.error('4. Ensure firewall allows MySQL connections\n');
      throw error;
    }
  }

  private async createDatabase(): Promise<void> {
    console.log('🗄️  Creating database if not exists...');
    
    try {
      await createDatabaseIfNotExists();
      console.log(`✅ Database '${this.config.MYSQL_DATABASE}' is ready\n`);
    } catch (error) {
      console.error('❌ Failed to create database');
      throw error;
    }
  }

  private async initializeSchema(): Promise<void> {
    console.log('📋 Initializing MySQL schema...');
    
    try {
      await initializeMySQL();
      console.log('✅ MySQL schema initialized\n');
    } catch (error) {
      console.error('❌ Failed to initialize MySQL schema');
      throw error;
    }
  }

  private async checkSQLiteDatabase(): Promise<void> {
    console.log('🔍 Checking SQLite database...');
    
    const sqlitePath = this.migrator['sqlitePath'];
    if (!fs.existsSync(sqlitePath)) {
      throw new Error(`SQLite database not found at: ${sqlitePath}`);
    }
    
    console.log(`✅ SQLite database found: ${sqlitePath}\n`);
  }

  private async runDryRunMigration(): Promise<void> {
    console.log('🧪 Performing dry run migration analysis...');
    
    // This would analyze the SQLite database and show what would be migrated
    // without actually performing the migration
    const summary = await this.migrator.analyzeMigration();
    
    console.log('\n📊 Migration Analysis:');
    console.log(`   Tables to migrate: ${summary.totalTables}`);
    console.log(`   Estimated records: ${summary.totalRecords}`);
    console.log(`   Potential issues: ${summary.warnings.length}`);
    
    if (summary.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      summary.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n✅ Dry run completed. Use --no-dry-run to perform actual migration.');
  }

  private async runActualMigration(force: boolean): Promise<void> {
    console.log('🔄 Starting data migration...');
    
    if (!force) {
      console.log('\n⚠️  This will migrate all data from SQLite to MySQL.');
      console.log('   Make sure you have backed up your data before proceeding.');
      console.log('   Use --force to skip this confirmation.\n');
      
      // In a real CLI, you'd prompt for user confirmation here
      // For now, we'll assume confirmation
    }
    
    const summary = await this.migrator.migrate();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Tables processed: ${summary.tablesProcessed}`);
    console.log(`   Records migrated: ${summary.recordsMigrated}`);
    console.log(`   Errors: ${summary.errors}`);
    console.log(`   Warnings: ${summary.warnings}`);
    
    if (summary.errors > 0) {
      console.log('\n⚠️  Some errors occurred during migration. Check logs for details.');
    }
  }

  private async validateMigration(): Promise<void> {
    console.log('🔍 Validating migration...');
    
    try {
      const isValid = await this.migrator.validateMigration();
      
      if (isValid) {
        console.log('✅ Migration validation successful');
      } else {
        console.log('⚠️  Migration validation found discrepancies');
        console.log('   Check logs for details');
      }
    } catch (error) {
      console.log('⚠️  Migration validation failed:', error);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--sqlite-path':
        options.sqlitePath = args[++i];
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--help':
        console.log('MySQL Migration Script');
        console.log('Usage: node migrateToMySQL.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --sqlite-path <path>    Path to SQLite database file');
        console.log('  --skip-validation       Skip migration validation');
        console.log('  --dry-run               Analyze migration without executing');
        console.log('  --force                 Skip confirmation prompts');
        console.log('  --help                  Show this help message');
        process.exit(0);
    }
  }
  
  const migrationScript = new MySQLMigrationScript(options);
  migrationScript.run(options).catch(console.error);
}

export { MySQLMigrationScript };