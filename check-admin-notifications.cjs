const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'creditrepair.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

console.log('Checking admin_notifications table...');

// Check if table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_notifications'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
    db.close();
    return;
  }
  
  if (!row) {
    console.log('❌ admin_notifications table does not exist');
    
    // Check what tables do exist
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('Error listing tables:', err);
      } else {
        console.log('Available tables:');
        tables.forEach(table => console.log('  -', table.name));
      }
      db.close();
    });
    return;
  }
  
  console.log('✅ admin_notifications table exists');
  
  // Get table schema
  db.all('PRAGMA table_info(admin_notifications)', (err, columns) => {
    if (err) {
      console.error('Error getting table info:', err);
      db.close();
      return;
    }
    
    console.log('\nTable schema:');
    columns.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
    });
    
    // Check if there are any records
    db.get('SELECT COUNT(*) as count FROM admin_notifications', (err, result) => {
      if (err) {
        console.error('Error counting records:', err);
      } else {
        console.log(`\nRecords in table: ${result.count}`);
        
        // Show sample records if any exist
        if (result.count > 0) {
          db.all('SELECT * FROM admin_notifications LIMIT 3', (err, records) => {
            if (err) {
              console.error('Error fetching sample records:', err);
            } else {
              console.log('\nSample records:');
              records.forEach((record, index) => {
                console.log(`Record ${index + 1}:`, JSON.stringify(record, null, 2));
              });
            }
            db.close();
          });
        } else {
          db.close();
        }
      }
    });
  });
});