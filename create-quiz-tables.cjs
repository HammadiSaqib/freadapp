const mysql = require('mysql2/promise');
require('dotenv').config();

async function createQuizTables() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'creditrepair_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL database');

    // Create course_quizzes table
    const createCourseQuizzesTable = `
      CREATE TABLE IF NOT EXISTS course_quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        module_id INT NULL,
        video_id INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        quiz_type ENUM('assessment', 'practice', 'final_exam') NOT NULL DEFAULT 'practice',
        time_limit_minutes INT NULL,
        attempts_allowed INT NOT NULL DEFAULT 3,
        passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
        randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
        show_correct_answers BOOLEAN NOT NULL DEFAULT TRUE,
        show_results_immediately BOOLEAN NOT NULL DEFAULT TRUE,
        order_index INT NOT NULL DEFAULT 0,
        is_required BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_course_id (course_id),
        INDEX idx_module_id (module_id),
        INDEX idx_video_id (video_id),
        INDEX idx_quiz_type (quiz_type),
        INDEX idx_order (order_index)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // Create quiz_questions table
    const createQuizQuestionsTable = `
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_type ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank') NOT NULL DEFAULT 'multiple_choice',
        options JSON,
        correct_answers JSON,
        explanation TEXT,
        points DECIMAL(5,2) NOT NULL DEFAULT 1.00,
        order_index INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_quiz_id (quiz_id),
        INDEX idx_question_type (question_type),
        INDEX idx_order (order_index),
        FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // Create quiz_attempts table
    const createQuizAttemptsTable = `
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        user_id INT NOT NULL,
        enrollment_id INT NULL,
        attempt_number INT NOT NULL DEFAULT 1,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        score DECIMAL(5,2) NULL,
        total_points DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        earned_points DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        time_taken_minutes INT NULL,
        answers JSON,
        status ENUM('in_progress', 'completed', 'abandoned', 'timed_out') NOT NULL DEFAULT 'in_progress',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_quiz_id (quiz_id),
        INDEX idx_user_id (user_id),
        INDEX idx_enrollment_id (enrollment_id),
        INDEX idx_status (status),
        INDEX idx_started_at (started_at),
        FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // Execute table creation
    console.log('Creating course_quizzes table...');
    await connection.execute(createCourseQuizzesTable);
    console.log('✓ course_quizzes table created successfully');

    console.log('Creating quiz_questions table...');
    await connection.execute(createQuizQuestionsTable);
    console.log('✓ quiz_questions table created successfully');

    console.log('Creating quiz_attempts table...');
    await connection.execute(createQuizAttemptsTable);
    console.log('✓ quiz_attempts table created successfully');

    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('course_quizzes', 'quiz_questions', 'quiz_attempts')
    `, [process.env.DB_NAME || 'creditrepair_db']);

    console.log('\nCreated tables:');
    tables.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });

    console.log('\n✅ All quiz tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating quiz tables:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createQuizTables();