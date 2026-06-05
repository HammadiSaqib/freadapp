import { initializeMySQLPool, executeQuery } from './server/database/mysqlConfig.ts';

async function run() {
  try {
    await initializeMySQLPool();
    console.log('Connected to MySQL. Updating cards.state length to CHAR(3)...');

    const alterSql = `ALTER TABLE cards MODIFY COLUMN state CHAR(3) NULL`;
    await executeQuery(alterSql);
    console.log('✅ cards.state column updated to CHAR(3)');

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update cards.state length:', err);
    process.exit(1);
  }
}

run();