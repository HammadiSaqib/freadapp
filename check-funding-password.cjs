const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  const [users] = await connection.execute(
    'SELECT email, password_hash FROM users WHERE role = "funding_manager"'
  );
  
  if (users.length > 0) {
    const user = users[0];
    console.log('User email:', user.email);
    
    // Test different passwords
    const passwords = ['12345678', 'password123', 'FundingManager123!'];
    
    for (const pwd of passwords) {
      const isValid = bcrypt.compareSync(pwd, user.password_hash);
      console.log(`Password '${pwd}': ${isValid ? 'VALID' : 'INVALID'}`);
    }
  } else {
    console.log('No funding manager user found');
  }
  
  await connection.end();
}

checkPassword().catch(console.error);