import { Router } from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/blog');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (increased for audio)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp3|wav|ogg|m4a|mpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/|audio\//.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and audio files are allowed.'));
    }
  }
});

// Middleware to ensure user is support or admin
router.use(authenticateToken);
router.use(requireRole('support', 'admin', 'super_admin'));

// Upload image
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const url = `${proto}://${host}/uploads/blog/${req.file.filename}`;
    
    res.json({ url });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload audio
router.post('/upload-audio', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const url = `${proto}://${host}/uploads/blog/${req.file.filename}`;
    
    res.json({ url });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

// --- Posts ---

// Get all posts (for management)
router.get('/posts', async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        p.*, 
        c.name as category_name, 
        u.first_name as author_first_name, 
        u.last_name as author_last_name
      FROM blog_posts p
      LEFT JOIN blog_categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (category) {
      query += ` AND p.category_id = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (p.title LIKE ? OR p.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const posts = await executeQuery(query, params);

    // Get count
    let countQuery = `SELECT COUNT(*) as total FROM blog_posts p WHERE 1=1`;
    const countParams: any[] = [];

    if (status) {
      countQuery += ` AND p.status = ?`;
      countParams.push(status);
    }
    if (category) {
      countQuery += ` AND p.category_id = ?`;
      countParams.push(category);
    }
    if (search) {
      countQuery += ` AND (p.title LIKE ? OR p.content LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const totalResult = await executeQuery<any[]>(countQuery, countParams);
    const total = totalResult[0]?.total || 0;

    res.json({
      posts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post for editing
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get post details
    const posts = await executeQuery<any[]>(`
      SELECT * FROM blog_posts WHERE id = ?
    `, [id]);

    if (!posts || posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[0];

    // Get tags
    const tags = await executeQuery<any[]>(`
      SELECT t.id, t.name 
      FROM blog_tags t
      JOIN blog_post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `, [id]);

    post.tags = tags;

    res.json(post);
  } catch (error) {
    console.error('Error fetching post details:', error);
    res.status(500).json({ error: 'Failed to fetch post details' });
  }
});

// Create post
router.post('/posts', async (req: any, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      youtube_url,
      audio_url,
      category_id,
      status,
      seo_title,
      seo_description,
      seo_keywords,
      tags // Array of tag IDs or names
    } = req.body;

    const author_id = req.user.id;
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const published_at = status === 'published' ? new Date() : null;

    const result = await executeQuery(
      `INSERT INTO blog_posts (
        title, slug, content, excerpt, featured_image, youtube_url, audio_url,
        author_id, category_id, status, published_at, 
        seo_title, seo_description, seo_keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, finalSlug, content, excerpt, featured_image, youtube_url, audio_url,
        author_id, category_id, status || 'draft', published_at,
        seo_title, seo_description, seo_keywords
      ]
    );

    const postId = (result as any).insertId;

    // Handle tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        let tagId = tag.id;
        
        // If tag doesn't exist (new tag passed as string name)
        if (!tagId && typeof tag === 'string') {
           const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
           // Try insert, ignore if exists
           await executeQuery('INSERT IGNORE INTO blog_tags (name, slug) VALUES (?, ?)', [tag, tagSlug]);
           const tagRes = await executeQuery<any[]>('SELECT id FROM blog_tags WHERE slug = ?', [tagSlug]);
           tagId = tagRes[0]?.id;
        }

        if (tagId) {
          await executeQuery('INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
        }
      }
    }

    res.status(201).json({ message: 'Post created successfully', id: postId, slug: finalSlug });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update post
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      content,
      excerpt,
      featured_image,
      youtube_url,
      audio_url,
      category_id,
      status,
      seo_title,
      seo_description,
      seo_keywords,
      tags
    } = req.body;

    // Check if post exists
    const existing = await executeQuery<any[]>('SELECT status FROM blog_posts WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let published_at_update = '';
    const params = [
      title, slug, content, excerpt, featured_image, youtube_url, audio_url,
      category_id, status, seo_title, seo_description, seo_keywords
    ];

    // If changing to published from non-published, set published_at
    if (status === 'published' && existing[0].status !== 'published') {
      published_at_update = ', published_at = NOW()';
    }

    params.push(id);

    await executeQuery(
      `UPDATE blog_posts SET 
        title = ?, slug = ?, content = ?, excerpt = ?, featured_image = ?, youtube_url = ?, audio_url = ?,
        category_id = ?, status = ?, seo_title = ?, seo_description = ?, seo_keywords = ?
        ${published_at_update}
       WHERE id = ?`,
      params
    );

    // Update tags (delete all and re-insert)
    if (tags !== undefined) {
      await executeQuery('DELETE FROM blog_post_tags WHERE post_id = ?', [id]);
      
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          let tagId = tag.id;
          if (!tagId && typeof tag === 'string') {
             const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
             await executeQuery('INSERT IGNORE INTO blog_tags (name, slug) VALUES (?, ?)', [tag, tagSlug]);
             const tagRes = await executeQuery<any[]>('SELECT id FROM blog_tags WHERE slug = ?', [tagSlug]);
             tagId = tagRes[0]?.id;
          }
          if (tagId) {
             await executeQuery('INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', [id, tagId]);
          }
        }
      }
    }

    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM blog_posts WHERE id = ?', [id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// --- Categories ---

router.get('/categories', async (req, res) => {
  try {
    const categories = await executeQuery('SELECT * FROM blog_categories ORDER BY name ASC');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    await executeQuery(
      'INSERT INTO blog_categories (name, slug, description) VALUES (?, ?, ?)',
      [name, slug, description]
    );
    res.status(201).json({ message: 'Category created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Set posts in this category to uncategorized
    await executeQuery('UPDATE blog_posts SET category_id = NULL WHERE category_id = ?', [id]);
    // Delete category
    await executeQuery('DELETE FROM blog_categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// --- Tags ---

router.get('/tags', async (req, res) => {
  try {
    const tags = await executeQuery('SELECT * FROM blog_tags ORDER BY name ASC');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

router.post('/tags', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    // Check if exists
    const existing = await executeQuery<any[]>('SELECT id FROM blog_tags WHERE slug = ?', [slug]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Tag already exists' });
    }

    await executeQuery(
      'INSERT INTO blog_tags (name, slug) VALUES (?, ?)',
      [name, slug]
    );
    res.status(201).json({ message: 'Tag created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

router.delete('/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove tag associations first
    await executeQuery('DELETE FROM blog_post_tags WHERE tag_id = ?', [id]);
    
    // Delete tag
    await executeQuery('DELETE FROM blog_tags WHERE id = ?', [id]);
    
    res.json({ message: 'Tag deleted' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
