const mysql = require('mysql2/promise');

async function checkEnrollments() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('Connected to MySQL database');
    
    // Check course_enrollments table structure and data
    console.log('\n=== COURSE_ENROLLMENTS TABLE ===');
    const [enrollments] = await connection.execute('SELECT * FROM course_enrollments LIMIT 5');
    console.log('Total enrollments:', enrollments.length);
    console.log('Sample data:', JSON.stringify(enrollments, null, 2));
    
    // Check the exact query used in the API
    console.log('\n=== API QUERY TEST ===');
    const [apiResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(DISTINCT user_id) as unique_students,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_enrollments
      FROM course_enrollments
    `);
    console.log('API query result:', JSON.stringify(apiResult, null, 2));
    
    // Check course_videos table
    console.log('\n=== COURSE_VIDEOS TABLE ===');
    const [videos] = await connection.execute('SELECT COUNT(*) as total FROM course_videos');
    console.log('Total videos:', videos[0].total);
    
    // Check course_materials table
    console.log('\n=== COURSE_MATERIALS TABLE ===');
    const [materials] = await connection.execute('SELECT COUNT(*) as total FROM course_materials');
    console.log('Total materials:', materials[0].total);
    
    // Check course_quizzes table
    console.log('\n=== COURSE_QUIZZES TABLE ===');
    const [quizzes] = await connection.execute('SELECT COUNT(*) as total FROM course_quizzes');
    console.log('Total quizzes:', quizzes[0].total);
    
    // Check courses table for published status
    console.log('\n=== COURSES TABLE STATUS ===');
    const [courseStatus] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM courses 
      GROUP BY status
    `);
    console.log('Course status breakdown:', JSON.stringify(courseStatus, null, 2));
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEnrollments();