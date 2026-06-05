const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'creditrepair.db');

async function checkClientCredentials() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    // Check clients table structure and data
    db.all(`PRAGMA table_info(clients)`, (err, columns) => {
      if (err) {
        console.error('❌ Error getting table info:', err);
        reject(err);
        return;
      }
      
      console.log('\n📋 Clients table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
    });

    // Get all clients with their credentials
    db.all(`SELECT id, first_name, last_name, email, status, user_id FROM clients`, (err, clients) => {
      if (err) {
        console.error('❌ Error querying clients:', err);
        reject(err);
        return;
      }

      console.log('\n👥 Client credentials:');
      console.log(`Found ${clients.length} clients:`);
      
      clients.forEach(client => {
        console.log(`\n  Client ID: ${client.id}`);
        console.log(`  Name: ${client.first_name} ${client.last_name}`);
        console.log(`  Email: ${client.email}`);
        console.log(`  User ID: ${client.user_id}`);
        console.log(`  Status: ${client.status}`);
      });

      db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
          reject(err);
        } else {
          console.log('\n✅ Database connection closed');
          resolve();
        }
      });
    });
  });
}

checkClientCredentials().catch(console.error);