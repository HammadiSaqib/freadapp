const mysql = require('mysql2/promise');

async function testAnalyticsQueries() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Connected to MySQL database');

    // Test sales chat analytics queries
    console.log('\n=== Testing Sales Chat Analytics Queries ===');
    
    // Chat statistics
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
      LIMIT 10
    `);
    
    console.log('Chat Stats (last 10 days):');
    console.log(chatStats);
    
    // Top agents
    const [topAgents] = await connection.execute(`
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(cm.id) as messages_sent,
        0 as avg_response_time,
        COUNT(DISTINCT cm.receiver_id) as clients_helped
      FROM users u
      JOIN chat_messages cm ON u.id = cm.sender_id
      WHERE u.role IN ('support', 'admin') AND cm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY u.id
      ORDER BY messages_sent DESC
      LIMIT 5
    `);
    
    console.log('\nTop Agents:');
    console.log(topAgents);
    
    // Conversion stats
    const [conversionStats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT cm.sender_id) as total_chat_users,
        COUNT(DISTINCT s.user_id) as converted_users,
        CASE 
          WHEN COUNT(DISTINCT cm.sender_id) > 0 
          THEN (COUNT(DISTINCT s.user_id) / COUNT(DISTINCT cm.sender_id)) * 100 
          ELSE 0 
        END as conversion_rate
      FROM chat_messages cm
      LEFT JOIN subscriptions s ON cm.sender_id = s.user_id 
        AND s.created_at >= cm.created_at 
        AND s.created_at <= DATE_ADD(cm.created_at, INTERVAL 7 DAY)
      WHERE cm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    console.log('\nConversion Stats:');
    console.log(conversionStats);

    // Test report pulling analytics queries
    console.log('\n=== Testing Report Pulling Analytics Queries ===');
    
    // Check if credit_reports table has data
    const [reportCount] = await connection.execute('SELECT COUNT(*) as count FROM credit_reports');
    console.log(`Total credit reports in database: ${reportCount[0].count}`);
    
    if (reportCount[0].count > 0) {
      // Report statistics
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
        LIMIT 10
      `);
      
      console.log('\nReport Stats (last 10 days):');
      console.log(reportStats);
      
      // Bureau statistics
      const [bureauStats] = await connection.execute(`
        SELECT 
          bureau as bureau_name,
          COUNT(*) as total_pulls,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_pulls,
          0 as avg_processing_time,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_pulls
        FROM credit_reports 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY bureau
        ORDER BY total_pulls DESC
      `);
      
      console.log('\nBureau Stats:');
      console.log(bureauStats);
      
      // User activity
      const [userActivity] = await connection.execute(`
        SELECT 
          c.first_name,
          c.last_name,
          c.email,
          COUNT(cr.id) as reports_pulled,
          MAX(cr.created_at) as last_report_date,
          0 as avg_processing_time
        FROM clients c
        JOIN credit_reports cr ON c.id = cr.client_id
        WHERE cr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY c.id
        ORDER BY reports_pulled DESC
        LIMIT 10
      `);
      
      console.log('\nUser Activity:');
      console.log(userActivity);
    } else {
      console.log('No credit reports found in database');
    }

    console.log('\n=== Analytics queries test completed ===');

  } catch (error) {
    console.error('Error testing analytics queries:', error);
  } finally {
    await connection.end();
  }
}

testAnalyticsQueries();