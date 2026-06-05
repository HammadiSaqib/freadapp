const mysql = require('mysql2/promise');

async function debugDateFormat() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Checking date format in calendar_events...');
    
    // Get sample events with different date formats
    const [events] = await connection.execute(
      'SELECT id, title, date, DATE_FORMAT(date, "%Y-%m-%d") as formatted_date FROM calendar_events WHERE MONTH(date) = 10 AND YEAR(date) = 2025 LIMIT 5'
    );
    
    console.log('\n📅 Sample events with date formats:');
    events.forEach(event => {
      console.log(`  ID: ${event.id}`);
      console.log(`  Title: ${event.title}`);
      console.log(`  Raw date: ${event.date}`);
      console.log(`  Formatted date: ${event.formatted_date}`);
      console.log(`  ISO string: ${new Date(event.date).toISOString()}`);
      console.log(`  Date only: ${new Date(event.date).toISOString().split('T')[0]}`);
      console.log('  ---');
    });
    
    // Test what the frontend expects
    console.log('\n🎯 Frontend date format expectations:');
    const testDate = new Date(2025, 9, 28); // October 28, 2025 (month is 0-indexed)
    console.log(`  JavaScript Date: ${testDate}`);
    console.log(`  ISO string: ${testDate.toISOString()}`);
    console.log(`  Date only: ${testDate.toISOString().split('T')[0]}`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugDateFormat();