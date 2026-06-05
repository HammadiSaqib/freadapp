const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkQuizStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('=== Detailed Quiz Table Analysis ===\n');

    // Get detailed structure of course_quizzes
    const [structure] = await connection.execute('DESCRIBE course_quizzes');
    console.log('course_quizzes structure:');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    console.log('\n');

    // Check if there are any quiz-related tables
    const [tables] = await connection.execute("SHOW TABLES LIKE '%quiz%'");
    console.log('Quiz-related tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    console.log('\n');

    // Check if there are any question-related tables
    const [questionTables] = await connection.execute("SHOW TABLES LIKE '%question%'");
    console.log('Question-related tables:');
    questionTables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    console.log('\n');

    // Try to add some sample quiz data to test
    console.log('=== Adding Sample Quiz Data ===');
    
    // First, get a course ID to use
    const [courses] = await connection.execute('SELECT id FROM courses LIMIT 1');
    if (courses.length > 0) {
      const courseId = courses[0].id;
      console.log(`Using course ID: ${courseId}`);

      // Insert a sample quiz
      await connection.execute(`
        INSERT INTO course_quizzes (course_id, title, description, quiz_type, time_limit_minutes, attempts_allowed, passing_score)
        VALUES (?, 'Sample Quiz', 'A test quiz', 'practice', 30, 3, 70.00)
        ON DUPLICATE KEY UPDATE title = VALUES(title)
      `, [courseId]);

      // Check if the insert worked
      const [quizzes] = await connection.execute('SELECT * FROM course_quizzes LIMIT 3');
      console.log('Sample quiz data:');
      console.log(JSON.stringify(quizzes, null, 2));
      console.log('\n');

      // Test different ways to count questions
      console.log('=== Testing Question Count Methods ===');

      // Method 1: Check if there's a questions column
      try {
        const [result1] = await connection.execute(`
          SELECT id, title, 
                 CASE 
                   WHEN questions IS NOT NULL THEN JSON_LENGTH(questions)
                   ELSE 0 
                 END as question_count
          FROM course_quizzes 
          LIMIT 3
        `);
        console.log('Method 1 (questions column):', result1);
      } catch (error) {
        console.log('Method 1 failed:', error.message);
      }

      // Method 2: Check for separate quiz_questions table
      try {
        const [result2] = await connection.execute(`
          SELECT COUNT(*) as total_questions FROM quiz_questions
        `);
        console.log('Method 2 (quiz_questions table):', result2[0]);
      } catch (error) {
        console.log('Method 2 failed:', error.message);
      }

      // Method 3: Check for course_quiz_questions table
      try {
        const [result3] = await connection.execute(`
          SELECT COUNT(*) as total_questions FROM course_quiz_questions
        `);
        console.log('Method 3 (course_quiz_questions table):', result3[0]);
      } catch (error) {
        console.log('Method 3 failed:', error.message);
      }

    } else {
      console.log('No courses found to test with');
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await connection.end();
  }
}

checkQuizStructure().catch(console.error);