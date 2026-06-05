const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdmin() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('Connected to MySQL database');
    
    const [users] = await connection.execute(
      'SELECT id, email, role, status FROM users WHERE email = ?',
      ['hammadisaqib@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('Admin user not found');
      return;
    }
    
    const user = users[0];
    console.log('Admin user data:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    
    const [clients] = await connection.execute(
      'SELECT id, first_name, last_name, email, status FROM clients WHERE user_id = ?',
      [user.id]
    );
    
    console.log('Total clients:', clients.length);
    
    if (clients.length > 0) {
      clients.forEach((client, index) => {
        console.log((index + 1) + '. ID: ' + client.id + ', Name: ' + client.first_name + ' ' + client.last_name + ', Email: ' + client.email + ', Status: ' + client.status);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkAdmin();