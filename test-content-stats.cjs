const mysql = require('mysql2/promise');
require('dotenv').config();

async function testContentStats() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('=== Testing Final Content Statistics ===\n');

    // Test the exact query used in the API
    const [contentStats] = await connection.execute(`
      SELECT 
        COALESCE((SELECT COUNT(*) FROM course_modules), 0) as total_modules,
        COALESCE((SELECT COUNT(*) FROM course_videos), 0) as total_videos,
        COALESCE((SELECT COUNT(*) FROM course_materials), 0) as total_materials,
        COALESCE((SELECT COUNT(*) FROM course_quizzes), 0) as total_quizzes,
        0 as total_questions
    `);

    console.log('Content Statistics Results:');
    console.log('- Total Videos:', contentStats[0].total_videos);
    console.log('- Total Modules:', contentStats[0].total_modules);
    console.log('- Total Materials:', contentStats[0].total_materials);
    console.log('- Total Quizzes:', contentStats[0].total_quizzes);
    console.log('- Total Questions:', contentStats[0].total_questions);
    console.log('\n');

    // Verify individual table counts
    console.log('=== Individual Table Verification ===');
    
    const [videoCount] = await connection.execute('SELECT COUNT(*) as count FROM course_videos');
    console.log('course_videos count:', videoCount[0].count);

    const [moduleCount] = await connection.execute('SELECT COUNT(*) as count FROM course_modules');
    console.log('course_modules count:', moduleCount[0].count);

    const [materialCount] = await connection.execute('SELECT COUNT(*) as count FROM course_materials');
    console.log('course_materials count:', materialCount[0].count);

    const [quizCount] = await connection.execute('SELECT COUNT(*) as count FROM course_quizzes');
    console.log('course_quizzes count:', quizCount[0].count);

    console.log('\n=== Expected Results ===');
    console.log('Based on previous analysis:');
    console.log('- Videos: 3 (should show 3)');
    console.log('- Modules: 0 (should show 0)');
    console.log('- Materials: 1 (should show 1)');
    console.log('- Quizzes: 1 (should show 1, we added a sample)');
    console.log('- Questions: 0 (should show 0, no question system implemented)');

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await connection.end();
  }
}

testContentStats().catch(console.error);