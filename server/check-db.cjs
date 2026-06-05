const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Checking database tables...');

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('Error getting tables:', err);
    db.close();
    return;
  }
  
  console.log('Tables found:', rows.map(r => r.name));
  
  if (rows.some(r => r.name === 'clients')) {
    db.all('SELECT COUNT(*) as count FROM clients', (err, countRows) => {
      if (err) {
        console.error('Error counting clients:', err);
      } else {
        console.log('Total clients:', countRows[0].count);
      }
      db.close();
    });
  } else {
    console.log('No clients table found');
    db.close();
  }
});