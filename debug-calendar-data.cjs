const mysql = require('mysql2/promise');

async function debugCalendarData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Checking calendar_events table...');
    
    // Check sample events
    const [events] = await connection.execute('SELECT id, title, date, time, type, created_at FROM calendar_events LIMIT 5');
    console.log('\n📅 Sample events:');
    events.forEach(event => {
      console.log(`  ID: ${event.id}, Title: ${event.title}, Date: ${event.date}, Time: ${event.time}, Type: ${event.type}`);
    });
    
    // Check current month events
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    console.log(`\n🗓️ Looking for events in month: ${month}, year: ${year}`);
    
    const [currentEvents] = await connection.execute(
      'SELECT id, title, date, time, type FROM calendar_events WHERE MONTH(date) = ? AND YEAR(date) = ?',
      [month, year]
    );
    console.log(`📊 Events for current month (${month}/${year}): ${currentEvents.length}`);
    currentEvents.forEach(event => {
      console.log(`  ${event.title} - ${event.date} ${event.time}`);
    });
    
    // Check active clients for reminders
    const [clients] = await connection.execute('SELECT id, first_name, last_name, created_at, status FROM clients WHERE status = ? LIMIT 5', ['active']);
    console.log('\n👥 Active clients:');
    clients.forEach(client => {
      console.log(`  Client: ${client.first_name} ${client.last_name}, Created: ${client.created_at}`);
    });
    
    // Check if there are any events at all
    const [totalEvents] = await connection.execute('SELECT COUNT(*) as total FROM calendar_events');
    console.log(`\n📈 Total events in database: ${totalEvents[0].total}`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugCalendarData();