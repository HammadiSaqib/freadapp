const mysql = require('mysql2/promise');

async function addSampleData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Connected to MySQL database');

    // Check if tables exist and add sample data
    
    // 1. Add sample chat messages for sales chat analytics
    console.log('\n=== Adding sample chat messages ===');
    
    // First, let's check if chat_messages table exists
    const [chatTableExists] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'creditrepair_db' AND table_name = 'chat_messages'
    `);
    
    if (chatTableExists[0].count > 0) {
      // Get some user IDs to use as sender/receiver
      const [users] = await connection.execute('SELECT id FROM users LIMIT 5');
      
      if (users.length >= 2) {
        const userIds = users.map(u => u.id);
        
        // Add sample chat messages for the last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          const messagesPerDay = Math.floor(Math.random() * 20) + 5; // 5-25 messages per day
          
          for (let j = 0; j < messagesPerDay; j++) {
            const senderId = userIds[Math.floor(Math.random() * userIds.length)];
            const receiverId = userIds[Math.floor(Math.random() * userIds.length)];
            
            if (senderId !== receiverId) {
              await connection.execute(`
                INSERT INTO chat_messages (sender_id, receiver_id, message, created_at)
                VALUES (?, ?, ?, ?)
              `, [senderId, receiverId, `Sample message ${j + 1} for day ${i}`, date]);
            }
          }
        }
        console.log('Added sample chat messages');
      } else {
        console.log('Not enough users found to create chat messages');
      }
    } else {
      console.log('chat_messages table does not exist, creating it...');
      await connection.execute(`
        CREATE TABLE chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
      `);
      console.log('Created chat_messages table');
      
      // Now add sample data
      const [users] = await connection.execute('SELECT id FROM users LIMIT 5');
      
      if (users.length >= 2) {
        const userIds = users.map(u => u.id);
        
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          const messagesPerDay = Math.floor(Math.random() * 20) + 5;
          
          for (let j = 0; j < messagesPerDay; j++) {
            const senderId = userIds[Math.floor(Math.random() * userIds.length)];
            const receiverId = userIds[Math.floor(Math.random() * userIds.length)];
            
            if (senderId !== receiverId) {
              await connection.execute(`
                INSERT INTO chat_messages (sender_id, receiver_id, message, created_at)
                VALUES (?, ?, ?, ?)
              `, [senderId, receiverId, `Sample message ${j + 1} for day ${i}`, date]);
            }
          }
        }
        console.log('Added sample chat messages to new table');
      }
    }

    // 2. Add sample credit reports for report pulling analytics
    console.log('\n=== Adding sample credit reports ===');
    
    const [reportTableExists] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'creditrepair_db' AND table_name = 'credit_reports'
    `);
    
    if (reportTableExists[0].count > 0) {
      // Get some client IDs
      const [clients] = await connection.execute('SELECT id FROM clients LIMIT 10');
      
      if (clients.length > 0) {
        const clientIds = clients.map(c => c.id);
        const bureaus = ['Experian', 'Equifax', 'TransUnion'];
        const statuses = ['completed', 'error', 'pending'];
        
        // Add sample credit reports for the last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          const reportsPerDay = Math.floor(Math.random() * 15) + 3; // 3-18 reports per day
          
          for (let j = 0; j < reportsPerDay; j++) {
            const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
            const bureau = bureaus[Math.floor(Math.random() * bureaus.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            await connection.execute(`
              INSERT INTO credit_reports (client_id, bureau, status, created_at)
              VALUES (?, ?, ?, ?)
            `, [clientId, bureau, status, date]);
          }
        }
        console.log('Added sample credit reports');
      } else {
        console.log('No clients found to create credit reports');
      }
    } else {
      console.log('credit_reports table does not exist, creating it...');
      await connection.execute(`
        CREATE TABLE credit_reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          bureau VARCHAR(50) NOT NULL,
          status ENUM('pending', 'completed', 'error') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `);
      console.log('Created credit_reports table');
      
      // Now add sample data
      const [clients] = await connection.execute('SELECT id FROM clients LIMIT 10');
      
      if (clients.length > 0) {
        const clientIds = clients.map(c => c.id);
        const bureaus = ['Experian', 'Equifax', 'TransUnion'];
        const statuses = ['completed', 'error', 'pending'];
        
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          const reportsPerDay = Math.floor(Math.random() * 15) + 3;
          
          for (let j = 0; j < reportsPerDay; j++) {
            const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
            const bureau = bureaus[Math.floor(Math.random() * bureaus.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            await connection.execute(`
              INSERT INTO credit_reports (client_id, bureau, status, created_at)
              VALUES (?, ?, ?, ?)
            `, [clientId, bureau, status, date]);
          }
        }
        console.log('Added sample credit reports to new table');
      }
    }

    // 3. Test the analytics queries
    console.log('\n=== Testing analytics queries ===');
    
    // Test sales chat analytics query
    const [chatStats] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_messages,
        COUNT(DISTINCT sender_id) as active_users,
        0 as avg_response_time
      FROM chat_messages 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.log('Sample chat stats:', chatStats);
    
    // Test report pulling analytics query
    const [reportStats] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_reports,
        COUNT(DISTINCT client_id) as unique_users,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_reports,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_reports,
        0 as avg_processing_time
      FROM credit_reports 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.log('Sample report stats:', reportStats);

    console.log('\n=== Sample data added successfully! ===');

  } catch (error) {
    console.error('Error adding sample data:', error);
  } finally {
    await connection.end();
  }
}

addSampleData();