const mysql = require('mysql2/promise');

async function checkSuperAdminUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Connected to MySQL database');
    
    // Check all super admin users
    const [superAdmins] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, status, created_at 
      FROM users 
      WHERE role = 'super_admin'
      ORDER BY id
    `);
    
    console.log('\n=== Super Admin Users ===');
    if (superAdmins.length === 0) {
      console.log('❌ No super admin users found');
    } else {
      superAdmins.forEach((admin, index) => {
        console.log(`${index + 1}. ID: ${admin.id}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Status: ${admin.status}`);
        console.log(`   Created: ${admin.created_at}`);
        console.log('');
      });
    }
    
    // Check specific user
    const [specificUser] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, status, password_hash 
      FROM users 
      WHERE email = ?
    `, ['demo@creditrepairpro.com']);
    
    console.log('\n=== Specific User Check (demo@creditrepairpro.com) ===');
    if (specificUser.length === 0) {
      console.log('❌ User demo@creditrepairpro.com not found');
    } else {
      const user = specificUser[0];
      console.log(`✅ User found:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Password Hash: ${user.password_hash.substring(0, 20)}...`);
    }
    
    // Check test@example.com user
    const [testUser] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, status, password_hash 
      FROM users 
      WHERE email = ?
    `, ['test@example.com']);
    
    console.log('\n=== Test User Check (test@example.com) ===');
    if (testUser.length === 0) {
      console.log('❌ User test@example.com not found');
    } else {
      const user = testUser[0];
      console.log(`✅ User found:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Password Hash: ${user.password_hash.substring(0, 20)}...`);
    }
    
  } catch (error) {
    console.error('Error checking super admin users:', error);
  } finally {
    await connection.end();
  }
}

checkSuperAdminUser();