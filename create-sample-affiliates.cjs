const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'creditrepair_db'
};

async function createSampleAffiliates() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check if we have an admin user to associate affiliates with
    const [adminUsers] = await connection.execute(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }
    
    const adminId = adminUsers[0].id;
    console.log(`✅ Found admin user with ID: ${adminId}`);
    
    // Sample affiliate accounts with real names
    const sampleAffiliates = [
      {
        email: 'john.smith@affiliate.com',
        password: 'affiliate123',
        first_name: 'John',
        last_name: 'Smith',
        company_name: 'Smith Marketing Solutions',
        phone: '(555) 123-4567',
        commission_rate: 20.00
      },
      {
        email: 'sarah.johnson@affiliate.com',
        password: 'affiliate123',
        first_name: 'Sarah',
        last_name: 'Johnson',
        company_name: 'Johnson Digital Agency',
        phone: '(555) 234-5678',
        commission_rate: 25.00
      },
      {
        email: 'mike.wilson@affiliate.com',
        password: 'affiliate123',
        first_name: 'Mike',
        last_name: 'Wilson',
        company_name: 'Wilson Lead Generation',
        phone: '(555) 345-6789',
        commission_rate: 22.50
      },
      {
        email: 'testaffiliate@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'Affiliate',
        company_name: 'Test Marketing Co',
        phone: '(555) 456-7890',
        commission_rate: 15.00
      }
    ];
    
    console.log('🌱 Creating sample affiliate accounts...');
    
    for (const affiliate of sampleAffiliates) {
      try {
        // Check if affiliate already exists
        const [existing] = await connection.execute(
          'SELECT id FROM affiliates WHERE email = ?',
          [affiliate.email]
        );
        
        if (existing.length > 0) {
          console.log(`ℹ️  Affiliate ${affiliate.email} already exists, skipping...`);
          continue;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(affiliate.password, 12);
        
        // Insert affiliate
        const [result] = await connection.execute(`
          INSERT INTO affiliates (
            admin_id, email, password_hash, first_name, last_name, 
            company_name, phone, commission_rate, status, email_verified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', true)
        `, [
          adminId,
          affiliate.email,
          hashedPassword,
          affiliate.first_name,
          affiliate.last_name,
          affiliate.company_name,
          affiliate.phone,
          affiliate.commission_rate
        ]);
        
        const affiliateId = result.insertId;
        const username = `${affiliate.first_name}${affiliate.last_name}`.toLowerCase().replace(/\s+/g, '');
        
        console.log(`✅ Created affiliate: ${affiliate.first_name} ${affiliate.last_name}`);
        console.log(`   📧 Email: ${affiliate.email}`);
        console.log(`   🔗 Referral Link: http://localhost:3001/referrallandingpage/${username}`);
        console.log(`   🔑 Password: ${affiliate.password}`);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Error creating affiliate ${affiliate.email}:`, error.message);
      }
    }
    
    console.log('🎉 Sample affiliate creation completed!');
    console.log('');
    console.log('📋 Summary of Created Affiliates:');
    console.log('================================');
    console.log('1. John Smith - http://localhost:3001/referrallandingpage/johnsmith');
    console.log('2. Sarah Johnson - http://localhost:3001/referrallandingpage/sarahjohnson');
    console.log('3. Mike Wilson - http://localhost:3001/referrallandingpage/mikewilson');
    console.log('4. Test Affiliate - http://localhost:3001/referrallandingpage/testaffiliate');
    console.log('');
    console.log('💡 You can now login with any of these accounts and see their personalized referral links!');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('');
    console.log('💡 Make sure your MySQL server is running and the database exists.');
    console.log('   You may need to update the database configuration in this script.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createSampleAffiliates();