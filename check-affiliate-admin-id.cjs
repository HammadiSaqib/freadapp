const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Empty password for XAMPP default
  database: 'creditrepair_db',
  port: 3306
};

async function checkAffiliateAdminId() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    // Check affiliate data including admin_id
    const [affiliate] = await connection.execute(
      'SELECT id, email, first_name, last_name, admin_id, avatar FROM affiliates WHERE email = ?',
      ['affi@gmail.com']
    );
    
    if (affiliate.length === 0) {
      console.log('❌ Affiliate not found with email: affi@gmail.com');
      return;
    }
    
    const affiliateData = affiliate[0];
    console.log('\n=== AFFILIATE DATA ===');
    console.log('Affiliate ID:', affiliateData.id);
    console.log('Email:', affiliateData.email);
    console.log('Name:', affiliateData.first_name, affiliateData.last_name);
    console.log('Admin ID:', affiliateData.admin_id);
    console.log('Avatar:', affiliateData.avatar);
    
    // Check if there's a user with the admin_id
    if (affiliateData.admin_id) {
      const [adminUser] = await connection.execute(
        'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
        [affiliateData.admin_id]
      );
      
      console.log('\n=== ADMIN USER DATA ===');
      if (adminUser.length > 0) {
        const adminData = adminUser[0];
        console.log('Admin User ID:', adminData.id);
        console.log('Admin Email:', adminData.email);
        console.log('Admin Name:', adminData.first_name, adminData.last_name);
        console.log('Admin Role:', adminData.role);
      } else {
        console.log('❌ No admin user found with ID:', affiliateData.admin_id);
      }
    }
    
    // Test the current query that's failing
    console.log('\n=== TESTING CURRENT QUERY ===');
    console.log('Query: UPDATE affiliates SET avatar = ? WHERE admin_id = ?');
    console.log('Parameters: [test-url, ' + affiliateData.admin_id + ']');
    
    const [updateResult] = await connection.execute(
      'UPDATE affiliates SET avatar = ? WHERE admin_id = ?',
      ['test-avatar-url', affiliateData.admin_id]
    );
    
    console.log('Update result:', updateResult);
    console.log('Affected rows:', updateResult.affectedRows);
    console.log('Changed rows:', updateResult.changedRows);
    
    // Check what the correct query should be
    console.log('\n=== TESTING CORRECT QUERY ===');
    console.log('Query: UPDATE affiliates SET avatar = ? WHERE id = ?');
    console.log('Parameters: [test-url-2, ' + affiliateData.id + ']');
    
    const [correctUpdateResult] = await connection.execute(
      'UPDATE affiliates SET avatar = ? WHERE id = ?',
      ['test-avatar-url-2', affiliateData.id]
    );
    
    console.log('Correct update result:', correctUpdateResult);
    console.log('Affected rows:', correctUpdateResult.affectedRows);
    console.log('Changed rows:', correctUpdateResult.changedRows);
    
    // Verify the update
    const [verifyResult] = await connection.execute(
      'SELECT avatar FROM affiliates WHERE id = ?',
      [affiliateData.id]
    );
    
    console.log('Updated avatar:', verifyResult[0].avatar);
    
    // Clean up
    await connection.execute(
      'UPDATE affiliates SET avatar = NULL WHERE id = ?',
      [affiliateData.id]
    );
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

checkAffiliateAdminId();