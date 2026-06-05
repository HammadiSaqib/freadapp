import express from 'express';
import { Request, Response } from 'express';
import { executeQuery, executeTransaction } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/community';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get a single post by ID
router.get('/posts/:postId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    // Ensure user ID is valid
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const postQuery = `
      SELECT 
        cp.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        COUNT(DISTINCT pr.id) as actual_likes_count,
        COUNT(DISTINCT pc.id) as actual_comments_count,
        EXISTS(SELECT 1 FROM post_reactions WHERE post_id = cp.id AND user_id = ?) as user_liked,
        (SELECT reaction_type FROM post_reactions WHERE post_id = cp.id AND user_id = ? LIMIT 1) as user_reaction
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN post_reactions pr ON cp.id = pr.post_id
      LEFT JOIN post_comments pc ON cp.id = pc.post_id
      WHERE cp.id = ?
      GROUP BY cp.id
    `;

    const posts = await executeQuery(postQuery, [userId, userId, postId]);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[0];

    // Transform post to match client expectations
    let mediaUrl = null;
    if (post.media_urls) {
      try {
        const urls = JSON.parse(post.media_urls);
        mediaUrl = urls.length > 0 ? urls[0] : null;
      } catch (e) {
        mediaUrl = post.media_urls; // fallback if not JSON
      }
    }

    const transformedPost = {
      ...post,
      media_url: mediaUrl,
      like_count: post.actual_likes_count || 0,
      comment_count: post.actual_comments_count || 0,
      user_has_liked: !!post.user_liked,
      user_reaction: post.user_reaction || null,
      user: {
        id: post.user_id,
        first_name: post.first_name,
        last_name: post.last_name,
        email: post.email,
        role: post.role || 'user'
      }
    };

    res.json({ post: transformedPost });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Get all community posts with pagination
router.get('/posts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string);
    const rawLimit = parseInt(req.query.limit as string);
    const safePage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const safeLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    const safeOffset = (safePage - 1) * safeLimit;
    const filter = (req.query.filter as string) || 'all';

    // Debug logging
    console.log('User ID:', req.user?.id, 'Type:', typeof req.user?.id);
    console.log('Query parameters:', { userId: req.user?.id, limit: safeLimit, offset: safeOffset });

    // Ensure user ID is valid
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    let transformedPosts: any[] = [];
    let total = 0;

    if (filter === 'joined') {
      // Fetch posts from groups the user has joined
      const groupPostsQuery = `
        SELECT 
          gp.*,
          u.first_name,
          u.last_name,
          u.email,
          u.role
        FROM group_posts gp
        JOIN users u ON gp.user_id = u.id
        JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = ?
        ORDER BY gp.is_pinned DESC, gp.created_at DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `;

      const posts = await executeQuery(groupPostsQuery, [userId]);

      transformedPosts = posts.map((post: any) => {
        let mediaUrl = null;
        if (post.media_urls) {
          try {
            const urls = JSON.parse(post.media_urls);
            mediaUrl = urls.length > 0 ? urls[0] : null;
          } catch (e) {
            mediaUrl = post.media_urls; // fallback if not JSON
          }
        }

        return {
          ...post,
          media_url: mediaUrl,
          like_count: post.likes_count || 0,
          comment_count: post.comments_count || 0,
          user_has_liked: false,
          user_reaction: null,
          user: {
            id: post.user_id,
            first_name: post.first_name,
            last_name: post.last_name,
            email: post.email,
            role: post.role || 'user'
          }
        };
      });

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM group_posts gp
        JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = ?
      `;
      const countResult = await executeQuery(countQuery, [userId]);
      total = countResult[0].total;
    } else {
      const postsQuery = `
        SELECT 
          cp.*,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          COUNT(DISTINCT pr.id) as actual_likes_count,
          COUNT(DISTINCT pc.id) as actual_comments_count,
          EXISTS(SELECT 1 FROM post_reactions WHERE post_id = cp.id AND user_id = ?) as user_liked,
          (SELECT reaction_type FROM post_reactions WHERE post_id = cp.id AND user_id = ? LIMIT 1) as user_reaction
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN post_reactions pr ON cp.id = pr.post_id
        LEFT JOIN post_comments pc ON cp.id = pc.post_id
        GROUP BY cp.id
        ORDER BY cp.is_pinned DESC, cp.created_at DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `;

      const posts = await executeQuery(postsQuery, [userId, userId]);

      transformedPosts = posts.map((post: any) => {
        let mediaUrl = null;
        if (post.media_urls) {
          try {
            const urls = JSON.parse(post.media_urls);
            mediaUrl = urls.length > 0 ? urls[0] : null;
          } catch (e) {
            mediaUrl = post.media_urls; // fallback if not JSON
          }
        }

        return {
          ...post,
          media_url: mediaUrl,
          like_count: post.actual_likes_count || 0,
          comment_count: post.actual_comments_count || 0,
          user_has_liked: !!post.user_liked,
          user_reaction: post.user_reaction || null,
          user: {
            id: post.user_id,
            first_name: post.first_name,
            last_name: post.last_name,
            email: post.email,
            role: post.role || 'user'
          }
        };
      });

      const countQuery = 'SELECT COUNT(*) as total FROM community_posts';
      const countResult = await executeQuery(countQuery);
      total = countResult[0].total;
    }

    res.json({
      posts: transformedPosts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/posts', authenticateToken, upload.array('media', 5), async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const files = req.files as Express.Multer.File[];

    // Allow posts with either content or media files
    if ((!content || content.trim().length === 0) && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Either content or media is required' });
    }

    let mediaUrls = null;
    let mediaType = null;

    if (files && files.length > 0) {
      mediaUrls = JSON.stringify(files.map(file => `/uploads/community/${file.filename}`));
      // Determine media type based on first file
      const firstFile = files[0];
      if (firstFile.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (firstFile.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else {
        mediaType = 'document';
      }
    }

    // Detect group targeting
    let targetGroups: number[] = [];
    if (req.body && (req.body as any).target_groups) {
      try {
        const raw = (req.body as any).target_groups;
        if (typeof raw === 'string') {
          targetGroups = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          targetGroups = raw.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v));
        }
      } catch (e) {
        // ignore parse error
      }
    }

    const postContent = content && content.trim() ? content.trim() : '';

    if (targetGroups && targetGroups.length > 0) {
      // Enforce membership: user must be a member of each target group
      const placeholders = targetGroups.map(() => '?').join(',');
      const membershipQuery = `
        SELECT group_id FROM group_members WHERE user_id = ? AND group_id IN (${placeholders})
      `;
      const membershipRows = await executeQuery(membershipQuery, [userId, ...targetGroups]);
      const memberGroupIds = new Set(membershipRows.map((r: any) => r.group_id));
      const unauthorized = targetGroups.filter(gid => !memberGroupIds.has(gid));
      if (unauthorized.length > 0) {
        return res.status(403).json({ error: 'Not a member of all selected groups', unauthorized_groups: unauthorized });
      }

      // Insert a post per target group
      const insertGroupPostQuery = `
        INSERT INTO group_posts (group_id, user_id, content, media_urls, media_type)
        VALUES (?, ?, ?, ?, ?)
      `;

      // Execute in a transaction to keep consistency
      await executeTransaction(async (connection) => {
        for (const gid of targetGroups) {
          await connection.execute(insertGroupPostQuery, [gid, userId, postContent, mediaUrls, mediaType]);
          // Update group's post_count
          await connection.execute('UPDATE `groups` SET post_count = post_count + 1 WHERE id = ?', [gid]);
        }
      });

      // Return success (client may refetch depending on filter)
      return res.status(201).json({ message: 'Group post(s) created', post: null });
    }

    // Default: create a community post
    const insertQuery = `
      INSERT INTO community_posts (user_id, content, media_urls, media_type)
      VALUES (?, ?, ?, ?)
    `;
    const result = await executeQuery(insertQuery, [userId, postContent, mediaUrls, mediaType]);
    const postId = result.insertId;

    const postQuery = `
      SELECT 
        cp.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = ?
    `;
    const post = await executeQuery(postQuery, [postId]);
    const rawPost = post[0];

    let mediaUrl = null;
    if (rawPost.media_urls) {
      try {
        const urls = JSON.parse(rawPost.media_urls);
        mediaUrl = urls.length > 0 ? urls[0] : null;
      } catch (e) {
        mediaUrl = rawPost.media_urls; // fallback if not JSON
      }
    }

    const transformedPost = {
      ...rawPost,
      media_url: mediaUrl,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      user: {
        id: rawPost.user_id,
        first_name: rawPost.first_name,
        last_name: rawPost.last_name,
        email: rawPost.email,
        role: rawPost.role || 'user'
      }
    };

    res.status(201).json({ post: transformedPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get comments for a specific post
router.get('/posts/:postId/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const rawPage = parseInt(req.query.page as string);
    const rawLimit = parseInt(req.query.limit as string);
    const safePage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const safeLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const safeOffset = (safePage - 1) * safeLimit;

    // Ensure user ID is valid
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const commentsQuery = `
      SELECT 
        pc.*,
        u.first_name,
        u.last_name,
        u.email,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = pc.id AND user_id = ?) as user_liked
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = ?
      ORDER BY pc.created_at ASC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const comments = await executeQuery(commentsQuery, [userId, postId]);

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment to a post
router.post('/posts/:postId/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const commentId = await executeTransaction(async (connection) => {
      // Insert comment
      const insertQuery = `
        INSERT INTO post_comments (post_id, user_id, content, parent_comment_id)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await connection.execute(insertQuery, [postId, userId, content, parentCommentId || null]);
      const commentId = result[0].insertId;

      // Update post comments count
      const updatePostQuery = `
        UPDATE community_posts 
        SET comments_count = comments_count + 1 
        WHERE id = ?
      `;
      
      await connection.execute(updatePostQuery, [postId]);

      return commentId;
    });

    // Fetch the complete comment data with user information
    const commentQuery = `
      SELECT 
        pc.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = pc.id AND user_id = ?) as user_liked
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.id = ?
    `;

    const commentResult = await executeQuery(commentQuery, [userId, commentId]);
    const comment = commentResult[0];

    // Transform the comment data
    const transformedComment = {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      like_count: comment.likes_count || 0,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: {
        id: comment.user_id,
        first_name: comment.first_name,
        last_name: comment.last_name,
        email: comment.email,
        role: comment.role || 'user'
      },
      user_has_liked: Boolean(comment.user_liked)
    };

    res.status(201).json({ 
      message: 'Comment added successfully',
      comment: transformedComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Like/unlike a post
router.post('/posts/:postId/like', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    await executeTransaction(async (connection) => {
      // Check if user already liked the post
      const checkQuery = 'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?';
      const existingLike = await connection.execute(checkQuery, [postId, userId]);

      if (existingLike[0].length > 0) {
        // Unlike the post
        const deleteQuery = 'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?';
        await connection.execute(deleteQuery, [postId, userId]);

        const updateQuery = 'UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = ?';
        await connection.execute(updateQuery, [postId]);

        return { action: 'unliked' };
      } else {
        // Like the post
        const insertQuery = 'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)';
        await connection.execute(insertQuery, [postId, userId]);

        const updateQuery = 'UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?';
        await connection.execute(updateQuery, [postId]);

        return { action: 'liked' };
      }
    });

    res.json({ message: 'Post like status updated' });
  } catch (error) {
    console.error('Error updating like status:', error);
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

// Add/update reaction to a post
router.post('/posts/:postId/react', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { reactionType } = req.body;
    const userId = req.user.id;

    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    await executeTransaction(async (connection) => {
      // Check if user already reacted to the post
      const checkQuery = 'SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?';
      const existingReaction = await connection.execute(checkQuery, [postId, userId]);

      if (existingReaction[0].length > 0) {
        // Update existing reaction
        const updateQuery = 'UPDATE post_reactions SET reaction_type = ? WHERE post_id = ? AND user_id = ?';
        await connection.execute(updateQuery, [reactionType, postId, userId]);
      } else {
        // Insert new reaction
        const insertQuery = 'INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)';
        await connection.execute(insertQuery, [postId, userId, reactionType]);
      }
    });

    // Get updated reaction data
    const reactionCountQuery = `
      SELECT COUNT(*) as like_count
      FROM post_reactions 
      WHERE post_id = ?
    `;
    const reactionCountResult = await executeQuery(reactionCountQuery, [postId]);
    const like_count = reactionCountResult[0]?.like_count || 0;

    // Get user's current reaction
    const userReactionQuery = `
      SELECT reaction_type
      FROM post_reactions 
      WHERE post_id = ? AND user_id = ?
    `;
    const userReactionResult = await executeQuery(userReactionQuery, [postId, userId]);
    const user_reaction = userReactionResult[0]?.reaction_type || null;
    const user_has_liked = user_reaction !== null;

    res.json({ 
      message: 'Reaction updated successfully',
      like_count,
      user_has_liked,
      user_reaction
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

// Track post share
router.post('/posts/:postId/share', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { platform } = req.body;
    const userId = req.user.id;

    const validPlatforms = ['facebook', 'twitter', 'linkedin', 'email', 'copy'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Insert share record
    const insertQuery = 'INSERT INTO post_shares (post_id, user_id, platform) VALUES (?, ?, ?)';
    await executeQuery(insertQuery, [postId, userId, platform]);

    res.json({ message: 'Share tracked successfully' });
  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
});

// Like/unlike a comment
router.post('/comments/:commentId/like', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    await executeTransaction(async (connection) => {
      // Check if user already liked the comment
      const checkQuery = 'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?';
      const existingLike = await connection.execute(checkQuery, [commentId, userId]);

      if (existingLike[0].length > 0) {
        // Unlike the comment
        const deleteQuery = 'DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?';
        await connection.execute(deleteQuery, [commentId, userId]);

        const updateQuery = 'UPDATE post_comments SET likes_count = likes_count - 1 WHERE id = ?';
        await connection.execute(updateQuery, [commentId]);

        return { action: 'unliked' };
      } else {
        // Like the comment
        const insertQuery = 'INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)';
        await connection.execute(insertQuery, [commentId, userId]);

        const updateQuery = 'UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = ?';
        await connection.execute(updateQuery, [commentId]);

        return { action: 'liked' };
      }
    });

    res.json({ message: 'Comment like status updated' });
  } catch (error) {
    console.error('Error updating comment like status:', error);
    res.status(500).json({ error: 'Failed to update comment like status' });
  }
});

// Delete a post (only by author or admin)
router.delete('/posts/:postId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user owns the post or is admin
    const postQuery = 'SELECT user_id FROM community_posts WHERE id = ?';
    const post = await executeQuery(postQuery, [postId]);

    if (post.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete post (cascade will handle related records)
    const deleteQuery = 'DELETE FROM community_posts WHERE id = ?';
    await executeQuery(deleteQuery, [postId]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Pin/unpin a post (admin only)
router.patch('/posts/:postId/pin', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can pin posts' });
    }

    const updateQuery = 'UPDATE community_posts SET is_pinned = NOT is_pinned WHERE id = ?';
    await executeQuery(updateQuery, [postId]);

    res.json({ message: 'Post pin status updated' });
  } catch (error) {
    console.error('Error updating pin status:', error);
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

// Get community statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get overall community stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM community_posts) as total_posts,
        (SELECT COUNT(*) FROM post_comments) as total_comments,
        (SELECT COUNT(*) FROM post_likes) as total_likes,
        (SELECT COUNT(DISTINCT user_id) FROM community_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as active_users
    `;
    
    const stats = await executeQuery(statsQuery);
    
    // Get individual post stats for real-time updates
    const postStatsQuery = `
      SELECT 
        cp.id,
        cp.likes_count,
        cp.comments_count,
        cp.updated_at
      FROM community_posts cp
      ORDER BY cp.updated_at DESC
      LIMIT 50
    `;
    
    const postStats = await executeQuery(postStatsQuery);
    
    // Convert post stats to object format for easier lookup
    const postStatsMap = postStats.reduce((acc: any, post: any) => {
      acc[post.id] = {
        like_count: post.likes_count,
        comment_count: post.comments_count,
        updated_at: post.updated_at
      };
      return acc;
    }, {});
    
    res.json({
      ...stats[0],
      postStats: postStatsMap
    });
  } catch (error) {
    console.error('Error fetching community stats:', error);
    res.status(500).json({ error: 'Failed to fetch community stats' });
  }
});

export default router;