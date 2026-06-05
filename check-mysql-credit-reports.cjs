/**
 * Debug script to check and populate the credit_report_history table in MySQL
 */

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db'
};

// Create a connection to the database
const connection = mysql.createConnection(dbConfig);

// Connect to MySQL
connection.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  
  // Run the checks
  checkAndPopulateTable();
});

// Check if credit_report_history table exists and has data
async function checkAndPopulateTable() {
  try {
    // Check if table exists
    const tableExists = await checkTableExists();
    
    if (!tableExists) {
      await createTable();
    }
    
    // Count rows in the table
    const rowCount = await countRows();
    console.log(`Table has ${rowCount} rows`);
    
    // If table is empty, insert sample data
    if (rowCount === 0) {
      await insertSampleData();
      console.log('Sample data inserted');
    }
    
    // Display all records
    await displayAllRecords();
    
    console.log('Debug script completed successfully');
    connection.end();
  } catch (error) {
    console.error('Error in checkAndPopulateTable:', error);
    connection.end();
  }
}

// Check if credit_report_history table exists
function checkTableExists() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name = ?
    `;
    
    connection.query(query, [dbConfig.database, 'credit_report_history'], (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      const exists = results[0].count > 0;
      console.log(`credit_report_history table exists: ${exists ? 'Yes' : 'No'}`);
      resolve(exists);
    });
  });
}

// Create credit_report_history table if it doesn't exist
function createTable() {
  return new Promise((resolve, reject) => {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS credit_report_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        platform VARCHAR(255) NOT NULL,
        report_path VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `;
    
    connection.query(createTableSql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('credit_report_history table created');
      resolve(true);
    });
  });
}

// Count rows in the credit_report_history table
function countRows() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT COUNT(*) as count FROM credit_report_history', (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results[0].count);
    });
  });
}

// Insert sample data into the credit_report_history table
function insertSampleData() {
  return new Promise((resolve, reject) => {
    // First get some client IDs
    connection.query('SELECT id FROM clients LIMIT 2', (err, clients) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (clients.length === 0) {
        console.log('No clients found in the database');
        resolve(false);
        return;
      }
      
      // Sample report data
      const sampleReport = {
        bureaus: {
          experian: {
            score: 650,
            accounts: {
              total: 5,
              negative: 1
            },
            inquiries: 2,
            publicRecords: 0
          }
        }
      };
      
      // Create sample report files
      const reportsDir = path.join(__dirname, 'server', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Insert multiple records
      const insertPromises = clients.flatMap(client => {
        const platforms = ['experian', 'equifax', 'transunion', 'myFreeScoreNow'];
        
        return platforms.map((platform, index) => {
          const reportPath = path.join(reportsDir, `client_${client.id}_${platform}_${Date.now()}.json`);
          const relativePath = path.relative(__dirname, reportPath).replace(/\\/g, '/');
          
          // Write sample report to file
          fs.writeFileSync(reportPath, JSON.stringify(sampleReport, null, 2));
          
          // Insert record into database
          return new Promise((resolveInsert, rejectInsert) => {
            const insertSql = `
              INSERT INTO credit_report_history 
              (client_id, platform, report_path, status) 
              VALUES (?, ?, ?, ?)
            `;
            
            connection.query(
              insertSql, 
              [client.id, platform, relativePath, 'completed'], 
              (insertErr) => {
                if (insertErr) {
                  rejectInsert(insertErr);
                  return;
                }
                resolveInsert(true);
              }
            );
          });
        });
      });
      
      Promise.all(insertPromises)
        .then(() => resolve(true))
        .catch(error => reject(error));
    });
  });
}

// Display all records in the credit_report_history table
function displayAllRecords() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT crh.*, c.first_name, c.last_name 
      FROM credit_report_history crh
      JOIN clients c ON crh.client_id = c.id
      ORDER BY crh.created_at DESC
    `;
    
    connection.query(query, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('=== Credit Report History Records ===');
      results.forEach(row => {
        console.log(`ID: ${row.id}, Client: ${row.first_name} ${row.last_name}, Platform: ${row.platform}, Path: ${row.report_path}`);
      });
      console.log('===================================');
      
      resolve(true);
    });
  });
}

// Handle process termination
process.on('exit', () => {
  if (connection) {
    connection.end();
    console.log('Database connection closed');
  }
});