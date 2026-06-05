const mysql = require('mysql2/promise');

async function updatePlanPermissions() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔍 Updating subscription plan page permissions...');
    
    // Define page permissions for each plan
    const planPermissions = {
      'Professional': [
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
      ],
      'Enterprise': [
        'dashboard',
        'clients',
        'reports', 
        'credit-report',
        'disputes',
        'ai-coach',
        'school',
        'analytics',
        'compliance',
        'automations',
        'settings',
        'support'
      ]
    };
    
    // Update Professional plan
    console.log('📝 Updating Professional plan permissions...');
    await connection.execute(
      'UPDATE subscription_plans SET page_permissions = ? WHERE name = ?',
      [JSON.stringify(planPermissions.Professional), 'Professional']
    );
    
    // Update Enterprise plan  
    console.log('📝 Updating Enterprise plan permissions...');
    await connection.execute(
      'UPDATE subscription_plans SET page_permissions = ? WHERE name = ?',
      [JSON.stringify(planPermissions.Enterprise), 'Enterprise']
    );
    
    // Verify updates
    console.log('\n✅ Verifying updates...');
    const [plans] = await connection.execute(
      'SELECT name, page_permissions FROM subscription_plans WHERE name IN (?, ?)',
      ['Professional', 'Enterprise']
    );
    
    plans.forEach(plan => {
      const permissions = JSON.parse(plan.page_permissions || '[]');
      console.log(`${plan.name}: ${permissions.length} permissions - ${permissions.slice(0, 3).join(', ')}${permissions.length > 3 ? '...' : ''}`);
    });
    
    console.log('\n🎉 Plan permissions updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating plan permissions:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updatePlanPermissions();