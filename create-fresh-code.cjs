const mysql = require('mysql2/promise');

async function createFreshCode() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db',
    timezone: '+00:00'
  });

  try {
    const email = 'sadas4545645@gmail.com';
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('=== CREATING FRESH VERIFICATION CODE ===');
    console.log('Email:', email);
    console.log('New code:', newCode);
    
    // Get current database time
    const [timeResult] = await connection.execute('SELECT NOW() as current_db_time');
    console.log('Current DB time:', timeResult[0].current_db_time);
    
    // Create expiry time using database time + 15 minutes
    const [insertResult] = await connection.execute(
      `INSERT INTO email_verification_codes (email, code, type, expires_at, created_at)
       VALUES (?, ?, 'admin_registration', DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())`,
      [email, newCode]
    );
    
    console.log('Insert result:', insertResult);
    
    // Verify the new code
    const [verifyResult] = await connection.execute(
      `SELECT *, 
       NOW() as current_db_time,
       TIMESTAMPDIFF(MINUTE, NOW(), expires_at) as minutes_until_expiry,
       (expires_at > NOW()) as is_valid
       FROM email_verification_codes 
       WHERE id = ?`,
      [insertResult.insertId]
    );
    
    console.log('\n=== VERIFICATION CODE DETAILS ===');
    const code = verifyResult[0];
    console.log('ID:', code.id);
    console.log('Email:', code.email);
    console.log('Code:', code.code);
    console.log('Type:', code.type);
    console.log('Created at:', code.created_at);
    console.log('Expires at:', code.expires_at);
    console.log('Current DB time:', code.current_db_time);
    console.log('Minutes until expiry:', code.minutes_until_expiry);
    console.log('Is valid:', code.is_valid === 1);
    console.log('Used:', code.used);
    
    // Also update the pending registration expiry
    const [updateResult] = await connection.execute(
      `UPDATE pending_registrations 
       SET expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
       WHERE email = ?`,
      [email]
    );
    
    console.log('\n=== PENDING REGISTRATION UPDATED ===');
    console.log('Updated rows:', updateResult.affectedRows);
    
    console.log('\n✅ Ready to test with:');
    console.log('Email:', email);
    console.log('Code:', newCode);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createFreshCode();