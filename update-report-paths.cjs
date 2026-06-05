const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('./data/creditrepair.db');

// Get the current working directory
const currentDir = process.cwd();
const correctPath = path.join(currentDir, 'sample-reports', 'sample_report.json');

console.log('🔧 Updating report paths in credit_report_history table...');
console.log('Current directory:', currentDir);
console.log('Correct path should be:', correctPath);

// Check if the sample report file exists
if (!fs.existsSync(correctPath)) {
  console.error('❌ Sample report file does not exist at:', correctPath);
  process.exit(1);
}

// Update all report paths to the correct location
db.run(
  `UPDATE credit_report_history SET report_path = ?`,
  [correctPath],
  function(err) {
    if (err) {
      console.error('Error updating paths:', err);
      return;
    }
    console.log(`✅ Updated ${this.changes} records with correct path`);
    
    // Verify the update
    db.all('SELECT id, client_id, platform, report_path FROM credit_report_history LIMIT 5', (err, rows) => {
      if (err) {
        console.error('Error verifying update:', err);
        return;
      }
      console.log('\n📋 Verification - First 5 records:');
      rows.forEach((row, i) => {
        console.log(`${i+1}. ID: ${row.id}, Client: ${row.client_id}, Platform: ${row.platform}`);
        console.log(`   Path: ${row.report_path}`);
        console.log(`   File exists: ${fs.existsSync(row.report_path) ? '✅' : '❌'}`);
      });
      
      db.close();
    });
  }
);