const mysql = require('mysql2/promise');

async function generateNewVerificationCode() {
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
    
    // Generate verification code with 2-day expiration
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    
    console.log(`Generating new verification code for ${testEmail}`);
    console.log(`Code: ${verificationCode}`);
    console.log(`Expires at: ${expiresAt}`);
    
    // Insert new verification code
    const insertQuery = `
      INSERT INTO email_verification_codes (email, code, type, expires_at, created_at)
      VALUES (?, ?, 'affiliate_registration', ?, NOW())
    `;
    
    await connection.execute(insertQuery, [testEmail, verificationCode, expiresAt]);
    
    console.log('✅ New verification code generated successfully');
    
    // Test the verification immediately
    console.log('\n=== Testing verification with new code ===');
    
    const codeQuery = `
      SELECT * FROM email_verification_codes 
      WHERE email = ? AND code = ? AND type = 'affiliate_registration' 
      AND used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const [verificationRecord] = await connection.execute(codeQuery, [testEmail, verificationCode]);
    
    if (verificationRecord.length > 0) {
      console.log('✅ Verification code found and valid');
      console.log('Code details:', {
        id: verificationRecord[0].id,
        code: verificationRecord[0].code,
        expires_at: verificationRecord[0].expires_at,
        used: verificationRecord[0].used
      });
    } else {
      console.log('❌ Verification code not found or invalid');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

generateNewVerificationCode();