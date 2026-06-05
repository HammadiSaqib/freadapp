const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'creditrepair.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Create admin_notifications table (SQLite version)
const createTableSQL = `
CREATE TABLE IF NOT EXISTS admin_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL,
  sender_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'system')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN NOT NULL DEFAULT 0,
  read_at DATETIME,
  action_url TEXT,
  action_text TEXT,
  expires_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
)`;

console.log('Creating admin_notifications table...');

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('Error creating table:', err);
    db.close();
    return;
  }
  
  console.log('✅ admin_notifications table created successfully');
  
  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient_id ON admin_notifications(recipient_id)',
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_sender_id ON admin_notifications(sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type)',
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority)',
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read)',
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_admin_notifications_expires_at ON admin_notifications(expires_at)'
  ];
  
  let indexCount = 0;
  indexes.forEach((indexSQL, i) => {
    db.run(indexSQL, (err) => {
      if (err) {
        console.error(`Error creating index ${i + 1}:`, err);
      } else {
        console.log(`✅ Index ${i + 1} created successfully`);
      }
      
      indexCount++;
      if (indexCount === indexes.length) {
        // Insert a sample notification for testing
        const sampleNotification = `
        INSERT INTO admin_notifications (
          recipient_id, title, message, type, priority
        ) VALUES (
          1, 'Welcome to Admin Panel', 'Your admin panel is now set up and ready to use.', 'info', 'medium'
        )`;
        
        db.run(sampleNotification, (err) => {
          if (err) {
            console.log('Note: Could not insert sample notification (this is normal if user ID 1 does not exist)');
          } else {
            console.log('✅ Sample notification inserted');
          }
          
          // Verify table creation
          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_notifications'", (err, row) => {
            if (err) {
              console.error('Error verifying table:', err);
            } else if (row) {
              console.log('✅ Table verification successful');
            } else {
              console.log('❌ Table verification failed');
            }
            
            db.close();
            console.log('Database connection closed');
          });
        });
      }
    });
  });
});