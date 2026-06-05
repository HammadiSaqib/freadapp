const mysql = require('mysql2/promise');

async function checkClientStats() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('📊 Checking client statistics for analytics...\n');
    
    // Total clients
    const [totalClients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    console.log(`Total clients: ${totalClients[0].count}`);
    
    // Client status breakdown
    const [statusBreakdown] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM clients 
      GROUP BY status
    `);
    console.log('\nClient status breakdown:');
    statusBreakdown.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
    // Fundable vs Not Fundable (credit score > 650)
    const [fundableStats] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN credit_score > 650 THEN 1 END) as fundable,
        COUNT(CASE WHEN credit_score <= 650 OR credit_score IS NULL THEN 1 END) as not_fundable
      FROM clients
    `);
    console.log(`\nFundable clients (score > 650): ${fundableStats[0].fundable}`);
    console.log(`Not fundable clients (score <= 650): ${fundableStats[0].not_fundable}`);
    
    // Ready vs Not Ready (has required fields)
    const [readyStats] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN 
          first_name IS NOT NULL AND 
          last_name IS NOT NULL AND 
          email IS NOT NULL AND 
          phone IS NOT NULL AND 
          address IS NOT NULL 
        THEN 1 END) as ready,
        COUNT(CASE WHEN 
          first_name IS NULL OR 
          last_name IS NULL OR 
          email IS NULL OR 
          phone IS NULL OR 
          address IS NULL 
        THEN 1 END) as not_ready
      FROM clients
    `);
    console.log(`\nReady clients (complete info): ${readyStats[0].ready}`);
    console.log(`Not ready clients (incomplete info): ${readyStats[0].not_ready}`);
    
    // Check disputes table
    const [disputeStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM disputes
    `);
    console.log(`\nDispute statistics:`);
    console.log(`  Total disputes: ${disputeStats[0].total_disputes}`);
    console.log(`  Pending: ${disputeStats[0].pending}`);
    console.log(`  Investigating: ${disputeStats[0].investigating}`);
    console.log(`  Resolved: ${disputeStats[0].resolved}`);
    console.log(`  Rejected: ${disputeStats[0].rejected}`);
    
    // Active disputes (pending + investigating)
    const activeDisputes = disputeStats[0].pending + disputeStats[0].investigating;
    console.log(`  Active disputes: ${activeDisputes}`);
    
    // Success rate
    const completedDisputes = disputeStats[0].resolved + disputeStats[0].rejected;
    const successRate = completedDisputes > 0 ? Math.round((disputeStats[0].resolved / completedDisputes) * 100) : 0;
    console.log(`  Success rate: ${successRate}%`);
    
    // Check credit score improvements
    const [scoreStats] = await connection.execute(`
      SELECT 
        AVG(credit_score) as avg_current_score,
        COUNT(CASE WHEN credit_score IS NOT NULL THEN 1 END) as clients_with_scores
      FROM clients
    `);
    console.log(`\nCredit score statistics:`);
    console.log(`  Average current score: ${Math.round(scoreStats[0].avg_current_score || 0)}`);
    console.log(`  Clients with scores: ${scoreStats[0].clients_with_scores}`);
    
    // Sample client data to understand structure
    const [sampleClients] = await connection.execute(`
      SELECT id, first_name, last_name, status, credit_score, created_at
      FROM clients 
      ORDER BY created_at DESC
      LIMIT 3
    `);
    console.log(`\nSample recent clients:`);
    sampleClients.forEach(client => {
      console.log(`  ${client.id}: ${client.first_name} ${client.last_name} (${client.status}, score: ${client.credit_score || 'N/A'}, created: ${client.created_at})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkClientStats();