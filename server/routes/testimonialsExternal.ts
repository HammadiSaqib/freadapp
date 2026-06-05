import express from 'express';
import { allQuery } from '../database/databaseAdapter.js';

const router = express.Router();

// Open CORS for all origins so any external app (PHP, Node.js, etc.) can fetch
router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Helper: get column names from the testimonials table
 */
async function getColumnNames(): Promise<string[]> {
  try {
    const rows = await allQuery(
      `SELECT COLUMN_NAME, column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'testimonials'`
    );
    return rows.map((r: any) => r.COLUMN_NAME || r.column_name).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Helper: build the base URL from the request so video paths become absolute URLs
 */
function getBaseUrl(req: express.Request): string {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost';
  return `${proto}://${host}`;
}

/**
 * Helper: resolve a video value to an absolute URL
 *  - If it's already an http(s) URL, return as-is
 *  - If it's a local path like "public/testimonials/file.mp4", build a full URL
 */
function resolveVideoUrl(video: string | null | undefined, baseUrl: string): string {
  if (!video) return '';
  const v = video.trim();
  if (/^https?:\/\//i.test(v)) return v;
  // Strip "public/" prefix and normalize slashes
  const cleaned = v.replace(/\\/g, '/').replace(/^public\//, '');
  return `${baseUrl}/${cleaned}`;
}

// ─── GET /api/v1/testimonials ────────────────────────────────────────────────
// Returns all testimonials, newest first.
//
// Query parameters (all optional):
//   ?limit=10        Max results to return
//   ?offset=0        Skip N results (for pagination)
//   ?order=asc       Sort order: "asc" or "desc" (default: desc)
//
// Example responses:
//   GET /api/v1/testimonials
//   GET /api/v1/testimonials?limit=5&offset=0
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const cols = await getColumnNames();
    const baseVideo = cols.includes('video')
      ? 'video'
      : (cols.includes('file_path') ? 'file_path' : 'NULL');
    const videoExpr = cols.includes('file_url')
      ? `COALESCE(file_url, ${baseVideo})`
      : baseVideo;
    const roleExpr = cols.includes('client_role') ? 'client_role' : 'NULL AS client_role';
    const hasCreatedAt = cols.includes('created_at');
    const hasUpdatedAt = cols.includes('updated_at');

    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const selectCols = [
      'id',
      `${videoExpr} AS video`,
      'client_name',
      roleExpr,
      ...(hasCreatedAt ? ['created_at'] : []),
      ...(hasUpdatedAt ? ['updated_at'] : []),
    ].join(', ');

    const rows = await allQuery(
      `SELECT ${selectCols} FROM testimonials ORDER BY id ${order} LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countResult = await allQuery(`SELECT COUNT(*) AS total FROM testimonials`);
    const total = countResult?.[0]?.total ?? 0;

    const baseUrl = getBaseUrl(req);

    const testimonials = (rows || []).map((row: any) => ({
      id: row.id,
      client_name: row.client_name || '',
      client_role: row.client_role || null,
      video_url: resolveVideoUrl(row.video, baseUrl),
      ...(hasCreatedAt && row.created_at ? { created_at: row.created_at } : {}),
      ...(hasUpdatedAt && row.updated_at ? { updated_at: row.updated_at } : {}),
    }));

    return res.json({
      success: true,
      total,
      count: testimonials.length,
      limit,
      offset,
      data: testimonials,
    });
  } catch (error: any) {
    console.error('External testimonials API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch testimonials' });
  }
});

// ─── GET /api/v1/testimonials/:id ────────────────────────────────────────────
// Returns a single testimonial by ID.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid testimonial ID' });
    }

    const cols = await getColumnNames();
    const baseVideo = cols.includes('video')
      ? 'video'
      : (cols.includes('file_path') ? 'file_path' : 'NULL');
    const videoExpr = cols.includes('file_url')
      ? `COALESCE(file_url, ${baseVideo})`
      : baseVideo;
    const roleExpr = cols.includes('client_role') ? 'client_role' : 'NULL AS client_role';
    const hasCreatedAt = cols.includes('created_at');
    const hasUpdatedAt = cols.includes('updated_at');

    const selectCols = [
      'id',
      `${videoExpr} AS video`,
      'client_name',
      roleExpr,
      ...(hasCreatedAt ? ['created_at'] : []),
      ...(hasUpdatedAt ? ['updated_at'] : []),
    ].join(', ');

    const rows = await allQuery(
      `SELECT ${selectCols} FROM testimonials WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Testimonial not found' });
    }

    const row = rows[0];
    const baseUrl = getBaseUrl(req);

    return res.json({
      success: true,
      data: {
        id: row.id,
        client_name: row.client_name || '',
        client_role: row.client_role || null,
        video_url: resolveVideoUrl(row.video, baseUrl),
        ...(hasCreatedAt && row.created_at ? { created_at: row.created_at } : {}),
        ...(hasUpdatedAt && row.updated_at ? { updated_at: row.updated_at } : {}),
      },
    });
  } catch (error: any) {
    console.error('External testimonials API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch testimonial' });
  }
});

export default router;
