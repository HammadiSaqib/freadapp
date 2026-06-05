const { getDatabaseAdapter } = require('./server/database/databaseAdapter.ts');

async function testCoursesDB() {
  try {
    const db = getDatabaseAdapter();
    
    // Check if courses table exists and has data
    console.log('Checking courses table...');
    const courses = await db.allQuery('SELECT * FROM courses LIMIT 5');
    console.log('Courses found:', courses.length);
    console.log('Sample courses:', JSON.stringify(courses, null, 2));
    
    // Check course categories
    console.log('\nChecking course categories...');
    const categories = await db.allQuery('SELECT * FROM course_categories LIMIT 5');
    console.log('Categories found:', categories.length);
    console.log('Sample categories:', JSON.stringify(categories, null, 2));
    
    // Check if there are any issues with the query used in the API
    console.log('\nTesting API query...');
    const apiQuery = `
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as instructor_name,
        cc.name as category_name,
        (SELECT COUNT(*) FROM course_modules WHERE course_id = c.id) as modules_count,
        (SELECT COUNT(*) FROM course_videos WHERE course_id = c.id) as videos_count,
        (SELECT COUNT(*) FROM course_quizzes WHERE course_id = c.id) as quizzes_count,
        (SELECT COUNT(*) FROM course_materials WHERE course_id = c.id) as materials_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_categories cc ON c.category_id = cc.id
      WHERE 1=1
      ORDER BY c.created_at DESC
      LIMIT 10 OFFSET 0
    `;
    
    const apiResults = await db.allQuery(apiQuery);
    console.log('API query results:', apiResults.length);
    console.log('Sample API results:', JSON.stringify(apiResults, null, 2));
    
  } catch (error) {
    console.error('Error testing courses DB:', error);
  }
}

testCoursesDB();