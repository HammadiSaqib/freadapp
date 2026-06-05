const mysql = require('mysql2/promise');

async function debugEventOwnership() {
  let connection;
  
  try {
    console.log('🔍 Debugging event ownership and types...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'creditrepair_db'
    });
    
    console.log('✅ Connected to database');
    
    // Check current date for reference
    const [currentDateResult] = await connection.execute('SELECT CURDATE() as current_date, DATE_ADD(CURDATE(), INTERVAL 7 DAY) as seven_days_later');
    console.log('📅 Current date range:', currentDateResult[0]);
    
    // Check all upcoming events (next 7 days) without filtering by creator
    const [allUpcomingEvents] = await connection.execute(`
      SELECT 
        ce.id,
        ce.title,
        ce.date,
        ce.time,
        ce.type,
        ce.created_by,
        ce.visible_to_admins,
        u.email as creator_email
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY ce.date ASC, ce.time ASC
    `);
    
    console.log(`\n📊 All upcoming events (${allUpcomingEvents.length} total):`);
    allUpcomingEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title}`);
      console.log(`     Date: ${event.date}, Time: ${event.time || 'No time'}`);
      console.log(`     Type: ${event.type}, Created by: ${event.created_by} (${event.creator_email || 'Unknown'})`);
      console.log(`     Visible to admins: ${event.visible_to_admins}`);
      console.log('');
    });
    
    // Check what the current filter would return for admin ID 4
    const adminId = 4;
    const [filteredEvents] = await connection.execute(`
      SELECT 
        ce.id,
        ce.title,
        ce.date,
        ce.time,
        ce.type,
        ce.created_by
      FROM calendar_events ce
      WHERE ce.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND (ce.created_by = ? OR ce.type IN ('webinar', 'workshop', 'office_hours'))
      ORDER BY ce.date ASC, ce.time ASC
    `, [adminId]);
    
    console.log(`\n🔍 Events returned by current filter for admin ${adminId} (${filteredEvents.length} total):`);
    filteredEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title} - ${event.date} ${event.time || 'No time'}`);
      console.log(`     Type: ${event.type}, Created by: ${event.created_by}`);
    });
    
    // Check unique event types
    const [eventTypes] = await connection.execute(`
      SELECT DISTINCT type, COUNT(*) as count
      FROM calendar_events 
      WHERE date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      GROUP BY type
      ORDER BY count DESC
    `);
    
    console.log(`\n📈 Event types in upcoming events:`);
    eventTypes.forEach(type => {
      console.log(`  ${type.type}: ${type.count} events`);
    });
    
    // Check unique creators
    const [creators] = await connection.execute(`
      SELECT DISTINCT ce.created_by, u.email, COUNT(*) as count
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      GROUP BY ce.created_by, u.email
      ORDER BY count DESC
    `);
    
    console.log(`\n👥 Event creators in upcoming events:`);
    creators.forEach(creator => {
      console.log(`  User ID ${creator.created_by} (${creator.email || 'Unknown'}): ${creator.count} events`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

debugEventOwnership();