const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCoursePrices() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });

    console.log('🔍 Checking course prices in database...\n');

    // Get all courses with their pricing information
    const [courses] = await connection.execute(`
      SELECT id, title, price, is_free, currency, featured, difficulty
      FROM courses 
      ORDER BY id
    `);

    console.log('📊 Course Pricing Data:');
    console.log('='.repeat(80));
    
    if (courses.length === 0) {
      console.log('❌ No courses found in database');
    } else {
      courses.forEach(course => {
        console.log(`ID: ${course.id}`);
        console.log(`Title: ${course.title}`);
        console.log(`Price: $${course.price} ${course.currency || 'USD'}`);
        console.log(`Is Free: ${course.is_free ? 'Yes' : 'No'}`);
        console.log(`Featured: ${course.featured ? 'Yes' : 'No'}`);
        console.log(`Difficulty: ${course.difficulty}`);
        console.log('-'.repeat(40));
      });
      
      // Check for problematic prices
      const lowPriceCourses = courses.filter(c => !c.is_free && c.price < 0.50);
      const zeroPriceCourses = courses.filter(c => !c.is_free && c.price === 0);
      
      console.log('\n🚨 Potential Issues:');
      if (lowPriceCourses.length > 0) {
        console.log(`❌ ${lowPriceCourses.length} paid courses with price below $0.50 (Stripe minimum):`);
        lowPriceCourses.forEach(c => console.log(`  - ${c.title}: $${c.price}`));
      }
      
      if (zeroPriceCourses.length > 0) {
        console.log(`❌ ${zeroPriceCourses.length} paid courses with $0 price:`);
        zeroPriceCourses.forEach(c => console.log(`  - ${c.title}: $${c.price}`));
      }
      
      if (lowPriceCourses.length === 0 && zeroPriceCourses.length === 0) {
        console.log('✅ All paid courses have valid prices (>= $0.50)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCoursePrices();