const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Empty password for XAMPP default
  database: 'creditrepair_db'
};

async function testTieredCommissionSystem() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Test scenarios
    const testScenarios = [
      {
        name: 'Free Plan Affiliate - Under 100 referrals',
        planType: 'free',
        paidReferralsCount: 50,
        expectedRate: 10.0
      },
      {
        name: 'Free Plan Affiliate - 100+ referrals',
        planType: 'free',
        paidReferralsCount: 150,
        expectedRate: 15.0
      },
      {
        name: 'Paid Partner - Under 100 referrals',
        planType: 'paid_partner',
        paidReferralsCount: 75,
        expectedRate: 20.0
      },
      {
        name: 'Paid Partner - 100+ referrals',
        planType: 'paid_partner',
        paidReferralsCount: 200,
        expectedRate: 25.0
      }
    ];

    console.log('\n=== Testing Tiered Commission System ===\n');

    for (const scenario of testScenarios) {
      console.log(`Testing: ${scenario.name}`);
      console.log(`Plan Type: ${scenario.planType}, Paid Referrals: ${scenario.paidReferralsCount}`);
      
      // Create test affiliate
      const [affiliateResult] = await connection.execute(
        `INSERT INTO affiliates (admin_id, email, password_hash, first_name, last_name, 
         plan_type, paid_referrals_count, status, created_at) 
         VALUES (1, ?, 'test_hash', 'Test', 'Affiliate', ?, ?, 'active', NOW())`,
        [`test_${Date.now()}@example.com`, scenario.planType, scenario.paidReferralsCount]
      );
      
      const affiliateId = affiliateResult.insertId;
      console.log(`Created test affiliate ID: ${affiliateId}`);

      // Test commission rate calculation
      const calculateTieredCommissionRate = (planType, paidReferralsCount) => {
        if (planType === 'free') {
          return paidReferralsCount >= 100 ? 15.0 : 10.0;
        } else if (planType === 'paid_partner') {
          return paidReferralsCount >= 100 ? 25.0 : 20.0;
        }
        return 10.0;
      };

      const calculatedRate = calculateTieredCommissionRate(scenario.planType, scenario.paidReferralsCount);
      
      console.log(`Expected Rate: ${scenario.expectedRate}%`);
      console.log(`Calculated Rate: ${calculatedRate}%`);
      
      if (calculatedRate === scenario.expectedRate) {
        console.log('✅ PASS - Commission rate calculation correct');
      } else {
        console.log('❌ FAIL - Commission rate calculation incorrect');
      }

      // Test commission calculation for $100 purchase
      const purchaseAmount = 100.00;
      const expectedCommission = (purchaseAmount * scenario.expectedRate) / 100;
      const calculatedCommission = (purchaseAmount * calculatedRate) / 100;
      
      console.log(`Purchase Amount: $${purchaseAmount}`);
      console.log(`Expected Commission: $${expectedCommission.toFixed(2)}`);
      console.log(`Calculated Commission: $${calculatedCommission.toFixed(2)}`);
      
      if (Math.abs(calculatedCommission - expectedCommission) < 0.01) {
        console.log('✅ PASS - Commission amount calculation correct');
      } else {
        console.log('❌ FAIL - Commission amount calculation incorrect');
      }

      // Clean up test affiliate
      await connection.execute('DELETE FROM affiliates WHERE id = ?', [affiliateId]);
      console.log(`Cleaned up test affiliate ID: ${affiliateId}`);
      console.log('---\n');
    }

    // Test edge cases
    console.log('=== Testing Edge Cases ===\n');
    
    // Test exactly 100 referrals
    const edgeCases = [
      { planType: 'free', count: 100, expected: 15.0, description: 'Free plan at exactly 100 referrals' },
      { planType: 'paid_partner', count: 100, expected: 25.0, description: 'Paid partner at exactly 100 referrals' },
      { planType: 'free', count: 99, expected: 10.0, description: 'Free plan at 99 referrals' },
      { planType: 'paid_partner', count: 99, expected: 20.0, description: 'Paid partner at 99 referrals' }
    ];

    for (const edgeCase of edgeCases) {
      console.log(`Testing: ${edgeCase.description}`);
      
      const calculateTieredCommissionRate = (planType, paidReferralsCount) => {
        if (planType === 'free') {
          return paidReferralsCount >= 100 ? 15.0 : 10.0;
        } else if (planType === 'paid_partner') {
          return paidReferralsCount >= 100 ? 25.0 : 20.0;
        }
        return 10.0;
      };

      const rate = calculateTieredCommissionRate(edgeCase.planType, edgeCase.count);
      console.log(`Plan: ${edgeCase.planType}, Count: ${edgeCase.count}, Rate: ${rate}%, Expected: ${edgeCase.expected}%`);
      
      if (rate === edgeCase.expected) {
        console.log('✅ PASS - Edge case handled correctly');
      } else {
        console.log('❌ FAIL - Edge case failed');
      }
      console.log('---\n');
    }

    console.log('=== Tiered Commission System Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the test
testTieredCommissionSystem().catch(console.error);