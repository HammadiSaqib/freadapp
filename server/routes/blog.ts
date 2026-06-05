import { Router } from 'express';
import { executeQuery } from '../database/mysqlConfig.js';

const router = Router();

export const fetchBlogPostBySlug = async (slug: string) => {
  await executeQuery('UPDATE blog_posts SET views = views + 1 WHERE slug = ?', [slug]);

  const posts = await executeQuery<any[]>(`
    SELECT 
      p.*, 
      c.name as category_name, 
      c.slug as category_slug,
      u.first_name as author_first_name, 
      u.last_name as author_last_name,
      u.avatar as author_avatar
    FROM blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.slug = ? AND p.status = 'published'
  `, [slug]);

  if (!posts || posts.length === 0) {
    return null;
  }

  const post = posts[0];

  const tags = await executeQuery(`
    SELECT t.* 
    FROM blog_tags t
    JOIN blog_post_tags pt ON t.id = pt.tag_id
    WHERE pt.post_id = ?
  `, [post.id]);

  return { ...post, tags };
};

// Get all published blog posts
router.get('/', async (req, res) => {
  try {
    const { category, tag, page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT 
        p.*, 
        c.name as category_name, 
        c.slug as category_slug,
        u.first_name as author_first_name, 
        u.last_name as author_last_name,
        u.avatar as author_avatar
      FROM blog_posts p
      LEFT JOIN blog_categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'published'
    `;
    
    const params: any[] = [];

    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (p.title LIKE ? OR p.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sort by published date descending
    query += ` ORDER BY p.published_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const posts = await executeQuery(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM blog_posts p 
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE p.status = 'published'
    `;
    const countParams: any[] = [];
    
    if (category) {
      countQuery += ` AND c.slug = ?`;
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
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single blog post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await fetchBlogPostBySlug(slug);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Get categories
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await executeQuery(`
      SELECT c.*, COUNT(p.id) as post_count
      FROM blog_categories c
      LEFT JOIN blog_posts p ON c.id = p.category_id AND p.status = 'published'
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;
