const axios = require('axios');

async function testUpcomingEventsAPI() {
  try {
    console.log('🔍 Testing upcoming events API endpoint...');
    
    // First, let's try to login to get a valid token
    console.log('🔐 Attempting to login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'hammadisaqib@gmail.com',
      password: '12345678'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Now test the upcoming events API
    console.log('📅 Testing upcoming events API...');
    const upcomingResponse = await axios.get('http://localhost:3001/api/calendar/admin/upcoming', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 API Response Status:', upcomingResponse.status);
    console.log('📋 API Response Data:');
    console.log(JSON.stringify(upcomingResponse.data, null, 2));
    
    if (upcomingResponse.data.success && upcomingResponse.data.data) {
      const { upcoming_events, total_upcoming, client_reminders, meetings } = upcomingResponse.data.data;
      console.log(`\n📈 Summary:`);
      console.log(`  Total upcoming events: ${total_upcoming}`);
      console.log(`  Client reminders: ${client_reminders}`);
      console.log(`  Meetings: ${meetings}`);
      
      if (upcoming_events && upcoming_events.length > 0) {
        console.log(`\n📅 First few events:`);
        upcoming_events.slice(0, 3).forEach((event, index) => {
          console.log(`  ${index + 1}. ${event.title} - ${event.date} ${event.time || 'No time'}`);
        });
      } else {
        console.log('\n⚠️ No upcoming events found in API response');
      }
    } else {
      console.log('❌ API response indicates failure or no data');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testUpcomingEventsAPI();