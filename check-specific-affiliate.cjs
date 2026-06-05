const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db',
  port: 3306
};

async function checkSpecificAffiliate() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    const searchTerm = 'affiliate1761451500768';
    console.log(`\n🔍 Searching for affiliate: ${searchTerm}`);
    
    // Check by email
    const [emailResults] = await connection.execute(
      'SELECT * FROM affiliates WHERE email = ?',
      [searchTerm]
    );
    
    // Check by first_name + last_name combination (no spaces)
    const [nameResults] = await connection.execute(
      'SELECT * FROM affiliates WHERE LOWER(CONCAT(first_name, last_name)) = LOWER(?)',
      [searchTerm]
    );
    
    // Check by first_name + last_name combination (with spaces removed)
    const [nameSpaceResults] = await connection.execute(
      'SELECT * FROM affiliates WHERE LOWER(REPLACE(CONCAT(first_name, " ", last_name), " ", "")) = LOWER(?)',
      [searchTerm]
    );
    
    // Check all affiliates to see what usernames would be generated
    const [allAffiliates] = await connection.execute(
      'SELECT id, email, first_name, last_name, status FROM affiliates ORDER BY id'
    );
    
    console.log('\n=== SEARCH RESULTS ===');
    console.log(`Email match: ${emailResults.length} results`);
    console.log(`Name match (no spaces): ${nameResults.length} results`);
    console.log(`Name match (spaces removed): ${nameSpaceResults.length} results`);
    
    if (emailResults.length > 0) {
      console.log('\n📧 Email matches:');
      emailResults.forEach(affiliate => {
        console.log(`  ID: ${affiliate.id} | ${affiliate.first_name} ${affiliate.last_name} | ${affiliate.email} | Status: ${affiliate.status}`);
      });
    }
    
    if (nameResults.length > 0) {
      console.log('\n👤 Name matches (no spaces):');
      nameResults.forEach(affiliate => {
        console.log(`  ID: ${affiliate.id} | ${affiliate.first_name} ${affiliate.last_name} | ${affiliate.email} | Status: ${affiliate.status}`);
      });
    }
    
    if (nameSpaceResults.length > 0) {
      console.log('\n👤 Name matches (spaces removed):');
      nameSpaceResults.forEach(affiliate => {
        console.log(`  ID: ${affiliate.id} | ${affiliate.first_name} ${affiliate.last_name} | ${affiliate.email} | Status: ${affiliate.status}`);
      });
    }
    
    console.log('\n=== ALL AFFILIATES & THEIR POTENTIAL USERNAMES ===');
    allAffiliates.forEach(affiliate => {
      const usernameNoSpaces = (affiliate.first_name + affiliate.last_name).toLowerCase();
      const usernameSpacesRemoved = (affiliate.first_name + ' ' + affiliate.last_name).replace(/\s+/g, '').toLowerCase();
      
      console.log(`ID: ${affiliate.id} | ${affiliate.first_name} ${affiliate.last_name} | ${affiliate.email}`);
      console.log(`  Status: ${affiliate.status}`);
      console.log(`  Username (no spaces): ${usernameNoSpaces}`);
      console.log(`  Username (spaces removed): ${usernameSpacesRemoved}`);
      console.log(`  Referral link: /ref/${usernameNoSpaces}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

checkSpecificAffiliate();