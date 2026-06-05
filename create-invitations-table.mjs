import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'creditrepair_db',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function createInvitationsTable() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Creating invitations table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'support') NOT NULL DEFAULT 'user',
        status ENUM('pending', 'accepted', 'expired') NOT NULL DEFAULT 'pending',
        token VARCHAR(255) NOT NULL UNIQUE,
        invited_by INT NOT NULL,
        expires_at DATETIME NOT NULL,
        accepted_at DATETIME NULL,
        accepted_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_token (token),
        INDEX idx_status (status),
        INDEX idx_invited_by (invited_by),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Invitations table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating invitations table:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createInvitationsTable();