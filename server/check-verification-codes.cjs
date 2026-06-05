const mysql = require('mysql2/promise');

async function checkVerificationCodes() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('=== Checking verification codes ===');
    
    // Get all verification codes for pending affiliates
    const [codes] = await connection.execute(`
      SELECT 
        evc.id,
        evc.email,
        evc.code,
        evc.expires_at,
        evc.used,
        evc.created_at,
        a.status as affiliate_status
      FROM email_verification_codes evc
      LEFT JOIN affiliates a ON evc.email = a.email
      WHERE evc.email IN (
        SELECT email FROM affiliates WHERE status = 'pending' OR email_verified = 0
      )
      ORDER BY evc.created_at DESC
      LIMIT 10
    `);
    
    console.log('Recent verification codes for pending/unverified affiliates:');
    codes.forEach(code => {
      console.log({
        id: code.id,
        email: code.email,
        code: code.code,
        expires_at: code.expires_at,
        used: code.used,
        affiliate_status: code.affiliate_status,
        created_at: code.created_at,
        is_expired: new Date() > new Date(code.expires_at)
      });
    });
    
    // Check for the specific email we tested
    const testEmail = 'wanewa6539@dwakm.com';
    const [specificCodes] = await connection.execute(`
      SELECT * FROM email_verification_codes 
      WHERE email = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [testEmail]);
    
    console.log(`\n=== Codes for ${testEmail} ===`);
    specificCodes.forEach(code => {
      console.log({
        id: code.id,
        code: code.code,
        expires_at: code.expires_at,
        used: code.used,
        created_at: code.created_at,
        is_expired: new Date() > new Date(code.expires_at)
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkVerificationCodes();