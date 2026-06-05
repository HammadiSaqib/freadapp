const mysql = require('mysql2/promise');

async function debugVerificationQuery() {
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
    const testCode = '829744';
    
    console.log('=== Debugging verification query ===');
    console.log(`Email: ${testEmail}`);
    console.log(`Code: ${testCode}`);
    console.log(`Current time: ${new Date()}`);
    
    // Test the exact query from the API
    const codeQuery = `
      SELECT * FROM email_verification_codes 
      WHERE email = ? AND code = ? AND type = 'affiliate_registration' 
      AND used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    console.log('\n=== Executing query ===');
    console.log('Query:', codeQuery);
    console.log('Parameters:', [testEmail, testCode]);
    
    const [verificationRecord] = await connection.execute(codeQuery, [testEmail, testCode]);
    
    console.log('\n=== Query result ===');
    console.log('Records found:', verificationRecord.length);
    
    if (verificationRecord.length > 0) {
      console.log('Record details:', verificationRecord[0]);
    } else {
      console.log('No records found. Let\'s check each condition separately...');
      
      // Check email match
      const [emailCheck] = await connection.execute(
        'SELECT * FROM email_verification_codes WHERE email = ?', 
        [testEmail]
      );
      console.log(`\nEmail matches: ${emailCheck.length} records`);
      
      // Check code match
      const [codeCheck] = await connection.execute(
        'SELECT * FROM email_verification_codes WHERE code = ?', 
        [testCode]
      );
      console.log(`Code matches: ${codeCheck.length} records`);
      
      // Check type
      const [typeCheck] = await connection.execute(
        'SELECT * FROM email_verification_codes WHERE type = ?', 
        ['affiliate_registration']
      );
      console.log(`Type matches: ${typeCheck.length} records`);
      
      // Check used status
      const [usedCheck] = await connection.execute(
        'SELECT * FROM email_verification_codes WHERE used = FALSE'
      );
      console.log(`Not used: ${usedCheck.length} records`);
      
      // Check expiration
      const [expiredCheck] = await connection.execute(
        'SELECT * FROM email_verification_codes WHERE expires_at > NOW()'
      );
      console.log(`Not expired: ${expiredCheck.length} records`);
      
      // Check the specific record
      const [specificRecord] = await connection.execute(
        'SELECT *, NOW() as current_db_time FROM email_verification_codes WHERE email = ? AND code = ?', 
        [testEmail, testCode]
      );
      
      if (specificRecord.length > 0) {
        const record = specificRecord[0];
        console.log('\n=== Specific record analysis ===');
        console.log('Record:', {
          id: record.id,
          email: record.email,
          code: record.code,
          type: record.type,
          used: record.used,
          expires_at: record.expires_at,
          current_db_time: record.current_db_time,
          is_expired: new Date(record.current_db_time) > new Date(record.expires_at)
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugVerificationQuery();