import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db'
});

try {
  console.log('Connected to MySQL database');
  
  // Update the first admin user to be a super admin
  const [result] = await connection.execute(
    'UPDATE users SET role = "super_admin" WHERE email = "test@example.com" AND role = "admin"'
  );
  
  console.log('Update result:', result);
  
  // Verify the update
  const [users] = await connection.execute(
    'SELECT id, email, role FROM users WHERE email = "test@example.com"'
  );
  
  console.log('Updated user:', users[0]);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await connection.end();
}