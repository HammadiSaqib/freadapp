const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db',
  port: 3306
};

async function checkAffiliatePlanTypes() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    // Check affiliate plan_type data
    const [affiliates] = await connection.execute(
      'SELECT id, email, first_name, last_name, admin_id, plan_type, status FROM affiliates ORDER BY id'
    );
    
    console.log('\n=== AFFILIATE PLAN TYPES ===');
    console.log('Total affiliates:', affiliates.length);
    
    const planTypeCounts = {};
    
    affiliates.forEach(affiliate => {
      const planType = affiliate.plan_type || 'null';
      planTypeCounts[planType] = (planTypeCounts[planType] || 0) + 1;
      
      console.log(`ID: ${affiliate.id} | ${affiliate.first_name} ${affiliate.last_name} | ${affiliate.email}`);
      console.log(`  Admin ID: ${affiliate.admin_id || 'None'} | Plan Type: ${affiliate.plan_type} | Status: ${affiliate.status}`);
      console.log('');
    });
    
    console.log('\n=== PLAN TYPE SUMMARY ===');
    Object.entries(planTypeCounts).forEach(([planType, count]) => {
      console.log(`${planType}: ${count} affiliates`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

checkAffiliatePlanTypes();