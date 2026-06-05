const mysql = require('mysql2/promise');

async function resetAffiliateVerification() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    const testEmail = 'wanewa6539@dwakm.com';
    
    console.log(`=== Resetting verification status for ${testEmail} ===`);
    
    // Reset affiliate email_verified status
    const resetAffiliateQuery = `
      UPDATE affiliates 
      SET email_verified = 0, status = 'pending'
      WHERE email = ?
    `;
    
    await connection.execute(resetAffiliateQuery, [testEmail]);
    console.log('✅ Reset affiliate email_verified status to 0');
    
    // Mark all verification codes as unused for this email
    const resetCodesQuery = `
      UPDATE email_verification_codes 
      SET used = 0, used_at = NULL
      WHERE email = ?
    `;
    
    await connection.execute(resetCodesQuery, [testEmail]);
    console.log('✅ Reset all verification codes to unused');
    
    // Check current status
    const [affiliate] = await connection.execute(
      'SELECT id, email, status, email_verified FROM affiliates WHERE email = ?',
      [testEmail]
    );
    
    console.log('\n=== Current affiliate status ===');
    console.log(affiliate[0]);
    
    // Check verification codes
    const [codes] = await connection.execute(
      'SELECT id, code, used, expires_at FROM email_verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 3',
      [testEmail]
    );
    
    console.log('\n=== Recent verification codes ===');
    codes.forEach(code => {
      console.log({
        id: code.id,
        code: code.code,
        used: code.used,
        expires_at: code.expires_at,
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

resetAffiliateVerification();