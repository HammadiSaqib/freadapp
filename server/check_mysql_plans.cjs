const mysql = require('mysql2/promise');

async function checkProfessionalPlan() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db'
  });

  try {
    console.log('Connected to MySQL database');
    
    // Check if subscription_plans table exists
    const [tables] = await connection.execute(
      'SHOW TABLES LIKE "subscription_plans"'
    );
    
    if (tables.length === 0) {
      console.log('subscription_plans table does not exist');
      return;
    }
    
    // Get Professional plan
    const [plans] = await connection.execute(
      'SELECT name, page_permissions FROM subscription_plans WHERE name = ?',
      ['Professional']
    );
    
    console.log('Professional plan:', JSON.stringify(plans, null, 2));
    
    if (plans.length > 0 && !plans[0].page_permissions) {
      console.log('\nProfessional plan has no page_permissions. Updating...');
      
      const professionalPermissions = JSON.stringify([
        'dashboard',
        'clients', 
        'reports',
        'credit-report',
        'disputes',
        'ai-coach',
        'school',
        'analytics',
        'settings',
        'support'
      ]);
      
      await connection.execute(
        'UPDATE subscription_plans SET page_permissions = ? WHERE name = ?',
        [professionalPermissions, 'Professional']
      );
      
      console.log('✅ Professional plan updated with page permissions');
    }

    // Update Stripe IDs for specific plan (e.g., plan ID 17)
    try {
      const targetPlanId = 17;
      const [target] = await connection.execute(
        'SELECT id, name, stripe_monthly_price_id, stripe_product_id FROM subscription_plans WHERE id = ?',
        [targetPlanId]
      );
      if (Array.isArray(target) && target.length > 0) {
        console.log(`\nFound plan ID ${targetPlanId} (${target[0].name}). Updating Stripe IDs...`);
        await connection.execute(
          'UPDATE subscription_plans SET stripe_monthly_price_id = ?, stripe_product_id = ? WHERE id = ?',
          ['price_1STirkFJqv88HmtneBGa4Dkn', 'prod_TQa1FeeMraEm6Y', targetPlanId]
        );
        console.log('✅ Plan Stripe IDs updated:', {
          planId: targetPlanId,
          stripe_monthly_price_id: 'price_1STirkFJqv88HmtneBGa4Dkn',
          stripe_product_id: 'prod_TQa1FeeMraEm6Y'
        });
      } else {
        console.log(`\nPlan ID ${targetPlanId} not found. Skipping Stripe ID update.`);
      }
    } catch (stripeUpdateErr) {
      console.error('⚠️ Error updating plan Stripe IDs:', stripeUpdateErr);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkProfessionalPlan();