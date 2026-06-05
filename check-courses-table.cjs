const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/creditrepair.db');

db.serialize(() => {
  console.log('Checking courses table structure...');
  
  db.all('PRAGMA table_info(courses)', (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    if (rows.length === 0) {
      console.log('❌ Courses table does not exist');
    } else {
      console.log('✅ Courses table exists with columns:');
      rows.forEach(row => {
        console.log(`- ${row.name}: ${row.type} (nullable: ${!row.notnull})`);
      });
      
      // Check if price field exists
      const hasPriceField = rows.some(row => row.name === 'price');
      console.log(`\nPrice field exists: ${hasPriceField ? '✅ Yes' : '❌ No'}`);
      
      // Get sample data
      db.all('SELECT * FROM courses LIMIT 3', (err, courses) => {
        if (err) {
          console.error('Error fetching sample courses:', err);
        } else {
          console.log(`\nSample courses (${courses.length} found):`);
          courses.forEach(course => {
            console.log(`- ID: ${course.id}, Title: ${course.title}, Price: ${course.price || 'N/A'}`);
          });
        }
        
        db.close();
      });
    }
  });
});