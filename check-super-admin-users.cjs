const mysql = require('mysql2/promise');

async function checkSuperAdminUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // First, let's see the current ENUM values for the role column
    console.log('Current role ENUM values:');
    const [enumInfo] = await connection.execute(
      "SHOW COLUMNS FROM users LIKE 'role'"
    );
    console.log(enumInfo[0]);
    
    // Check if there are any users with super_admin role
    console.log('\nChecking for users with super_admin role:');
    const [superAdminUsers] = await connection.execute(
      "SELECT id, email, role FROM users WHERE role = 'super_admin'"
    );
    
    if (superAdminUsers.length > 0) {
      console.log('Found users with super_admin role:');
      console.table(superAdminUsers);
    } else {
      console.log('No users found with super_admin role.');
    }
    
    // Check admin_profiles table for super admin entries
    console.log('\nChecking admin_profiles table for super admin entries:');
    const [adminProfiles] = await connection.execute(
      "SELECT id, user_id, access_level FROM admin_profiles WHERE access_level = 'super_admin'"
    );
    
    if (adminProfiles.length > 0) {
      console.log('Found super admin entries in admin_profiles:');
      console.table(adminProfiles);
    } else {
      console.log('No super admin entries found in admin_profiles.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSuperAdminUsers();