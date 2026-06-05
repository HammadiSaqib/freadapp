const mysql = require('mysql2/promise');

async function debugAffiliateVerification() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });
    
    console.log('=== Checking email_verification_codes table ===');
    const [codes] = await connection.execute(`
      SELECT * FROM email_verification_codes 
      WHERE type = 'affiliate_registration' 
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log('Recent verification codes:', codes);
    
    console.log('\n=== Checking affiliates table ===');
    const [affiliates] = await connection.execute(`
      SELECT id, email, status, email_verified, created_at 
      FROM affiliates 
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log('Recent affiliates:', affiliates);
    
    // Check for any pending affiliates
    console.log('\n=== Checking pending affiliates ===');
    const [pending] = await connection.execute(`
      SELECT id, email, status, email_verified 
      FROM affiliates 
      WHERE email_verified = FALSE OR status = 'pending'
    `);
    console.log('Pending affiliates:', pending);
    
    await connection.end();
  } catch (error) {
    console.error('Database check error:', error);
  }
}

debugAffiliateVerification();