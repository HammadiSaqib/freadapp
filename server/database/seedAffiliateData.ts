import { executeQuery, executeTransaction } from './mysqlConfig.js';

// Seed commission tiers table with default tiers
export async function seedCommissionTiers(): Promise<void> {
  try {
    console.log('🌱 Seeding commission tiers...');
    
    // Check if tiers already exist
    const existingTiers = await executeQuery('SELECT COUNT(*) as count FROM commission_tiers');
    if (existingTiers[0]?.count > 0) {
      console.log('ℹ️  Commission tiers already exist, skipping...');
      return;
    }
    
    const tiers = [
      {
        name: 'Bronze',
        min_referrals: 0,
        commission_rate: 15.00,
        bonuses: JSON.stringify(['Basic support', 'Monthly reports'])
      },
      {
        name: 'Silver',
        min_referrals: 10,
        commission_rate: 20.00,
        bonuses: JSON.stringify(['Priority support', 'Weekly reports', 'Marketing materials'])
      },
      {
        name: 'Gold',
        min_referrals: 25,
        commission_rate: 25.00,
        bonuses: JSON.stringify(['Dedicated support', 'Daily reports', 'Custom materials', 'Performance bonuses'])
      },
      {
        name: 'Platinum',
        min_referrals: 50,
        commission_rate: 30.00,
        bonuses: JSON.stringify(['VIP support', 'Real-time analytics', 'Custom landing pages', 'Quarterly bonuses', 'Exclusive events'])
      }
    ];
    
    for (const tier of tiers) {
      await executeQuery(
        `INSERT INTO commission_tiers (name, min_referrals, commission_rate, bonuses, is_active) 
         VALUES (?, ?, ?, ?, true)`,
        [tier.name, tier.min_referrals, tier.commission_rate, tier.bonuses]
      );
    }
    
    console.log('✅ Commission tiers seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding commission tiers:', error);
    throw error;
  }
}

// Seed affiliate commissions table with sample data
export async function seedAffiliateCommissions(): Promise<void> {
  try {
    console.log('🌱 Seeding affiliate commissions...');
    
    // Check if commissions already exist
    const existingCommissions = await executeQuery('SELECT COUNT(*) as count FROM affiliate_commissions');
    if (existingCommissions[0]?.count > 0) {
      console.log('ℹ️  Affiliate commissions already exist, skipping...');
      return;
    }
    
    // Get first affiliate ID for sample data
    const affiliates = await executeQuery('SELECT id FROM affiliates LIMIT 1');
    if (affiliates.length === 0) {
      console.log('⚠️  No affiliates found, skipping commission seeding');
      return;
    }
    
    const affiliateId = affiliates[0].id;
    
    // Get first user ID for customer data
    const users = await executeQuery('SELECT id, first_name, last_name, email FROM users LIMIT 5');
    if (users.length === 0) {
      console.log('⚠️  No users found, skipping commission seeding');
      return;
    }
    
    const sampleCommissions = [
      {
        affiliate_id: affiliateId,
        customer_id: users[0]?.id || 1,
        customer_name: `${users[0]?.first_name || 'John'} ${users[0]?.last_name || 'Doe'}`,
        customer_email: users[0]?.email || 'john.doe@example.com',
        order_value: 299.99,
        commission_rate: 20.00,
        commission_amount: 59.99,
        status: 'paid',
        tier: 'Silver',
        product: 'Score Machine - Monthly',
        order_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        payment_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        commission_type: 'signup',
        tracking_code: 'CR-2024-001'
      },
      {
        affiliate_id: affiliateId,
        customer_id: users[1]?.id || 2,
        customer_name: `${users[1]?.first_name || 'Jane'} ${users[1]?.last_name || 'Smith'}`,
        customer_email: users[1]?.email || 'jane.smith@example.com',
        order_value: 199.99,
        commission_rate: 20.00,
        commission_amount: 39.99,
        status: 'approved',
        tier: 'Silver',
        product: 'Credit Repair Basic - Monthly',
        order_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        commission_type: 'signup',
        tracking_code: 'CR-2024-002'
      },
      {
        affiliate_id: affiliateId,
        customer_id: users[2]?.id || 3,
        customer_name: `${users[2]?.first_name || 'Mike'} ${users[2]?.last_name || 'Johnson'}`,
        customer_email: users[2]?.email || 'mike.johnson@example.com',
        order_value: 499.99,
        commission_rate: 25.00,
        commission_amount: 124.99,
        status: 'pending',
        tier: 'Gold',
        product: 'Credit Repair Premium - Yearly',
        order_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        commission_type: 'upgrade',
        tracking_code: 'CR-2024-003'
      },
      {
        affiliate_id: affiliateId,
        customer_id: users[3]?.id || 4,
        customer_name: `${users[3]?.first_name || 'Sarah'} ${users[3]?.last_name || 'Wilson'}`,
        customer_email: users[3]?.email || 'sarah.wilson@example.com',
        order_value: 99.99,
        commission_rate: 15.00,
        commission_amount: 14.99,
        status: 'paid',
        tier: 'Bronze',
        product: 'Credit Report Analysis',
        order_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        payment_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        commission_type: 'monthly',
        tracking_code: 'CR-2024-004'
      },
      {
        affiliate_id: affiliateId,
        customer_id: users[4]?.id || 5,
        customer_name: `${users[4]?.first_name || 'David'} ${users[4]?.last_name || 'Brown'}`,
        customer_email: users[4]?.email || 'david.brown@example.com',
        order_value: 799.99,
        commission_rate: 30.00,
        commission_amount: 239.99,
        status: 'approved',
        tier: 'Platinum',
        product: 'Credit Repair Enterprise - Yearly',
        order_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        commission_type: 'bonus',
        tracking_code: 'CR-2024-005'
      }
    ];
    
    for (const commission of sampleCommissions) {
      await executeQuery(
        `INSERT INTO affiliate_commissions (
          affiliate_id, customer_id, customer_name, customer_email, 
          order_value, commission_rate, commission_amount, status, 
          tier, product, commission_level, affiliate_type_at_payout, payer_user_id, subscription_id,
          order_date, payment_date, commission_type, tracking_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          commission.affiliate_id,
          commission.customer_id,
          commission.customer_name,
          commission.customer_email,
          commission.order_value,
          commission.commission_rate,
          commission.commission_amount,
          commission.status,
          commission.tier,
          commission.product,
          1,
          'paid',
          commission.customer_id,
          null,
          commission.order_date,
          commission.payment_date,
          commission.commission_type,
          commission.tracking_code
        ]
      );
    }
    
    console.log('✅ Affiliate commissions seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding affiliate commissions:', error);
    throw error;
  }
}

// Main seeding function
export async function seedAffiliateData(): Promise<void> {
  try {
    console.log('🌱 Starting affiliate data seeding...');
    await seedCommissionTiers();
    await seedAffiliateCommissions();
    console.log('✅ Affiliate data seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding affiliate data:', error);
    throw error;
  }
}
