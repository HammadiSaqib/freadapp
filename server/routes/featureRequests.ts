import express, { Request, Response } from 'express';
import { executeQuery, executeTransaction } from '../database/mysqlConfig.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = 'uploads/feature-requests';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Invalid file type'));
  },
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User ID not found in token' });

    const rawPage = parseInt(req.query.page as string);
    const rawLimit = parseInt(req.query.limit as string);
    const safePage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const safeLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
    const safeOffset = (safePage - 1) * safeLimit;

    const rows = await executeQuery<any[]>(
      `
        SELECT 
          fr.*,
          u.first_name,
          u.last_name,
          u.email,
          u.avatar,
          EXISTS(
            SELECT 1 
            FROM feature_request_votes v 
            WHERE v.request_id = fr.id AND v.user_id = ?
          ) as user_voted
        FROM feature_requests fr
        JOIN users u ON fr.user_id = u.id
        ORDER BY fr.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [userId, safeLimit, safeOffset]
    );

    const countRows = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM feature_requests`,
      []
    );

    const requests = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      image_url: row.image_url,
      status: row.status,
      votes_count: row.votes_count ?? 0,
      comments_count: row.comments_count ?? 0,
      user_has_voted: !!row.user_voted,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        avatar: row.avatar || null,
      },
    }));

    const total = countRows?.[0]?.total ?? 0;
    res.json({ requests, pagination: { page: safePage, limit: safeLimit, total } });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    res.status(500).json({ error: 'Failed to fetch feature requests' });
  }
});

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User ID not found in token' });

    const title = (req.body?.title ?? '').toString().trim();
    const content = (req.body?.content ?? '').toString().trim();
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    const imageUrl = file ? `/uploads/feature-requests/${file.filename}` : null;

    const result = await executeTransaction(async (connection) => {
      const [insertResult]: any = await connection.query(
        `INSERT INTO feature_requests (user_id, title, content, image_url) VALUES (?, ?, ?, ?)`,
        [userId, title, content, imageUrl]
      );
      const requestId = insertResult.insertId as number;

      const [rows]: any = await connection.query(
        `
          SELECT fr.*, u.first_name, u.last_name, u.email, u.avatar
          FROM feature_requests fr
          JOIN users u ON fr.user_id = u.id
          WHERE fr.id = ?
          LIMIT 1
        `,
        [requestId]
      );

      return rows?.[0] ?? null;
    });

    if (!result) return res.status(500).json({ error: 'Failed to create feature request' });

    res.status(201).json({
      request: {
        id: result.id,
        title: result.title,
        content: result.content,
        image_url: result.image_url,
        status: result.status,
        votes_count: result.votes_count ?? 0,
        comments_count: result.comments_count ?? 0,
        user_has_voted: false,
        created_at: result.created_at,
        updated_at: result.updated_at,
        user: {
          id: result.user_id,
          first_name: result.first_name,
          last_name: result.last_name,
          email: result.email,
          avatar: result.avatar || null,
        },
      },
    });
  } catch (error) {
    console.error('Error creating feature request:', error);
    res.status(500).json({ error: 'Failed to create feature request' });
  }
});

router.post('/:requestId/vote', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User ID not found in token' });

    const requestId = parseInt(req.params.requestId, 10);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const result = await executeTransaction(async (connection) => {
      const [existingRows]: any = await connection.query(
        `SELECT id FROM feature_request_votes WHERE request_id = ? AND user_id = ? LIMIT 1`,
        [requestId, userId]
      );
      const hasExisting = Array.isArray(existingRows) && existingRows.length > 0;

      if (hasExisting) {
        await connection.query(
          `DELETE FROM feature_request_votes WHERE request_id = ? AND user_id = ?`,
          [requestId, userId]
        );
        await connection.query(
          `UPDATE feature_requests SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = ?`,
          [requestId]
        );
      } else {
        await connection.query(
          `INSERT INTO feature_request_votes (request_id, user_id) VALUES (?, ?)`,
          [requestId, userId]
        );
        await connection.query(
          `UPDATE feature_requests SET votes_count = votes_count + 1 WHERE id = ?`,
          [requestId]
        );
      }

      const [rows]: any = await connection.query(
        `SELECT votes_count FROM feature_requests WHERE id = ? LIMIT 1`,
        [requestId]
      );
      const votesCount = rows?.[0]?.votes_count ?? 0;
      return { votesCount, userHasVoted: !hasExisting };
    });

    res.json({ votes_count: result.votesCount, user_has_voted: result.userHasVoted });
  } catch (error) {
    console.error('Error toggling vote:', error);
    res.status(500).json({ error: 'Failed to toggle vote' });
  }
});

router.get('/:requestId/comments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User ID not found in token' });

    const requestId = parseInt(req.params.requestId, 10);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const rows = await executeQuery<any[]>(
      `
        SELECT 
          frc.*,
          u.first_name,
          u.last_name,
          u.email,
          u.avatar
        FROM feature_request_comments frc
        JOIN users u ON frc.user_id = u.id
        WHERE frc.request_id = ?
        ORDER BY frc.created_at ASC
      `,
      [requestId]
    );

    const comments = rows.map((row: any) => ({
      id: row.id,
      request_id: row.request_id,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        avatar: row.avatar || null,
      },
    }));

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching feature request comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/:requestId/comments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User ID not found in token' });

    const requestId = parseInt(req.params.requestId, 10);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const content = (req.body?.content ?? '').toString().trim();
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const result = await executeTransaction(async (connection) => {
      const [insertResult]: any = await connection.query(
        `INSERT INTO feature_request_comments (request_id, user_id, content) VALUES (?, ?, ?)`,
        [requestId, userId, content]
      );
      const commentId = insertResult.insertId as number;

      await connection.query(
        `UPDATE feature_requests SET comments_count = comments_count + 1 WHERE id = ?`,
        [requestId]
      );

      const [rows]: any = await connection.query(
        `
          SELECT frc.*, u.first_name, u.last_name, u.email
          FROM feature_request_comments frc
          JOIN users u ON frc.user_id = u.id
          WHERE frc.id = ?
          LIMIT 1
        `,
        [commentId]
      );
      const [countRows]: any = await connection.query(
        `SELECT comments_count FROM feature_requests WHERE id = ? LIMIT 1`,
        [requestId]
      );

      return { comment: rows?.[0] ?? null, commentsCount: countRows?.[0]?.comments_count ?? 0 };
    });

    if (!result.comment) return res.status(500).json({ error: 'Failed to create comment' });

    res.status(201).json({
      comment: {
        id: result.comment.id,
        request_id: result.comment.request_id,
        content: result.comment.content,
        created_at: result.comment.created_at,
        updated_at: result.comment.updated_at,
        user: {
          id: result.comment.user_id,
          first_name: result.comment.first_name,
          last_name: result.comment.last_name,
          email: result.comment.email,
          avatar: result.comment.avatar || null,
        },
      },
      comments_count: result.commentsCount,
    });
  } catch (error) {
    console.error('Error creating feature request comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Mark feature request as approved (super admin)
router.post('/:requestId/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    const userRole = (req as any).user?.role as string | undefined;
    if (!userId) return res.status(401).json({ error: 'User ID not found in token' });
    if (userRole !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

    const requestId = parseInt(req.params.requestId, 10);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    await executeTransaction(async (connection) => {
      await connection.query(
        `UPDATE feature_requests SET status = 'closed', updated_at = NOW() WHERE id = ?`,
        [requestId]
      );
    });

    res.json({ status: 'closed' });
  } catch (error) {
    console.error('Error approving feature request:', error);
    res.status(500).json({ error: 'Failed to approve feature request' });
  }
});

export default router;
