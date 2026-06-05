const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/creditrepair.db');

db.serialize(() => {
  console.log('🔧 Adding missing price fields to courses table...');
  
  // Add price-related fields
  const alterQueries = [
    'ALTER TABLE courses ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00',
    'ALTER TABLE courses ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL',
    'ALTER TABLE courses ADD COLUMN is_free BOOLEAN DEFAULT 1',
    'ALTER TABLE courses ADD COLUMN currency VARCHAR(3) DEFAULT "USD"',
    'ALTER TABLE courses ADD COLUMN thumbnail_url TEXT DEFAULT NULL',
    'ALTER TABLE courses ADD COLUMN video_url TEXT DEFAULT NULL',
    'ALTER TABLE courses ADD COLUMN category VARCHAR(100) DEFAULT "General"',
    'ALTER TABLE courses ADD COLUMN has_quiz BOOLEAN DEFAULT 0',
    'ALTER TABLE courses ADD COLUMN is_published BOOLEAN DEFAULT 1',
    'ALTER TABLE courses ADD COLUMN enrollment_count INTEGER DEFAULT 0',
    'ALTER TABLE courses ADD COLUMN rating DECIMAL(3,2) DEFAULT 4.5'
  ];
  
  let completedAlters = 0;
  
  alterQueries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`❌ Error adding field ${index + 1}:`, err.message);
      } else if (!err) {
        console.log(`✅ Added field ${index + 1}`);
      } else {
        console.log(`⚠️  Field ${index + 1} already exists`);
      }
      
      completedAlters++;
      if (completedAlters === alterQueries.length) {
        insertSampleCourses();
      }
    });
  });
  
  function insertSampleCourses() {
    console.log('\n📚 Inserting sample courses...');
    
    // First, get a user ID to use as created_by
    db.get('SELECT id FROM users LIMIT 1', (err, user) => {
      const userId = user ? user.id : 1;
      
      const sampleCourses = [
        {
          title: 'Funding Fundamentals',
          description: 'Learn the basics of funding, understanding credit scores, and how to improve your credit rating.',
          instructor: 'Sarah Johnson',
          duration: '2 hours',
          difficulty: 'beginner',
          points: 150,
          price: 49.99,
          original_price: 79.99,
          is_free: 0,
          featured: 1,
          category: 'Funding',
          has_quiz: 1,
          thumbnail_url: '/placeholder-course.jpg',
          video_url: 'https://example.com/video1'
        },
        {
          title: 'Advanced Funding Strategies',
          description: 'Advanced techniques for funding optimization, dispute processes, and long-term funding building.',
          instructor: 'Michael Davis',
          duration: '3.5 hours',
          difficulty: 'advanced',
          points: 250,
          price: 99.99,
          original_price: 149.99,
          is_free: 0,
          featured: 1,
          category: 'Funding',  
          has_quiz: 1,
          thumbnail_url: '/placeholder-course.jpg',
          video_url: 'https://example.com/video2'
        },
        {
          title: 'Understanding Credit Reports',
          description: 'Free course on how to read and understand your credit report from all three major bureaus.',
          instructor: 'Lisa Chen',
          duration: '1 hour',
          difficulty: 'beginner',
          points: 100,
          price: 0.00,
          is_free: 1,
          featured: 0,
          category: 'Education',
          has_quiz: 1,
          thumbnail_url: '/placeholder-course.jpg',
          video_url: 'https://example.com/video3'
        },
        {
          title: 'Debt Management Strategies',
          description: 'Learn effective strategies for managing and reducing debt while improving your credit score.',
          instructor: 'Robert Wilson',
          duration: '2.5 hours',
          difficulty: 'intermediate',
          points: 200,
          price: 69.99,
          original_price: 99.99,
          is_free: 0,
          featured: 1,
          category: 'Financial Planning',
          has_quiz: 1,
          thumbnail_url: '/placeholder-course.jpg',
          video_url: 'https://example.com/video4'
        },
        {
          title: 'Building Credit from Scratch',
          description: 'Perfect for beginners with no credit history. Learn how to establish and build credit responsibly.',
          instructor: 'Amanda Rodriguez',
          duration: '1.5 hours',
          difficulty: 'beginner',
          points: 120,
          price: 29.99,
          is_free: 0,
          featured: 0,
          category: 'Credit Building',
          has_quiz: 1,
          thumbnail_url: '/placeholder-course.jpg',
          video_url: 'https://example.com/video5'
        }
      ];
      
      let insertedCourses = 0;
      
      sampleCourses.forEach((course, index) => {
        const insertQuery = `
          INSERT INTO courses (
            title, description, instructor, duration, difficulty, points, 
            price, original_price, is_free, featured, category, has_quiz, 
            thumbnail_url, video_url, created_by, is_published, enrollment_count, rating
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          course.title, course.description, course.instructor, course.duration,
          course.difficulty, course.points, course.price, course.original_price,
          course.is_free, course.featured, course.category, course.has_quiz,
          course.thumbnail_url, course.video_url, userId, 1, 0, 4.5
        ];
        
        db.run(insertQuery, values, function(err) {
          if (err) {
            console.error(`❌ Error inserting course ${index + 1}:`, err.message);
          } else {
            console.log(`✅ Inserted course: ${course.title} (ID: ${this.lastID})`);
          }
          
          insertedCourses++;
          if (insertedCourses === sampleCourses.length) {
            console.log('\n🎉 Course table update completed!');
            db.close();
          }
        });
      });
    });
  }
});