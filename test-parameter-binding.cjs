const mysql = require('mysql2/promise');

const config = {
  host: '72.61.2.28',
  port: 3306,
  user: 'root',
  password: 'Creditrepair2024!',
  database: 'creditrepair_db'
};

async function testParameterBinding() {
  let connection;
  
  try {
    console.log('🔗 Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully');
    
    // Test 1: Simple query without parameters
    console.log('\n📋 Test 1: Simple query without parameters');
    const [rows1] = await connection.execute('SELECT COUNT(*) as count FROM activities');
    console.log('✅ Activities count:', rows1[0].count);
    
    // Test 2: Query with single parameter
    console.log('\n📋 Test 2: Query with single parameter');
    const [rows2] = await connection.execute('SELECT * FROM activities WHERE id = ? LIMIT 1', [1]);
    console.log('✅ Single parameter query result:', rows2.length > 0 ? 'Found record' : 'No record');
    
    // Test 3: Query with multiple parameters
    console.log('\n📋 Test 3: Query with multiple parameters');
    const [rows3] = await connection.execute(
      'SELECT * FROM activities WHERE id > ? AND id < ? LIMIT 2', 
      [0, 10]
    );
    console.log('✅ Multiple parameters query result:', rows3.length, 'records');
    
    // Test 4: Test with credit_report_history table
    console.log('\n📋 Test 4: Test credit_report_history with parameters');
    const [rows4] = await connection.execute(
      'SELECT id, client_id, platform, status FROM credit_report_history WHERE client_id = ? LIMIT 1', 
      [1]
    );
    console.log('✅ Credit report history query result:', rows4.length, 'records');
    
    // Test 5: Test groups table with backticks
    console.log('\n📋 Test 5: Test groups table with backticks');
    const [rows5] = await connection.execute('SELECT COUNT(*) as count FROM `groups`');
    console.log('✅ Groups count:', rows5[0].count);
    
    // Test 6: Test groups table with parameters
    console.log('\n📋 Test 6: Test groups table with parameters');
    const [rows6] = await connection.execute('SELECT * FROM `groups` WHERE id = ? LIMIT 1', [1]);
    console.log('✅ Groups with parameter:', rows6.length, 'records');
    
    // Test 7: Test potential problematic query patterns
    console.log('\n📋 Test 7: Test complex query with multiple JOINs');
    const complexQuery = `
      SELECT g.id, g.name, u.first_name, u.last_name
      FROM \`groups\` g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
      LIMIT 1
    `;
    const [rows7] = await connection.execute(complexQuery, [1]);
    console.log('✅ Complex JOIN query result:', rows7.length, 'records');
    
    console.log('\n🎉 All parameter binding tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during parameter binding test:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    
    // Check for specific parameter binding errors
    if (error.message.includes('mysqld_stmt_execute')) {
      console.error('🚨 PARAMETER BINDING ISSUE DETECTED!');
      console.error('This suggests a mismatch between query placeholders (?) and provided parameters');
    }
    
    if (error.message.includes('Incorrect arguments')) {
      console.error('🚨 INCORRECT ARGUMENTS ERROR!');
      console.error('This suggests parameter count or type mismatch');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

testParameterBinding();