const mysql = require('mysql2/promise');

async function createFundingRequestsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS funding_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      purpose ENUM('equipment', 'marketing', 'expansion', 'inventory', 'technology', 'training', 'other') NOT NULL,
      status ENUM('pending', 'approved', 'rejected', 'under_review') DEFAULT 'pending',
      priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
      requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_date TIMESTAMP NULL,
      reviewer_notes TEXT NULL,
      user_id INT NOT NULL,
      reviewer_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_priority (priority),
      INDEX idx_requested_date (requested_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  await connection.execute(createTableQuery);
  console.log('Funding requests table created successfully');
  
  await connection.end();
}

createFundingRequestsTable().catch(console.error);