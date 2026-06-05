const mysql = require('mysql2/promise');

async function createDemoAnalytics() {
  let connection;
  
  try {
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db',
      port: 3306
    });
    
    console.log('🔌 Connected to MySQL database');
    
    // Get all existing tickets
    const [tickets] = await connection.execute(
      'SELECT id, status, created_at, updated_at FROM tickets ORDER BY id'
    );
    
    console.log(`📊 Found ${tickets.length} tickets to create analytics for`);
    
    if (tickets.length === 0) {
      console.log('❌ No tickets found. Please create tickets first.');
      return;
    }
    
    console.log('\n📈 Creating ticket analytics...');
    
    // Create analytics for each ticket
    for (const ticket of tickets) {
      const ticketId = ticket.id;
      const createdAt = new Date(ticket.created_at);
      const updatedAt = new Date(ticket.updated_at);
      
      // Generate realistic response and resolution times
      const responseTimeHours = Math.random() * 24 + 0.5; // 0.5 to 24.5 hours
      const resolutionTimeHours = ticket.status === 'resolved' ? 
        Math.random() * 72 + 2 : null; // 2 to 74 hours for resolved tickets
      
      // Generate first response time (within response time)
      const firstResponseAt = new Date(createdAt);
      firstResponseAt.setHours(firstResponseAt.getHours() + responseTimeHours);
      
      // Generate resolved time for resolved tickets
      const resolvedAt = ticket.status === 'resolved' ? 
        new Date(createdAt.getTime() + (resolutionTimeHours * 60 * 60 * 1000)) : null;
      
      // Generate customer satisfaction (1-5 scale, weighted towards higher scores)
      const satisfactionRating = ticket.status === 'resolved' ? 
        Math.floor(Math.random() * 3) + 3 : null; // 3-5 for resolved tickets
      
      // Determine SLA compliance (assume 4 hour response, 48 hour resolution SLA)
      const slaResponseMet = responseTimeHours <= 4;
      const slaResolutionMet = resolutionTimeHours ? resolutionTimeHours <= 48 : false;
      
      // Random escalation (10% chance)
      const escalated = Math.random() < 0.1;
      const escalatedAt = escalated ? 
        new Date(createdAt.getTime() + (Math.random() * 24 * 60 * 60 * 1000)) : null;
      
      try {
        await connection.execute(
          `INSERT INTO ticket_analytics (
            ticket_id, 
            first_response_at, 
            resolved_at, 
            response_time_hours, 
            resolution_time_hours, 
            customer_satisfaction_rating, 
            escalated, 
            escalated_at, 
            sla_response_met, 
            sla_resolution_met,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            first_response_at = VALUES(first_response_at),
            resolved_at = VALUES(resolved_at),
            response_time_hours = VALUES(response_time_hours),
            resolution_time_hours = VALUES(resolution_time_hours),
            customer_satisfaction_rating = VALUES(customer_satisfaction_rating),
            escalated = VALUES(escalated),
            escalated_at = VALUES(escalated_at),
            sla_response_met = VALUES(sla_response_met),
            sla_resolution_met = VALUES(sla_resolution_met),
            updated_at = NOW()`,
          [
            ticketId,
            firstResponseAt,
            resolvedAt,
            parseFloat(responseTimeHours.toFixed(2)),
            resolutionTimeHours ? parseFloat(resolutionTimeHours.toFixed(2)) : null,
            satisfactionRating,
            escalated,
            escalatedAt,
            slaResponseMet,
            slaResolutionMet
          ]
        );
        
        console.log(`  ✅ Created analytics for ticket #${ticketId}: ${responseTimeHours.toFixed(1)}h response${satisfactionRating ? `, ${satisfactionRating}/5 satisfaction` : ''}${escalated ? ', escalated' : ''}`);
        
      } catch (error) {
        console.error(`  ❌ Error creating analytics for ticket #${ticketId}:`, error.message);
      }
    }
    
    // Get final analytics count
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM ticket_analytics');
    const totalAnalytics = countResult[0].total;
    
    console.log(`\n🎉 Demo analytics created successfully!`);
    console.log(`📊 Total ticket analytics records: ${totalAnalytics}`);
    
    // Show some sample metrics
    const [metricsResult] = await connection.execute(`
      SELECT 
        COUNT(*) as totalTickets,
        AVG(response_time_hours) as avgResponseTime,
        AVG(customer_satisfaction_rating) as avgSatisfaction,
        COUNT(CASE WHEN sla_response_met = 1 THEN 1 END) as slaResponseMet,
        COUNT(CASE WHEN escalated = 1 THEN 1 END) as escalatedTickets
      FROM ticket_analytics
    `);
    
    const metrics = metricsResult[0];
    console.log(`\n📈 Sample Metrics:`);
    console.log(`  - Average Response Time: ${metrics.avgResponseTime ? metrics.avgResponseTime.toFixed(1) : 'N/A'}h`);
    console.log(`  - Average Satisfaction: ${metrics.avgSatisfaction ? metrics.avgSatisfaction.toFixed(1) : 'N/A'}/5`);
    console.log(`  - SLA Response Met: ${metrics.slaResponseMet}/${metrics.totalTickets}`);
    console.log(`  - Escalated Tickets: ${metrics.escalatedTickets}`);
    
  } catch (error) {
    console.error('❌ Error creating demo analytics:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

createDemoAnalytics();