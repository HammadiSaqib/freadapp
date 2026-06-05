import { Request, Response } from 'express';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { CalendarEvent, EventRegistration } from '../database/mysqlSchema.js';
import { z } from 'zod';
import { executeQuery } from '../database/mysqlConfig.js';
import { securityLogger } from '../utils/securityLogger.js';

const eventTimeSchema = z.preprocess(
  (value) => value === '' ? null : value,
  z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').nullable().optional()
);

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Date must be in ISO format'),
  time: eventTimeSchema,
  duration: z.string().optional().default('1h'),
  type: z.enum(['webinar', 'workshop', 'office_hours', 'exam', 'meetup', 'deadline', 'meeting', 'physical_event', 'report_pull', 'other']),
  instructor: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  is_virtual: z.boolean().optional(),
  is_physical: z.boolean().optional(),
  max_attendees: z.number().int().positive().optional(),
  meeting_link: z.string().nullable().optional(),
  visible_to_admins: z.boolean().optional().default(false)
});

const updateEventSchema = createEventSchema.partial();

const getEventsQuerySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1') || 1),
  limit: z.string().optional().transform(val => Math.min(parseInt(val || '10') || 10, 100)),
  search: z.string().optional(),
  type: z.enum(['webinar', 'workshop', 'office_hours', 'exam', 'meetup', 'deadline', 'meeting', 'physical_event', 'report_pull', 'other']).optional(),
  is_virtual: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// Get all calendar events
export async function getCalendarEvents(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const query = getEventsQuerySchema.parse(req.query);
    const { page, limit, search, type, is_virtual, date_from, date_to } = query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ? OR instructor LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (is_virtual !== undefined) {
      whereClause += ' AND is_virtual = ?';
      params.push(is_virtual ? 1 : 0);
    }

    if (date_from) {
      whereClause += ' AND date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND date <= ?';
      params.push(date_to);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM calendar_events ${whereClause}`;
    const countResult = await db.getQuery(countQuery, params);
    const total = countResult?.total || 0;

    // Get events with pagination
    const eventsQuery = `
      SELECT e.*, u.first_name || ' ' || u.last_name as creator_name
      FROM calendar_events e
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.date ASC, e.time ASC
      LIMIT ? OFFSET ?
    `;
    
    const events = await db.allQuery(eventsQuery, [...params, limit, offset]);

    // Get registration counts for each event
    const eventIds = events.map(e => e.id);
    let registrationCounts: any[] = [];
    
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const registrationQuery = `
        SELECT event_id, COUNT(*) as registration_count
        FROM event_registrations
        WHERE event_id IN (${placeholders})
        GROUP BY event_id
      `;
      registrationCounts = await db.allQuery(registrationQuery, eventIds);
    }

    // Add registration counts to events
    const eventsWithCounts = events.map(event => {
      const registrationCount = registrationCounts.find(rc => rc.event_id === event.id);
      return {
        ...event,
        attendees: registrationCount?.registration_count || 0,
        is_virtual: Boolean(event.is_virtual)
      };
    });

    res.json({
      success: true,
      data: eventsWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events'
    });
  }
}

// Get single calendar event
export async function getCalendarEvent(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const eventId = parseInt(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    const eventQuery = `
      SELECT e.*, u.first_name || ' ' || u.last_name as creator_name
      FROM calendar_events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `;
    
    const event = await db.getQuery(eventQuery, [eventId]);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Get registration count
    const registrationQuery = `
      SELECT COUNT(*) as registration_count
      FROM event_registrations
      WHERE event_id = ?
    `;
    const registrationResult = await db.getQuery(registrationQuery, [eventId]);

    const eventWithCount = {
      ...event,
      attendees: registrationResult?.registration_count || 0,
      is_virtual: Boolean(event.is_virtual)
    };

    res.json({
      success: true,
      data: eventWithCount
    });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar event'
    });
  }
}

// Create new calendar event
export async function createCalendarEvent(req: Request, res: Response) {
  const debugId = `CREATE_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DEBUG ${debugId}] ========== Calendar Event Creation Started ==========`);
  console.log(`[DEBUG ${debugId}] Request Method: ${req.method}`);
  console.log(`[DEBUG ${debugId}] Request URL: ${req.url}`);
  console.log(`[DEBUG ${debugId}] Request Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[DEBUG ${debugId}] Raw Request Body:`, JSON.stringify(req.body, null, 2));
  console.log(`[DEBUG ${debugId}] Request Body Type:`, typeof req.body);
  console.log(`[DEBUG ${debugId}] Request Body Keys:`, Object.keys(req.body || {}));
  
  try {
    console.log(`[DEBUG ${debugId}] Getting database adapter...`);
    const db = getDatabaseAdapter();
    console.log(`[DEBUG ${debugId}] Database adapter obtained successfully`);
    
    console.log(`[DEBUG ${debugId}] Extracting user ID from request...`);
    const userId = (req as any).user?.id;
    console.log(`[DEBUG ${debugId}] User ID:`, userId);
    console.log(`[DEBUG ${debugId}] Full user object:`, JSON.stringify((req as any).user, null, 2));

    if (!userId) {
      console.log(`[DEBUG ${debugId}] Authentication failed - no user ID found`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log(`[DEBUG ${debugId}] Starting schema validation...`);
    console.log(`[DEBUG ${debugId}] Schema validation input:`, JSON.stringify(req.body, null, 2));
    
    let eventData;
    try {
      eventData = createEventSchema.parse(req.body);
      console.log(`[DEBUG ${debugId}] Schema validation successful`);
      console.log(`[DEBUG ${debugId}] Parsed event data:`, JSON.stringify(eventData, null, 2));
    } catch (validationError) {
      console.log(`[DEBUG ${debugId}] Schema validation failed:`, validationError);
      if (validationError instanceof z.ZodError) {
        console.log(`[DEBUG ${debugId}] Zod validation errors:`, JSON.stringify(validationError.errors, null, 2));
      }
      throw validationError;
    }

    console.log(`[DEBUG ${debugId}] Preparing database insert query...`);

    // Normalize date/time for MySQL columns
    // eventData.date is ISO (e.g., 2025-11-04T15:30:00.000Z). The DB expects DATE and TIME separately.
    let dateForDb: string;
    let timeForDb: string | null = null;

    try {
      const parsed = new Date(eventData.date);
      if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date provided: ${eventData.date}`);
      }
      // Use UTC to avoid locale shifts and ensure consistency
      const iso = parsed.toISOString();
      dateForDb = iso.slice(0, 10); // YYYY-MM-DD
      // Prefer explicit time from payload; otherwise derive HH:MM:SS from ISO
      if (typeof eventData.time === 'string' && /^\d{2}:\d{2}$/.test(eventData.time)) {
        timeForDb = `${eventData.time}:00`;
      } else if (eventData.time === null) {
        timeForDb = null;
      } else {
        timeForDb = iso.slice(11, 19); // HH:MM:SS
      }
      console.log(`[DEBUG ${debugId}] Normalized date/time for DB:`, { dateForDb, timeForDb });
    } catch (dtErr) {
      console.log(`[DEBUG ${debugId}] Failed to normalize date/time:`, dtErr);
      throw dtErr;
    }
    const insertQuery = `
      INSERT INTO calendar_events (
        title, description, date, time, duration, type, instructor,
        location, is_virtual, is_physical, max_attendees, meeting_link,
        visible_to_admins, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertValues = [
      eventData.title,
      eventData.description || null,
      dateForDb,
      timeForDb,
      eventData.duration,
      eventData.type,
      eventData.instructor || null,
      eventData.location || null,
      eventData.is_virtual ? 1 : 0,
      eventData.is_physical ? 1 : 0,
      eventData.max_attendees || null,
      eventData.meeting_link || null,
      eventData.visible_to_admins ? 1 : 0,
      userId
    ];

    console.log(`[DEBUG ${debugId}] Insert query:`, insertQuery);
    console.log(`[DEBUG ${debugId}] Insert values:`, JSON.stringify(insertValues, null, 2));
    console.log(`[DEBUG ${debugId}] Insert values types:`, insertValues.map(v => typeof v));

    console.log(`[DEBUG ${debugId}] Executing database insert...`);
    let result;
    try {
      result = await db.executeQuery(insertQuery, insertValues);
      console.log(`[DEBUG ${debugId}] Database insert successful`);
      console.log(`[DEBUG ${debugId}] Insert result:`, JSON.stringify(result, null, 2));
    } catch (dbError) {
      console.log(`[DEBUG ${debugId}] Database insert failed:`, dbError);
      console.log(`[DEBUG ${debugId}] Database error details:`, {
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno,
        sqlState: dbError.sqlState,
        sqlMessage: dbError.sqlMessage
      });
      throw dbError;
    }

    const eventId = result.insertId;
    console.log(`[DEBUG ${debugId}] New event ID:`, eventId);

    const repeatWeeklyRaw = (req.body as any)?.repeat_weekly;
    const repeatWeeksRaw = (req.body as any)?.repeat_weeks;
    const repeatWeekly = repeatWeeklyRaw === true || repeatWeeklyRaw === 'true' || repeatWeeklyRaw === 1;
    const repeatWeeks = parseInt(repeatWeeksRaw as any) || 0;
    if (repeatWeekly && repeatWeeks > 1) {
      console.log(`[DEBUG ${debugId}] Recurrence enabled: weekly x${repeatWeeks}`);
      const base = new Date(`${dateForDb}T${timeForDb || '00:00:00'}`);
      for (let i = 1; i < repeatWeeks; i++) {
        const next = new Date(base);
        next.setDate(next.getDate() + i * 7);
        const y = next.getFullYear();
        const m = String(next.getMonth() + 1).padStart(2, '0');
        const d = String(next.getDate()).padStart(2, '0');
        const nextDateForDb = `${y}-${m}-${d}`;
        const values = [
          eventData.title,
          eventData.description || null,
          nextDateForDb,
          timeForDb,
          eventData.duration,
          eventData.type,
          eventData.instructor || null,
          eventData.location || null,
          eventData.is_virtual ? 1 : 0,
          eventData.is_physical ? 1 : 0,
          eventData.max_attendees || null,
          eventData.meeting_link || null,
          eventData.visible_to_admins ? 1 : 0,
          userId
        ];
        try {
          await db.executeQuery(insertQuery, values);
          console.log(`[DEBUG ${debugId}] Inserted recurring event for ${nextDateForDb}`);
        } catch (recErr) {
          console.log(`[DEBUG ${debugId}] Failed inserting recurring event for ${nextDateForDb}:`, recErr);
        }
      }
    }

    console.log(`[DEBUG ${debugId}] Fetching created event...`);
    let createdEvent;
    try {
      createdEvent = await db.getQuery(
        'SELECT * FROM calendar_events WHERE id = ?',
        [eventId]
      );
      console.log(`[DEBUG ${debugId}] Fetched created event:`, JSON.stringify(createdEvent, null, 2));
    } catch (fetchError) {
      console.log(`[DEBUG ${debugId}] Failed to fetch created event:`, fetchError);
      throw fetchError;
    }

    const responseData = {
      success: true,
      data: {
        ...createdEvent,
        attendees: 0,
        is_virtual: Boolean(createdEvent.is_virtual)
      }
    };

    console.log(`[DEBUG ${debugId}] Sending success response:`, JSON.stringify(responseData, null, 2));
    console.log(`[DEBUG ${debugId}] ========== Calendar Event Creation Completed Successfully ==========`);
    
    res.status(201).json(responseData);
  } catch (error) {
    console.log(`[DEBUG ${debugId}] ========== Calendar Event Creation Failed ==========`);
    console.error(`[DEBUG ${debugId}] Error creating calendar event:`, error);
    console.error(`[DEBUG ${debugId}] Error stack:`, error.stack);
    console.error(`[DEBUG ${debugId}] Error name:`, error.name);
    console.error(`[DEBUG ${debugId}] Error message:`, error.message);
    
    if (error instanceof z.ZodError) {
      console.log(`[DEBUG ${debugId}] Zod validation error details:`, JSON.stringify(error.errors, null, 2));
      console.log(`[DEBUG ${debugId}] Sending validation error response`);
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        details: error.errors
      });
    }

    console.log(`[DEBUG ${debugId}] Sending generic error response`);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar event'
    });
  }
}

// Update calendar event
export async function updateCalendarEvent(req: Request, res: Response) {
  const debugId = `UPDATE_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DEBUG ${debugId}] ========== Calendar Event Update Started ==========`);
  console.log(`[DEBUG ${debugId}] Request Method: ${req.method}`);
  console.log(`[DEBUG ${debugId}] Request URL: ${req.url}`);
  console.log(`[DEBUG ${debugId}] Request Params:`, JSON.stringify(req.params, null, 2));
  console.log(`[DEBUG ${debugId}] Raw Request Body:`, JSON.stringify(req.body, null, 2));
  
  try {
    console.log(`[DEBUG ${debugId}] Getting database adapter...`);
    const db = getDatabaseAdapter();
    console.log(`[DEBUG ${debugId}] Database adapter obtained successfully`);
    
    console.log(`[DEBUG ${debugId}] Extracting user ID and event ID...`);
    const userId = (req as any).user?.id;
    const eventId = parseInt(req.params.id);
    console.log(`[DEBUG ${debugId}] User ID:`, userId);
    console.log(`[DEBUG ${debugId}] Event ID:`, eventId);

    if (!userId) {
      console.log(`[DEBUG ${debugId}] Authentication failed - no user ID found`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!eventId) {
      console.log(`[DEBUG ${debugId}] Invalid event ID provided`);
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking if event exists...`);
    // Check if event exists and user has permission
    let existingEvent;
    try {
      existingEvent = await db.getQuery(
        'SELECT * FROM calendar_events WHERE id = ?',
        [eventId]
      );
      console.log(`[DEBUG ${debugId}] Existing event query result:`, JSON.stringify(existingEvent, null, 2));
    } catch (fetchError) {
      console.log(`[DEBUG ${debugId}] Failed to fetch existing event:`, fetchError);
      throw fetchError;
    }

    if (!existingEvent) {
      console.log(`[DEBUG ${debugId}] Event not found with ID: ${eventId}`);
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking user permissions...`);
    console.log(`[DEBUG ${debugId}] Event creator ID: ${existingEvent.created_by}, Current user ID: ${userId}`);
    const role = (req as any).user?.role;
    if (existingEvent.created_by !== userId && role !== 'admin' && role !== 'super_admin') {
      console.log(`[DEBUG ${debugId}] Permission denied - user is not the creator`);
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    console.log(`[DEBUG ${debugId}] Starting schema validation for update...`);
    let eventData;
    try {
      eventData = updateEventSchema.parse(req.body);
      console.log(`[DEBUG ${debugId}] Update schema validation successful`);
      console.log(`[DEBUG ${debugId}] Parsed update data:`, JSON.stringify(eventData, null, 2));
    } catch (validationError) {
      console.log(`[DEBUG ${debugId}] Update schema validation failed:`, validationError);
      if (validationError instanceof z.ZodError) {
        console.log(`[DEBUG ${debugId}] Zod validation errors:`, JSON.stringify(validationError.errors, null, 2));
      }
      throw validationError;
    }

    console.log(`[DEBUG ${debugId}] Normalizing date/time fields for DB...`);
    try {
      if (eventData.date !== undefined) {
        const parsed = new Date(eventData.date as any);
        if (isNaN(parsed.getTime())) {
          throw new Error(`Invalid date provided: ${eventData.date}`);
        }
        const iso = parsed.toISOString();
        const dateForDb = iso.slice(0, 10);
        let timeForDb: string | undefined = undefined;
        if (eventData.time !== undefined) {
          const t = eventData.time as any;
          if (t === null) {
            timeForDb = null;
          } else if (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) {
            timeForDb = `${t}:00`;
          } else if (typeof t === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(t)) {
            timeForDb = t;
          }
        } else {
          timeForDb = iso.slice(11, 19);
        }
        (eventData as any).date = dateForDb;
        if (timeForDb !== undefined) {
          (eventData as any).time = timeForDb;
        }
        console.log(`[DEBUG ${debugId}] Normalized update date/time:`, { dateForDb: (eventData as any).date, timeForDb: (eventData as any).time });
      } else if (eventData.time !== undefined) {
        const t = eventData.time as any;
        if (t === null) {
          (eventData as any).time = null;
        } else if (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) {
          (eventData as any).time = `${t}:00`;
        }
      }
    } catch (normErr) {
      console.log(`[DEBUG ${debugId}] Failed to normalize update date/time:`, normErr);
      throw normErr;
    }

    console.log(`[DEBUG ${debugId}] Building dynamic update query...`);
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Build dynamic update query
    Object.entries(eventData).forEach(([key, value]) => {
      if (value !== undefined) {
        console.log(`[DEBUG ${debugId}] Processing field: ${key} = ${value} (type: ${typeof value})`);
        if (key === 'is_virtual') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    });

    console.log(`[DEBUG ${debugId}] Update fields:`, updateFields);
    console.log(`[DEBUG ${debugId}] Update values:`, JSON.stringify(updateValues, null, 2));

    if (updateFields.length === 0) {
      console.log(`[DEBUG ${debugId}] No valid fields to update`);
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const updateQuery = `
      UPDATE calendar_events 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    console.log(`[DEBUG ${debugId}] Update query:`, updateQuery);
    console.log(`[DEBUG ${debugId}] Final update values:`, JSON.stringify([...updateValues, eventId], null, 2));

    console.log(`[DEBUG ${debugId}] Executing update query...`);
    try {
      await db.executeQuery(updateQuery, [...updateValues, eventId]);
      console.log(`[DEBUG ${debugId}] Update query executed successfully`);
    } catch (updateError) {
      console.log(`[DEBUG ${debugId}] Update query failed:`, updateError);
      console.log(`[DEBUG ${debugId}] Update error details:`, {
        message: updateError.message,
        code: updateError.code,
        errno: updateError.errno,
        sqlState: updateError.sqlState,
        sqlMessage: updateError.sqlMessage
      });
      throw updateError;
    }

    console.log(`[DEBUG ${debugId}] Fetching updated event...`);
    // Fetch updated event
    let updatedEvent;
    try {
      updatedEvent = await db.getQuery(
        'SELECT * FROM calendar_events WHERE id = ?',
        [eventId]
      );
      console.log(`[DEBUG ${debugId}] Updated event:`, JSON.stringify(updatedEvent, null, 2));
    } catch (fetchError) {
      console.log(`[DEBUG ${debugId}] Failed to fetch updated event:`, fetchError);
      throw fetchError;
    }

    console.log(`[DEBUG ${debugId}] Getting registration count...`);
    // Get registration count
    let registrationResult;
    try {
      registrationResult = await db.getQuery(
        'SELECT COUNT(*) as registration_count FROM event_registrations WHERE event_id = ?',
        [eventId]
      );
      console.log(`[DEBUG ${debugId}] Registration count result:`, JSON.stringify(registrationResult, null, 2));
    } catch (regError) {
      console.log(`[DEBUG ${debugId}] Failed to get registration count:`, regError);
      throw regError;
    }

    const responseData = {
      success: true,
      data: {
        ...updatedEvent,
        attendees: registrationResult?.registration_count || 0,
        is_virtual: Boolean(updatedEvent.is_virtual)
      }
    };

    console.log(`[DEBUG ${debugId}] Sending success response:`, JSON.stringify(responseData, null, 2));
    console.log(`[DEBUG ${debugId}] ========== Calendar Event Update Completed Successfully ==========`);
    
    res.json(responseData);
  } catch (error) {
    console.log(`[DEBUG ${debugId}] ========== Calendar Event Update Failed ==========`);
    console.error(`[DEBUG ${debugId}] Error updating calendar event:`, error);
    console.error(`[DEBUG ${debugId}] Error stack:`, error.stack);
    console.error(`[DEBUG ${debugId}] Error name:`, error.name);
    console.error(`[DEBUG ${debugId}] Error message:`, error.message);
    
    if (error instanceof z.ZodError) {
      console.log(`[DEBUG ${debugId}] Zod validation error details:`, JSON.stringify(error.errors, null, 2));
      console.log(`[DEBUG ${debugId}] Sending validation error response`);
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        details: error.errors
      });
    }

    console.log(`[DEBUG ${debugId}] Sending generic error response`);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar event'
    });
  }
}

// Delete calendar event
export async function deleteCalendarEvent(req: Request, res: Response) {
  const debugId = `DELETE_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DEBUG ${debugId}] ========== Calendar Event Deletion Started ==========`);
  console.log(`[DEBUG ${debugId}] Request Method: ${req.method}`);
  console.log(`[DEBUG ${debugId}] Request URL: ${req.url}`);
  console.log(`[DEBUG ${debugId}] Request Params:`, JSON.stringify(req.params, null, 2));
  
  try {
    console.log(`[DEBUG ${debugId}] Getting database adapter...`);
    const db = getDatabaseAdapter();
    console.log(`[DEBUG ${debugId}] Database adapter obtained successfully`);
    
    console.log(`[DEBUG ${debugId}] Extracting user ID and event ID...`);
    const userId = (req as any).user?.id;
    const eventId = parseInt(req.params.id);
    console.log(`[DEBUG ${debugId}] User ID:`, userId);
    console.log(`[DEBUG ${debugId}] Event ID:`, eventId);

    if (!userId) {
      console.log(`[DEBUG ${debugId}] Authentication failed - no user ID found`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!eventId) {
      console.log(`[DEBUG ${debugId}] Invalid event ID provided`);
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking if event exists...`);
    // Check if event exists and user has permission
    let existingEvent;
    try {
      existingEvent = await db.getQuery(
        'SELECT * FROM calendar_events WHERE id = ?',
        [eventId]
      );
      console.log(`[DEBUG ${debugId}] Existing event query result:`, JSON.stringify(existingEvent, null, 2));
    } catch (fetchError) {
      console.log(`[DEBUG ${debugId}] Failed to fetch existing event:`, fetchError);
      throw fetchError;
    }

    if (!existingEvent) {
      console.log(`[DEBUG ${debugId}] Event not found with ID: ${eventId}`);
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking user permissions...`);
    console.log(`[DEBUG ${debugId}] Event creator ID: ${existingEvent.created_by}, Current user ID: ${userId}`);
    const role = (req as any).user?.role;
    if (existingEvent.created_by !== userId && role !== 'admin' && role !== 'super_admin') {
      console.log(`[DEBUG ${debugId}] Permission denied - user is not the creator`);
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    console.log(`[DEBUG ${debugId}] Executing delete query...`);
    try {
      await db.executeQuery('DELETE FROM calendar_events WHERE id = ?', [eventId]);
      console.log(`[DEBUG ${debugId}] Delete query executed successfully`);
    } catch (deleteError) {
      console.log(`[DEBUG ${debugId}] Delete query failed:`, deleteError);
      console.log(`[DEBUG ${debugId}] Delete error details:`, {
        message: deleteError.message,
        code: deleteError.code,
        errno: deleteError.errno,
        sqlState: deleteError.sqlState,
        sqlMessage: deleteError.sqlMessage
      });
      throw deleteError;
    }

    const responseData = {
      success: true,
      message: 'Event deleted successfully'
    };

    console.log(`[DEBUG ${debugId}] Sending success response:`, JSON.stringify(responseData, null, 2));
    console.log(`[DEBUG ${debugId}] ========== Calendar Event Deletion Completed Successfully ==========`);
    
    res.json(responseData);
  } catch (error) {
    console.log(`[DEBUG ${debugId}] ========== Calendar Event Deletion Failed ==========`);
    console.error(`[DEBUG ${debugId}] Error deleting calendar event:`, error);
    console.error(`[DEBUG ${debugId}] Error stack:`, error.stack);
    console.error(`[DEBUG ${debugId}] Error name:`, error.name);
    console.error(`[DEBUG ${debugId}] Error message:`, error.message);
    
    console.log(`[DEBUG ${debugId}] Sending error response`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete calendar event'
    });
  }
}

// Register for event
export async function registerForEvent(req: Request, res: Response) {
  const debugId = `REGISTER_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DEBUG ${debugId}] ========== Event Registration Started ==========`);
  console.log(`[DEBUG ${debugId}] Request Method: ${req.method}`);
  console.log(`[DEBUG ${debugId}] Request URL: ${req.url}`);
  console.log(`[DEBUG ${debugId}] Request Params:`, JSON.stringify(req.params, null, 2));
  
  try {
    console.log(`[DEBUG ${debugId}] Getting database adapter...`);
    const db = getDatabaseAdapter();
    console.log(`[DEBUG ${debugId}] Database adapter obtained successfully`);
    
    console.log(`[DEBUG ${debugId}] Extracting user ID and event ID...`);
    const userId = (req as any).user?.id;
    const eventId = parseInt(req.params.id);
    console.log(`[DEBUG ${debugId}] User ID:`, userId);
    console.log(`[DEBUG ${debugId}] Event ID:`, eventId);

    if (!userId) {
      console.log(`[DEBUG ${debugId}] Authentication failed - no user ID found`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!eventId) {
      console.log(`[DEBUG ${debugId}] Invalid event ID provided`);
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking if event exists...`);
    // Check if event exists
    let event;
    try {
      event = await db.getQuery(
        'SELECT * FROM calendar_events WHERE id = ?',
        [eventId]
      );
      console.log(`[DEBUG ${debugId}] Event query result:`, JSON.stringify(event, null, 2));
    } catch (fetchError) {
      console.log(`[DEBUG ${debugId}] Failed to fetch event:`, fetchError);
      throw fetchError;
    }

    if (!event) {
      console.log(`[DEBUG ${debugId}] Event not found with ID: ${eventId}`);
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking if user is already registered...`);
    // Check if already registered
    let existingRegistration;
    try {
      existingRegistration = await db.getQuery(
        'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );
      console.log(`[DEBUG ${debugId}] Existing registration query result:`, JSON.stringify(existingRegistration, null, 2));
    } catch (regCheckError) {
      console.log(`[DEBUG ${debugId}] Failed to check existing registration:`, regCheckError);
      throw regCheckError;
    }

    if (existingRegistration) {
      console.log(`[DEBUG ${debugId}] User already registered for this event`);
      return res.status(400).json({
        success: false,
        error: 'Already registered for this event'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking event capacity...`);
    console.log(`[DEBUG ${debugId}] Event max_attendees:`, event.max_attendees);
    // Check if event is full
    if (event.max_attendees) {
      let registrationCount;
      try {
        registrationCount = await db.getQuery(
          'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?',
          [eventId]
        );
        console.log(`[DEBUG ${debugId}] Registration count query result:`, JSON.stringify(registrationCount, null, 2));
      } catch (countError) {
        console.log(`[DEBUG ${debugId}] Failed to get registration count:`, countError);
        throw countError;
      }

      console.log(`[DEBUG ${debugId}] Current registrations: ${registrationCount.count}, Max attendees: ${event.max_attendees}`);
      if (registrationCount.count >= event.max_attendees) {
        console.log(`[DEBUG ${debugId}] Event is full`);
        return res.status(400).json({
          success: false,
          error: 'Event is full'
        });
      }
    }

    console.log(`[DEBUG ${debugId}] Registering user for event...`);
    // Register user for event
    try {
      await db.executeQuery(
        'INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)',
        [eventId, userId]
      );
      console.log(`[DEBUG ${debugId}] Registration insert query executed successfully`);
    } catch (insertError) {
      console.log(`[DEBUG ${debugId}] Registration insert query failed:`, insertError);
      console.log(`[DEBUG ${debugId}] Insert error details:`, {
        message: insertError.message,
        code: insertError.code,
        errno: insertError.errno,
        sqlState: insertError.sqlState,
        sqlMessage: insertError.sqlMessage
      });
      throw insertError;
    }

    const responseData = {
      success: true,
      message: 'Successfully registered for event'
    };

    console.log(`[DEBUG ${debugId}] Sending success response:`, JSON.stringify(responseData, null, 2));
    console.log(`[DEBUG ${debugId}] ========== Event Registration Completed Successfully ==========`);
    
    res.json(responseData);
  } catch (error) {
    console.log(`[DEBUG ${debugId}] ========== Event Registration Failed ==========`);
    console.error(`[DEBUG ${debugId}] Error registering for event:`, error);
    console.error(`[DEBUG ${debugId}] Error stack:`, error.stack);
    console.error(`[DEBUG ${debugId}] Error name:`, error.name);
    console.error(`[DEBUG ${debugId}] Error message:`, error.message);
    
    console.log(`[DEBUG ${debugId}] Sending error response`);
    res.status(500).json({
      success: false,
      error: 'Failed to register for event'
    });
  }
}

// Unregister from event
export async function unregisterFromEvent(req: Request, res: Response) {
  const debugId = `UNREGISTER_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DEBUG ${debugId}] ========== Event Unregistration Started ==========`);
  console.log(`[DEBUG ${debugId}] Request Method: ${req.method}`);
  console.log(`[DEBUG ${debugId}] Request URL: ${req.url}`);
  console.log(`[DEBUG ${debugId}] Request Params:`, JSON.stringify(req.params, null, 2));
  
  try {
    console.log(`[DEBUG ${debugId}] Getting database adapter...`);
    const db = getDatabaseAdapter();
    console.log(`[DEBUG ${debugId}] Database adapter obtained successfully`);
    
    console.log(`[DEBUG ${debugId}] Extracting user ID and event ID...`);
    const userId = (req as any).user?.id;
    const eventId = parseInt(req.params.id);
    console.log(`[DEBUG ${debugId}] User ID:`, userId);
    console.log(`[DEBUG ${debugId}] Event ID:`, eventId);

    if (!userId) {
      console.log(`[DEBUG ${debugId}] Authentication failed - no user ID found`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!eventId) {
      console.log(`[DEBUG ${debugId}] Invalid event ID provided`);
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    console.log(`[DEBUG ${debugId}] Checking if user is registered for this event...`);
    // Check if registered
    let existingRegistration;
    try {
      existingRegistration = await db.getQuery(
        'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );
      console.log(`[DEBUG ${debugId}] Registration check query result:`, JSON.stringify(existingRegistration, null, 2));
    } catch (regCheckError) {
      console.log(`[DEBUG ${debugId}] Failed to check registration:`, regCheckError);
      throw regCheckError;
    }

    if (!existingRegistration) {
      console.log(`[DEBUG ${debugId}] User is not registered for this event`);
      return res.status(400).json({
        success: false,
        error: 'Not registered for this event'
      });
    }

    console.log(`[DEBUG ${debugId}] Unregistering user from event...`);
    // Unregister user from event
    try {
      await db.executeQuery(
        'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );
      console.log(`[DEBUG ${debugId}] Unregistration delete query executed successfully`);
    } catch (deleteError) {
      console.log(`[DEBUG ${debugId}] Unregistration delete query failed:`, deleteError);
      console.log(`[DEBUG ${debugId}] Delete error details:`, {
        message: deleteError.message,
        code: deleteError.code,
        errno: deleteError.errno,
        sqlState: deleteError.sqlState,
        sqlMessage: deleteError.sqlMessage
      });
      throw deleteError;
    }

    const responseData = {
      success: true,
      message: 'Successfully unregistered from event'
    };

    console.log(`[DEBUG ${debugId}] Sending success response:`, JSON.stringify(responseData, null, 2));
    console.log(`[DEBUG ${debugId}] ========== Event Unregistration Completed Successfully ==========`);
    
    res.json(responseData);
  } catch (error) {
    console.log(`[DEBUG ${debugId}] ========== Event Unregistration Failed ==========`);
    console.error(`[DEBUG ${debugId}] Error unregistering from event:`, error);
    console.error(`[DEBUG ${debugId}] Error stack:`, error.stack);
    console.error(`[DEBUG ${debugId}] Error name:`, error.name);
    console.error(`[DEBUG ${debugId}] Error message:`, error.message);
    
    console.log(`[DEBUG ${debugId}] Sending error response`);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister from event'
    });
  }
}

// Get user's registered events
export async function getUserRegisteredEvents(req: Request, res: Response) {
  try {
    const db = getDatabaseAdapter();
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const eventsQuery = `
      SELECT e.*, er.registered_at, er.attended, er.attended_at
      FROM calendar_events e
      INNER JOIN event_registrations er ON e.id = er.event_id
      WHERE er.user_id = ?
      ORDER BY e.date ASC, e.time ASC
    `;
    
    const events = await db.allQuery(eventsQuery, [userId]);

    const eventsWithDetails = events.map(event => ({
      ...event,
      is_virtual: Boolean(event.is_virtual),
      is_registered: true
    }));

    res.json({
      success: true,
      data: eventsWithDetails
    });
  } catch (error) {
    console.error('Error fetching user registered events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registered events'
    });
  }
}

// Admin Dashboard Calendar Events - Get calendar events for admin dashboard
export async function getAdminCalendarEvents(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    
    // Get client report reminders (monthly reminders based on client creation date)
    const clientRemindersQuery = `
      SELECT 
        c.id as client_id,
        c.first_name,
        c.last_name,
        c.email,
        c.created_at,
        DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY) as next_report_date
      FROM clients c
      WHERE c.user_id = ?
        AND c.status = 'active'
        AND MONTH(DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY)) = ?
        AND YEAR(DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY)) = ?
      ORDER BY next_report_date ASC
    `;
    
    // Get scheduled meetings/classes from calendar_events table
    const meetingsQuery = `
      SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.date,
        ce.time,
        ce.duration,
        ce.type,
        ce.instructor,
        ce.location,
        ce.is_virtual,
        ce.is_physical,
        ce.meeting_link,
        ce.max_attendees,
        ce.visible_to_admins,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = ce.id) as attendees
      FROM calendar_events ce
      WHERE MONTH(ce.date) = ?
        AND YEAR(ce.date) = ?
        AND (ce.created_by = ? OR ce.type IN ('webinar', 'workshop', 'office_hours') OR ce.visible_to_admins = 1)
      ORDER BY ce.date ASC, ce.time ASC
    `;
    
    const [clientReminders, meetings] = await Promise.all([
      executeQuery(clientRemindersQuery, [adminId, targetMonth, targetYear]),
      executeQuery(meetingsQuery, [targetMonth, targetYear, adminId])
    ]);
    
    // Format client reminders as calendar events
    const reminderEvents = clientReminders.map((client: any) => ({
      id: `reminder-${client.client_id}`,
      type: 'client_reminder',
      title: `Pull Report: ${client.first_name} ${client.last_name}`,
      description: `Monthly credit report pull reminder for ${client.first_name} ${client.last_name} (${client.email})`,
      date: new Date(client.next_report_date).toISOString().split('T')[0],
      time: '09:00:00',
      duration: '30 minutes',
      client_id: client.client_id,
      client_name: `${client.first_name} ${client.last_name}`,
      client_email: client.email,
      created_date: client.created_at,
      priority: 'high',
      color: '#ff6b6b'
    }));
    
    // Format meeting events
    const meetingEvents = meetings.map((meeting: any) => ({
      id: `meeting-${meeting.id}`,
      type: 'meeting',
      title: meeting.title,
      description: meeting.description,
      date: new Date(meeting.date).toISOString().split('T')[0],
      time: meeting.time || null,
      duration: meeting.duration,
      meeting_type: meeting.type,
      instructor: meeting.instructor,
      location: meeting.location,
      is_virtual: meeting.is_virtual,
      meeting_link: meeting.meeting_link,
      max_attendees: meeting.max_attendees,
      current_attendees: meeting.attendees,
      priority: 'medium',
      color: '#4ecdc4'
    }));
    
    // Combine all events
    const allEvents = [...reminderEvents, ...meetingEvents];
    
    // Sort by date and time
    allEvents.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time || '23:59:59'}`);
      const dateB = new Date(`${b.date} ${b.time || '23:59:59'}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    res.json({
      success: true,
      data: {
        events: allEvents,
        month: targetMonth,
        year: targetYear,
        total_events: allEvents.length,
        client_reminders: reminderEvents.length,
        meetings: meetingEvents.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin calendar events:', error);
    securityLogger.logSecurityEvent('admin_calendar_fetch_error', {
      userId: (req as any).user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch calendar events' 
    });
  }
}

// Get upcoming events for admin dashboard (next 7 days)
export async function getUpcomingAdminEvents(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    
    // Get upcoming client reminders (next 7 days)
    const upcomingRemindersQuery = `
      SELECT 
        c.id as client_id,
        c.first_name,
        c.last_name,
        c.email,
        c.created_at,
        DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY) as next_report_date
      FROM clients c
      WHERE c.user_id = ?
        AND c.status = 'active'
        AND DATE_ADD(c.created_at, INTERVAL FLOOR(DATEDIFF(CURDATE(), c.created_at) / 30) * 30 + 30 DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY next_report_date ASC
    `;
    
    // Get upcoming meetings (next 7 days)
    const upcomingMeetingsQuery = `
      SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.date,
        ce.time,
        ce.duration,
        ce.type,
        ce.instructor,
        ce.location,
        ce.is_virtual,
        ce.meeting_link
      FROM calendar_events ce
      WHERE ce.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND (ce.created_by = ? OR ce.type IN ('webinar', 'workshop', 'office_hours') OR ce.visible_to_admins = 1)
      ORDER BY ce.date ASC, ce.time ASC
    `;
    
    const [upcomingReminders, upcomingMeetings] = await Promise.all([
      executeQuery(upcomingRemindersQuery, [adminId]),
      executeQuery(upcomingMeetingsQuery, [adminId])
    ]);
    
    // Format upcoming events
    const reminderEvents = upcomingReminders.map((client: any) => ({
      id: `reminder-${client.client_id}`,
      type: 'client_reminder',
      title: `Pull Report: ${client.first_name} ${client.last_name}`,
      description: `Monthly credit report pull reminder`,
      date: new Date(client.next_report_date).toISOString().split('T')[0],
      time: '09:00:00',
      client_name: `${client.first_name} ${client.last_name}`,
      client_email: client.email,
      priority: 'high',
      color: '#ff6b6b'
    }));
    
    const meetingEvents = upcomingMeetings.map((meeting: any) => ({
      id: `meeting-${meeting.id}`,
      type: 'meeting',
      title: meeting.title,
      description: meeting.description,
      date: new Date(meeting.date).toISOString().split('T')[0],
      time: meeting.time || null,
      duration: meeting.duration,
      meeting_type: meeting.type,
      instructor: meeting.instructor,
      location: meeting.location,
      is_virtual: meeting.is_virtual,
      meeting_link: meeting.meeting_link,
      priority: 'medium',
      color: '#4ecdc4'
    }));
    
    const allUpcoming = [...reminderEvents, ...meetingEvents];
    allUpcoming.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // First sort by date
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Then sort by time, treating null times as end of day
      const timeA = a.time ? new Date(`${a.date} ${a.time}`).getTime() : new Date(`${a.date} 23:59:59`).getTime();
      const timeB = b.time ? new Date(`${b.date} ${b.time}`).getTime() : new Date(`${b.date} 23:59:59`).getTime();
      
      return timeA - timeB;
    });
    
    res.json({
      success: true,
      data: {
        upcoming_events: allUpcoming,
        total_upcoming: allUpcoming.length,
        client_reminders: reminderEvents.length,
        meetings: meetingEvents.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching upcoming admin events:', error);
    securityLogger.logSecurityEvent('admin_calendar_upcoming_error', {
      userId: (req as any).user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch upcoming events' 
    });
  }
}

// Mark a client reminder as completed
export async function markReminderCompleted(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const { client_id, reminder_date } = req.body;
    
    if (!client_id || !reminder_date) {
      return res.status(400).json({ 
        success: false,
        error: 'Client ID and reminder date are required' 
      });
    }
    
    // Verify the client belongs to this admin
    const clientQuery = `
      SELECT id, first_name, last_name, email 
      FROM clients 
      WHERE id = ? AND user_id = ?
    `;
    
    const client = await executeQuery(clientQuery, [client_id, adminId]);
    
    if (!client || client.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Client not found' 
      });
    }
    
    // Log the completion in activities table
    const activityQuery = `
      INSERT INTO activities (user_id, client_id, type, description, created_at)
      VALUES (?, ?, 'report_pulled', ?, NOW())
    `;
    
    const clientData = client[0];
    const description = `Credit report pulled for ${clientData.first_name} ${clientData.last_name} on ${reminder_date}`;
    
    await executeQuery(activityQuery, [adminId, client_id, description]);
    
    securityLogger.logSecurityEvent('client_reminder_completed', {
      userId: adminId,
      clientId: client_id,
      reminderDate: reminder_date,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Reminder marked as completed',
      data: {
        client_id,
        client_name: `${clientData.first_name} ${clientData.last_name}`,
        completed_date: reminder_date
      }
    });
    
  } catch (error) {
    console.error('Error marking reminder as completed:', error);
    securityLogger.logSecurityEvent('admin_calendar_completion_error', {
      userId: (req as any).user?.id,
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark reminder as completed' 
    });
  }
}
