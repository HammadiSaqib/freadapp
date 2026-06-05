const mysql = require('mysql2/promise');

async function checkPlans() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔍 Checking subscription plans and their page permissions...');
    
    const [plans] = await connection.execute(
      'SELECT id, name, description, price, billing_cycle, features, page_permissions, is_active FROM subscription_plans ORDER BY sort_order ASC'
    );
    
    console.log(`📊 Found ${plans.length} subscription plans:`);
    console.log('');
    
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. Plan: ${plan.name}`);
      console.log(`   - ID: ${plan.id}`);
      console.log(`   - Price: $${plan.price} (${plan.billing_cycle})`);
      console.log(`   - Active: ${plan.is_active ? 'Yes' : 'No'}`);
      console.log(`   - Description: ${plan.description || 'N/A'}`);
      
      try {
        const features = JSON.parse(plan.features || '[]');
        console.log(`   - Features (${features.length}): ${features.slice(0, 3).join(', ')}${features.length > 3 ? '...' : ''}`);
      } catch (e) {
        console.log(`   - Features: Error parsing - ${plan.features}`);
      }
      
      try {
        const pagePermissions = plan.page_permissions ? JSON.parse(plan.page_permissions) : [];
        console.log(`   - Page Permissions (${pagePermissions.length}): ${pagePermissions.length > 0 ? pagePermissions.join(', ') : 'None configured'}`);
      } catch (e) {
        console.log(`   - Page Permissions: Error parsing - ${plan.page_permissions}`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPlans();