const mysql = require('mysql2/promise');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Empty password for XAMPP default
  database: 'creditrepair_db',
  port: 3306
};

async function testAvatarUpload() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    // Check current avatar status before upload
    console.log('\n=== BEFORE UPLOAD ===');
    const [beforeUpload] = await connection.execute(
      'SELECT id, email, first_name, last_name, avatar FROM affiliates WHERE email = ?',
      ['affi@gmail.com']
    );
    
    if (beforeUpload.length === 0) {
      console.log('❌ Affiliate not found with email: affi@gmail.com');
      return;
    }
    
    const affiliateData = beforeUpload[0];
    console.log('Affiliate ID:', affiliateData.id);
    console.log('Email:', affiliateData.email);
    console.log('Name:', affiliateData.first_name, affiliateData.last_name);
    console.log('Current Avatar:', affiliateData.avatar);
    
    // Test direct database update
    console.log('\n=== TESTING DIRECT DATABASE UPDATE ===');
    const testAvatarUrl = '/uploads/avatars/test-avatar-' + Date.now() + '.jpg';
    
    const [updateResult] = await connection.execute(
      'UPDATE affiliates SET avatar = ? WHERE email = ?',
      [testAvatarUrl, 'affi@gmail.com']
    );
    
    console.log('Update result:', updateResult);
    console.log('Affected rows:', updateResult.affectedRows);
    console.log('Changed rows:', updateResult.changedRows);
    
    // Check if the update worked
    console.log('\n=== AFTER DIRECT UPDATE ===');
    const [afterUpdate] = await connection.execute(
      'SELECT id, email, first_name, last_name, avatar FROM affiliates WHERE email = ?',
      ['affi@gmail.com']
    );
    
    const updatedData = afterUpdate[0];
    console.log('Updated Avatar:', updatedData.avatar);
    console.log('Update successful:', updatedData.avatar === testAvatarUrl);
    
    // Clean up - set back to null
    await connection.execute(
      'UPDATE affiliates SET avatar = NULL WHERE email = ?',
      ['affi@gmail.com']
    );
    
    console.log('\n✅ Test completed - avatar field can be updated directly');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

testAvatarUpload();