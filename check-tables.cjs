const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('🔍 Checking all tables in the database...\n');

    // Show all tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available Tables:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    console.log('\n');

    // Look for referral-related tables
    const referralTables = tables.filter(table => 
      Object.values(table)[0].toLowerCase().includes('referral') ||
      Object.values(table)[0].toLowerCase().includes('refer')
    );
    
    console.log('🔗 Referral-related tables:');
    referralTables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    console.log('\n');

    // Check affiliate_referrals table if it exists
    const affiliateReferralsExists = tables.some(table => 
      Object.values(table)[0] === 'affiliate_referrals'
    );
    
    if (affiliateReferralsExists) {
      console.log('📊 Checking affiliate_referrals table...');
      const [referrals] = await connection.execute(`
        SELECT * FROM affiliate_referrals WHERE affiliate_id = 31
      `);
      console.log('Referrals from affiliate_referrals:');
      console.log(referrals);
      console.log('\n');
    }

    // Check user_referrals table if it exists
    const userReferralsExists = tables.some(table => 
      Object.values(table)[0] === 'user_referrals'
    );
    
    if (userReferralsExists) {
      console.log('📊 Checking user_referrals table...');
      const [referrals] = await connection.execute(`
        SELECT * FROM user_referrals WHERE referrer_id = 31
      `);
      console.log('Referrals from user_referrals:');
      console.log(referrals);
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkTables();