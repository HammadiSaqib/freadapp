const mysql = require('mysql2/promise');

async function debugUpcomingAPI() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Testing upcoming events API logic...');
    
    // Test upcoming client reminders (next 7 days)
    const upcomingRemindersQuery = `
      SELECT 
        c.id as client_id,
        c.first_name,
        c.last_name,
        c.email,
        c.created_at,
        DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY) as next_report_date
      FROM clients c
      WHERE c.status = 'active'
        AND DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY next_report_date ASC
    `;
    
    // Test upcoming meetings (next 7 days)
    const upcomingMeetingsQuery = `
      SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.date,
        ce.time,
        ce.duration,
        ce.type,
        ce.instructor,
        ce.location,
        ce.is_virtual,
        ce.meeting_link
      FROM calendar_events ce
      WHERE ce.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY ce.date ASC, ce.time ASC
    `;
    
    console.log('\n📅 Checking upcoming client reminders...');
    const [upcomingReminders] = await connection.execute(upcomingRemindersQuery);
    console.log(`Found ${upcomingReminders.length} upcoming client reminders:`);
    upcomingReminders.forEach(client => {
      console.log(`  - ${client.first_name} ${client.last_name}: ${client.next_report_date}`);
    });
    
    console.log('\n🗓️ Checking upcoming meetings...');
    const [upcomingMeetings] = await connection.execute(upcomingMeetingsQuery);
    console.log(`Found ${upcomingMeetings.length} upcoming meetings:`);
    upcomingMeetings.forEach(meeting => {
      console.log(`  - ${meeting.title}: ${meeting.date} ${meeting.time || 'No time'}`);
    });
    
    // Format upcoming events like the API does
    const reminderEvents = upcomingReminders.map((client) => ({
      id: `reminder-${client.client_id}`,
      type: 'client_reminder',
      title: `Pull Report: ${client.first_name} ${client.last_name}`,
      description: `Monthly credit report pull reminder`,
      date: new Date(client.next_report_date).toISOString().split('T')[0],
      time: '09:00:00',
      client_name: `${client.first_name} ${client.last_name}`,
      client_email: client.email,
      priority: 'high',
      color: '#ff6b6b'
    }));
    
    const meetingEvents = upcomingMeetings.map((meeting) => ({
      id: `meeting-${meeting.id}`,
      type: 'meeting',
      title: meeting.title,
      description: meeting.description,
      date: new Date(meeting.date).toISOString().split('T')[0],
      time: meeting.time,
      duration: meeting.duration,
      meeting_type: meeting.type,
      instructor: meeting.instructor,
      location: meeting.location,
      is_virtual: meeting.is_virtual,
      meeting_link: meeting.meeting_link,
      priority: 'medium',
      color: '#4ecdc4'
    }));
    
    const allUpcoming = [...reminderEvents, ...meetingEvents];
    
    console.log('\n📊 Final upcoming events result:');
    console.log(`Total upcoming events: ${allUpcoming.length}`);
    console.log(`Client reminders: ${reminderEvents.length}`);
    console.log(`Meetings: ${meetingEvents.length}`);
    
    if (allUpcoming.length > 0) {
      console.log('\n📋 Upcoming events details:');
      allUpcoming.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.title} - ${event.date} ${event.time} (${event.type})`);
      });
    } else {
      console.log('\n⚠️ No upcoming events found in the next 7 days');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugUpcomingAPI();