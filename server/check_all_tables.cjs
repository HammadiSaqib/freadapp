const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'creditrepair.db');
const db = new sqlite3.Database(dbPath);

// Check all tables
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    db.close();
    return;
  }
  
  console.log('All available tables:');
  tables.forEach(table => {
    console.log('- ' + table.name);
  });
  
  // Look for any table that might contain plans
  const planTables = tables.filter(t => 
    t.name.toLowerCase().includes('plan') || 
    t.name.toLowerCase().includes('subscription') ||
    t.name.toLowerCase().includes('billing')
  );
  
  console.log('\nPlan-related tables:', planTables.map(t => t.name));
  
  // Check if this is using MySQL instead
  if (tables.length === 0) {
    console.log('\nNo tables found in SQLite database. This might be using MySQL.');
  }
  
  db.close();
});