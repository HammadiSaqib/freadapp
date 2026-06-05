const mysql = require('mysql2/promise');

async function checkAffiliateStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    // Get all affiliates and their admin_id status
    const [affiliates] = await connection.execute(`
      SELECT 
        a.id, 
        a.email, 
        a.first_name, 
        a.last_name, 
        a.admin_id,
        a.plan_type,
        a.status,
        s.id as subscription_id,
        s.plan_name,
        s.status as subscription_status
      FROM affiliates a
      LEFT JOIN subscriptions s ON a.admin_id = s.user_id
      ORDER BY a.id
    `);
    
    console.log('=== Affiliate Status Report ===');
    affiliates.forEach(affiliate => {
      console.log(`
ID: ${affiliate.id}
Email: ${affiliate.email}
Name: ${affiliate.first_name} ${affiliate.last_name}
Admin ID: ${affiliate.admin_id || 'NULL (No admin profile)'}
Plan Type: ${affiliate.plan_type || 'NULL'}
Status: ${affiliate.status}
Subscription: ${affiliate.subscription_id ? `${affiliate.plan_name} (${affiliate.subscription_status})` : 'None'}
---`);
    });
    
  } finally {
    await connection.end();
  }
}

checkAffiliateStatus().catch(console.error);