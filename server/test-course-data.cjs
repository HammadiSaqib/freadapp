const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔍 Checking database tables and course data...\n');

// First, check what tables exist
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('❌ Error fetching tables:', err);
    return;
  }
  
  console.log('📋 Available tables:');
  rows.forEach(row => console.log(`  - ${row.name}`));
  console.log('');
  
  // Check if courses table exists
  const hasCourses = rows.some(row => row.name === 'courses');
  
  if (hasCourses) {
    // Get course data with pricing info
    db.all('SELECT id, title, price, is_free, featured FROM courses LIMIT 10', (err, courses) => {
      if (err) {
        console.error('❌ Error fetching courses:', err);
        return;
      }
      
      console.log('💰 Course pricing data:');
      if (courses.length === 0) {
        console.log('  No courses found in database');
      } else {
        console.table(courses);
      }
      
      db.close();
    });
  } else {
    console.log('⚠️  No courses table found');
    db.close();
  }
});