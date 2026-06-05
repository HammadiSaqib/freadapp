/**
 * Debug script to check and populate the credit_report_history table
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Connect to the database
const db = new sqlite3.Database('./data/creditrepair.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Check if credit_report_history table exists
function checkTableExists() {
  return new Promise((resolve, reject) => {
    db.get("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='credit_report_history'", [], (err, result) => {
      if (err) {
        console.error('Error checking table existence:', err);
        reject(err);
        return;
      }
      
      const exists = result && result.count > 0;
      console.log('credit_report_history table exists:', exists ? 'Yes' : 'No');
      resolve(exists);
    });
  });
}

// Create credit_report_history table if it doesn't exist
function createTable() {
  return new Promise((resolve, reject) => {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS credit_report_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        report_path TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `;
    
    db.run(createTableSql, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        reject(err);
        return;
      }
      console.log('Table created or already exists');
      resolve();
    });
  });
}

// Count rows in the table
function countRows() {
  return new Promise((resolve, reject) => {
    db.get("SELECT count(*) as count FROM credit_report_history", [], (err, result) => {
      if (err) {
        console.error('Error counting rows:', err);
        reject(err);
        return;
      }
      console.log('Total rows in credit_report_history:', result ? result.count : 'unknown');
      resolve(result ? result.count : 0);
    });
  });
}

// Get all clients
function getClients() {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, first_name, last_name FROM clients LIMIT 10", [], (err, rows) => {
      if (err) {
        console.error('Error getting clients:', err);
        reject(err);
        return;
      }
      console.log(`Found ${rows.length} clients`);
      resolve(rows);
    });
  });
}

// Insert sample data
function insertSampleData(clients) {
  if (!clients || clients.length === 0) {
    console.log('No clients found to add sample data');
    return Promise.resolve();
  }
  
  // Create sample report directory if it doesn't exist
  const sampleReportDir = path.join(__dirname, 'sample-reports');
  if (!fs.existsSync(sampleReportDir)) {
    fs.mkdirSync(sampleReportDir, { recursive: true });
  }
  
  // Create a sample report file
  const sampleReportPath = path.join(sampleReportDir, 'sample_report.json');
  const sampleReportData = {
    reportData: {
      Score: [
        {
          Score: "720",
          BureauId: 1
        }
      ],
      Accounts: [
        {
          AccountName: "Sample Credit Card",
          AccountType: "Credit Card",
          Balance: 1500,
          Status: "Current"
        }
      ]
    },
    clientInfo: {
      firstName: "Sample",
      lastName: "Client"
    }
  };
  
  fs.writeFileSync(sampleReportPath, JSON.stringify(sampleReportData, null, 2));
  console.log(`Created sample report at ${sampleReportPath}`);
  
  // Insert sample data for each client
  const platforms = ['experian', 'transunion', 'equifax', 'myfreescore'];
  const promises = clients.map((client, index) => {
    return new Promise((resolve, reject) => {
      const platform = platforms[index % platforms.length];
      const reportPath = sampleReportPath;
      
      const insertSql = `
        INSERT INTO credit_report_history 
        (client_id, platform, report_path, status) 
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(insertSql, [client.id, platform, reportPath, 'completed'], function(err) {
        if (err) {
          console.error(`Error inserting sample data for client ${client.id}:`, err);
          reject(err);
          return;
        }
        console.log(`Inserted sample data for client ${client.id}, ID: ${this.lastID}`);
        resolve();
      });
    });
  });
  
  return Promise.all(promises);
}

// Show all records
function showAllRecords() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM credit_report_history", [], (err, rows) => {
      if (err) {
        console.error('Error getting records:', err);
        reject(err);
        return;
      }
      console.log('All records in credit_report_history:');
      console.log(JSON.stringify(rows, null, 2));
      resolve(rows);
    });
  });
}

// Main function
async function main() {
  try {
    const tableExists = await checkTableExists();
    
    if (!tableExists) {
      await createTable();
    }
    
    const rowCount = await countRows();
    
    if (rowCount === 0) {
      console.log('No data found in credit_report_history table. Adding sample data...');
      const clients = await getClients();
      await insertSampleData(clients);
    }
    
    await showAllRecords();
    
    console.log('Debug script completed successfully');
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Run the main function
main();