const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Empty password for XAMPP default
  database: 'creditrepair_db'
};

async function addSampleCommissionData() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // First, check if there are any affiliates
    const [affiliates] = await connection.execute(
      'SELECT id, email, first_name, last_name, plan_type FROM affiliates WHERE status = "active" LIMIT 1'
    );

    if (affiliates.length === 0) {
      console.log('No active affiliates found. Creating a test affiliate...');
      
      // Create a test affiliate
      const [affiliateResult] = await connection.execute(
        `INSERT INTO affiliates (admin_id, email, password_hash, first_name, last_name, 
         plan_type, paid_referrals_count, status, email_verified, created_at) 
         VALUES (1, 'test.affiliate@example.com', 'test_hash', 'Test', 'Affiliate', 'pro', 50, 'active', true, NOW())`
      );
      
      const affiliateId = affiliateResult.insertId;
      console.log(`Created test affiliate with ID: ${affiliateId}`);
      
      // Add the new affiliate to our list
      affiliates.push({
        id: affiliateId,
        email: 'test.affiliate@example.com',
        first_name: 'Test',
        last_name: 'Affiliate',
        plan_type: 'pro'
      });
    }

    const affiliate = affiliates[0];
    console.log(`Using affiliate: ${affiliate.first_name} ${affiliate.last_name} (ID: ${affiliate.id})`);

    // Check if commission data already exists
    const [existingCommissions] = await connection.execute(
      'SELECT COUNT(*) as count FROM affiliate_commissions WHERE affiliate_id = ?',
      [affiliate.id]
    );

    if (existingCommissions[0].count > 0) {
      console.log(`Affiliate already has ${existingCommissions[0].count} commission records. Skipping data creation.`);
      return;
    }

    console.log('Adding sample commission data...');

    // Sample commission data for different months and statuses
    const sampleCommissions = [
      // Paid commissions from previous months
      {
        customer_name: 'John Smith',
        customer_email: 'john.smith@example.com',
        order_value: 299.99,
        commission_rate: 20.00,
        commission_amount: 59.98,
        status: 'paid',
        tier: 'Silver',
        product: 'Score Machine',
        commission_type: 'signup',
        order_date: '2024-01-15 10:30:00',
        payment_date: '2024-01-30 14:00:00'
      },
      {
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.j@example.com',
        order_value: 199.99,
        commission_rate: 20.00,
        commission_amount: 39.98,
        status: 'paid',
        tier: 'Silver',
        product: 'Credit Repair Basic',
        commission_type: 'signup',
        order_date: '2024-01-20 16:45:00',
        payment_date: '2024-01-30 14:00:00'
      },
      {
        customer_name: 'Mike Davis',
        customer_email: 'mike.davis@example.com',
        order_value: 99.99,
        commission_rate: 20.00,
        commission_amount: 19.98,
        status: 'paid',
        tier: 'Silver',
        product: 'Monthly Subscription',
        commission_type: 'monthly',
        order_date: '2024-01-25 09:15:00',
        payment_date: '2024-01-30 14:00:00'
      },
      // Current month commissions (some paid, some pending)
      {
        customer_name: 'Emily Wilson',
        customer_email: 'emily.w@example.com',
        order_value: 399.99,
        commission_rate: 20.00,
        commission_amount: 79.98,
        status: 'paid',
        tier: 'Silver',
        product: 'Credit Repair Premium',
        commission_type: 'signup',
        order_date: '2024-02-05 11:20:00',
        payment_date: '2024-02-15 10:00:00'
      },
      {
        customer_name: 'David Brown',
        customer_email: 'david.brown@example.com',
        order_value: 199.99,
        commission_rate: 20.00,
        commission_amount: 39.98,
        status: 'paid',
        tier: 'Silver',
        product: 'Credit Repair Basic',
        commission_type: 'signup',
        order_date: '2024-02-10 14:30:00',
        payment_date: '2024-02-15 10:00:00'
      },
      // Pending commissions
      {
        customer_name: 'Lisa Anderson',
        customer_email: 'lisa.a@example.com',
        order_value: 299.99,
        commission_rate: 20.00,
        commission_amount: 59.98,
        status: 'pending',
        tier: 'Silver',
        product: 'Score Machine',
        commission_type: 'signup',
        order_date: '2024-02-18 13:45:00'
      },
      {
        customer_name: 'Robert Taylor',
        customer_email: 'robert.t@example.com',
        order_value: 99.99,
        commission_rate: 20.00,
        commission_amount: 19.98,
        status: 'pending',
        tier: 'Silver',
        product: 'Monthly Subscription',
        commission_type: 'monthly',
        order_date: '2024-02-20 16:00:00'
      },
      // Bonus commissions
      {
        customer_name: 'Jennifer Lee',
        customer_email: 'jennifer.lee@example.com',
        order_value: 500.00,
        commission_rate: 25.00,
        commission_amount: 125.00,
        status: 'approved',
        tier: 'Gold',
        product: 'Tier Bonus',
        commission_type: 'bonus',
        order_date: '2024-02-01 12:00:00'
      }
    ];

    // Insert sample commissions
    for (const commission of sampleCommissions) {
      const [result] = await connection.execute(
        `INSERT INTO affiliate_commissions 
         (affiliate_id, customer_id, customer_name, customer_email, order_value, 
          commission_rate, commission_amount, status, tier, product, commission_type, 
          order_date, payment_date, tracking_code, created_at, updated_at) 
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          affiliate.id,
          commission.customer_name,
          commission.customer_email,
          commission.order_value,
          commission.commission_rate,
          commission.commission_amount,
          commission.status,
          commission.tier,
          commission.product,
          commission.commission_type,
          commission.order_date,
          commission.payment_date || null,
          `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`
        ]
      );
      
      console.log(`✅ Added commission: ${commission.customer_name} - $${commission.commission_amount} (${commission.status})`);
    }

    // Update affiliate's total earnings and referral count
    const [totalEarnings] = await connection.execute(
      'SELECT SUM(commission_amount) as total FROM affiliate_commissions WHERE affiliate_id = ? AND status = "paid"',
      [affiliate.id]
    );

    const [totalReferrals] = await connection.execute(
      'SELECT COUNT(*) as count FROM affiliate_commissions WHERE affiliate_id = ?',
      [affiliate.id]
    );

    await connection.execute(
      'UPDATE affiliates SET total_earnings = ?, total_referrals = ?, paid_referrals_count = ? WHERE id = ?',
      [
        totalEarnings[0].total || 0,
        totalReferrals[0].count || 0,
        totalReferrals[0].count || 0,
        affiliate.id
      ]
    );

    console.log('\n✅ Sample commission data added successfully!');
    console.log(`Total earnings: $${totalEarnings[0].total || 0}`);
    console.log(`Total referrals: ${totalReferrals[0].count || 0}`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
addSampleCommissionData();