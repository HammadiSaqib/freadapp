const mysql = require('mysql2/promise');

async function checkTableStructure() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('Connected to MySQL database');
    
    // Check course_enrollments table structure
    console.log('\n=== COURSE_ENROLLMENTS TABLE STRUCTURE ===');
    const [columns] = await connection.execute('DESCRIBE course_enrollments');
    console.log('Actual columns:', JSON.stringify(columns, null, 2));
    
    // Check what data is actually in the table
    console.log('\n=== ACTUAL DATA IN COURSE_ENROLLMENTS ===');
    const [data] = await connection.execute('SELECT * FROM course_enrollments LIMIT 3');
    console.log('Sample data:', JSON.stringify(data, null, 2));
    
    // Test a corrected query that matches the actual schema
    console.log('\n=== CORRECTED API QUERY TEST ===');
    const [correctedResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(DISTINCT user_id) as unique_students,
        COUNT(CASE WHEN completed = 1 THEN 1 END) as completed_enrollments,
        COUNT(CASE WHEN completed = 0 THEN 1 END) as active_enrollments
      FROM course_enrollments
    `);
    console.log('Corrected query result:', JSON.stringify(correctedResult, null, 2));
    
    // Check courses table for published status
    console.log('\n=== COURSES TABLE STATUS CHECK ===');
    const [courseStatus] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM courses 
      GROUP BY status
    `);
    console.log('Course status breakdown:', JSON.stringify(courseStatus, null, 2));
    
    // Check content tables
    console.log('\n=== CONTENT TABLES COUNT ===');
    const [videoCount] = await connection.execute('SELECT COUNT(*) as total FROM course_videos');
    const [materialCount] = await connection.execute('SELECT COUNT(*) as total FROM course_materials');
    const [quizCount] = await connection.execute('SELECT COUNT(*) as total FROM course_quizzes');
    const [moduleCount] = await connection.execute('SELECT COUNT(*) as total FROM course_modules');
    
    console.log('Videos:', videoCount[0].total);
    console.log('Materials:', materialCount[0].total);
    console.log('Quizzes:', quizCount[0].total);
    console.log('Modules:', moduleCount[0].total);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTableStructure();