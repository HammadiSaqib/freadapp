import { getDatabaseAdapter } from './databaseAdapter.js';

// School Management Database Schema
// This file contains all database table definitions for the school management system

export async function createSchoolManagementTables(): Promise<void> {
  console.log('📚 Creating School Management tables...');
  
  const db = getDatabaseAdapter();
  
  const tables = [
    // Courses table - Main course information
    `CREATE TABLE IF NOT EXISTS courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      short_description VARCHAR(500),
      instructor_id INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
      duration_hours INT NOT NULL DEFAULT 0,
      duration_minutes INT NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_free BOOLEAN NOT NULL DEFAULT TRUE,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      thumbnail_url VARCHAR(500),
      preview_video_url VARCHAR(500),
      status ENUM('draft', 'published', 'archived', 'under_review') NOT NULL DEFAULT 'draft',
      enrollment_count INT NOT NULL DEFAULT 0,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      rating_count INT NOT NULL DEFAULT 0,
      completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      prerequisites TEXT,
      learning_objectives JSON,
      tags JSON,
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      certificate_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      certificate_template VARCHAR(500),
      max_enrollments INT NULL,
      enrollment_start_date DATETIME NULL,
      enrollment_end_date DATETIME NULL,
      course_start_date DATETIME NULL,
      course_end_date DATETIME NULL,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      INDEX idx_instructor (instructor_id),
      INDEX idx_category (category),
      INDEX idx_level (level),
      INDEX idx_status (status),
      INDEX idx_price (price),
      INDEX idx_featured (featured),
      INDEX idx_created_at (created_at),
      FULLTEXT idx_search (title, description, short_description),
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course modules/sections table
    `CREATE TABLE IF NOT EXISTS course_modules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INT NOT NULL DEFAULT 0,
      duration_minutes INT NOT NULL DEFAULT 0,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      unlock_after_module_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_order (order_index),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (unlock_after_module_id) REFERENCES course_modules(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course videos table
    `CREATE TABLE IF NOT EXISTS course_videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      module_id INT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      video_url VARCHAR(500) NOT NULL,
      video_type ENUM('upload', 'youtube', 'vimeo', 'external') NOT NULL DEFAULT 'upload',
      video_id VARCHAR(255),
      thumbnail_url VARCHAR(500),
      duration_seconds INT NOT NULL DEFAULT 0,
      order_index INT NOT NULL DEFAULT 0,
      is_preview BOOLEAN NOT NULL DEFAULT FALSE,
      transcript TEXT,
      captions_url VARCHAR(500),
      quality_options JSON,
      view_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_module_id (module_id),
      INDEX idx_order (order_index),
      INDEX idx_is_preview (is_preview),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course materials table (PDFs, images, documents)
    `CREATE TABLE IF NOT EXISTS course_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      module_id INT NULL,
      video_id INT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_url VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_type ENUM('pdf', 'image', 'document', 'audio', 'archive', 'other') NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      mime_type VARCHAR(100),
      order_index INT NOT NULL DEFAULT 0,
      is_downloadable BOOLEAN NOT NULL DEFAULT TRUE,
      download_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_module_id (module_id),
      INDEX idx_video_id (video_id),
      INDEX idx_file_type (file_type),
      INDEX idx_order (order_index),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
      FOREIGN KEY (video_id) REFERENCES course_videos(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course quizzes table
    `CREATE TABLE IF NOT EXISTS course_quizzes (
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
      INDEX idx_order (order_index),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
      FOREIGN KEY (video_id) REFERENCES course_videos(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Quiz questions table
    `CREATE TABLE IF NOT EXISTS quiz_questions (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course enrollments table
    `CREATE TABLE IF NOT EXISTS course_enrollments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      user_id INT NOT NULL,
      enrollment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completion_date DATETIME NULL,
      progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      last_accessed_at DATETIME NULL,
      status ENUM('enrolled', 'in_progress', 'completed', 'dropped', 'suspended') NOT NULL DEFAULT 'enrolled',
      certificate_issued BOOLEAN NOT NULL DEFAULT FALSE,
      certificate_url VARCHAR(500) NULL,
      final_grade DECIMAL(5,2) NULL,
      time_spent_minutes INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_enrollment_date (enrollment_date),
      INDEX idx_completion_date (completion_date),
      UNIQUE KEY unique_course_user (course_id, user_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Student progress tracking table
    `CREATE TABLE IF NOT EXISTS student_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      enrollment_id INT NOT NULL,
      content_type ENUM('video', 'quiz', 'material', 'module') NOT NULL,
      content_id INT NOT NULL,
      status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
      progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      time_spent_minutes INT NOT NULL DEFAULT 0,
      last_position_seconds INT NULL,
      attempts_count INT NOT NULL DEFAULT 0,
      best_score DECIMAL(5,2) NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enrollment_id (enrollment_id),
      INDEX idx_content_type (content_type),
      INDEX idx_content_id (content_id),
      INDEX idx_status (status),
      UNIQUE KEY unique_enrollment_content (enrollment_id, content_type, content_id),
      FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Quiz attempts table
    `CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      quiz_id INT NOT NULL,
      user_id INT NOT NULL,
      enrollment_id INT NOT NULL,
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
      FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course reviews and ratings table
    `CREATE TABLE IF NOT EXISTS course_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      user_id INT NOT NULL,
      enrollment_id INT NOT NULL,
      rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      helpful_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_user_id (user_id),
      INDEX idx_rating (rating),
      INDEX idx_is_featured (is_featured),
      INDEX idx_created_at (created_at),
      UNIQUE KEY unique_course_user_review (course_id, user_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course categories table
    `CREATE TABLE IF NOT EXISTS course_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      parent_category_id INT NULL,
      icon VARCHAR(100),
      color VARCHAR(7),
      order_index INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      course_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_parent_category (parent_category_id),
      INDEX idx_is_active (is_active),
      INDEX idx_order (order_index),
      FOREIGN KEY (parent_category_id) REFERENCES course_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Course announcements table
    `CREATE TABLE IF NOT EXISTS course_announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author_id INT NOT NULL,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      send_notification BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_course_id (course_id),
      INDEX idx_author_id (author_id),
      INDEX idx_is_pinned (is_pinned),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  try {
    for (const table of tables) {
      await db.executeQuery(table);
    }
    
    // Insert default course categories
    await insertDefaultCategories(db);
    
    console.log('✅ School Management tables created successfully');
  } catch (error) {
    console.error('❌ Error creating School Management tables:', error);
    throw error;
  }
}

// Insert default course categories
async function insertDefaultCategories(db: any): Promise<void> {
  const defaultCategories = [
    { name: 'Credit Repair', description: 'Courses focused on credit repair strategies and techniques', icon: 'credit-card', color: '#3B82F6' },
    { name: 'Financial Literacy', description: 'Basic financial education and money management', icon: 'dollar-sign', color: '#10B981' },
    { name: 'Business Development', description: 'Growing and scaling your credit repair business', icon: 'trending-up', color: '#8B5CF6' },
    { name: 'Legal & Compliance', description: 'Legal aspects and compliance in credit repair', icon: 'shield', color: '#F59E0B' },
    { name: 'Marketing & Sales', description: 'Marketing strategies for credit repair businesses', icon: 'megaphone', color: '#EF4444' },
    { name: 'Technology & Tools', description: 'Software and tools for credit repair professionals', icon: 'laptop', color: '#06B6D4' }
  ];

  for (const category of defaultCategories) {
    try {
      await db.executeQuery(
        `INSERT IGNORE INTO course_categories (name, description, icon, color) VALUES (?, ?, ?, ?)`,
        [category.name, category.description, category.icon, category.color]
      );
    } catch (error) {
      console.log(`Category ${category.name} may already exist, skipping...`);
    }
  }
}

// Helper function to get course statistics
export async function getCourseStatistics(): Promise<any> {
  const db = getDatabaseAdapter();
  
  try {
    const stats = await db.getQuery(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_courses,
        COUNT(CASE WHEN is_free = 1 THEN 1 END) as free_courses,
        COUNT(CASE WHEN is_free = 0 THEN 1 END) as paid_courses,
        AVG(rating) as average_rating,
        SUM(enrollment_count) as total_enrollments
      FROM courses
    `);
    
    return stats;
  } catch (error) {
    console.error('Error getting course statistics:', error);
    throw error;
  }
}

// Helper function to update course statistics
export async function updateCourseStatistics(courseId: number): Promise<void> {
  const db = getDatabaseAdapter();
  
  try {
    // Update enrollment count
    await db.executeQuery(`
      UPDATE courses 
      SET enrollment_count = (
        SELECT COUNT(*) FROM course_enrollments WHERE course_id = ?
      )
      WHERE id = ?
    `, [courseId, courseId]);
    
    // Update rating
    await db.executeQuery(`
      UPDATE courses 
      SET 
        rating = COALESCE((SELECT AVG(rating) FROM course_reviews WHERE course_id = ?), 0),
        rating_count = (SELECT COUNT(*) FROM course_reviews WHERE course_id = ?)
      WHERE id = ?
    `, [courseId, courseId, courseId]);
    
  } catch (error) {
    console.error('Error updating course statistics:', error);
    throw error;
  }
}