import { Request, Response, Router } from 'express';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { listBusinessDirectories } from '../utils/businessDirectories.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Course schemas
const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  short_description: z.string().max(500, 'Short description too long').optional(),
  category: z.string().min(1, 'Category is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  duration_hours: z.number().int().min(0).default(0),
  duration_minutes: z.number().int().min(0).max(59).default(0),
  price: z.number().min(0).default(0),
  is_free: z.boolean().default(true),
  currency: z.string().length(3).default('USD'),
  prerequisites: z.string().optional(),
  learning_objectives: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().default('en'),
  certificate_enabled: z.boolean().default(false),
  max_enrollments: z.number().int().positive().optional(),
  enrollment_start_date: z.string().datetime().optional(),
  enrollment_end_date: z.string().datetime().optional(),
  course_start_date: z.string().datetime().optional(),
  course_end_date: z.string().datetime().optional(),
  featured: z.boolean().default(false),
  thumbnail_url: z.string().url().optional(),
  preview_video_url: z.string().url().optional(),
  youtube_embed_url: z.string().url().optional()
});

const updateCourseSchema = createCourseSchema.partial();

// Module schemas
const createModuleSchema = z.object({
  course_id: z.number().int().positive(),
  title: z.string().min(1, 'Module title is required').max(255),
  description: z.string().optional(),
  order_index: z.number().int().min(0).default(0),
  duration_minutes: z.number().int().min(0).default(0),
  is_locked: z.boolean().default(false),
  unlock_after_module_id: z.number().int().positive().optional()
});

const updateModuleSchema = createModuleSchema.partial().omit({ course_id: true });

// Video schemas
const createVideoSchema = z.object({
  course_id: z.number().int().positive(),
  module_id: z.number().int().positive().optional(),
  title: z.string().min(1, 'Video title is required').max(255),
  description: z.string().optional(),
  video_url: z.string().url('Invalid video URL'),
  video_type: z.enum(['upload', 'youtube', 'vimeo', 'external']).default('upload'),
  video_id: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  duration_seconds: z.number().int().min(0).default(0),
  order_index: z.number().int().min(0).default(0),
  is_preview: z.boolean().default(false),
  transcript: z.string().optional(),
  captions_url: z.string().url().optional()
});

const updateVideoSchema = createVideoSchema.partial().omit({ course_id: true });

// Material schemas
const createMaterialSchema = z.object({
  course_id: z.number().int().positive(),
  module_id: z.number().int().positive().optional(),
  video_id: z.number().int().positive().optional(),
  title: z.string().min(1, 'Material title is required').max(255),
  description: z.string().optional(),
  file_type: z.enum(['pdf', 'image', 'document', 'audio', 'archive', 'other']),
  order_index: z.number().int().min(0).default(0),
  is_downloadable: z.boolean().default(true)
});

// Quiz schemas
const createQuizSchema = z.object({
  course_id: z.number().int().positive(),
  module_id: z.number().int().positive().optional(),
  video_id: z.number().int().positive().optional(),
  title: z.string().min(1, 'Quiz title is required').max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  quiz_type: z.enum(['assessment', 'practice', 'final_exam']).default('practice'),
  time_limit_minutes: z.number().int().positive().optional(),
  attempts_allowed: z.number().int().positive().default(3),
  passing_score: z.number().min(0).max(100).default(70),
  randomize_questions: z.boolean().default(false),
  show_correct_answers: z.boolean().default(true),
  show_results_immediately: z.boolean().default(true),
  order_index: z.number().int().min(0).default(0),
  is_required: z.boolean().default(false)
});

const updateQuizSchema = createQuizSchema.partial().omit({ course_id: true });

// Question schemas
const createQuestionSchema = z.object({
  quiz_id: z.number().int().positive(),
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank']).default('multiple_choice'),
  options: z.array(z.string()).optional(),
  correct_answers: z.array(z.string()),
  explanation: z.string().optional(),
  points: z.number().min(0).default(1),
  order_index: z.number().int().min(0).default(0)
});

const updateQuestionSchema = createQuestionSchema.partial().omit({ quiz_id: true });

// Query schemas
const getCourseQuerySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1') || 1),
  limit: z.string().optional().transform(val => Math.min(parseInt(val || '10') || 10, 100)),
  search: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  status: z.enum(['draft', 'published', 'archived', 'under_review']).optional(),
  featured: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  is_free: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  sort_by: z.enum(['created_at', 'title', 'enrollment_count', 'rating']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'school');
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true,
    'audio/mpeg': true,
    'audio/wav': true,
    'video/mp4': true,
    'video/avi': true,
    'video/quicktime': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, audio, and video files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// ============================================================================
// ROUTE MAPPINGS
// ============================================================================

// Course routes
router.get('/courses', getCourses);
router.get('/courses/:id', getCourse);
router.post('/courses', upload.single('thumbnail'), createCourse);
router.put('/courses/:id', upload.single('thumbnail'), updateCourse);
router.delete('/courses/:id', deleteCourse);

// Course module routes
router.get('/courses/:courseId/modules', getCourseModules);
router.post('/courses/:courseId/modules', createCourseModule);
router.put('/modules/:id', updateCourseModule);
router.delete('/modules/:id', deleteCourseModule);

// Course video routes
router.get('/videos', getAllVideos);
router.get('/courses/:courseId/videos', getCourseVideos);
router.post('/courses/:courseId/videos', createCourseVideo);
router.post('/videos/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), uploadCourseVideo);
router.put('/videos/:id', updateCourseVideo);
router.delete('/videos/:id', deleteCourseVideo);
router.get('/materials', getAllMaterials);

// Course material routes
router.get('/courses/:courseId/materials', getCourseMaterials);
router.post('/courses/:courseId/materials', upload.single('file'), uploadCourseMaterial);
router.put('/materials/:id', updateCourseMaterial);
router.delete('/materials/:id', deleteCourseMaterial);

// Course quiz routes
router.get('/courses/:courseId/quizzes', getCourseQuizzes);
router.post('/courses/:courseId/quizzes', createCourseQuiz);
router.put('/quizzes/:id', updateCourseQuiz);
router.delete('/quizzes/:id', deleteCourseQuiz);

// Quiz question routes
router.get('/quizzes/:quizId/questions', getQuizQuestions);
router.post('/quizzes/:quizId/questions', createQuizQuestion);
router.put('/questions/:id', updateQuizQuestion);
router.delete('/questions/:id', deleteQuizQuestion);

// Category routes
router.get('/categories', getCourseCategories);
router.post('/categories', createCourseCategory);
router.put('/categories/:id', updateCourseCategory);
router.delete('/categories/:id', deleteCourseCategory);

// Statistics and analytics routes
router.get('/statistics', getSchoolStatistics);
router.get('/courses/:courseId/analytics', getCourseAnalytics);
// Leaderboard route
router.get('/leaderboard', getSchoolLeaderboard);
router.get('/business-directories', getBusinessDirectories);

// Bulk operations
router.put('/courses/bulk', bulkUpdateCourses);

// Export routes
router.get('/courses/:courseId/export', exportCourseData);

export default router;

// ============================================================================
// COURSE MANAGEMENT ENDPOINTS
// ============================================================================

// Get all courses with advanced filtering and pagination
export async function getCourses(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const query = getCourseQuerySchema.parse(req.query);
    const { page, limit, search, category, level, status, featured, is_free, sort_by, sort_order } = query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.short_description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      whereClause += ' AND c.category_id = ?';
      params.push(category);
    }

    if (level) {
      whereClause += ' AND c.level = ?';
      params.push(level);
    }

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    if (featured !== undefined) {
      whereClause += ' AND c.featured = ?';
      params.push(featured ? 1 : 0);
    }

    if (is_free !== undefined) {
      whereClause += ' AND c.is_free = ?';
      params.push(is_free ? 1 : 0);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM courses c ${whereClause}`;
    const countResult = await db.getQuery(countQuery, params);
    const total = countResult?.total || 0;

    // Get courses with pagination and sorting
    const coursesQuery = `
      SELECT 
        c.*,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        cc.name as category_name,
        (SELECT COUNT(*) FROM course_modules WHERE course_id = c.id) as modules_count,
        (SELECT COUNT(*) FROM course_videos WHERE course_id = c.id) as videos_count,
        (SELECT COUNT(*) FROM course_quizzes WHERE course_id = c.id) as quizzes_count,
        (SELECT COUNT(*) FROM course_materials WHERE course_id = c.id) as materials_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_categories cc ON c.category_id = cc.id
      ${whereClause}
      ORDER BY c.${sort_by} ${sort_order.toUpperCase()}
      LIMIT ${Math.max(1, Math.min(100, limit))} OFFSET ${Math.max(0, offset)}
    `;
    
    const courses = await db.allQuery(coursesQuery, params);

    // Format the response
    const formattedCourses = courses.map(course => ({
      ...course,
      learning_objectives: course.learning_objectives ? JSON.parse(course.learning_objectives) : [],
      tags: course.tags ? JSON.parse(course.tags) : [],
      featured: Boolean(course.featured),
      is_free: Boolean(course.is_free),
      certificate_enabled: Boolean(course.certificate_enabled)
    }));

    res.json({
      success: true,
      data: {
        courses: formattedCourses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1
        },
        filters: {
          search,
          category,
          level,
          status,
          featured,
          is_free,
          sort_by,
          sort_order
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

export async function getBusinessDirectories(_req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const directories = await listBusinessDirectories(db);
    res.json({ success: true, directories });
  } catch (error) {
    console.error('Error fetching school business directories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch business directories' });
  }
}

// Get single course with full details
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

    // Get course with instructor info
    const courseQuery = `
      SELECT 
        c.*,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        u.email as instructor_email,
        cc.name as category_name,
        cc.description as category_description
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_categories cc ON c.category_id = cc.id
      WHERE c.id = ?
    `;
    
    const course = await db.getQuery(courseQuery, [courseId]);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Get course modules
    const modulesQuery = `
      SELECT * FROM course_modules
      WHERE course_id = ?
      ORDER BY order_index ASC
    `;
    const modules = await db.allQuery(modulesQuery, [courseId]);

    // Get course videos
    const videosQuery = `
      SELECT * FROM course_videos
      WHERE course_id = ?
      ORDER BY order_index ASC
    `;
    const videos = await db.allQuery(videosQuery, [courseId]);

    // Get course materials
    const materialsQuery = `
      SELECT * FROM course_materials
      WHERE course_id = ?
      ORDER BY order_index ASC
    `;
    const materials = await db.allQuery(materialsQuery, [courseId]);

    // Get course quizzes
    const quizzesQuery = `
      SELECT * FROM course_quizzes
      WHERE course_id = ?
      ORDER BY order_index ASC
    `;
    const quizzes = await db.allQuery(quizzesQuery, [courseId]);

    // Format the response
    const formattedCourse = {
      ...course,
      learning_objectives: course.learning_objectives ? JSON.parse(course.learning_objectives) : [],
      tags: course.tags ? JSON.parse(course.tags) : [],
      featured: Boolean(course.featured),
      is_free: Boolean(course.is_free),
      certificate_enabled: Boolean(course.certificate_enabled),
      modules,
      videos,
      materials,
      quizzes
    };

    res.json({
      success: true,
      data: formattedCourse
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

    // Handle FormData - convert string values to appropriate types
    const formData = { ...req.body };
    
    // Convert numeric fields from strings to numbers
    if (formData.price) {
      formData.price = parseFloat(formData.price);
    }
    if (formData.duration_hours) {
      formData.duration_hours = parseFloat(formData.duration_hours);
    }
    if (formData.duration_minutes) {
      formData.duration_minutes = parseFloat(formData.duration_minutes);
    }
    
    // Convert boolean fields from strings to booleans
    if (formData.is_featured !== undefined) {
      formData.is_featured = formData.is_featured === 'true';
    }
    if (formData.is_published !== undefined) {
      formData.is_published = formData.is_published === 'true';
    }
    if (formData.is_free !== undefined) {
      formData.is_free = formData.is_free === 'true';
    }
    if (formData.certificate_enabled !== undefined) {
      formData.certificate_enabled = formData.certificate_enabled === 'true';
    }

    // Handle file upload
    const uploadedFile = req.file;
    if (uploadedFile) {
      formData.thumbnail_url = `/uploads/school/${uploadedFile.filename}`;
    }

    if (!formData.thumbnail_url && formData.youtube_embed_url) {
      const extractYouTubeId = (raw: string): string => {
        let url = raw || '';
        const m = url.match(/src=\"([^\"]+)\"/i);
        if (m && m[1]) url = m[1];
        try {
          const u = new URL(url);
          const host = u.hostname.replace('www.', '');
          if (host.includes('youtu.be')) {
            return u.pathname.replace('/', '').split('?')[0];
          }
          if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
            if (u.pathname.includes('/embed/')) return u.pathname.split('/embed/')[1].split('?')[0];
            if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1].split('?')[0];
            const v = u.searchParams.get('v');
            if (v) return v;
          }
        } catch {}
        const match = url.match(/(?:v=|\/embed\/|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
        return match ? match[1] : '';
      };
      const vid = extractYouTubeId(formData.youtube_embed_url);
      if (vid) {
        formData.thumbnail_url = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
        formData.preview_video_url = `https://www.youtube.com/embed/${vid}`;
      }
    }

    const extractYouTubeId = (raw: string): string => {
      let url = raw || '';
      const m = url.match(/src=\"([^\"]+)\"/i);
      if (m && m[1]) url = m[1];
      try {
        const u = new URL(url);
        const host = u.hostname.replace('www.', '');
        if (host.includes('youtu.be')) {
          return u.pathname.replace('/', '').split('?')[0];
        }
        if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
          if (u.pathname.includes('/embed/')) return u.pathname.split('/embed/')[1].split('?')[0];
          if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1].split('?')[0];
          const v = u.searchParams.get('v');
          if (v) return v;
        }
      } catch {}
      const match = url.match(/(?:v=|\/embed\/|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
      return match ? match[1] : '';
    };

    if (!formData.thumbnail_url && formData.youtube_embed_url) {
      const vid = extractYouTubeId(formData.youtube_embed_url);
      if (vid) {
        formData.thumbnail_url = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
        formData.preview_video_url = `https://www.youtube.com/embed/${vid}`;
      }
    }

    const validatedData = createCourseSchema.parse(formData);

    let courseResult;
    try {
      courseResult = await db.executeQuery(
        `INSERT INTO courses (
          title, description, short_description, instructor_id, category_id, level,
          duration_hours, duration_minutes, price, is_free, currency,
          prerequisites, learning_objectives, tags, language, certificate_enabled,
          max_enrollments, enrollment_start_date, enrollment_end_date,
          course_start_date, course_end_date, featured, thumbnail_url, preview_video_url, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          validatedData.title,
          validatedData.description || null,
          validatedData.short_description || null,
          userId,
          parseInt(validatedData.category),
          validatedData.level,
          validatedData.duration_hours,
          validatedData.duration_minutes,
          validatedData.price,
          validatedData.is_free ? 1 : 0,
          validatedData.currency,
          validatedData.prerequisites || null,
          validatedData.learning_objectives ? JSON.stringify(validatedData.learning_objectives) : null,
          validatedData.tags ? JSON.stringify(validatedData.tags) : null,
          validatedData.language,
          validatedData.certificate_enabled ? 1 : 0,
          validatedData.max_enrollments || null,
          validatedData.enrollment_start_date || null,
          validatedData.enrollment_end_date || null,
          validatedData.course_start_date || null,
          validatedData.course_end_date || null,
          validatedData.featured ? 1 : 0,
          formData.thumbnail_url || null,
          formData.preview_video_url || null,
          userId,
          userId
        ]
      );
    } catch (e) {
      const nameRow = await db.getQuery(
        `SELECT first_name, last_name FROM users WHERE id = ?`,
        [userId]
      ).catch(() => null);
      const instructorName = `${String(nameRow?.first_name || '').trim()} ${String(nameRow?.last_name || '').trim()}`.trim() || 'Instructor';
      const durationStr = `${Number(validatedData.duration_hours || 0)}h ${Number(validatedData.duration_minutes || 0)}m`;
      courseResult = await db.executeQuery(
        `INSERT INTO courses (title, description, instructor, duration, difficulty, points, featured, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          validatedData.title,
          validatedData.description || null,
          instructorName,
          durationStr,
          validatedData.level,
          0,
          validatedData.featured ? 1 : 0,
          userId
        ]
      );
    }

    const courseId = courseResult.insertId;

    let createdCourse;
    try {
      createdCourse = await db.getQuery(
        `SELECT c.*, u.first_name || ' ' || u.last_name as instructor_name
         FROM courses c
         LEFT JOIN users u ON c.instructor_id = u.id
         WHERE c.id = ?`,
        [courseId]
      );
    } catch {
      createdCourse = await db.getQuery(
        `SELECT c.* FROM courses c WHERE c.id = ?`,
        [courseId]
      );
    }

    res.status(201).json({
      success: true,
      data: {
        ...createdCourse,
        learning_objectives: createdCourse?.learning_objectives ? JSON.parse(createdCourse.learning_objectives) : [],
        tags: createdCourse?.tags ? JSON.parse(createdCourse.tags) : [],
        featured: Boolean((createdCourse as any)?.featured),
        is_free: Boolean((createdCourse as any)?.is_free),
        certificate_enabled: Boolean((createdCourse as any)?.certificate_enabled)
      }
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

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Handle FormData - convert string values to appropriate types
    const formData = { ...req.body };
    
    // Convert numeric fields from strings to numbers
    if (formData.price) {
      formData.price = parseFloat(formData.price);
    }
    if (formData.duration_hours) {
      formData.duration_hours = parseFloat(formData.duration_hours);
    }
    if (formData.duration_minutes) {
      formData.duration_minutes = parseFloat(formData.duration_minutes);
    }
    if (formData.category_id) {
      formData.category_id = parseInt(formData.category_id);
    }
    
    // Convert boolean fields from strings to booleans
    if (formData.is_featured !== undefined) {
      formData.is_featured = formData.is_featured === 'true';
    }
    if (formData.is_published !== undefined) {
      formData.is_published = formData.is_published === 'true';
    }
    if (formData.is_free !== undefined) {
      formData.is_free = formData.is_free === 'true';
    }
    if (formData.certificate_enabled !== undefined) {
      formData.certificate_enabled = formData.certificate_enabled === 'true';
    }

    // Handle file upload
    const uploadedFile = req.file;
    if (uploadedFile) {
      formData.thumbnail_url = `/uploads/school/${uploadedFile.filename}`;
    }

    const validatedData = updateCourseSchema.parse(formData);

    // Check if course exists
    const existingCourse = await db.getQuery('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'learning_objectives' || key === 'tags') {
          updateFields.push(`${key} = ?`);
          updateValues.push(Array.isArray(value) ? JSON.stringify(value) : value);
        } else if (typeof value === 'boolean') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add updated_by and updated_at
    updateFields.push('updated_by = ?');
    updateValues.push(userId);

    // Execute update
    await db.executeQuery(
      `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, courseId]
    );

    // Get updated course
    const updatedCourse = await db.getQuery(
      `SELECT c.*, u.first_name || ' ' || u.last_name as instructor_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.id = ?`,
      [courseId]
    );

    res.json({
      success: true,
      data: {
        ...updatedCourse,
        learning_objectives: updatedCourse.learning_objectives ? JSON.parse(updatedCourse.learning_objectives) : [],
        tags: updatedCourse.tags ? JSON.parse(updatedCourse.tags) : [],
        featured: Boolean(updatedCourse.featured),
        is_free: Boolean(updatedCourse.is_free),
        certificate_enabled: Boolean(updatedCourse.certificate_enabled)
      }
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
    const courseId = parseInt(req.params.id);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Check if course exists
    const existingCourse = await db.getQuery('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Delete course (cascade will handle related records)
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

// ============================================================================
// COURSE MODULE ENDPOINTS
// ============================================================================

// Get modules for a course
export async function getCourseModules(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const modules = await db.allQuery(
      'SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC',
      [courseId]
    );

    res.json({
      success: true,
      data: modules
    });

  } catch (error) {
    console.error('Error fetching course modules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course modules'
    });
  }
}

// Create course module
export async function createCourseModule(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const validatedData = createModuleSchema.parse(req.body);

    // Check if course exists
    const course = await db.getQuery('SELECT id FROM courses WHERE id = ?', [validatedData.course_id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    const result = await db.executeQuery(
      `INSERT INTO course_modules (course_id, title, description, order_index, duration_minutes, is_locked, unlock_after_module_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.course_id,
        validatedData.title,
        validatedData.description || null,
        validatedData.order_index,
        validatedData.duration_minutes,
        validatedData.is_locked ? 1 : 0,
        validatedData.unlock_after_module_id || null
      ]
    );

    const createdModule = await db.getQuery(
      'SELECT * FROM course_modules WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdModule,
        is_locked: Boolean(createdModule.is_locked)
      }
    });

  } catch (error) {
    console.error('Error creating course module:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid module data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create course module'
    });
  }
}

// Update course module
export async function updateCourseModule(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const moduleId = parseInt(req.params.id);
    const validatedData = updateModuleSchema.parse(req.body);

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid module ID'
      });
    }

    // Check if module exists
    const existingModule = await db.getQuery('SELECT * FROM course_modules WHERE id = ?', [moduleId]);
    if (!existingModule) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'boolean') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    await db.executeQuery(
      `UPDATE course_modules SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, moduleId]
    );

    const updatedModule = await db.getQuery(
      'SELECT * FROM course_modules WHERE id = ?',
      [moduleId]
    );

    res.json({
      success: true,
      data: {
        ...updatedModule,
        is_locked: Boolean(updatedModule.is_locked)
      }
    });

  } catch (error) {
    console.error('Error updating course module:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid module data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update course module'
    });
  }
}

// Delete course module
export async function deleteCourseModule(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const moduleId = parseInt(req.params.id);

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid module ID'
      });
    }

    // Check if module exists
    const existingModule = await db.getQuery('SELECT * FROM course_modules WHERE id = ?', [moduleId]);
    if (!existingModule) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    await db.executeQuery('DELETE FROM course_modules WHERE id = ?', [moduleId]);

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course module:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course module'
    });
  }
}

// ============================================================================
// COURSE VIDEO ENDPOINTS
// ============================================================================

// Get all videos from all courses
export async function getAllVideos(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();

    const videos = await db.allQuery(
      `SELECT cv.*, cm.title as module_title, c.title as course_title
       FROM course_videos cv
       LEFT JOIN course_modules cm ON cv.module_id = cm.id
       LEFT JOIN courses c ON cv.course_id = c.id
       ORDER BY cv.created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: videos.map(video => ({
        ...video,
        is_preview: Boolean(video.is_preview),
        quality_options: video.quality_options ? JSON.parse(video.quality_options) : null
      }))
    });

  } catch (error) {
    console.error('Error fetching all videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos'
    });
  }
}

// Get all materials from all courses
export async function getAllMaterials(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();

    const materials = await db.allQuery(
      `SELECT cm.*, cm_mod.title as module_title, c.title as course_title, cv.title as video_title
       FROM course_materials cm
       LEFT JOIN course_modules cm_mod ON cm.module_id = cm_mod.id
       LEFT JOIN courses c ON cm.course_id = c.id
       LEFT JOIN course_videos cv ON cm.video_id = cv.id
       ORDER BY cm.created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: materials.map(material => ({
        ...material,
        is_downloadable: Boolean(material.is_downloadable)
      }))
    });

  } catch (error) {
    console.error('Error fetching all materials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch materials'
    });
  }
}

// Get videos for a course
export async function getCourseVideos(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const videos = await db.allQuery(
      `SELECT cv.*, cm.title as module_title 
       FROM course_videos cv
       LEFT JOIN course_modules cm ON cv.module_id = cm.id
       WHERE cv.course_id = ? 
       ORDER BY cv.order_index ASC`,
      [courseId]
    );

    res.json({
      success: true,
      data: videos.map(video => ({
        ...video,
        is_preview: Boolean(video.is_preview),
        quality_options: video.quality_options ? JSON.parse(video.quality_options) : null
      }))
    });

  } catch (error) {
    console.error('Error fetching course videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course videos'
    });
  }
}

// Create course video
export async function createCourseVideo(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const validatedData = createVideoSchema.parse(req.body);

    // Check if course exists
    const course = await db.getQuery('SELECT id FROM courses WHERE id = ?', [validatedData.course_id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if module exists (if provided)
    if (validatedData.module_id) {
      const module = await db.getQuery('SELECT id FROM course_modules WHERE id = ? AND course_id = ?', 
        [validatedData.module_id, validatedData.course_id]);
      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found'
        });
      }
    }

    const result = await db.executeQuery(
      `INSERT INTO course_videos (
        course_id, module_id, title, description, video_url, video_type, video_id, thumbnail_url,
        duration_seconds, order_index, is_preview, transcript, captions_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.course_id,
        validatedData.module_id || null,
        validatedData.title,
        validatedData.description || null,
        validatedData.video_url,
        validatedData.video_type,
        validatedData.video_id || null,
        validatedData.thumbnail_url || null,
        validatedData.duration_seconds,
        validatedData.order_index,
        validatedData.is_preview ? 1 : 0,
        validatedData.transcript || null,
        validatedData.captions_url || null
      ]
    );

    const createdVideo = await db.getQuery(
      'SELECT * FROM course_videos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdVideo,
        is_preview: Boolean(createdVideo.is_preview)
      }
    });

  } catch (error) {
    console.error('Error creating course video:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create course video'
    });
  }
}

// Update course video
export async function updateCourseVideo(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const videoId = parseInt(req.params.id);
    const validatedData = updateVideoSchema.parse(req.body);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID'
      });
    }

    // Check if video exists
    const existingVideo = await db.getQuery('SELECT * FROM course_videos WHERE id = ?', [videoId]);
    if (!existingVideo) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'boolean') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    await db.executeQuery(
      `UPDATE course_videos SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, videoId]
    );

    const updatedVideo = await db.getQuery(
      'SELECT * FROM course_videos WHERE id = ?',
      [videoId]
    );

    res.json({
      success: true,
      data: {
        ...updatedVideo,
        is_preview: Boolean(updatedVideo.is_preview)
      }
    });

  } catch (error) {
    console.error('Error updating course video:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update course video'
    });
  }
}

// Delete course video
export async function deleteCourseVideo(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const videoId = parseInt(req.params.id);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID'
      });
    }

    // Check if video exists
    const existingVideo = await db.getQuery('SELECT * FROM course_videos WHERE id = ?', [videoId]);
    if (!existingVideo) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    await db.executeQuery('DELETE FROM course_videos WHERE id = ?', [videoId]);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course video'
    });
  }
}

// Upload course video with file
export async function uploadCourseVideo(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.video || files.video.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded'
      });
    }

    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;

    // Parse and validate the form data
    const videoData = {
      ...req.body,
      course_id: parseInt(req.body.course_id),
      module_id: req.body.module_id ? parseInt(req.body.module_id) : undefined,
      duration_seconds: parseInt(req.body.duration_seconds || '0'),
      order_index: parseInt(req.body.order_index || '0'),
      is_preview: req.body.is_preview === 'true'
    };

    // Validate required fields
    if (!videoData.course_id || !videoData.title) {
      return res.status(400).json({
        success: false,
        error: 'Course ID and title are required'
      });
    }

    // Check if course exists
    const course = await db.getQuery('SELECT id FROM courses WHERE id = ?', [videoData.course_id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if module exists (if provided)
    if (videoData.module_id) {
      const module = await db.getQuery('SELECT id FROM course_modules WHERE id = ? AND course_id = ?', 
        [videoData.module_id, videoData.course_id]);
      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found'
        });
      }
    }

    // Create video URL (relative path)
    const videoUrl = `/uploads/school/${videoFile.filename}`;
    const thumbnailUrl = thumbnailFile ? `/uploads/school/${thumbnailFile.filename}` : null;

    const result = await db.executeQuery(
      `INSERT INTO course_videos (
        course_id, module_id, title, description, video_url, video_type, 
        thumbnail_url, duration_seconds, order_index, is_preview, transcript
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoData.course_id,
        videoData.module_id || null,
        videoData.title,
        videoData.description || null,
        videoUrl,
        'upload',
        thumbnailUrl,
        videoData.duration_seconds,
        videoData.order_index,
        videoData.is_preview ? 1 : 0,
        videoData.transcript || null
      ]
    );

    const createdVideo = await db.getQuery(
      'SELECT * FROM course_videos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdVideo,
        is_preview: Boolean(createdVideo.is_preview)
      }
    });

  } catch (error) {
    console.error('Error uploading course video:', error);
    
    // Clean up uploaded files if there was an error
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      try {
        if (files.video && files.video[0]) {
          await fs.unlink(files.video[0].path);
        }
        if (files.thumbnail && files.thumbnail[0]) {
          await fs.unlink(files.thumbnail[0].path);
        }
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded files:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload course video'
    });
  }
}

// ============================================================================
// COURSE MATERIAL ENDPOINTS
// ============================================================================

// Get materials for a course
export async function getCourseMaterials(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const materials = await db.allQuery(
      `SELECT cm.*, cm_mod.title as module_title, cv.title as video_title
       FROM course_materials cm
       LEFT JOIN course_modules cm_mod ON cm.module_id = cm_mod.id
       LEFT JOIN course_videos cv ON cm.video_id = cv.id
       WHERE cm.course_id = ? 
       ORDER BY cm.order_index ASC`,
      [courseId]
    );

    res.json({
      success: true,
      data: materials.map(material => ({
        ...material,
        is_downloadable: Boolean(material.is_downloadable)
      }))
    });

  } catch (error) {
    console.error('Error fetching course materials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course materials'
    });
  }
}

// Upload and create course material
export async function uploadCourseMaterial(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Determine file type based on mime type first
    let fileType = 'other';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype === 'application/pdf') {
      fileType = 'pdf';
    } else if (req.file.mimetype.includes('document') || req.file.mimetype.includes('word') || req.file.mimetype.includes('powerpoint')) {
      fileType = 'document';
    } else if (req.file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
    }

    // Parse and validate the form data
    const materialData = {
      ...req.body,
      course_id: parseInt(req.body.course_id),
      module_id: req.body.module_id ? parseInt(req.body.module_id) : undefined,
      video_id: req.body.video_id ? parseInt(req.body.video_id) : undefined,
      order_index: parseInt(req.body.order_index || '0'),
      is_downloadable: req.body.is_downloadable === 'true',
      file_type: fileType // Add the determined file type
    };

    const validatedData = createMaterialSchema.parse(materialData);

    // Check if course exists
    const course = await db.getQuery('SELECT id FROM courses WHERE id = ?', [validatedData.course_id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Create file URL (relative path)
    const fileUrl = `/uploads/school/${req.file.filename}`;

    const result = await db.executeQuery(
      `INSERT INTO course_materials (
        course_id, module_id, video_id, title, description, file_url, file_name,
        file_type, file_size, mime_type, order_index, is_downloadable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.course_id,
        validatedData.module_id || null,
        validatedData.video_id || null,
        validatedData.title,
        validatedData.description || null,
        fileUrl,
        req.file.originalname,
        fileType,
        req.file.size,
        req.file.mimetype,
        validatedData.order_index,
        validatedData.is_downloadable ? 1 : 0
      ]
    );

    const createdMaterial = await db.getQuery(
      'SELECT * FROM course_materials WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdMaterial,
        is_downloadable: Boolean(createdMaterial.is_downloadable)
      }
    });

  } catch (error) {
    console.error('Error uploading course material:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid material data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload course material'
    });
  }
}

// Update course material
export async function updateCourseMaterial(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const materialId = parseInt(req.params.id);

    if (!materialId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid material ID'
      });
    }

    // Check if material exists
    const existingMaterial = await db.getQuery('SELECT * FROM course_materials WHERE id = ?', [materialId]);
    if (!existingMaterial) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = ['title', 'description', 'order_index', 'is_downloadable'];
    
    Object.entries(req.body).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'is_downloadable') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value === true || value === 'true' ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    await db.executeQuery(
      `UPDATE course_materials SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, materialId]
    );

    const updatedMaterial = await db.getQuery(
      'SELECT * FROM course_materials WHERE id = ?',
      [materialId]
    );

    res.json({
      success: true,
      data: {
        ...updatedMaterial,
        is_downloadable: Boolean(updatedMaterial.is_downloadable)
      }
    });

  } catch (error) {
    console.error('Error updating course material:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update course material'
    });
  }
}

// Delete course material
export async function deleteCourseMaterial(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const materialId = parseInt(req.params.id);

    if (!materialId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid material ID'
      });
    }

    // Check if material exists
    const existingMaterial = await db.getQuery('SELECT * FROM course_materials WHERE id = ?', [materialId]);
    if (!existingMaterial) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }

    // Delete the file from filesystem
    if (existingMaterial.file_url) {
      const filePath = path.join(process.cwd(), existingMaterial.file_url);
      try {
        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    await db.executeQuery('DELETE FROM course_materials WHERE id = ?', [materialId]);

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course material:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course material'
    });
  }
}

// ============================================================================
// COURSE QUIZ ENDPOINTS
// ============================================================================

// Get quizzes for a course
export async function getCourseQuizzes(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const quizzes = await db.allQuery(
      `SELECT cq.*, cq_mod.title as module_title, cv.title as video_title,
              (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = cq.id) as questions_count
       FROM course_quizzes cq
       LEFT JOIN course_modules cq_mod ON cq.module_id = cq_mod.id
       LEFT JOIN course_videos cv ON cq.video_id = cv.id
       WHERE cq.course_id = ? 
       ORDER BY cq.order_index ASC`,
      [courseId]
    );

    res.json({
      success: true,
      data: quizzes.map(quiz => ({
        ...quiz,
        randomize_questions: Boolean(quiz.randomize_questions),
        show_correct_answers: Boolean(quiz.show_correct_answers),
        show_results_immediately: Boolean(quiz.show_results_immediately),
        is_required: Boolean(quiz.is_required)
      }))
    });

  } catch (error) {
    console.error('Error fetching course quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course quizzes'
    });
  }
}

// Create course quiz
export async function createCourseQuiz(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const validatedData = createQuizSchema.parse(req.body);

    // Check if course exists
    const course = await db.getQuery('SELECT id FROM courses WHERE id = ?', [validatedData.course_id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    const result = await db.executeQuery(
      `INSERT INTO course_quizzes (
        course_id, module_id, video_id, title, description, instructions, quiz_type,
        time_limit_minutes, attempts_allowed, passing_score, randomize_questions,
        show_correct_answers, show_results_immediately, order_index, is_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.course_id,
        validatedData.module_id || null,
        validatedData.video_id || null,
        validatedData.title,
        validatedData.description || null,
        validatedData.instructions || null,
        validatedData.quiz_type,
        validatedData.time_limit_minutes || null,
        validatedData.attempts_allowed,
        validatedData.passing_score,
        validatedData.randomize_questions ? 1 : 0,
        validatedData.show_correct_answers ? 1 : 0,
        validatedData.show_results_immediately ? 1 : 0,
        validatedData.order_index,
        validatedData.is_required ? 1 : 0
      ]
    );

    const createdQuiz = await db.getQuery(
      'SELECT * FROM course_quizzes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdQuiz,
        randomize_questions: Boolean(createdQuiz.randomize_questions),
        show_correct_answers: Boolean(createdQuiz.show_correct_answers),
        show_results_immediately: Boolean(createdQuiz.show_results_immediately),
        is_required: Boolean(createdQuiz.is_required)
      }
    });

  } catch (error) {
    console.error('Error creating course quiz:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create course quiz'
    });
  }
}

// Update course quiz
export async function updateCourseQuiz(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const quizId = parseInt(req.params.id);
    const validatedData = updateQuizSchema.parse(req.body);

    if (!quizId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz ID'
      });
    }

    // Check if quiz exists
    const existingQuiz = await db.getQuery('SELECT * FROM course_quizzes WHERE id = ?', [quizId]);
    if (!existingQuiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'boolean') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    await db.executeQuery(
      `UPDATE course_quizzes SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, quizId]
    );

    const updatedQuiz = await db.getQuery(
      'SELECT * FROM course_quizzes WHERE id = ?',
      [quizId]
    );

    res.json({
      success: true,
      data: {
        ...updatedQuiz,
        randomize_questions: Boolean(updatedQuiz.randomize_questions),
        show_correct_answers: Boolean(updatedQuiz.show_correct_answers),
        show_results_immediately: Boolean(updatedQuiz.show_results_immediately),
        is_required: Boolean(updatedQuiz.is_required)
      }
    });

  } catch (error) {
    console.error('Error updating course quiz:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update course quiz'
    });
  }
}

// Delete course quiz
export async function deleteCourseQuiz(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const quizId = parseInt(req.params.id);

    if (!quizId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz ID'
      });
    }

    // Check if quiz exists
    const existingQuiz = await db.getQuery('SELECT * FROM course_quizzes WHERE id = ?', [quizId]);
    if (!existingQuiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    await db.executeQuery('DELETE FROM course_quizzes WHERE id = ?', [quizId]);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course quiz'
    });
  }
}

// ============================================================================
// QUIZ QUESTION ENDPOINTS
// ============================================================================

// Get questions for a quiz
export async function getQuizQuestions(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const quizId = parseInt(req.params.quizId);

    if (!quizId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz ID'
      });
    }

    const questions = await db.allQuery(
      'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC',
      [quizId]
    );

    res.json({
      success: true,
      data: questions.map(question => ({
        ...question,
        options: question.options ? JSON.parse(question.options) : [],
        correct_answers: question.correct_answers ? JSON.parse(question.correct_answers) : []
      }))
    });

  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz questions'
    });
  }
}

// Create quiz question
export async function createQuizQuestion(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const validatedData = createQuestionSchema.parse(req.body);

    // Check if quiz exists
    const quiz = await db.getQuery('SELECT id FROM course_quizzes WHERE id = ?', [validatedData.quiz_id]);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    const result = await db.executeQuery(
      `INSERT INTO quiz_questions (
        quiz_id, question_text, question_type, options, correct_answers, explanation, points, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.quiz_id,
        validatedData.question_text,
        validatedData.question_type,
        validatedData.options ? JSON.stringify(validatedData.options) : null,
        JSON.stringify(validatedData.correct_answers),
        validatedData.explanation || null,
        validatedData.points,
        validatedData.order_index
      ]
    );

    const createdQuestion = await db.getQuery(
      'SELECT * FROM quiz_questions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createdQuestion,
        options: createdQuestion.options ? JSON.parse(createdQuestion.options) : [],
        correct_answers: createdQuestion.correct_answers ? JSON.parse(createdQuestion.correct_answers) : []
      }
    });

  } catch (error) {
    console.error('Error creating quiz question:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create quiz question'
    });
  }
}

// Update quiz question
export async function updateQuizQuestion(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const questionId = parseInt(req.params.id);
    const validatedData = updateQuestionSchema.parse(req.body);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question ID'
      });
    }

    // Check if question exists
    const existingQuestion = await db.getQuery('SELECT * FROM quiz_questions WHERE id = ?', [questionId]);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'options' || key === 'correct_answers') {
          updateFields.push(`${key} = ?`);
          updateValues.push(Array.isArray(value) ? JSON.stringify(value) : value);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    await db.executeQuery(
      `UPDATE quiz_questions SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, questionId]
    );

    const updatedQuestion = await db.getQuery(
      'SELECT * FROM quiz_questions WHERE id = ?',
      [questionId]
    );

    res.json({
      success: true,
      data: {
        ...updatedQuestion,
        options: updatedQuestion.options ? JSON.parse(updatedQuestion.options) : [],
        correct_answers: updatedQuestion.correct_answers ? JSON.parse(updatedQuestion.correct_answers) : []
      }
    });

  } catch (error) {
    console.error('Error updating quiz question:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to update quiz question'
    });
  }
}

// Delete quiz question
export async function deleteQuizQuestion(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const questionId = parseInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question ID'
      });
    }

    // Check if question exists
    const existingQuestion = await db.getQuery('SELECT * FROM quiz_questions WHERE id = ?', [questionId]);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    await db.executeQuery('DELETE FROM quiz_questions WHERE id = ?', [questionId]);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting quiz question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quiz question'
    });
  }
}

// ============================================================================
// COURSE CATEGORIES ENDPOINTS
// ============================================================================

// Get all course categories
export async function getCourseCategories(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    
    const categories = await db.allQuery(
      `SELECT cc.*, 
              (SELECT COUNT(*) FROM courses WHERE category_id = cc.id) as courses_count
       FROM course_categories cc 
       ORDER BY cc.name ASC`
    );

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching course categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course categories'
    });
  }
}

// Create course category
export async function createCourseCategory(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Check if category already exists
    const existingCategory = await db.getQuery('SELECT id FROM course_categories WHERE name = ?', [name.trim()]);
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        error: 'Category already exists'
      });
    }

    const result = await db.executeQuery(
      'INSERT INTO course_categories (name, description) VALUES (?, ?)',
      [name.trim(), description || null]
    );

    const createdCategory = await db.getQuery(
      'SELECT * FROM course_categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: createdCategory
    });

  } catch (error) {
    console.error('Error creating course category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create course category'
    });
  }
}

// Update course category
export async function updateCourseCategory(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }

    // Check if category exists
    const existingCategory = await db.getQuery('SELECT * FROM course_categories WHERE id = ?', [categoryId]);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name && name.trim().length > 0) {
      // Check if new name conflicts with existing category
      const nameConflict = await db.getQuery(
        'SELECT id FROM course_categories WHERE name = ? AND id != ?',
        [name.trim(), categoryId]
      );
      if (nameConflict) {
        return res.status(409).json({
          success: false,
          error: 'Category name already exists'
        });
      }
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    await db.executeQuery(
      `UPDATE course_categories SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateValues, categoryId]
    );

    const updatedCategory = await db.getQuery(
      'SELECT * FROM course_categories WHERE id = ?',
      [categoryId]
    );

    res.json({
      success: true,
      data: updatedCategory
    });

  } catch (error) {
    console.error('Error updating course category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update course category'
    });
  }
}

// Delete course category
export async function deleteCourseCategory(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const categoryId = parseInt(req.params.id);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }

    // Check if category exists
    const existingCategory = await db.getQuery('SELECT * FROM course_categories WHERE id = ?', [categoryId]);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category is being used by any courses
    const coursesUsingCategory = await db.getQuery(
      'SELECT COUNT(*) as count FROM courses WHERE category_id = ?',
      [categoryId]
    );

    if (coursesUsingCategory.count > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete category. ${coursesUsingCategory.count} course(s) are using this category.`
      });
    }

    await db.executeQuery('DELETE FROM course_categories WHERE id = ?', [categoryId]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course category'
    });
  }
}

// ============================================================================
// ANALYTICS AND STATISTICS ENDPOINTS
// ============================================================================

// Get school management dashboard statistics
export async function getSchoolStatistics(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();

    // Get course statistics
    const courseStats = await db.getQuery(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_courses,
        COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_courses,
        COUNT(CASE WHEN is_free = 1 THEN 1 END) as free_courses,
        COALESCE(AVG(price), 0) as average_price
      FROM courses
    `);

    // Get enrollment statistics (handle missing table gracefully)
    let enrollmentStats = { total_enrollments: 0, unique_students: 0, completed_enrollments: 0, active_enrollments: 0 };
    try {
      enrollmentStats = await db.getQuery(`
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(DISTINCT user_id) as unique_students,
          COUNT(CASE WHEN completed = 1 THEN 1 END) as completed_enrollments,
          COUNT(CASE WHEN completed = 0 THEN 1 END) as active_enrollments
        FROM course_enrollments
      `);
    } catch (error) {
      console.log('course_enrollments table not found, using default values');
    }

    // Get content statistics (handle missing tables gracefully)
    let contentStats = { total_modules: 0, total_videos: 0, total_materials: 0, total_quizzes: 0, total_questions: 0 };
    try {
      contentStats = await db.getQuery(`
        SELECT 
          COALESCE((SELECT COUNT(*) FROM course_modules), 0) as total_modules,
          COALESCE((SELECT COUNT(*) FROM course_videos), 0) as total_videos,
          COALESCE((SELECT COUNT(*) FROM course_materials), 0) as total_materials,
          COALESCE((SELECT COUNT(*) FROM course_quizzes), 0) as total_quizzes,
          0 as total_questions
      `);
      
      // Ensure we have the correct values from the database
      if (!contentStats) {
        contentStats = { total_modules: 0, total_videos: 0, total_materials: 0, total_quizzes: 0, total_questions: 0 };
      }
    } catch (error) {
      console.log('Some content tables not found, using default values');
      contentStats = { total_modules: 0, total_videos: 0, total_materials: 0, total_quizzes: 0, total_questions: 0 };
    }

    // Get recent activity (last 30 days)
    const recentActivity = await db.getQuery(`
      SELECT 
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as courses_created_30d,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as courses_created_7d
      FROM courses
    `);

    // Get top categories
    const topCategories = await db.allQuery(`
      SELECT 
        cc.name as category,
        COUNT(c.id) as course_count,
        COUNT(CASE WHEN c.status = 'published' THEN 1 END) as published_count
      FROM course_categories cc
      LEFT JOIN courses c ON c.category_id = cc.id
      GROUP BY cc.id, cc.name 
      ORDER BY course_count DESC 
      LIMIT 10
    `);

    // Get instructor statistics (handle missing instructor_id gracefully)
    let instructorStats = { total_instructors: 0, avg_courses_per_instructor: 0 };
    try {
      instructorStats = await db.getQuery(`
        SELECT 
          COUNT(DISTINCT instructor_id) as total_instructors,
          COALESCE(AVG(course_count), 0) as avg_courses_per_instructor
        FROM (
          SELECT instructor_id, COUNT(*) as course_count
          FROM courses
          WHERE instructor_id IS NOT NULL
          GROUP BY instructor_id
        ) instructor_courses
      `);
    } catch (error) {
      console.log('instructor_id column not found, using default values');
    }

    res.json({
      success: true,
      data: {
        courses: {
          ...courseStats,
          average_price: parseFloat(String(courseStats.average_price || 0)).toFixed(2)
        },
        enrollments: enrollmentStats,
        content: contentStats,
        recent_activity: recentActivity,
        top_categories: topCategories,
        instructors: {
          ...instructorStats,
          avg_courses_per_instructor: parseFloat(String(instructorStats.avg_courses_per_instructor || 0)).toFixed(1)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching school statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch school statistics'
    });
  }
}

// Get course performance analytics
export async function getCourseAnalytics(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Check if course exists
    const course = await db.getQuery('SELECT id, title FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Get enrollment analytics
    const enrollmentAnalytics = await db.getQuery(`
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'dropped' THEN 1 END) as dropped_count,
        AVG(progress_percentage) as average_progress,
        AVG(CASE WHEN status = 'completed' THEN 
          (julianday(completed_at) - julianday(enrolled_at)) 
        END) as avg_completion_days
      FROM course_enrollments 
      WHERE course_id = ?
    `, [courseId]);

    // Get quiz performance
    const quizPerformance = await db.allQuery(`
      SELECT 
        cq.title as quiz_title,
        COUNT(qa.id) as total_attempts,
        AVG(qa.score) as average_score,
        COUNT(CASE WHEN qa.passed = 1 THEN 1 END) as passed_attempts,
        AVG(qa.time_taken_minutes) as avg_time_taken
      FROM course_quizzes cq
      LEFT JOIN quiz_attempts qa ON cq.id = qa.quiz_id
      WHERE cq.course_id = ?
      GROUP BY cq.id, cq.title
      ORDER BY cq.order_index
    `, [courseId]);

    // Get enrollment trends (last 12 months)
    const enrollmentTrends = await db.allQuery(`
      SELECT 
        DATE_FORMAT(enrolled_at, '%Y-%m') as month,
        COUNT(*) as enrollments
      FROM course_enrollments 
      WHERE course_id = ? 
        AND enrolled_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(enrolled_at, '%Y-%m')
      ORDER BY month
    `, [courseId]);

    // Get student feedback/reviews
    const reviewStats = await db.getQuery(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
      FROM course_reviews 
      WHERE course_id = ?
    `, [courseId]);

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title
        },
        enrollments: {
          ...enrollmentAnalytics,
          average_progress: parseFloat(enrollmentAnalytics.average_progress || 0).toFixed(1),
          avg_completion_days: parseFloat(enrollmentAnalytics.avg_completion_days || 0).toFixed(1),
          completion_rate: enrollmentAnalytics.total_enrollments > 0 
            ? ((enrollmentAnalytics.completed_count / enrollmentAnalytics.total_enrollments) * 100).toFixed(1)
            : '0.0'
        },
        quiz_performance: quizPerformance.map(quiz => ({
          ...quiz,
          average_score: parseFloat(quiz.average_score || 0).toFixed(1),
          pass_rate: quiz.total_attempts > 0 
            ? ((quiz.passed_attempts / quiz.total_attempts) * 100).toFixed(1)
            : '0.0',
          avg_time_taken: parseFloat(quiz.avg_time_taken || 0).toFixed(1)
        })),
        enrollment_trends: enrollmentTrends,
        reviews: {
          ...reviewStats,
          average_rating: parseFloat(reviewStats.average_rating || 0).toFixed(1)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course analytics'
    });
  }
}

// ============================================================================
// LEADERBOARD ENDPOINT
// ============================================================================

export async function getSchoolLeaderboard(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const currentUserId = (req as any)?.user?.id ?? null;
    const dbType = db.getType ? db.getType() : 'sqlite';

    // Build cross-DB SQL for leaderboard aggregation
    const mysqlQuery = `
      SELECT 
        u.id AS user_id,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.email) AS name,
        COALESCE(SUM(qa.earned_points), 0) AS total_points,
        COALESCE(SUM(CASE WHEN qa.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN qa.earned_points ELSE 0 END), 0) AS weekly_points,
        COALESCE(COUNT(DISTINCT CASE WHEN ce.status = 'completed' OR ce.completed = 1 THEN ce.course_id END), 0) AS courses_completed,
        COALESCE(COUNT(CASE WHEN qa.status = 'completed' THEN 1 END), 0) AS badges_count
      FROM users u
      LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
      LEFT JOIN course_enrollments ce ON ce.user_id = u.id
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 100
    `;

    const sqliteQuery = `
      SELECT 
        u.id AS user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
        COALESCE(SUM(qa.earned_points), 0) AS total_points,
        COALESCE(SUM(CASE WHEN qa.started_at >= datetime('now','-7 days') THEN qa.earned_points ELSE 0 END), 0) AS weekly_points,
        COALESCE(COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.course_id END), 0) AS courses_completed,
        COALESCE(COUNT(CASE WHEN qa.status = 'completed' THEN 1 END), 0) AS badges_count
      FROM users u
      LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
      LEFT JOIN course_enrollments ce ON ce.user_id = u.id
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 100
    `;

    let rows: any[] = [];
    try {
      rows = await db.allQuery(dbType === 'mysql' ? mysqlQuery : sqliteQuery);
    } catch (err) {
      // Fallback: if learning tables are missing, return users with zero stats
      const fallbackQuery = dbType === 'mysql'
        ? `SELECT u.id AS user_id, COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.email) AS name FROM users u LIMIT 50`
        : `SELECT u.id AS user_id, COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name FROM users u LIMIT 50`;
      const basicUsers = await db.allQuery(fallbackQuery);
      rows = basicUsers.map((u: any) => ({
        user_id: u.user_id,
        name: u.name,
        total_points: 0,
        weekly_points: 0,
        courses_completed: 0,
        badges_count: 0,
      }));
    }

    // Helper to compute tier from points
    const computeTier = (points: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' => {
      if (points >= 5000) return 'diamond';
      if (points >= 2500) return 'platinum';
      if (points >= 1500) return 'gold';
      if (points >= 750) return 'silver';
      return 'bronze';
    };

    // Sort rows by points descending to ensure ranking
    rows.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    const leaderboard = rows.map((row, index) => {
      const nameStr: string = row.name || 'User';
      const initial = (nameStr || 'U').trim().charAt(0).toUpperCase() || 'U';
      return {
        id: row.user_id,
        name: nameStr,
        avatar: initial,
        points: Number(row.total_points || 0),
        badges: Number(row.badges_count || 0),
        coursesCompleted: Number(row.courses_completed || 0),
        rank: index + 1,
        weeklyGain: Number(row.weekly_points || 0),
        tier: computeTier(Number(row.total_points || 0)),
      };
    });

    // Compute current user's streak (consecutive days with activity)
    let currentStreak = 0;
    if (currentUserId) {
      const streakQuery = dbType === 'mysql'
        ? `
          SELECT DATE(qa.started_at) AS day
          FROM quiz_attempts qa
          WHERE qa.user_id = ?
            AND qa.started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY day
          ORDER BY day DESC
        `
        : `
          SELECT DATE(qa.started_at) AS day
          FROM quiz_attempts qa
          WHERE qa.user_id = ?
            AND qa.started_at >= date('now', '-30 day')
          GROUP BY day
          ORDER BY day DESC
        `;
      try {
        const days = await db.allQuery(streakQuery, [currentUserId]);
        const daySet = new Set((days || []).map((d: any) => String(d.day)));
        // Iterate backwards from today to count consecutive active days
        const today = new Date();
        const fmt = (dt: Date) => {
          const year = dt.getFullYear();
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        let streak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = fmt(d);
          if (daySet.has(key)) streak++;
          else break;
        }
        currentStreak = streak;
      } catch (_) {
        currentStreak = 0;
      }
    }

    // Find current user's stats in leaderboard
    const youIndex = currentUserId ? leaderboard.findIndex(l => l.id === currentUserId) : -1;
    const youEntry = youIndex >= 0 ? leaderboard[youIndex] : null;

    const yourStats = {
      totalPoints: youEntry ? youEntry.points : 0,
      currentStreak,
      coursesCompleted: youEntry ? youEntry.coursesCompleted : 0,
      badgesEarned: youEntry ? youEntry.badges : 0,
      communityRank: youIndex >= 0 ? (youIndex + 1) : 0,
      weeklyPoints: youEntry ? youEntry.weeklyGain : 0,
    };

    res.json({
      success: true,
      data: {
        leaderboard,
        yourStats,
      }
    });

  } catch (error) {
    console.error('Error generating leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate leaderboard'
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Bulk operations for courses
export async function bulkUpdateCourses(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const { course_ids, updates } = req.body;

    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Course IDs array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required'
      });
    }

    // Validate course IDs
    const validCourseIds = course_ids.filter(id => Number.isInteger(id) && id > 0);
    if (validCourseIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid course IDs provided'
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = ['status', 'featured', 'is_free', 'category', 'level'];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        if (typeof value === 'boolean') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Create placeholders for course IDs
    const placeholders = validCourseIds.map(() => '?').join(',');
    
    // Execute bulk update
    const result = await db.executeQuery(
      `UPDATE courses SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`,
      [...updateValues, ...validCourseIds]
    );

    res.json({
      success: true,
      data: {
        updated_count: result.changes || 0,
        course_ids: validCourseIds
      }
    });

  } catch (error) {
    console.error('Error bulk updating courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update courses'
    });
  }
}

// Export course data
export async function exportCourseData(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const courseId = parseInt(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    // Get complete course data
    const course = await db.getQuery(`
      SELECT c.*, u.first_name || ' ' || u.last_name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [courseId]);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Get all related data
    const modules = await db.allQuery('SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index', [courseId]);
    const videos = await db.allQuery('SELECT * FROM course_videos WHERE course_id = ? ORDER BY order_index', [courseId]);
    const materials = await db.allQuery('SELECT * FROM course_materials WHERE course_id = ? ORDER BY order_index', [courseId]);
    const quizzes = await db.allQuery('SELECT * FROM course_quizzes WHERE course_id = ? ORDER BY order_index', [courseId]);
    
    // Get quiz questions for each quiz
    const quizQuestions = {};
    for (const quiz of quizzes) {
      const questions = await db.allQuery('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index', [quiz.id]);
      quizQuestions[quiz.id] = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : [],
        correct_answers: q.correct_answers ? JSON.parse(q.correct_answers) : []
      }));
    }

    // Format export data
    const exportData = {
      course: {
        ...course,
        learning_objectives: course.learning_objectives ? JSON.parse(course.learning_objectives) : [],
        tags: course.tags ? JSON.parse(course.tags) : []
      },
      modules,
      videos,
      materials,
      quizzes: quizzes.map(quiz => ({
        ...quiz,
        questions: quizQuestions[quiz.id] || []
      })),
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_version: '1.0'
      }
    };

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Error exporting course data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export course data'
    });
  }
}
