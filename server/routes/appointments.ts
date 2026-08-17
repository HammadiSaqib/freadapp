import crypto from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { z, ZodError } from 'zod';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { AuthRequest, authenticateToken } from '../middleware/authMiddleware.js';
import {
  CONSULTATION_DURATION_MINUTES,
  generateConsultationSlots,
  isValidIanaTimezone,
  zonedSlotToUtc,
  type MeetingSettings,
} from '../services/consultationAvailability.js';
import { sendConsultationChangeEmails, sendConsultationEmails } from '../services/consultationEmailService.js';
import { createZoomConsultation, deleteZoomConsultation, updateZoomConsultation } from '../services/zoomConsultationService.js';

const router = Router();
const ACTIVE_STATUSES = ['pending_zoom', 'confirmed', 'completed', 'no_show'];
const PHONE_PATTERN = /^[+()\d\s.-]{7,40}$/;

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

const publicBookingSchema = slotSchema.extend({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(PHONE_PATTERN),
  company_name: z.string().trim().max(180).optional().default(''),
  meeting_reason: z.string().trim().min(3).max(255),
  notes: z.string().trim().max(3000).optional().default(''),
  idempotency_key: z.string().trim().min(12).max(100),
});

const adminBookingSchema = slotSchema.extend({
  meeting_reason: z.string().trim().min(3).max(255),
  notes: z.string().trim().max(3000).optional().default(''),
  idempotency_key: z.string().trim().min(12).max(100),
});

const settingsSchema = z.object({
  timezone: z.string().trim().min(1).max(100).refine(isValidIanaTimezone, 'Invalid IANA timezone'),
  booking_window_days: z.number().int().min(1).max(365),
  minimum_notice_minutes: z.number().int().min(0).max(43200),
  active: z.boolean(),
});

const availabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean().optional().default(true),
}).refine((value) => value.start_time < value.end_time, { message: 'End time must be after start time' });

const blockedSchema = z.object({
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reason: z.string().trim().max(255).optional().default('Unavailable'),
}).refine((value) => (!value.start_time && !value.end_time) || Boolean(value.start_time && value.end_time && value.start_time < value.end_time), {
  message: 'Provide both start and end time, with end after start',
});

const statusSchema = z.object({ status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']), admin_notes: z.string().max(3000).optional() });

const strictRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (!roles.includes(String(req.user.role).toLowerCase())) return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  next();
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const publicBookingRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const key = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return next();
  }
  if (bucket.count >= 10) return res.status(429).json({ success: false, error: 'Too many booking attempts. Please try again later.' });
  bucket.count += 1;
  next();
};

const utcSql = (value: string | Date) => new Date(value).toISOString().slice(0, 19).replace('T', ' ');
const tokenHash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const secureToken = () => crypto.randomBytes(32).toString('base64url');

let consultationSchemaReady: Promise<void> | null = null;

async function ensureConsultationSchema() {
  if (!consultationSchemaReady) {
    consultationSchemaReady = (async () => {
      const db = getDatabaseAdapter();
      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS meeting_settings (
          id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
          timezone VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
          slot_duration_minutes TINYINT UNSIGNED NOT NULL DEFAULT 30,
          booking_window_days SMALLINT UNSIGNED NOT NULL DEFAULT 60,
          minimum_notice_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 120,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT chk_meeting_duration_30 CHECK (slot_duration_minutes = 30)
        )
      `);
      await db.executeQuery(
        `INSERT IGNORE INTO meeting_settings
         (id, timezone, slot_duration_minutes, booking_window_days, minimum_notice_minutes, active)
         VALUES (1, 'America/New_York', 30, 60, 120, TRUE)`,
      );
      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS meeting_availability (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          day_of_week TINYINT UNSIGNED NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_meeting_availability_day (day_of_week, active),
          CONSTRAINT chk_meeting_availability_day CHECK (day_of_week BETWEEN 0 AND 6),
          CONSTRAINT chk_meeting_availability_range CHECK (start_time < end_time)
        )
      `);
      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS meeting_blocked_dates (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          blocked_date DATE NOT NULL,
          start_time TIME NULL,
          end_time TIME NULL,
          reason VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_meeting_blocked_date (blocked_date),
          CONSTRAINT chk_meeting_blocked_range CHECK (
            (start_time IS NULL AND end_time IS NULL) OR
            (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
          )
        )
      `);
      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS consultation_appointments (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          admin_id BIGINT UNSIGNED NULL,
          booking_source ENUM('admin_dashboard', 'public_website') NOT NULL,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(180) NOT NULL,
          phone VARCHAR(40) NOT NULL,
          company_name VARCHAR(180) NULL,
          meeting_reason VARCHAR(255) NOT NULL,
          notes TEXT NULL,
          start_datetime_utc DATETIME NOT NULL,
          end_datetime_utc DATETIME NOT NULL,
          timezone VARCHAR(100) NOT NULL,
          status ENUM('pending_zoom', 'confirmed', 'completed', 'cancelled', 'no_show', 'zoom_failed') NOT NULL DEFAULT 'pending_zoom',
          active_slot_key VARCHAR(40) NULL,
          idempotency_key VARCHAR(100) NOT NULL,
          zoom_meeting_id VARCHAR(100) NULL,
          zoom_meeting_uuid VARCHAR(255) NULL,
          zoom_join_url TEXT NULL,
          zoom_start_url TEXT NULL,
          cancellation_token_hash CHAR(64) NOT NULL,
          reschedule_token_hash CHAR(64) NOT NULL,
          admin_notes TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          cancelled_at DATETIME NULL,
          UNIQUE KEY uq_consultation_active_slot (active_slot_key),
          UNIQUE KEY uq_consultation_idempotency (idempotency_key),
          UNIQUE KEY uq_consultation_cancel_token (cancellation_token_hash),
          UNIQUE KEY uq_consultation_reschedule_token (reschedule_token_hash),
          INDEX idx_consultation_admin (admin_id, start_datetime_utc),
          INDEX idx_consultation_status_start (status, start_datetime_utc)
        )
      `);
      const availabilityCount = await db.executeQuery(`SELECT COUNT(*) AS total FROM meeting_availability`) as any[];
      if (Number(availabilityCount?.[0]?.total || 0) === 0) {
        for (const weekday of [1, 2, 3, 4, 5]) {
          await db.executeQuery(
            `INSERT INTO meeting_availability (day_of_week, start_time, end_time, active) VALUES (?, '09:00:00', '17:00:00', TRUE)`,
            [weekday],
          );
        }
      }
    })().catch((error) => {
      consultationSchemaReady = null;
      throw error;
    });
  }
  return consultationSchemaReady;
}

async function getSettings(): Promise<MeetingSettings> {
  await ensureConsultationSchema();
  const rows = await getDatabaseAdapter().executeQuery(
    `SELECT timezone, booking_window_days, minimum_notice_minutes, active FROM meeting_settings WHERE id = 1 LIMIT 1`,
  ) as any[];
  if (!rows?.[0]) throw new Error('Meeting booking migration has not been applied');
  return rows[0];
}

async function availableSlots(date: string) {
  const db = getDatabaseAdapter();
  const settings = await getSettings();
  const dayStartUtc = zonedSlotToUtc(date, '00:00', settings.timezone);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 30 * 60 * 60 * 1000);
  const [availability, blocks, appointments] = await Promise.all([
    db.executeQuery(`SELECT id, day_of_week, start_time, end_time, active FROM meeting_availability WHERE active = TRUE ORDER BY start_time`),
    db.executeQuery(`SELECT blocked_date, start_time, end_time FROM meeting_blocked_dates WHERE blocked_date = ?`, [date]),
    db.executeQuery(
      `SELECT start_datetime_utc, end_datetime_utc FROM consultation_appointments
       WHERE status IN (${ACTIVE_STATUSES.map(() => '?').join(',')})
         AND start_datetime_utc < ?
         AND end_datetime_utc > ?`,
      [...ACTIVE_STATUSES, utcSql(dayEndUtc), utcSql(dayStartUtc)],
    ),
  ]);
  return { settings, slots: generateConsultationSlots({ date, settings, availability: availability as any[], blockedPeriods: blocks as any[], appointments: appointments as any[] }) };
}

function publicAppointment(row: any) {
  const { zoom_start_url: _hostUrl, cancellation_token_hash: _cancelHash, reschedule_token_hash: _rescheduleHash, active_slot_key: _slot, ...safe } = row;
  return { ...safe, duration_minutes: CONSULTATION_DURATION_MINUTES };
}

async function reserveAndBook(input: {
  adminId: number | null;
  source: 'admin_dashboard' | 'public_website';
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  reason: string;
  notes?: string;
  idempotencyKey: string;
}) {
  const db = getDatabaseAdapter();
  const prior = await db.executeQuery(`SELECT * FROM consultation_appointments WHERE idempotency_key = ? LIMIT 1`, [input.idempotencyKey]) as any[];
  if (prior?.[0]?.status === 'confirmed') return { appointment: publicAppointment(prior[0]), replayed: true };

  const { settings, slots } = await availableSlots(input.date);
  const slot = slots.find((candidate) => candidate.time === input.time);
  if (!slot) {
    const error = new Error('Sorry, this time was just booked by someone else. Please select another available slot.');
    (error as any).status = 409;
    throw error;
  }

  const cancellationToken = secureToken();
  const rescheduleToken = secureToken();
  let appointmentId: number | null = null;
  try {
    const result = await db.executeQuery(
      `INSERT INTO consultation_appointments
       (admin_id, booking_source, name, email, phone, company_name, meeting_reason, notes,
        start_datetime_utc, end_datetime_utc, timezone, status, active_slot_key, idempotency_key,
        cancellation_token_hash, reschedule_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_zoom', ?, ?, ?, ?)`,
      [input.adminId, input.source, input.name, input.email, input.phone, input.companyName || null, input.reason, input.notes || null,
        utcSql(slot.start_utc), utcSql(slot.end_utc), settings.timezone, slot.start_utc, input.idempotencyKey,
        tokenHash(cancellationToken), tokenHash(rescheduleToken)],
    ) as any;
    appointmentId = Number(result.insertId);
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY' || String(error?.message || '').includes('UNIQUE constraint failed')) {
      const conflict = new Error('Sorry, this time was just booked by someone else. Please select another available slot.');
      (conflict as any).status = 409;
      throw conflict;
    }
    throw error;
  }

  try {
    const topic = input.source === 'admin_dashboard'
      ? `Client Consultation — ${input.companyName || input.name} / ${input.name}`
      : `Consultation — ${input.name}`;
    const zoom = await createZoomConsultation({ topic, startUtc: slot.start_utc, timezone: settings.timezone });
    await db.executeQuery(
      `UPDATE consultation_appointments SET status = 'confirmed', zoom_meeting_id = ?, zoom_meeting_uuid = ?, zoom_join_url = ?, zoom_start_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [String(zoom.id), zoom.uuid || null, zoom.join_url, zoom.start_url, appointmentId],
    );
    const rows = await db.executeQuery(`SELECT * FROM consultation_appointments WHERE id = ?`, [appointmentId]) as any[];
    const row = rows[0];
    const email = await sendConsultationEmails({ ...row, cancellationToken, rescheduleToken });
    return { appointment: publicAppointment(row), cancellation_token: cancellationToken, reschedule_token: rescheduleToken, email };
  } catch (error) {
    await db.executeQuery(
      `UPDATE consultation_appointments SET status = 'zoom_failed', active_slot_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [appointmentId],
    );
    throw error;
  }
}

router.get('/config', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: { ...settings, slot_duration_minutes: CONSULTATION_DURATION_MINUTES } });
  } catch (error) { handleError(res, error); }
});

router.get('/availability', async (req, res) => {
  try {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
    const result = await availableSlots(date);
    res.json({ success: true, data: { timezone: result.settings.timezone, duration_minutes: CONSULTATION_DURATION_MINUTES, slots: result.slots } });
  } catch (error) { handleError(res, error); }
});

// Backward-compatible public URLs used by the existing landing page.
router.get('/public/config', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: { timezone: settings.timezone, timezone_label: settings.timezone, slot_duration_minutes: CONSULTATION_DURATION_MINUTES, booking_window_days: settings.booking_window_days, minimum_notice_minutes: settings.minimum_notice_minutes } });
  } catch (error) { handleError(res, error); }
});
router.get('/public/slots', async (req, res) => {
  try {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
    const result = await availableSlots(date);
    res.json({ success: true, data: { timezone: result.settings.timezone, service: { id: 1, name: 'Zoom Consultation', duration_minutes: 30 }, slots: result.slots } });
  } catch (error) { handleError(res, error); }
});

router.post('/public/book', publicBookingRateLimit, async (req, res) => {
  try {
    const body = publicBookingSchema.parse(req.body);
    const result = await reserveAndBook({ adminId: null, source: 'public_website', date: body.date, time: body.time, name: body.name, email: body.email, phone: body.phone, companyName: body.company_name, reason: body.meeting_reason, notes: body.notes, idempotencyKey: `public:${body.idempotency_key}` });
    res.status(result.replayed ? 200 : 201).json({ success: true, data: result });
  } catch (error) { handleError(res, error); }
});

router.post('/admin/book', authenticateToken, strictRole('admin'), async (req: AuthRequest, res) => {
  try {
    const body = adminBookingSchema.parse(req.body);
    const users = await getDatabaseAdapter().executeQuery(`SELECT first_name, last_name, email, phone, company_name FROM users WHERE id = ? LIMIT 1`, [req.user!.id]) as any[];
    const user = users?.[0];
    if (!user) return res.status(404).json({ success: false, error: 'Admin profile not found' });
    if (!user.phone || !PHONE_PATTERN.test(String(user.phone))) return res.status(400).json({ success: false, error: 'Add a valid phone number to your profile before booking.' });
    const result = await reserveAndBook({ adminId: req.user!.id, source: 'admin_dashboard', date: body.date, time: body.time, name: `${user.first_name} ${user.last_name}`.trim(), email: user.email, phone: user.phone, companyName: user.company_name, reason: body.meeting_reason, notes: body.notes, idempotencyKey: `admin:${req.user!.id}:${body.idempotency_key}` });
    res.status(result.replayed ? 200 : 201).json({ success: true, data: result });
  } catch (error) { handleError(res, error); }
});

router.get('/admin/my', authenticateToken, strictRole('admin'), async (req: AuthRequest, res) => {
  try {
    const rows = await getDatabaseAdapter().executeQuery(
      `SELECT id, booking_source, name, email, company_name, meeting_reason, notes, start_datetime_utc, end_datetime_utc, timezone, status, zoom_join_url, created_at
       FROM consultation_appointments WHERE admin_id = ? ORDER BY start_datetime_utc DESC`, [req.user!.id],
    ) as any[];
    res.json({ success: true, data: rows.map(publicAppointment) });
  } catch (error) { handleError(res, error); }
});

router.post('/cancel/:token', async (req, res) => {
  try {
    const db = getDatabaseAdapter();
    const rows = await db.executeQuery(`SELECT * FROM consultation_appointments WHERE cancellation_token_hash = ? LIMIT 1`, [tokenHash(req.params.token)]) as any[];
    const appointment = rows?.[0];
    if (!appointment) return res.status(404).json({ success: false, error: 'Invalid cancellation link' });
    if (appointment.status === 'cancelled') return res.json({ success: true });
    await db.executeQuery(`UPDATE consultation_appointments SET status = 'cancelled', active_slot_key = NULL, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [appointment.id]);
    if (appointment.zoom_meeting_id) await deleteZoomConsultation(String(appointment.zoom_meeting_id)).catch((error) => console.error('Zoom cancellation failed:', error));
    await sendConsultationChangeEmails(appointment, 'cancelled');
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

router.post('/reschedule/:token', async (req, res) => {
  try {
    const body = slotSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const rows = await db.executeQuery(`SELECT * FROM consultation_appointments WHERE reschedule_token_hash = ? LIMIT 1`, [tokenHash(req.params.token)]) as any[];
    const appointment = rows?.[0];
    if (!appointment || appointment.status !== 'confirmed') return res.status(404).json({ success: false, error: 'Invalid reschedule link' });
    const { settings, slots } = await availableSlots(body.date);
    const slot = slots.find((candidate) => candidate.time === body.time);
    if (!slot) return res.status(409).json({ success: false, error: 'Sorry, this time was just booked by someone else. Please select another available slot.' });
    const old = { start: appointment.start_datetime_utc, end: appointment.end_datetime_utc, key: appointment.active_slot_key, timezone: appointment.timezone };
    try {
      await db.executeQuery(`UPDATE consultation_appointments SET start_datetime_utc = ?, end_datetime_utc = ?, timezone = ?, active_slot_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [utcSql(slot.start_utc), utcSql(slot.end_utc), settings.timezone, slot.start_utc, appointment.id]);
      await updateZoomConsultation(String(appointment.zoom_meeting_id), slot.start_utc, settings.timezone);
    } catch (error) {
      await db.executeQuery(`UPDATE consultation_appointments SET start_datetime_utc = ?, end_datetime_utc = ?, timezone = ?, active_slot_key = ? WHERE id = ?`, [old.start, old.end, old.timezone, old.key, appointment.id]).catch(() => undefined);
      throw error;
    }
    const updatedRows = await db.executeQuery(`SELECT * FROM consultation_appointments WHERE id = ? LIMIT 1`, [appointment.id]) as any[];
    await sendConsultationChangeEmails(updatedRows[0], 'rescheduled');
    res.json({ success: true, data: { date: body.date, time: body.time, timezone: settings.timezone, duration_minutes: 30 } });
  } catch (error) { handleError(res, error); }
});

router.get('/manage/overview', authenticateToken, strictRole('super_admin'), async (_req, res) => {
  try {
    const db = getDatabaseAdapter();
    const [settings, availability, blocks, appointments] = await Promise.all([
      getSettings(),
      db.executeQuery(`SELECT * FROM meeting_availability ORDER BY day_of_week, start_time`),
      db.executeQuery(`SELECT * FROM meeting_blocked_dates ORDER BY blocked_date DESC, start_time`),
      db.executeQuery(`SELECT * FROM consultation_appointments ORDER BY start_datetime_utc DESC LIMIT 500`),
    ]);
    res.json({ success: true, data: { settings: { ...settings, slot_duration_minutes: 30 }, availability, blocked_dates: blocks, appointments } });
  } catch (error) { handleError(res, error); }
});

router.put('/manage/settings', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try {
    const body = settingsSchema.parse(req.body);
    await getDatabaseAdapter().executeQuery(`UPDATE meeting_settings SET timezone = ?, booking_window_days = ?, minimum_notice_minutes = ?, active = ?, slot_duration_minutes = 30, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, [body.timezone, body.booking_window_days, body.minimum_notice_minutes, body.active]);
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

router.post('/manage/availability', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try {
    const body = availabilitySchema.parse(req.body);
    const result = await getDatabaseAdapter().executeQuery(`INSERT INTO meeting_availability (day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?)`, [body.day_of_week, `${body.start_time}:00`, `${body.end_time}:00`, body.active]) as any;
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) { handleError(res, error); }
});

router.put('/manage/availability/:id', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try {
    const body = availabilitySchema.parse(req.body);
    await getDatabaseAdapter().executeQuery(`UPDATE meeting_availability SET day_of_week = ?, start_time = ?, end_time = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [body.day_of_week, `${body.start_time}:00`, `${body.end_time}:00`, body.active, Number(req.params.id)]);
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

router.delete('/manage/availability/:id', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try { await getDatabaseAdapter().executeQuery(`DELETE FROM meeting_availability WHERE id = ?`, [Number(req.params.id)]); res.json({ success: true }); }
  catch (error) { handleError(res, error); }
});

router.post('/manage/blocked-dates', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try {
    const body = blockedSchema.parse(req.body);
    const result = await getDatabaseAdapter().executeQuery(`INSERT INTO meeting_blocked_dates (blocked_date, start_time, end_time, reason) VALUES (?, ?, ?, ?)`, [body.blocked_date, body.start_time ? `${body.start_time}:00` : null, body.end_time ? `${body.end_time}:00` : null, body.reason]) as any;
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) { handleError(res, error); }
});

router.delete('/manage/blocked-dates/:id', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try { await getDatabaseAdapter().executeQuery(`DELETE FROM meeting_blocked_dates WHERE id = ?`, [Number(req.params.id)]); res.json({ success: true }); }
  catch (error) { handleError(res, error); }
});

router.put('/manage/appointments/:id/status', authenticateToken, strictRole('super_admin'), async (req, res) => {
  try {
    const body = statusSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const rows = await db.executeQuery(`SELECT * FROM consultation_appointments WHERE id = ? LIMIT 1`, [Number(req.params.id)]) as any[];
    const appointment = rows?.[0];
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    await db.executeQuery(`UPDATE consultation_appointments SET status = ?, admin_notes = COALESCE(?, admin_notes), active_slot_key = CASE WHEN ? = 'cancelled' THEN NULL ELSE active_slot_key END, cancelled_at = CASE WHEN ? = 'cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [body.status, body.admin_notes || null, body.status, body.status, appointment.id]);
    if (body.status === 'cancelled' && appointment.zoom_meeting_id) await deleteZoomConsultation(String(appointment.zoom_meeting_id)).catch((error) => console.error('Zoom cancellation failed:', error));
    if (body.status === 'cancelled') await sendConsultationChangeEmails(appointment, 'cancelled');
    res.json({ success: true });
  } catch (error) { handleError(res, error); }
});

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message || 'Invalid request' });
  const status = Number((error as any)?.status || 500);
  console.error('Consultation booking error:', error);
  const message = status < 500 ? (error as Error).message : (String((error as Error)?.message || '').includes('Zoom') ? 'Zoom meeting creation failed. No appointment was booked.' : 'Unable to process the appointment request.');
  return res.status(status).json({ success: false, error: message });
}

export default router;
