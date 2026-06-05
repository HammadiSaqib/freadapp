const mysql = require('mysql2/promise');

async function debugTimeIssue() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db',
    timezone: '+00:00'
  });

  try {
    console.log('=== TIME DEBUGGING ===');
    
    // Get current database time
    const [currentTimeResult] = await connection.execute('SELECT NOW() as db_time');
    console.log('Database times:', currentTimeResult[0]);
    
    // Get JavaScript time
    const jsTime = new Date();
    console.log('JavaScript time:', jsTime.toISOString());
    
    // Check the latest verification code for the test email
    const [codeResult] = await connection.execute(
      `SELECT *, 
       NOW() as current_db_time,
       TIMESTAMPDIFF(MINUTE, expires_at, NOW()) as minutes_past_expiry
       FROM email_verification_codes 
       WHERE email = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      ['sadas4545645@gmail.com']
    );
    
    if (codeResult.length > 0) {
      console.log('\nLatest verification code:');
      console.log('Code:', codeResult[0].code);
      console.log('Created at:', codeResult[0].created_at);
      console.log('Expires at:', codeResult[0].expires_at);
      console.log('Current DB time:', codeResult[0].current_db_time);
      console.log('Minutes past expiry:', codeResult[0].minutes_past_expiry);
      console.log('Is expired?', codeResult[0].minutes_past_expiry > 0);
    }
    
    // Test creating a new code with proper expiry
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    console.log('\n=== CREATING NEW CODE ===');
    console.log('New code:', newCode);
    console.log('JS expiry time:', expiresAt.toISOString());
    
    const [insertResult] = await connection.execute(
      `INSERT INTO email_verification_codes (email, code, type, expires_at)
       VALUES (?, ?, 'admin_registration', ?)`,
      ['sadas4545645@gmail.com', newCode, expiresAt]
    );
    
    console.log('Insert result:', insertResult);
    
    // Verify the new code was inserted correctly
    const [verifyResult] = await connection.execute(
      `SELECT *, 
       NOW() as current_db_time,
       TIMESTAMPDIFF(MINUTE, NOW(), expires_at) as minutes_until_expiry
       FROM email_verification_codes 
       WHERE id = ?`,
      [insertResult.insertId]
    );
    
    console.log('\nNew code verification:');
    console.log('Code:', verifyResult[0].code);
    console.log('Expires at:', verifyResult[0].expires_at);
    console.log('Current DB time:', verifyResult[0].current_db_time);
    console.log('Minutes until expiry:', verifyResult[0].minutes_until_expiry);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugTimeIssue();