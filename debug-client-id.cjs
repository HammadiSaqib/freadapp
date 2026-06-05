const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/creditrepair.db');

console.log('🔍 Debugging client ID issue...');

// Check what user is logged in and what clients exist
db.all('SELECT id, email, role FROM users ORDER BY id', (err, users) => {
  if (err) {
    console.error('Error fetching users:', err);
    return;
  }
  
  console.log('\n👥 All users in database:');
  users.forEach((user, i) => {
    console.log(`${i+1}. ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
  });
  
  // Check clients and their user associations
  db.all('SELECT id, first_name, last_name, email, user_id FROM clients ORDER BY id', (err, clients) => {
    if (err) {
      console.error('Error fetching clients:', err);
      return;
    }
    
    console.log('\n👤 All clients in database:');
    clients.forEach((client, i) => {
      console.log(`${i+1}. ID: ${client.id}, Name: ${client.first_name} ${client.last_name}, Email: ${client.email}, User ID: ${client.user_id}`);
    });
    
    // Check credit report history
    db.all(`
      SELECT crh.id, crh.client_id, crh.platform, crh.status, c.first_name, c.last_name, c.user_id
      FROM credit_report_history crh
      LEFT JOIN clients c ON crh.client_id = c.id
      ORDER BY crh.id
    `, (err, reports) => {
      if (err) {
        console.error('Error fetching reports:', err);
        return;
      }
      
      console.log('\n📊 Credit report history:');
      reports.forEach((report, i) => {
        console.log(`${i+1}. Report ID: ${report.id}, Client ID: ${report.client_id}, Name: ${report.first_name} ${report.last_name}, User ID: ${report.user_id}, Platform: ${report.platform}, Status: ${report.status}`);
      });
      
      db.close();
    });
  });
});