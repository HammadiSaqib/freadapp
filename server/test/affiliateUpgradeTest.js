/**
 * Test script for affiliate upgrade functionality
 * This script tests the affiliate-to-admin upgrade flow when an affiliate purchases a subscription
 */

import AffiliateUpgradeService from '../services/affiliateUpgradeService.js';
import { executeQuery } from '../database/mysqlConfig.ts';

async function testAffiliateUpgrade() {
  console.log('🧪 Starting Affiliate Upgrade Test...\n');
  
  const affiliateUpgradeService = new AffiliateUpgradeService();
  
  // Test data
  const testEmail = 'test-affiliate@example.com';
  const testUserId = 999999; // Use a high ID to avoid conflicts
  const planName = 'Professional Plan';
  const planType = 'monthly';
  const amount = 99.99;
  
  try {
    // Step 1: Create a test affiliate user
    console.log('📝 Step 1: Creating test affiliate user...');
    await executeQuery(`
      INSERT INTO affiliates (id, email, first_name, last_name, phone, role, assigned_super_admin_id, created_at)
      VALUES (?, ?, 'Test', 'Affiliate', '1234567890', 'affiliate', 1, NOW())
      ON DUPLICATE KEY UPDATE email = VALUES(email)
    `, [testUserId, testEmail]);
    console.log('✅ Test affiliate created');
    
    // Step 2: Verify affiliate exists and is not in users table
    console.log('\n📝 Step 2: Verifying initial state...');
    const isAffiliate = await affiliateUpgradeService.checkIfAffiliate(testUserId);
    console.log(`✅ Is affiliate: ${isAffiliate}`);
    
    const [userExists] = await executeQuery(
      'SELECT id FROM users WHERE id = ?',
      [testUserId]
    );
    console.log(`✅ User exists in users table: ${userExists && userExists.length > 0}`);
    
    // Step 3: Test the upgrade process
    console.log('\n📝 Step 3: Testing affiliate upgrade...');
    await affiliateUpgradeService.upgradeAffiliateToAdmin(
      testUserId,
      planName,
      planType,
      amount
    );
    console.log('✅ Upgrade process completed');
    
    // Step 4: Verify the upgrade results
    console.log('\n📝 Step 4: Verifying upgrade results...');
    
    // Check if user now exists in users table
    const [upgradedUser] = await executeQuery(
      'SELECT id, email, role FROM users WHERE id = ?',
      [testUserId]
    );
    console.log(`✅ User created in users table: ${upgradedUser && upgradedUser.length > 0}`);
    if (upgradedUser && upgradedUser.length > 0) {
      console.log(`   - Role: ${upgradedUser[0].role}`);
      console.log(`   - Email: ${upgradedUser[0].email}`);
    }
    
    // Check if admin profile exists
    const [adminProfile] = await executeQuery(
      'SELECT user_id, access_level FROM admin_profiles WHERE user_id = ?',
      [testUserId]
    );
    console.log(`✅ Admin profile created: ${adminProfile && adminProfile.length > 0}`);
    if (adminProfile && adminProfile.length > 0) {
      console.log(`   - Access level: ${adminProfile[0].access_level}`);
    }
    
    // Check if subscription exists
    const [subscription] = await executeQuery(
      'SELECT user_id, plan_name, status FROM admin_subscriptions WHERE user_id = ?',
      [testUserId]
    );
    console.log(`✅ Admin subscription created: ${subscription && subscription.length > 0}`);
    if (subscription && subscription.length > 0) {
      console.log(`   - Plan: ${subscription[0].plan_name}`);
      console.log(`   - Status: ${subscription[0].status}`);
    }
    
    // Check if affiliate record is updated
    const [updatedAffiliate] = await executeQuery(
      'SELECT id, upgraded_to_admin FROM affiliates WHERE id = ?',
      [testUserId]
    );
    console.log(`✅ Affiliate record updated: ${updatedAffiliate && updatedAffiliate.length > 0}`);
    if (updatedAffiliate && updatedAffiliate.length > 0) {
      console.log(`   - Upgraded to admin: ${updatedAffiliate[0].upgraded_to_admin}`);
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup: Remove test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      await executeQuery('DELETE FROM admin_subscriptions WHERE user_id = ?', [testUserId]);
      await executeQuery('DELETE FROM admin_profiles WHERE user_id = ?', [testUserId]);
      await executeQuery('DELETE FROM users WHERE id = ?', [testUserId]);
      await executeQuery('DELETE FROM affiliates WHERE id = ?', [testUserId]);
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError);
    }
  }
}

// Run the test
testAffiliateUpgrade().catch(console.error);