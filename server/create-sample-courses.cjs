const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔧 Creating courses table and adding sample data...\n');

// Create courses table with proper schema
const createCoursesTable = `
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor VARCHAR(100) NOT NULL,
  duration VARCHAR(50) NOT NULL DEFAULT '0 mins',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner',
  points INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_free BOOLEAN NOT NULL DEFAULT 1,
  image_url VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL DEFAULT 1
)`;

// Sample courses with different pricing
const sampleCourses = [
  {
    title: 'Credit Repair Fundamentals',
    description: 'Learn the basics of credit repair and how to improve your credit score.',
    instructor: 'John Smith',
    duration: '2 hours',
    difficulty: 'beginner',
    points: 100,
    featured: 1,
    price: 0.00,
    is_free: 1
  },
  {
    title: 'Advanced Credit Strategies',
    description: 'Advanced techniques for credit optimization and dispute resolution.',
    instructor: 'Jane Doe',
    duration: '4 hours',
    difficulty: 'advanced',
    points: 200,
    featured: 1,
    price: 99.99,
    is_free: 0
  },
  {
    title: 'Business Credit Building',
    description: 'Build strong business credit profiles for your company.',
    instructor: 'Mike Johnson',
    duration: '3 hours',
    difficulty: 'intermediate',
    points: 150,
    featured: 0,
    price: 149.99,
    is_free: 0
  },
  {
    title: 'Credit Monitoring Essentials',
    description: 'Free course on monitoring your credit effectively.',
    instructor: 'Sarah Wilson',
    duration: '1 hour',
    difficulty: 'beginner',
    points: 50,
    featured: 0,
    price: 0.00,
    is_free: 1
  },
  {
    title: 'Debt Management Masterclass',
    description: 'Comprehensive guide to managing and eliminating debt.',
    instructor: 'Robert Brown',
    duration: '5 hours',
    difficulty: 'intermediate',
    points: 250,
    featured: 1,
    price: 199.99,
    is_free: 0
  }
];

// Create table first
db.run(createCoursesTable, (err) => {
  if (err) {
    console.error('❌ Error creating courses table:', err);
    return;
  }
  
  console.log('✅ Courses table created successfully');
  
  // Clear existing courses
  db.run('DELETE FROM courses', (err) => {
    if (err) {
      console.error('❌ Error clearing courses:', err);
      return;
    }
    
    console.log('🧹 Cleared existing courses');
    
    // Insert sample courses
    const insertStmt = db.prepare(`
      INSERT INTO courses (title, description, instructor, duration, difficulty, points, featured, price, is_free, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    let insertedCount = 0;
    sampleCourses.forEach((course, index) => {
      insertStmt.run([
        course.title,
        course.description,
        course.instructor,
        course.duration,
        course.difficulty,
        course.points,
        course.featured,
        course.price,
        course.is_free
      ], function(err) {
        if (err) {
          console.error(`❌ Error inserting course ${index + 1}:`, err);
        } else {
          insertedCount++;
          console.log(`✅ Inserted: ${course.title} (${course.is_free ? 'Free' : '$' + course.price})`);
        }
        
        if (insertedCount + (sampleCourses.length - insertedCount) === sampleCourses.length) {
          insertStmt.finalize();
          
          // Verify the data
          db.all('SELECT id, title, price, is_free, featured FROM courses', (err, rows) => {
            if (err) {
              console.error('❌ Error fetching courses:', err);
            } else {
              console.log('\n📊 Course data verification:');
              console.table(rows);
            }
            
            db.close();
            console.log('\n🎉 Sample courses created successfully!');
          });
        }
      });
    });
  });
});