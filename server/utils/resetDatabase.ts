import { join } from 'path';
import { unlink } from 'fs/promises';
import { initializeDatabaseAdapter } from '../database/databaseAdapter.js';
import { loadEnvironmentConfig } from '../config/environment.js';

export async function resetDatabase() {
  try {
    // Load environment configuration
    const config = loadEnvironmentConfig();
    
    // Determine database type
    const databaseType = process.env.DATABASE_TYPE || 'sqlite';
    
    if (databaseType === 'sqlite') {
      const dbPath = join(process.cwd(), 'data', 'creditrepair.db');
      
      // Remove existing database file
      try {
        await unlink(dbPath);
        console.log('Existing SQLite database removed');
      } catch (error) {
        console.log('No existing SQLite database to remove');
      }
    } else {
      console.log('MySQL database reset requires manual intervention');
      console.log('Please drop and recreate the database manually or use the migration script');
    }
    
    // Initialize fresh database
    await initializeDatabaseAdapter(databaseType, config);
    console.log(`Fresh ${databaseType} database initialized`);
    
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase().then(() => {
    console.log('Database reset complete');
    process.exit(0);
  }).catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  });
}
