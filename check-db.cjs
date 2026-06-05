const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/creditrepair.db');

console.log('🔍 Checking credit_report_history table...');
db.all('SELECT * FROM credit_report_history ORDER BY created_at DESC LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Found', rows.length, 'records in credit_report_history:');
  rows.forEach((row, i) => {
    console.log(`${i+1}. ID: ${row.id}, Client: ${row.client_id}, Platform: ${row.platform}, Status: ${row.status}, Path: ${row.report_path}, Created: ${row.created_at}`);
  });
  
  console.log('\n🔍 Checking clients table...');
  db.all('SELECT id, first_name, last_name, email, user_id FROM clients ORDER BY id DESC LIMIT 10', (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('Found', rows.length, 'clients:');
    rows.forEach((row, i) => {
      console.log(`${i+1}. ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, User ID: ${row.user_id}`);
    });
    
    db.close();
  });
});