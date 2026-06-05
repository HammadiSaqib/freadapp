const mysql = require('mysql2/promise');

async function debugClientCreation() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Testing client creation with all columns...');
    
    // Test the exact INSERT statement from the code
    const sql = `INSERT INTO clients (
      user_id, first_name, last_name, email, phone, date_of_birth,
      employment_status, annual_income, ssn_last_four, address, city, state, zip_code, status,
      credit_score, target_score, notes, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      3, // user_id (using the super admin user ID)
      'Test', // first_name
      'Client', // last_name
      'testclient@example.com', // email
      '555-1234', // phone
      '1990-01-01', // date_of_birth
      'employed', // employment_status
      50000, // annual_income
      '1234', // ssn_last_four
      '123 Test St', // address
      'Test City', // city
      'CA', // state
      '12345', // zip_code
      'active', // status
      700, // credit_score
      750, // target_score
      'Test notes', // notes
      3, // created_by (using the super admin user ID)
      3  // updated_by (using the super admin user ID)
    ];
    
    console.log('📋 SQL:', sql);
    console.log('📋 Params:', params);
    
    const [result] = await connection.execute(sql, params);
    console.log('✅ Client created successfully:', result);
    
    // Clean up - delete the test client
    await connection.execute('DELETE FROM clients WHERE email = ?', ['testclient@example.com']);
    console.log('🧹 Test client cleaned up');
    
  } catch (error) {
    console.error('❌ Error creating client:', error.message);
    console.error('📋 Error code:', error.code);
    console.error('📋 SQL State:', error.sqlState);
  } finally {
    await connection.end();
  }
}

debugClientCreation();