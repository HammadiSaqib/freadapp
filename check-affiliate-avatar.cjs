const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Empty password for XAMPP default
  database: 'creditrepair_db',
  port: 3306
};

async function checkAffiliateAvatar() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    // Check affiliate avatar data
    const [affiliate] = await connection.execute(
      'SELECT id, email, first_name, last_name, avatar FROM affiliates WHERE email = ?',
      ['affi@gmail.com']
    );
    
    if (affiliate.length === 0) {
      console.log('❌ Affiliate not found with email: affi@gmail.com');
      return;
    }
    
    const affiliateData = affiliate[0];
    console.log('\n=== AFFILIATE AVATAR DATA ===');
    console.log('ID:', affiliateData.id);
    console.log('Email:', affiliateData.email);
    console.log('Name:', affiliateData.first_name, affiliateData.last_name);
    console.log('Avatar:', affiliateData.avatar);
    console.log('Avatar type:', typeof affiliateData.avatar);
    console.log('Avatar is null:', affiliateData.avatar === null);
    console.log('Avatar is undefined:', affiliateData.avatar === undefined);
    
    // Check if avatar column exists in affiliates table
    const [columns] = await connection.execute(
      'SHOW COLUMNS FROM affiliates LIKE "avatar"'
    );
    
    console.log('\n=== AVATAR COLUMN INFO ===');
    if (columns.length > 0) {
      console.log('✅ Avatar column exists in affiliates table');
      console.log('Column details:', columns[0]);
    } else {
      console.log('❌ Avatar column does NOT exist in affiliates table');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

checkAffiliateAvatar();