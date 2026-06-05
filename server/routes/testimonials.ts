import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { runQuery, allQuery } from '../database/databaseAdapter.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const supportRouter = express.Router();
const publicRouter = express.Router();

async function getTestimonialColumnNames(): Promise<string[]> {
  try {
    const rows = await allQuery(
      `SELECT COLUMN_NAME, column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'testimonials'`
    );
    return rows.map((r: any) => r.COLUMN_NAME || r.column_name).filter(Boolean);
  } catch {
    return [];
  }
}

// Ensure destination directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Multer storage to save videos into client/public/testimonials
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'client', 'public', 'testimonials');
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const orig = file.originalname || 'video';
    const ext = path.extname(orig).toLowerCase();
    const baseNameFromClient = (req.body.client_name || 'testimonial')
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '');
    const safeBase = baseNameFromClient || 'testimonial';
    cb(null, `${safeBase}${ext || '.mp4'}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
  },
  fileFilter: (_req, file, cb) => {
    // Allow only video MIME types
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Support-only routes
supportRouter.use(authenticateToken);
supportRouter.use(requireRole('support'));

// Create a testimonial (video upload + metadata)
supportRouter.post('/', upload.single('video'), async (req, res) => {
  try {
    const client_name = (req.body?.client_name || '').toString().trim();
    const client_role = (req.body?.client_role || '').toString().trim() || null;
    const file_url = (req.body?.file_url || '').toString().trim() || '';

    if (!client_name) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }
    if (!req.file && !file_url) {
      return res.status(400).json({ success: false, error: 'Video source is required' });
    }

    let storedPath: string | null = null;
    let storedUrl: string | null = null;
    if (req.file) {
      storedPath = path.join('public', 'testimonials', req.file.filename);
      storedUrl = storedPath.replace(/\\/g, '/');
    } else if (file_url) {
      storedUrl = file_url;
    }

    const cols = await getTestimonialColumnNames();
    const hasVideo = cols.includes('video');
    const hasFilePath = cols.includes('file_path');
    const hasFileUrl = cols.includes('file_url');
    const hasUploadedBy = cols.includes('uploaded_by');
    const hasClientRole = cols.includes('client_role');
    const hasClientName = cols.includes('client_name');

    if (!hasClientName) {
      await runQuery(`ALTER TABLE testimonials ADD COLUMN client_name TEXT NOT NULL`);
    }
    if (!hasClientRole) {
      try {
        await runQuery(`ALTER TABLE testimonials ADD COLUMN client_role TEXT NULL`);
      } catch {}
    }
    if (!hasVideo && !hasFilePath) {
      await runQuery(`ALTER TABLE testimonials ADD COLUMN video TEXT NOT NULL`);
    }

    const insertCols: string[] = [];
    const placeholders: string[] = [];
    const params: any[] = [];

    const uploaderId = (req as any)?.user?.id || null;

    if (hasVideo || !hasFilePath) {
      insertCols.push('video');
      placeholders.push('?');
      params.push(storedPath ?? storedUrl ?? '');
    }
    if (hasFilePath) {
      insertCols.push('file_path');
      placeholders.push('?');
      params.push(storedPath ?? '');
    }
    if (hasFileUrl) {
      insertCols.push('file_url');
      placeholders.push('?');
      params.push(storedUrl);
    }
    insertCols.push('client_name');
    placeholders.push('?');
    params.push(client_name);
    if (hasClientRole) {
      insertCols.push('client_role');
      placeholders.push('?');
      params.push(client_role);
    }
    if (hasUploadedBy) {
      insertCols.push('uploaded_by');
      placeholders.push('?');
      params.push(uploaderId);
    }

    const sql =
      `INSERT INTO testimonials (${insertCols.join(', ')}, created_at, updated_at) ` +
      `VALUES (${placeholders.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

    console.debug('🧭 Testimonials upload debug', {
      columns: cols,
      hasVideo,
      hasFilePath,
      hasFileUrl,
      hasUploadedBy,
      insertCols,
      paramsPreview: params,
      uploaderId,
      storedPath,
      storedUrl,
      hasFile: !!req.file
    });
    await runQuery(sql, params);

    return res.json({ success: true, message: 'Testimonial added successfully' });
  } catch (error: any) {
    console.error('Error adding testimonial:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to add testimonial',
      debug: {
        code: error?.code,
        errno: error?.errno,
        sqlMessage: error?.sqlMessage || error?.message,
        sqlState: error?.sqlState,
        sql: error?.sql
      }
    });
  }
});

supportRouter.put('/:id', upload.single('video'), async (req, res) => {
  try {
    const id = Number((req.params as any).id);
    const client_name = (req.body?.client_name || '').toString().trim();
    const client_role = (req.body?.client_role || '').toString().trim() || null;
    const file_url = (req.body?.file_url || '').toString().trim() || '';
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    const cols = await getTestimonialColumnNames();
    const hasVideo = cols.includes('video');
    const hasFilePath = cols.includes('file_path');
    const hasFileUrl = cols.includes('file_url');
    const hasClientRole = cols.includes('client_role');
    const hasClientName = cols.includes('client_name');
    if (!hasClientName) {
      await runQuery(`ALTER TABLE testimonials ADD COLUMN client_name TEXT NOT NULL`);
    }
    if (!hasClientRole) {
      try { await runQuery(`ALTER TABLE testimonials ADD COLUMN client_role TEXT NULL`); } catch {}
    }
    let storedPath: string | null = null;
    let storedUrl: string | null = null;
    if (req.file) {
      storedPath = path.join('public', 'testimonials', req.file.filename);
      storedUrl = storedPath.replace(/\\/g, '/');
      const oldRows = await allQuery(`SELECT video, file_path FROM testimonials WHERE id = ?`, [id]);
      const old = oldRows && oldRows[0];
      if (old) {
        const p = (old.video || old.file_path || '').toString();
        const rel = p.replace(/\\/g, '/').replace(/^public\//, '');
        const filePath = path.resolve(process.cwd(), 'client', rel);
        try { if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); } } catch {}
      }
    } else if (file_url) {
      const oldRows = await allQuery(`SELECT video, file_path FROM testimonials WHERE id = ?`, [id]);
      const old = oldRows && oldRows[0];
      if (old) {
        const p = (old.file_path || old.video || '').toString();
        const rel = p.replace(/\\/g, '/').replace(/^public\//, '');
        const filePath = path.resolve(process.cwd(), 'client', rel);
        try { if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); } } catch {}
      }
      storedUrl = file_url;
    }
    const setParts: string[] = [];
    const params: any[] = [];
    if (client_name) { setParts.push('client_name = ?'); params.push(client_name); }
    if (hasClientRole) { setParts.push('client_role = ?'); params.push(client_role); }
    if (storedPath) {
      if (hasVideo || !hasFilePath) { setParts.push('video = ?'); params.push(storedPath); }
      if (hasFilePath) { setParts.push('file_path = ?'); params.push(storedPath); }
      if (hasFileUrl) { setParts.push('file_url = ?'); params.push(storedUrl); }
    } else if (storedUrl) {
      if (hasVideo || !hasFilePath) { setParts.push('video = ?'); params.push(storedUrl); }
      if (hasFileUrl) { setParts.push('file_url = ?'); params.push(storedUrl); }
      if (hasFilePath) { setParts.push('file_path = ?'); params.push(''); }
    }
    setParts.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE testimonials SET ${setParts.join(', ')} WHERE id = ?`;
    params.push(id);
    console.debug('🧭 Testimonials edit debug', { id, hasVideo, hasFilePath, hasFileUrl, hasClientRole, hasClientName, setParts, paramsPreview: params, storedPath, storedUrl, hasFile: !!req.file });
    await runQuery(sql, params);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update testimonial',
      debug: {
        code: error?.code,
        errno: error?.errno,
        sqlMessage: error?.sqlMessage || error?.message,
        sqlState: error?.sqlState,
        sql: error?.sql
      }
    });
  }
});

supportRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number((req.params as any).id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const rows = await allQuery(`SELECT video, file_path FROM testimonials WHERE id = ?`, [id]);
    const row = rows && rows[0];
    if (row) {
      const p = (row.video || row.file_path || '').toString();
      const rel = p.replace(/\\/g, '/').replace(/^public\//, '');
      const filePath = path.resolve(process.cwd(), 'client', rel);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
    await runQuery(`DELETE FROM testimonials WHERE id = ?`, [id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete testimonial',
      debug: {
        code: error?.code,
        errno: error?.errno,
        sqlMessage: error?.sqlMessage || error?.message,
        sqlState: error?.sqlState,
        sql: error?.sql
      }
    });
  }
});

// Get testimonials (support view)
supportRouter.get('/', async (_req, res) => {
  try {
    const cols = await getTestimonialColumnNames();
    const baseVideo = cols.includes('video')
      ? 'video'
      : (cols.includes('file_path') ? 'file_path' : 'NULL');
    const videoExpr = cols.includes('file_url')
      ? `COALESCE(file_url, ${baseVideo}) AS video`
      : `${baseVideo} AS video`;
    const roleExpr = cols.includes('client_role') ? 'client_role' : 'NULL AS client_role';
    const rows = await allQuery(
      `SELECT id, ${videoExpr}, client_name, ${roleExpr}, created_at FROM testimonials ORDER BY id DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching testimonials:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch testimonials',
      debug: {
        code: error?.code,
        errno: error?.errno,
        sqlMessage: error?.sqlMessage || error?.message,
        sqlState: error?.sqlState,
        sql: error?.sql
      }
    });
  }
});

// Public testimonials listing (for landing page)
publicRouter.get('/', async (_req, res) => {
  try {
    const cols = await getTestimonialColumnNames();
    const baseVideo = cols.includes('video')
      ? 'video'
      : (cols.includes('file_path') ? 'file_path' : 'NULL');
    const videoExpr = cols.includes('file_url')
      ? `COALESCE(file_url, ${baseVideo}) AS video`
      : `${baseVideo} AS video`;
    const roleExpr = cols.includes('client_role') ? 'client_role' : 'NULL AS client_role';
    const rows = await allQuery(
      `SELECT id, ${videoExpr}, client_name, ${roleExpr} FROM testimonials ORDER BY id DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching public testimonials:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch testimonials',
      debug: {
        code: error?.code,
        errno: error?.errno,
        sqlMessage: error?.sqlMessage || error?.message,
        sqlState: error?.sqlState,
        sql: error?.sql
      }
    });
  }
});

export default supportRouter;
export { publicRouter as publicTestimonialsRoutes };
