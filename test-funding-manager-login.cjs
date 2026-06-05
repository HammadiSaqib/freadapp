const mysql = require('mysql2/promise');

async function testFundingManagerLogin() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });

    console.log('✅ Connected to MySQL database');

    // Check if funding manager user exists
    console.log('\n🔍 Checking funding manager users:');
    const [fundingManagers] = await connection.execute(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE role = "funding_manager"'
    );
    
    if (fundingManagers.length > 0) {
      console.log('Funding managers found:');
      console.table(fundingManagers);
      
      // Test login with the first funding manager
      const testUser = fundingManagers[0];
      console.log(`\n🧪 Testing login for: ${testUser.email}`);
      
      // Make API call to test login
      const fetch = (await import('node-fetch')).default;
      
      try {
        const response = await fetch('http://localhost:3001/api/auth/funding-manager/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testUser.email,
            password: 'password123' // Default password - you may need to adjust this
          })
        });
        
        const result = await response.text();
        console.log('Response status:', response.status);
        console.log('Response:', result);
        
        if (response.status === 401) {
          console.log('\n❌ Login failed - likely password issue');
          console.log('💡 Try checking the actual password hash in the database');
        } else if (response.status === 200) {
          console.log('\n✅ Login successful!');
        } else {
          console.log('\n⚠️ Unexpected response status');
        }
        
      } catch (fetchError) {
        console.error('❌ Error making API request:', fetchError.message);
        console.log('💡 Make sure the server is running on http://localhost:3001');
      }
      
    } else {
      console.log('❌ No funding manager users found');
      
      // Check all users to see what roles exist
      console.log('\n📊 All users in database:');
      const [allUsers] = await connection.execute('SELECT id, email, first_name, last_name, role FROM users ORDER BY id');
      console.table(allUsers);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testFundingManagerLogin();