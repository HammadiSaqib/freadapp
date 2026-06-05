import { Router, Request, Response } from 'express';
import { executeQuery, executeTransaction } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Interfaces
interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author_id: number;
  author_name?: string;
  status: 'published' | 'draft' | 'archived';
  views: number;
  likes: number;
  dislikes: number;
  rating: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  order_index: number;
  views: number;
  helpful: number;
  not_helpful: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// GET /api/knowledge-base/articles - Get all published articles with search and filtering
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      category, 
      featured, 
      limit = '10', 
      offset = '0',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    // Sanitize pagination inputs and inline them to avoid LIMIT/OFFSET placeholders
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 10));
    const offsetNum = Math.max(0, parseInt(String(offset), 10) || 0);

    let query = `
      SELECT 
        ka.*,
        CONCAT(u.first_name, ' ', u.last_name) as author_name
      FROM knowledge_articles ka
      LEFT JOIN users u ON ka.author_id = u.id
      WHERE ka.status = 'published'
    `;
    
    const params: any[] = [];

    if (search) {
      query += ` AND (MATCH(ka.title, ka.content) AGAINST(? IN NATURAL LANGUAGE MODE) OR ka.title LIKE ? OR ka.content LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND ka.category = ?`;
      params.push(category);
    }

    if (featured === 'true') {
      query += ` AND ka.featured = TRUE`;
    }

    // Validate sort and order parameters
    const validSortFields = ['created_at', 'updated_at', 'title', 'views', 'rating', 'likes'];
    const validOrderTypes = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sort as string) ? sort : 'created_at';
    const orderType = validOrderTypes.includes((order as string).toUpperCase()) ? (order as string).toUpperCase() : 'DESC';
    
    query += ` ORDER BY ka.${sortField} ${orderType}`;
    query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const articles = await executeQuery(query, params) as (RowDataPacket & KnowledgeArticle)[];
    
    // Parse tags JSON
    const processedArticles = articles.map(article => ({
      ...article,
      tags: article.tags ? JSON.parse(article.tags as any) : []
    }));

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM knowledge_articles ka WHERE ka.status = 'published'`;
    const countParams: any[] = [];

    if (search) {
      countQuery += ` AND (MATCH(ka.title, ka.content) AGAINST(? IN NATURAL LANGUAGE MODE) OR ka.title LIKE ? OR ka.content LIKE ?)`;
      countParams.push(search, `%${search}%`, `%${search}%`);
    }

    if (category) {
      countQuery += ` AND ka.category = ?`;
      countParams.push(category);
    }

    if (featured === 'true') {
      countQuery += ` AND ka.featured = TRUE`;
    }

    const countResult = await executeQuery(countQuery, countParams) as RowDataPacket[];
    const total = countResult[0].total;

    res.json({
      success: true,
      data: processedArticles,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch articles' });
  }
});

// GET /api/knowledge-base/articles/:id - Get single article and increment view count
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Get article
    const articles = await executeQuery(`
      SELECT 
        ka.*,
        CONCAT(u.first_name, ' ', u.last_name) as author_name
      FROM knowledge_articles ka
      LEFT JOIN users u ON ka.author_id = u.id
      WHERE ka.id = ? AND ka.status = 'published'
    `, [id]) as (RowDataPacket & KnowledgeArticle)[];

    if (articles.length === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const article = {
      ...articles[0],
      tags: articles[0].tags ? JSON.parse(articles[0].tags as any) : []
    };

    // Record view interaction and increment view count
    await executeTransaction(async (connection) => {
      // Insert or update view interaction
      await connection.execute(`
        INSERT INTO article_interactions (article_id, user_id, interaction_type, ip_address, user_agent)
        VALUES (?, ?, 'view', ?, ?)
        ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
      `, [id, userId || null, ipAddress, userAgent]);

      // Increment view count
      await connection.execute(`
        UPDATE knowledge_articles 
        SET views = views + 1 
        WHERE id = ?
      `, [id]);
    });

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch article' });
  }
});

// POST /api/knowledge-base/articles/:id/interact - Like/dislike/rate article
router.post('/articles/:id/interact', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, rating } = req.body; // type: 'like', 'dislike', 'rating'
    const userId = req.user!.id;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!['like', 'dislike', 'rating'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid interaction type' });
    }

    if (type === 'rating' && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    await executeTransaction(async (connection) => {
      // Insert or update interaction
      await connection.execute(`
        INSERT INTO article_interactions (article_id, user_id, interaction_type, rating_value, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          rating_value = VALUES(rating_value),
          created_at = CURRENT_TIMESTAMP
      `, [id, userId, type, type === 'rating' ? rating : null, ipAddress, userAgent]);

      // Update article counters
      if (type === 'like') {
        await connection.execute(`UPDATE knowledge_articles SET likes = likes + 1 WHERE id = ?`, [id]);
      } else if (type === 'dislike') {
        await connection.execute(`UPDATE knowledge_articles SET dislikes = dislikes + 1 WHERE id = ?`, [id]);
      } else if (type === 'rating') {
        // Recalculate average rating
        const ratingResult = await connection.execute(`
          SELECT AVG(rating_value) as avg_rating 
          FROM article_interactions 
          WHERE article_id = ? AND interaction_type = 'rating'
        `, [id]) as RowDataPacket[];
        
        const avgRating = ratingResult[0]?.avg_rating || 0;
        await connection.execute(`UPDATE knowledge_articles SET rating = ? WHERE id = ?`, [avgRating, id]);
      }
    });

    res.json({ success: true, message: 'Interaction recorded successfully' });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ success: false, message: 'Failed to record interaction' });
  }
});

// GET /api/knowledge-base/faqs - Get all active FAQs
router.get('/faqs', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    let query = `SELECT * FROM faqs WHERE status = 'active'`;
    const params: any[] = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (MATCH(question, answer) AGAINST(? IN NATURAL LANGUAGE MODE) OR question LIKE ? OR answer LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY order_index ASC, created_at DESC`;

    const faqs = await executeQuery(query, params) as (RowDataPacket & FAQ)[];

    res.json({ success: true, data: faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
  }
});

// POST /api/knowledge-base/faqs/:id/interact - Mark FAQ as helpful/not helpful
router.post('/faqs/:id/interact', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // type: 'helpful', 'not_helpful', 'view'
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!['helpful', 'not_helpful', 'view'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid interaction type' });
    }

    await executeTransaction(async (connection) => {
      // Insert or update interaction
      await connection.execute(`
        INSERT INTO faq_interactions (faq_id, user_id, interaction_type, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
      `, [id, userId || null, type, ipAddress, userAgent]);

      // Update FAQ counters
      if (type === 'helpful') {
        await connection.execute(`UPDATE faqs SET helpful = helpful + 1 WHERE id = ?`, [id]);
      } else if (type === 'not_helpful') {
        await connection.execute(`UPDATE faqs SET not_helpful = not_helpful + 1 WHERE id = ?`, [id]);
      } else if (type === 'view') {
        await connection.execute(`UPDATE faqs SET views = views + 1 WHERE id = ?`, [id]);
      }
    });

    res.json({ success: true, message: 'Interaction recorded successfully' });
  } catch (error) {
    console.error('Error recording FAQ interaction:', error);
    res.status(500).json({ success: false, message: 'Failed to record interaction' });
  }
});

// GET /api/knowledge-base/categories - Get all categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const articleCategories = await executeQuery(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM knowledge_articles 
      WHERE status = 'published' 
      GROUP BY category 
      ORDER BY category
    `) as RowDataPacket[];

    const faqCategories = await executeQuery(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM faqs 
      WHERE status = 'active' 
      GROUP BY category 
      ORDER BY category
    `) as RowDataPacket[];

    res.json({ 
      success: true, 
      data: {
        articles: articleCategories,
        faqs: faqCategories
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Admin routes (require authentication)

// POST /api/knowledge-base/articles - Create new article (Admin only)
router.post('/articles', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, status = 'draft', featured = false } = req.body;
    const authorId = req.user!.id;

    if (!title || !content || !category) {
      return res.status(400).json({ success: false, message: 'Title, content, and category are required' });
    }

    const result = await executeQuery(`
      INSERT INTO knowledge_articles (title, content, category, tags, author_id, status, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, content, category, JSON.stringify(tags || []), authorId, status, featured]) as ResultSetHeader;

    res.status(201).json({ 
      success: true, 
      message: 'Article created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: 'Failed to create article' });
  }
});

// PUT /api/knowledge-base/articles/:id - Update article (Admin only)
router.put('/articles/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, status, featured } = req.body;

    const result = await executeQuery(`
      UPDATE knowledge_articles 
      SET title = ?, content = ?, category = ?, tags = ?, status = ?, featured = ?
      WHERE id = ?
    `, [title, content, category, JSON.stringify(tags || []), status, featured, id]) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, message: 'Article updated successfully' });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, message: 'Failed to update article' });
  }
});

// DELETE /api/knowledge-base/articles/:id - Delete article (Admin only)
router.delete('/articles/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(`
      DELETE FROM knowledge_articles WHERE id = ?
    `, [id]) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ success: false, message: 'Failed to delete article' });
  }
});

// POST /api/knowledge-base/faqs - Create new FAQ (Admin only)
router.post('/faqs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { question, answer, category, order_index = 0, status = 'active' } = req.body;

    if (!question || !answer || !category) {
      return res.status(400).json({ success: false, message: 'Question, answer, and category are required' });
    }

    const result = await executeQuery(`
      INSERT INTO faqs (question, answer, category, order_index, status)
      VALUES (?, ?, ?, ?, ?)
    `, [question, answer, category, order_index, status]) as ResultSetHeader;

    res.status(201).json({ 
      success: true, 
      message: 'FAQ created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ success: false, message: 'Failed to create FAQ' });
  }
});

// PUT /api/knowledge-base/faqs/:id - Update FAQ (Admin only)
router.put('/faqs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question, answer, category, order_index, status } = req.body;

    const result = await executeQuery(`
      UPDATE faqs 
      SET question = ?, answer = ?, category = ?, order_index = ?, status = ?
      WHERE id = ?
    `, [question, answer, category, order_index, status, id]) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    res.json({ success: true, message: 'FAQ updated successfully' });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ success: false, message: 'Failed to update FAQ' });
  }
});

// DELETE /api/knowledge-base/faqs/:id - Delete FAQ (Admin only)
router.delete('/faqs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(`
      DELETE FROM faqs WHERE id = ?
    `, [id]) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ success: false, message: 'Failed to delete FAQ' });
  }
});

export default router;