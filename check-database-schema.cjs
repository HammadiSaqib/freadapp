const mysql = require('mysql2/promise');

const config = {
  host: '103.127.29.89',
  user: 'root',
  password: 'Creditrepair@123',
  database: 'creditrepair_db',
  port: 3306,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  ssl: false
};

// Reference tables from the SQL files
const referenceTables = [
  'activities', 'admin_notifications', 'admin_profiles', 'admin_subscriptions',
  'affiliates', 'affiliate_clicks', 'affiliate_commissions', 'affiliate_notification_settings',
  'affiliate_payment_history', 'affiliate_payment_settings', 'affiliate_referrals',
  'agent_performance', 'analytics', 'article_interactions', 'audit_logs', 'banks',
  'billing_transactions', 'calendar_events', 'cards', 'chat_messages', 'clients',
  'comment_likes', 'commission_payments', 'commission_tiers', 'community_posts',
  'courses', 'course_categories', 'course_chapters', 'course_enrollments',
  'course_materials', 'course_modules', 'course_quizzes', 'course_videos',
  'credit_reports', 'credit_report_history', 'disputes', 'email_verification_codes',
  'event_registrations', 'faqs', 'faq_interactions', 'funding_requests',
  'groups', 'group_members', 'group_posts', 'invitations', 'knowledge_articles',
  'password_reset_codes', 'affiliate_password_reset_codes', 'pending_registrations', 'plan_course_associations',
  'post_comments', 'post_likes', 'post_reactions', 'post_shares',
  'quiz_attempts', 'quiz_questions', 'stripe_config', 'subscriptions',
  'subscription_plans', 'support_general_settings', 'support_metrics',
  'support_notification_settings', 'support_team_members', 'support_working_hours',
  'system_settings', 'tickets', 'ticket_analytics', 'ticket_messages',
  'users', 'user_activities'
];

async function checkDatabaseSchema() {
  let connection;
  
  try {
    console.log('Connecting to MySQL database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully!');
    
    // Get all tables in the database
    console.log('\n=== Checking existing tables ===');
    const [tables] = await connection.execute('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0]);
    
    console.log(`Found ${existingTables.length} tables in the database:`);
    existingTables.forEach(table => console.log(`  - ${table}`));
    
    // Compare with reference tables
    console.log('\n=== Comparing with reference schema ===');
    const missingTables = referenceTables.filter(table => !existingTables.includes(table));
    const extraTables = existingTables.filter(table => !referenceTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`\nMissing tables (${missingTables.length}):`);
      missingTables.forEach(table => console.log(`  - ${table}`));
    } else {
      console.log('\n✓ All reference tables are present');
    }
    
    if (extraTables.length > 0) {
      console.log(`\nExtra tables not in reference (${extraTables.length}):`);
      extraTables.forEach(table => console.log(`  - ${table}`));
    }
    
    // Check specific table structures for key tables
    console.log('\n=== Checking key table structures ===');
    const keyTables = ['groups', 'credit_report_history', 'users', 'clients'];
    
    for (const tableName of keyTables) {
      if (existingTables.includes(tableName)) {
        try {
          const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
          console.log(`\n${tableName} table structure:`);
          columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
          });
        } catch (error) {
          console.error(`Error checking ${tableName} structure:`, error.message);
        }
      } else {
        console.log(`\n❌ ${tableName} table is missing!`);
      }
    }
    
    console.log('\n=== Schema check completed ===');
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('\nConnection was lost. This might be due to:');
      console.log('- Network connectivity issues');
      console.log('- MySQL server timeout settings');
      console.log('- Firewall blocking the connection');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
}

checkDatabaseSchema();