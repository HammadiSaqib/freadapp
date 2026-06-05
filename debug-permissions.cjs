const mysql = require('mysql2/promise');

async function debugPermissions() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('🔍 Debugging permission system...\n');
    
    // 1. Check admin user subscription status
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (users.length === 0) {
      console.log('❌ No admin users found');
      return;
    }
    
    const adminUser = users[0];
    console.log(`👤 Admin User: ${adminUser.email} (ID: ${adminUser.id})`);
    
    // 2. Check subscription status
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [adminUser.id]
    );
    
    console.log(`📋 Active Subscriptions: ${subscriptions.length}`);
    
    if (subscriptions.length === 0) {
      console.log('⚠️ Admin has no active subscription');
      console.log('✅ Expected behavior: Only "subscription" and "settings" pages should be enabled');
      console.log('✅ All other pages should be disabled\n');
    } else {
      const subscription = subscriptions[0];
      console.log(`📦 Subscription Plan: ${subscription.plan_name}`);
      
      // Get plan permissions
      const [plans] = await connection.execute(
        'SELECT * FROM subscription_plans WHERE name = ?',
        [subscription.plan_name]
      );
      
      if (plans.length > 0) {
        const plan = plans[0];
        const pagePermissions = JSON.parse(plan.page_permissions || '[]');
        console.log(`🔑 Plan Permissions (${pagePermissions.length}): ${pagePermissions.join(', ')}`);
        console.log(`✅ Expected enabled pages: ${[...pagePermissions, 'subscription'].join(', ')}\n`);
      }
    }
    
    // 3. Show all available page IDs from usePagePermissions
    const availablePages = [
      'dashboard', 'clients', 'reports', 'credit-report', 'credit-reports-scraper', 
      'credit-reports-scraper-logs', 'disputes', 'ai-coach', 'school', 'analytics', 
      'affiliate', 'affiliate-management', 'compliance', 'automation', 'settings', 
      'support', 'subscription'
    ];
    
    console.log('📄 Available Page IDs in usePagePermissions:');
    availablePages.forEach(page => console.log(`   - ${page}`));
    console.log('');
    
    // 4. Show Sidebar pageKey values (after fix)
    const sidebarPageKeys = [
      'dashboard', 'clients', 'reports', 'ai-coach', 'school', 'analytics', 
      'affiliate', 'affiliate-management', 'compliance', 'automation', 
      'subscription', 'support'
    ];
    
    console.log('🔧 Sidebar pageKey values (after fix):');
    sidebarPageKeys.forEach(key => console.log(`   - ${key}`));
    console.log('');
    
    // 5. Check for mismatches
    const mismatches = sidebarPageKeys.filter(key => !availablePages.includes(key));
    if (mismatches.length > 0) {
      console.log('❌ Page key mismatches found:');
      mismatches.forEach(key => console.log(`   - ${key} (not in AVAILABLE_PAGES)`));
    } else {
      console.log('✅ All sidebar pageKey values match AVAILABLE_PAGES');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugPermissions();