const Database = require('better-sqlite3');
const path = require('path');

async function checkUserPassword() {
  try {
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new Database(dbPath);
    
    console.log('Checking user bird09944@aminating.com...');
    
    const user = db.prepare('SELECT id, email, password_hash, role, email_verified FROM users WHERE email = ?').get('bird09944@aminating.com');
    
    if (user) {
      console.log('User found:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Email verified:', user.email_verified);
      console.log('Has password hash:', !!user.password_hash);
      console.log('Password hash length:', user.password_hash ? user.password_hash.length : 0);
    } else {
      console.log('User not found');
    }
    
    db.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUserPassword();