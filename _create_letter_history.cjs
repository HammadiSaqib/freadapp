const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'creditrepair_db' });
  
  await c.query(`CREATE TABLE IF NOT EXISTS dispute_letter_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    client_id INT NULL,
    dispute_id INT NULL,
    session_id VARCHAR(64) NULL,
    bureaus JSON NOT NULL,
    negative_item_types JSON NOT NULL,
    dispute_round INT NOT NULL DEFAULT 1,
    templates_used JSON NOT NULL,
    template_count INT NOT NULL DEFAULT 0,
    template_source VARCHAR(32) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dlh_user (user_id),
    INDEX idx_dlh_created (created_at),
    INDEX idx_dlh_session (session_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  
  console.log('dispute_letter_history table created successfully');
  await c.end();
})();
