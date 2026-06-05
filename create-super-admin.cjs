const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
  let connection;
  try {
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db',
      charset: 'utf8mb4',
      timezone: '+00:00'
    });
    
    console.log('📡 Connected to MySQL database');
    
    // Check if super admin already exists
    const [existingSuperAdmin] = await connection.execute(
      'SELECT * FROM users WHERE role = ? LIMIT 1',
      ['super_admin']
    );
    
    if (existingSuperAdmin.length > 0) {
      console.log('✅ Super admin already exists:', existingSuperAdmin[0].email);
      return;
    }
    
    // Hash the password
    const password = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create super admin user
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'superadmin@example.com',
        hashedPassword,
        'Super',
        'Admin',
        'super_admin',
        'active',
        1,
        1
      ]
    );
    
    console.log('🎉 Super admin created successfully!');
    console.log('📧 Email: superadmin@example.com');
    console.log('🔑 Password: admin123');
    console.log('🆔 User ID:', result.insertId);
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

createSuperAdmin();