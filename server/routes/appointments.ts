import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

let appointmentTablesReady: Promise<void> | null = null;

const publicSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().optional().transform((value) => {
    if (!value) return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }),
});

const createPublicBookingSchema = z.object({
  service_id: z.number().int().positive(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().trim().min(1).max(100).optional().default('America/New_York'),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().default(''),
  company: z.string().trim().max(180).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
});

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(1000).optional().default(''),
  duration_minutes: z.number().int().min(15).max(240),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().min(0).max(9999).optional().default(0),
});

const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  slot_interval_minutes: z.number().int().min(15).max(240).optional().default(30),
  buffer_minutes: z.number().int().min(0).max(120).optional().default(0),
  is_active: z.boolean().optional().default(true),
  team_member_name: z.string().trim().max(120).optional().default('CapSol Team'),
  zoom_join_url: z.string().trim().url().max(1000).optional().or(z.literal('')).default(''),
});

const blockedDateSchema = z.object({
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  reason: z.string().trim().max(255).optional().default('Unavailable'),
  is_active: z.boolean().optional().default(true),
});

const bookingUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  zoom_join_url: z.string().trim().url().max(1000).optional().or(z.literal('')),
  zoom_host_url: z.string().trim().url().max(1000).optional().or(z.literal('')),
  assigned_to: z.string().trim().max(120).optional(),
  admin_notes: z.string().trim().max(2000).optional(),
});

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
  return (hours * 60) + minutes;
}

function formatMinutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function getWeekday(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.getDay();
}

async function ensureAppointmentTables() {
  if (!appointmentTablesReady) {
    appointmentTablesReady = (async () => {
      const db = getDatabaseAdapter();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS appointment_services (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          slug VARCHAR(120) NOT NULL UNIQUE,
          description TEXT NULL,
          duration_minutes INT NOT NULL DEFAULT 30,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS appointment_availability (
          id INT AUTO_INCREMENT PRIMARY KEY,
          weekday TINYINT NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          slot_interval_minutes INT NOT NULL DEFAULT 30,
          buffer_minutes INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          team_member_name VARCHAR(120) NULL,
          zoom_join_url TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS appointment_blocked_dates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          blocked_date DATE NOT NULL,
          start_time TIME NULL,
          end_time TIME NULL,
          reason VARCHAR(255) NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await db.executeQuery(`
        CREATE TABLE IF NOT EXISTS appointment_bookings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          service_id INT NOT NULL,
          appointment_date DATE NOT NULL,
          appointment_time TIME NOT NULL,
          duration_minutes INT NOT NULL,
          timezone VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
          status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') NOT NULL DEFAULT 'confirmed',
          name VARCHAR(120) NOT NULL,
          email VARCHAR(180) NOT NULL,
          phone VARCHAR(40) NULL,
          company VARCHAR(180) NULL,
          notes TEXT NULL,
          zoom_join_url TEXT NULL,
          zoom_host_url TEXT NULL,
          assigned_to VARCHAR(120) NULL,
          admin_notes TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_appointment_bookings_service FOREIGN KEY (service_id) REFERENCES appointment_services(id) ON DELETE CASCADE
        )
      `);

      const serviceCountRows = await db.executeQuery('SELECT COUNT(*) as total FROM appointment_services');
      const serviceCount = Number((serviceCountRows as any)?.[0]?.total || 0);

      if (serviceCount === 0) {
        await db.executeQuery(
          `INSERT INTO appointment_services (name, slug, description, duration_minutes, is_active, sort_order, created_at, updated_at)
           VALUES
           (?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'Zoom Walkthrough', 'zoom-walkthrough', 'A live product walkthrough for investors and business owners.', 30, 1, 1, now, now,
            'Funding Strategy Call', 'funding-strategy-call', 'A strategy session to discuss capital goals, timing, and next steps.', 45, 1, 2, now, now,
            'Discovery Consultation', 'discovery-consultation', 'An introductory call to understand your business or acquisition funding needs.', 30, 1, 3, now, now,
          ],
        );
      }

      const availabilityCountRows = await db.executeQuery('SELECT COUNT(*) as total FROM appointment_availability');
      const availabilityCount = Number((availabilityCountRows as any)?.[0]?.total || 0);

      if (availabilityCount === 0) {
        const inserts: any[] = [];
        for (const weekday of [1, 2, 3, 4, 5]) {
          inserts.push(weekday, '17:00:00', '20:00:00', 30, 0, 1, 'CapSol Team', '');
        }
        await db.executeQuery(
          `INSERT INTO appointment_availability
            (weekday, start_time, end_time, slot_interval_minutes, buffer_minutes, is_active, team_member_name, zoom_join_url)
           VALUES
            (?, ?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?, ?)`,
          inserts,
        );
      } else {
        const existingSeedRows = await db.executeQuery(
          `SELECT id
           FROM appointment_availability
           WHERE weekday IN (1, 2, 3, 4, 5)
             AND start_time = '09:00:00'
             AND end_time = '17:00:00'
             AND slot_interval_minutes = 30
             AND COALESCE(buffer_minutes, 0) = 10
             AND COALESCE(team_member_name, 'CapSol Team') = 'CapSol Team'`,
        ) as any[];

        if (Array.isArray(existingSeedRows) && existingSeedRows.length === 5) {
          await db.executeQuery(
            `UPDATE appointment_availability
             SET start_time = '17:00:00',
                 end_time = '20:00:00',
                 buffer_minutes = 0,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id IN (${existingSeedRows.map(() => '?').join(',')})`,
            existingSeedRows.map((row) => row.id),
          );
        }
      }
    })().catch((error) => {
      appointmentTablesReady = null;
      throw error;
    });
  }

  return appointmentTablesReady;
}

async function getActiveServices() {
  const db = getDatabaseAdapter();
  return db.executeQuery(
    `SELECT id, name, slug, description, duration_minutes, is_active, sort_order
     FROM appointment_services
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
  );
}

async function getAvailableSlotsForDate(date: string, serviceId?: number) {
  await ensureAppointmentTables();
  const db = getDatabaseAdapter();

  const services = await getActiveServices() as any[];
  const selectedService = serviceId
    ? services.find((service) => Number(service.id) === Number(serviceId))
    : services[0];

  if (!selectedService) {
    return { service: null, slots: [] as any[] };
  }

  const weekday = getWeekday(date);
  const availabilityRows = await db.executeQuery(
    `SELECT id, weekday, start_time, end_time, slot_interval_minutes, buffer_minutes, team_member_name, zoom_join_url
     FROM appointment_availability
     WHERE is_active = TRUE AND weekday = ?
     ORDER BY start_time ASC`,
    [weekday],
  ) as any[];

  const blockedRows = await db.executeQuery(
    `SELECT id, blocked_date, start_time, end_time, reason
     FROM appointment_blocked_dates
     WHERE is_active = TRUE AND blocked_date = ?`,
    [date],
  ) as any[];

  const bookingRows = await db.executeQuery(
    `SELECT id, appointment_time, duration_minutes
     FROM appointment_bookings
     WHERE appointment_date = ?
       AND status IN ('pending', 'confirmed', 'completed')`,
    [date],
  ) as any[];

  const durationMinutes = Number(selectedService.duration_minutes || 30);
  const slots: any[] = [];

  for (const row of availabilityRows) {
    const start = parseTimeToMinutes(String(row.start_time).slice(0, 5));
    const end = parseTimeToMinutes(String(row.end_time).slice(0, 5));
    const interval = Number(row.slot_interval_minutes || durationMinutes);
    const bufferMinutes = Number(row.buffer_minutes || 0);

    for (let cursor = start; cursor + durationMinutes <= end; cursor += interval) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMinutes;
      let blocked = false;

      for (const blockedRow of blockedRows) {
        if (!blockedRow.start_time || !blockedRow.end_time) {
          blocked = true;
          break;
        }
        const blockedStart = parseTimeToMinutes(String(blockedRow.start_time).slice(0, 5));
        const blockedEnd = parseTimeToMinutes(String(blockedRow.end_time).slice(0, 5));
        if (overlaps(slotStart, slotEnd, blockedStart, blockedEnd)) {
          blocked = true;
          break;
        }
      }

      if (blocked) {
        continue;
      }

      const bookingConflict = bookingRows.some((booking) => {
        const bookingStart = parseTimeToMinutes(String(booking.appointment_time).slice(0, 5));
        const bookingEnd = bookingStart + Number(booking.duration_minutes || durationMinutes) + bufferMinutes;
        return overlaps(slotStart, slotEnd + bufferMinutes, bookingStart, bookingEnd);
      });

      if (bookingConflict) {
        continue;
      }

      slots.push({
        availability_id: row.id,
        date,
        time: formatMinutesToTime(slotStart),
        end_time: formatMinutesToTime(slotEnd),
        label: `${formatMinutesToTime(slotStart)} - ${formatMinutesToTime(slotEnd)}`,
        team_member_name: row.team_member_name || 'CapSol Team',
      });
    }
  }

  return {
    service: selectedService,
    slots,
  };
}

router.get('/public/config', async (_req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const services = await getActiveServices();
    res.json({
      success: true,
      data: {
        timezone_label: 'Eastern Time (ET)',
        booking_notice: 'Live booking hours are Monday through Friday, 5:00 PM to 8:00 PM Eastern, in 30-minute slots.',
        services,
      },
    });
  } catch (error) {
    console.error('Error loading appointment config:', error);
    res.status(500).json({ success: false, error: 'Failed to load booking configuration' });
  }
});

router.get('/public/slots', async (req: Request, res: Response) => {
  try {
    const query = publicSlotsQuerySchema.parse(req.query);
    const slotData = await getAvailableSlotsForDate(query.date, query.serviceId);

    res.json({
      success: true,
      data: slotData,
    });
  } catch (error) {
    console.error('Error loading appointment slots:', error);
    res.status(500).json({ success: false, error: 'Failed to load available slots' });
  }
});

router.post('/public/book', async (req: Request, res: Response) => {
  try {
    const payload = createPublicBookingSchema.parse(req.body);
    const today = new Date().toISOString().slice(0, 10);
    if (payload.appointment_date < today) {
      return res.status(400).json({ success: false, error: 'Selected date is in the past' });
    }

    const slotData = await getAvailableSlotsForDate(payload.appointment_date, payload.service_id);
    const matchingSlot = slotData.slots.find((slot) => slot.time === payload.appointment_time);

    if (!matchingSlot || !slotData.service) {
      return res.status(409).json({ success: false, error: 'That slot is no longer available. Please choose another time.' });
    }

    const db = getDatabaseAdapter();
    const availabilityRows = await db.executeQuery(
      `SELECT team_member_name, zoom_join_url
       FROM appointment_availability
       WHERE id = ?
       LIMIT 1`,
      [matchingSlot.availability_id],
    ) as any[];

    const availability = availabilityRows?.[0] || {};
    const insertResult = await db.executeQuery(
      `INSERT INTO appointment_bookings
        (service_id, appointment_date, appointment_time, duration_minutes, timezone, status, name, email, phone, company, notes, zoom_join_url, assigned_to)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.service_id,
        payload.appointment_date,
        `${payload.appointment_time}:00`,
        Number(slotData.service.duration_minutes || 30),
        payload.timezone,
        payload.name,
        payload.email,
        payload.phone || null,
        payload.company || null,
        payload.notes || null,
        availability.zoom_join_url || null,
        availability.team_member_name || 'CapSol Team',
      ],
    ) as any;

    res.status(201).json({
      success: true,
      data: {
        id: insertResult?.insertId || null,
        status: 'confirmed',
        service_name: slotData.service.name,
        appointment_date: payload.appointment_date,
        appointment_time: payload.appointment_time,
        duration_minutes: slotData.service.duration_minutes,
        zoom_join_url: availability.zoom_join_url || null,
        assigned_to: availability.team_member_name || 'CapSol Team',
      },
    });
  } catch (error) {
    console.error('Error creating appointment booking:', error);
    res.status(500).json({ success: false, error: 'Failed to book appointment' });
  }
});

router.get('/admin/overview', authenticateToken, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const db = getDatabaseAdapter();
    const [services, availability, blockedDates, bookings, statsRows] = await Promise.all([
      db.executeQuery(`SELECT * FROM appointment_services ORDER BY sort_order ASC, name ASC`),
      db.executeQuery(`SELECT * FROM appointment_availability ORDER BY weekday ASC, start_time ASC`),
      db.executeQuery(`SELECT * FROM appointment_blocked_dates ORDER BY blocked_date DESC, start_time ASC`),
      db.executeQuery(
        `SELECT b.*, s.name AS service_name
         FROM appointment_bookings b
         LEFT JOIN appointment_services s ON s.id = b.service_id
         ORDER BY b.appointment_date DESC, b.appointment_time DESC
         LIMIT 250`,
      ),
      db.executeQuery(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
         FROM appointment_bookings`,
      ),
    ]);

    res.json({
      success: true,
      data: {
        services,
        availability,
        blocked_dates: blockedDates,
        bookings,
        stats: (statsRows as any)?.[0] || { total: 0, confirmed: 0, completed: 0, cancelled: 0 },
      },
    });
  } catch (error) {
    console.error('Error loading admin appointment overview:', error);
    res.status(500).json({ success: false, error: 'Failed to load appointment manager data' });
  }
});

router.post('/admin/services', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const payload = serviceSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const result = await db.executeQuery(
      `INSERT INTO appointment_services (name, slug, description, duration_minutes, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payload.name, payload.slug, payload.description || null, payload.duration_minutes, payload.is_active, payload.sort_order],
    ) as any;
    res.status(201).json({ success: true, data: { id: result?.insertId || null } });
  } catch (error) {
    console.error('Error creating appointment service:', error);
    res.status(500).json({ success: false, error: 'Failed to create service' });
  }
});

router.put('/admin/services/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const serviceId = Number.parseInt(req.params.id, 10);
    const payload = serviceSchema.parse(req.body);
    const db = getDatabaseAdapter();
    await db.executeQuery(
      `UPDATE appointment_services
       SET name = ?, slug = ?, description = ?, duration_minutes = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [payload.name, payload.slug, payload.description || null, payload.duration_minutes, payload.is_active, payload.sort_order, serviceId],
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment service:', error);
    res.status(500).json({ success: false, error: 'Failed to update service' });
  }
});

router.delete('/admin/services/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const serviceId = Number.parseInt(req.params.id, 10);
    const db = getDatabaseAdapter();
    await db.executeQuery(`DELETE FROM appointment_services WHERE id = ?`, [serviceId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment service:', error);
    res.status(500).json({ success: false, error: 'Failed to delete service' });
  }
});

router.post('/admin/availability', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const payload = availabilitySchema.parse(req.body);
    const db = getDatabaseAdapter();
    const result = await db.executeQuery(
      `INSERT INTO appointment_availability
        (weekday, start_time, end_time, slot_interval_minutes, buffer_minutes, is_active, team_member_name, zoom_join_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.weekday,
        `${payload.start_time}:00`,
        `${payload.end_time}:00`,
        payload.slot_interval_minutes,
        payload.buffer_minutes,
        payload.is_active,
        payload.team_member_name || 'CapSol Team',
        payload.zoom_join_url || null,
      ],
    ) as any;
    res.status(201).json({ success: true, data: { id: result?.insertId || null } });
  } catch (error) {
    console.error('Error creating appointment availability:', error);
    res.status(500).json({ success: false, error: 'Failed to create availability rule' });
  }
});

router.put('/admin/availability/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const availabilityId = Number.parseInt(req.params.id, 10);
    const payload = availabilitySchema.parse(req.body);
    const db = getDatabaseAdapter();
    await db.executeQuery(
      `UPDATE appointment_availability
       SET weekday = ?, start_time = ?, end_time = ?, slot_interval_minutes = ?, buffer_minutes = ?, is_active = ?, team_member_name = ?, zoom_join_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.weekday,
        `${payload.start_time}:00`,
        `${payload.end_time}:00`,
        payload.slot_interval_minutes,
        payload.buffer_minutes,
        payload.is_active,
        payload.team_member_name || 'CapSol Team',
        payload.zoom_join_url || null,
        availabilityId,
      ],
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment availability:', error);
    res.status(500).json({ success: false, error: 'Failed to update availability rule' });
  }
});

router.delete('/admin/availability/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const availabilityId = Number.parseInt(req.params.id, 10);
    const db = getDatabaseAdapter();
    await db.executeQuery(`DELETE FROM appointment_availability WHERE id = ?`, [availabilityId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment availability:', error);
    res.status(500).json({ success: false, error: 'Failed to delete availability rule' });
  }
});

router.post('/admin/blocked-dates', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const payload = blockedDateSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const result = await db.executeQuery(
      `INSERT INTO appointment_blocked_dates (blocked_date, start_time, end_time, reason, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        payload.blocked_date,
        payload.start_time ? `${payload.start_time}:00` : null,
        payload.end_time ? `${payload.end_time}:00` : null,
        payload.reason || null,
        payload.is_active,
      ],
    ) as any;
    res.status(201).json({ success: true, data: { id: result?.insertId || null } });
  } catch (error) {
    console.error('Error creating blocked date:', error);
    res.status(500).json({ success: false, error: 'Failed to create blocked date' });
  }
});

router.delete('/admin/blocked-dates/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const blockedDateId = Number.parseInt(req.params.id, 10);
    const db = getDatabaseAdapter();
    await db.executeQuery(`DELETE FROM appointment_blocked_dates WHERE id = ?`, [blockedDateId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ success: false, error: 'Failed to delete blocked date' });
  }
});

router.put('/admin/bookings/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await ensureAppointmentTables();
    const bookingId = Number.parseInt(req.params.id, 10);
    const payload = bookingUpdateSchema.parse(req.body);
    const db = getDatabaseAdapter();

    await db.executeQuery(
      `UPDATE appointment_bookings
       SET
        status = COALESCE(?, status),
        zoom_join_url = COALESCE(?, zoom_join_url),
        zoom_host_url = COALESCE(?, zoom_host_url),
        assigned_to = COALESCE(?, assigned_to),
        admin_notes = COALESCE(?, admin_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.status || null,
        payload.zoom_join_url || null,
        payload.zoom_host_url || null,
        payload.assigned_to || null,
        payload.admin_notes || null,
        bookingId,
      ],
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
});

export default router;
