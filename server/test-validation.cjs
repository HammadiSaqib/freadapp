const mysql = require('mysql2/promise');
require('dotenv').config();

async function testValidation() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db'
  });

  try {
    console.log('=== Testing Referral Validation ===');

    // Test 1: Try to create referral for non-existent user
    console.log('\n1. Testing referral creation for non-existent user...');
    try {
      await connection.execute(`
        INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, status, created_at)
        VALUES (?, ?, 0, 10.00, 'pending', NOW())
      `, [20, 99999]); // Using a user ID that doesn't exist
      
      console.log('❌ ERROR: Should have failed but didn\'t!');
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ PASS: Foreign key constraint prevented invalid referral creation');
      } else {
        console.log('⚠️  Different error occurred:', error.message);
      }
    }

    // Test 2: Try to create referral for non-existent affiliate
    console.log('\n2. Testing referral creation for non-existent affiliate...');
    
    // First create a valid user for this test
    const testEmail = `validation_test_${Date.now()}@example.com`;
    const [userResult] = await connection.execute(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'user', NOW())
    `, ['Validation', 'Test', testEmail, 'hashed_password']);
    
    const userId = userResult.insertId;
    console.log(`Created test user ${userId}: ${testEmail}`);
    
    try {
      await connection.execute(`
        INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, status, created_at)
        VALUES (?, ?, 0, 10.00, 'pending', NOW())
      `, [99999, userId]); // Using an affiliate ID that doesn't exist
      
      console.log('❌ ERROR: Should have failed but didn\'t!');
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ PASS: Foreign key constraint prevented invalid affiliate referral');
      } else {
        console.log('⚠️  Different error occurred:', error.message);
      }
    }

    // Test 3: Create valid referral (should succeed)
    console.log('\n3. Testing valid referral creation...');
    try {
      const [referralResult] = await connection.execute(`
        INSERT INTO affiliate_referrals (affiliate_id, referred_user_id, commission_amount, commission_rate, status, created_at)
        VALUES (?, ?, 0, 10.00, 'pending', NOW())
      `, [20, userId]); // Using valid affiliate and user IDs
      
      console.log(`✅ PASS: Valid referral created with ID ${referralResult.insertId}`);
    } catch (error) {
      console.log('❌ ERROR: Valid referral creation failed:', error.message);
    }

    // Test 4: Check current referrals
    console.log('\n4. Current referrals in database:');
    const [referrals] = await connection.execute(`
      SELECT r.id, r.affiliate_id, r.referred_user_id, u.email, r.status, r.commission_amount
      FROM affiliate_referrals r
      JOIN users u ON r.referred_user_id = u.id
      ORDER BY r.id DESC
      LIMIT 5
    `);

    referrals.forEach(ref => {
      console.log(`  - Referral ID ${ref.id}: affiliate ${ref.affiliate_id} -> user ${ref.referred_user_id} (${ref.email}) - status: ${ref.status}, commission: $${ref.commission_amount || 0}`);
    });

    console.log('\n🎉 Validation tests completed!');

  } catch (error) {
    console.error('❌ Error during validation tests:', error);
  } finally {
    await connection.end();
  }
}

testValidation();