const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCoursePrices() {
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

    console.log('🔧 Fixing course prices to meet Stripe minimum requirements...\n');

    // Update courses with $0 price to have reasonable prices
    const priceUpdates = [
      { id: 11, title: 'Credit Fundamentals 101', price: 49.99 },
      { id: 12, title: 'Advanced Dispute Strategies', price: 99.99 },
      { id: 13, title: 'Credit Building for Beginners', price: 39.99 },
      { id: 14, title: 'Debt Management Strategies', price: 79.99 },
      { id: 15, title: 'test', price: 29.99 },
      { id: 16, title: 'test', price: 29.99 }
    ];

    for (const update of priceUpdates) {
      const [result] = await connection.execute(
        'UPDATE courses SET price = ? WHERE id = ? AND is_free = 0',
        [update.price, update.id]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ Updated "${update.title}" (ID: ${update.id}) price to $${update.price}`);
      } else {
        console.log(`⚠️  Course ID ${update.id} not found or already free`);
      }
    }

    // Verify the changes
    console.log('\n🔍 Verifying updated prices...');
    const [courses] = await connection.execute(`
      SELECT id, title, price, is_free 
      FROM courses 
      WHERE id IN (11, 12, 13, 14, 15, 16)
      ORDER BY id
    `);

    courses.forEach(course => {
      const status = course.is_free ? 'FREE' : `$${course.price}`;
      const valid = course.is_free || course.price >= 0.50 ? '✅' : '❌';
      console.log(`${valid} ID ${course.id}: ${course.title} - ${status}`);
    });

    console.log('\n🎉 Course price fixes completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixCoursePrices();