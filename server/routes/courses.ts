import { Request, Response } from 'express';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { Course, CourseChapter, CourseEnrollment } from '../database/schema.js';
import { z } from 'zod';

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  instructor: z.string().min(1, 'Instructor is required').max(100, 'Instructor name too long'),
  duration: z.string().min(1, 'Duration is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  points: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  chapters: z.array(z.object({
    title: z.string().min(1, 'Chapter title is required'),
    content: z.string().optional(),
    video_url: z.string().url().optional(),
    duration: z.string().min(1, 'Chapter duration is required')
  })).optional().default([])
});

const updateCourseSchema = createCourseSchema.partial();

const getCourseQuerySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1') || 1),
  limit: z.string().optional().transform(val => Math.min(parseInt(val || '10') || 10, 100)),
  search: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  featured: z.string().optional().transform(val => val === undefined ? undefined : val === 'true')
});

// Get all courses
export async function getCourses(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const query = getCourseQuerySchema.parse(req.query);
    const { page, limit, search, difficulty, featured } = query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ? OR instructor LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (difficulty) {
      whereClause += ' AND difficulty = ?';
      params.push(difficulty);
    }

    if (featured !== undefined) {
      whereClause += ' AND featured = ?';
      params.push(featured ? 1 : 0);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM courses ${whereClause}`;
    const countResult = await db.getQuery(countQuery, params);
    const total = countResult?.total || 0;

    // Get courses with pagination
    const safeLimitCourses = Math.max(1, Math.min(100, Number(limit)));
    const safeOffsetCourses = Math.max(0, offset);
    const coursesQuery = `
      SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as creator_name
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ${safeLimitCourses} OFFSET ${safeOffsetCourses}
    `;
    
    const courses = await db.allQuery(coursesQuery, params);

    // Get chapter counts for each course
    const courseIds = courses.map(c => c.id);
    let chapterCounts: any[] = [];
    
    if (courseIds.length > 0) {
      const placeholders = courseIds.map(() => '?').join(',');
      const chapterQuery = `
        SELECT course_id, COUNT(*) as chapter_count
        FROM course_chapters
        WHERE course_id IN (${placeholders})
        GROUP BY course_id
      `;
      chapterCounts = await db.allQuery(chapterQuery, courseIds);
    }

    // Add chapter counts to courses
    const coursesWithCounts = courses.map(course => {
      const chapterCount = chapterCounts.find(cc => cc.course_id === course.id);

      return {
        ...course,
        chapters: chapterCount?.chapter_count || 0,
        featured: Boolean(course.featured),
        is_free: Boolean(course.is_free),
        price: parseFloat(course.price) || 0
      };
    });

    res.json({
      success: true,
      data: {
        courses: coursesWithCounts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses'
    });
  }
}

// Get single course
export async function getCourse(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.id);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Get course with creator info
    const courseQuery = `
      SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as creator_name
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `;
    
    const course = await db.getQuery(courseQuery, [courseId]);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Get course chapters
    const chaptersQuery = `
      SELECT * FROM course_chapters
      WHERE course_id = ?
      ORDER BY order_index ASC
    `;
    
    const chapters = await db.allQuery(chaptersQuery, [courseId]);

    res.json({
      success: true,
      data: {
        ...course,
        chapters,
        featured: Boolean(course.featured)
      }
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course'
    });
  }
}

// Create new course
export async function createCourse(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const validatedData = createCourseSchema.parse(req.body);
    const { chapters, ...courseData } = validatedData;

    // Create course
    const courseResult = await db.executeQuery(
      `INSERT INTO courses (title, description, instructor, duration, difficulty, points, featured, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseData.title,
        courseData.description || null,
        courseData.instructor,
        courseData.duration,
        courseData.difficulty,
        courseData.points,
        courseData.featured ? 1 : 0,
        userId
      ]
    );

    const courseId = courseResult.insertId;

    // Create chapters if provided
    if (chapters && chapters.length > 0) {
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        await db.executeQuery(
          `INSERT INTO course_chapters (course_id, title, content, video_url, duration, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            courseId,
            chapter.title,
            chapter.content || null,
            chapter.video_url || null,
            chapter.duration,
            i + 1
          ]
        );
      }
    }

    // Get the created course with chapters
    const createdCourse = await db.getQuery(
      `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as creator_name
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [courseId]
    );

    const courseChapters = await db.allQuery(
      `SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_index ASC`,
      [courseId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdCourse,
        chapters: courseChapters,
        featured: Boolean(createdCourse.featured)
      },
      message: 'Course created successfully'
    });

  } catch (error) {
    console.error('Error creating course:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create course'
    });
  }
}

// Update course
export async function updateCourse(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;
    const courseId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Check if course exists and user has permission
    const existingCourse = await db.getQuery(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if user is the creator or admin
    const user = await db.getQuery('SELECT role FROM users WHERE id = ?', [userId]);
    if (existingCourse.created_by !== userId && user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const validatedData = updateCourseSchema.parse(req.body);
    const { chapters, ...courseData } = validatedData;

    // Build update query
    const updateFields = [];
    const updateValues = [];

    Object.entries(courseData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(key === 'featured' ? (value ? 1 : 0) : value);
      }
    });

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(courseId);

      await db.executeQuery(
        `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Update chapters if provided
    if (chapters) {
      // Delete existing chapters
      await db.executeQuery('DELETE FROM course_chapters WHERE course_id = ?', [courseId]);
      
      // Insert new chapters
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        await db.executeQuery(
          `INSERT INTO course_chapters (course_id, title, content, video_url, duration, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            courseId,
            chapter.title,
            chapter.content || null,
            chapter.video_url || null,
            chapter.duration,
            i + 1
          ]
        );
      }
    }

    // Get updated course
    const updatedCourse = await db.getQuery(
      `SELECT c.*, u.first_name || ' ' || u.last_name as creator_name
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [courseId]
    );

    const courseChapters = await db.allQuery(
      `SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_index ASC`,
      [courseId]
    );

    res.json({
      success: true,
      data: {
        ...updatedCourse,
        chapters: courseChapters,
        featured: Boolean(updatedCourse.featured)
      },
      message: 'Course updated successfully'
    });

  } catch (error) {
    console.error('Error updating course:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update course'
    });
  }
}

// Delete course
export async function deleteCourse(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;
    const courseId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Check if course exists and user has permission
    const existingCourse = await db.getQuery(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if user is the creator or admin
    const user = await db.getQuery('SELECT role FROM users WHERE id = ?', [userId]);
    if (existingCourse.created_by !== userId && user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    // Delete course (chapters will be deleted automatically due to CASCADE)
    await db.executeQuery('DELETE FROM courses WHERE id = ?', [courseId]);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course'
    });
  }
}

// Enroll in course
export async function enrollInCourse(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;
    const courseId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Check if course exists
    const course = await db.getQuery('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await db.getQuery(
      'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        error: 'Already enrolled in this course'
      });
    }

    // Create enrollment
    await db.executeQuery(
      'INSERT INTO course_enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course'
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll in course'
    });
  }
}

export async function getEnrolledCourses(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const enrolledCourses = await db.query(`
      SELECT 
        c.*,
        ce.enrolled_at,
        ce.progress,
        ce.completed_at
      FROM courses c
      INNER JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE ce.user_id = ?
      ORDER BY ce.enrolled_at DESC
    `, [userId]);

    res.json(enrolledCourses);
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
}

// Check if user is enrolled in a specific course
export async function checkEnrollment(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;
    const courseId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!courseId || isNaN(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const enrollment = await db.allQuery(`
      SELECT id, enrolled_at, progress, completed_at
      FROM course_enrollments
      WHERE user_id = ? AND course_id = ?
    `, [userId, courseId]);

    const isEnrolled = enrollment && enrollment.length > 0;

    res.json({
      isEnrolled,
      enrollment: isEnrolled ? enrollment[0] : null
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment status' });
  }
}