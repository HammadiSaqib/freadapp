import { Router, type NextFunction, type Response } from "express";
import { z } from "zod";
import { getDatabaseAdapter } from "../database/databaseAdapter.js";
import { authenticateToken, type AuthRequest } from "../middleware/authMiddleware.js";

const superAdminRouter = Router();
const supportRouter = Router();
const MAX_DAILY_ATTENDANCE_SESSIONS = 2;
const DAILY_CLOCK_IN_LIMIT_MESSAGE = "You have already clocked out twice for the day. If you have any issue, please contact your manager.";

const announcementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().default(""),
  label: z.string().trim().max(100).optional().default(""),
});

const taskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().default(""),
  priority: z.enum(["Done", "High", "Required", "Medium"]),
  today_only: z.boolean().optional().default(false),
});

const assignmentSchema = z.object({
  announcement_id: z.coerce.number().int().positive().optional(),
  title: z.string().trim().max(255).optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  label: z.string().trim().max(100).optional().default(""),
});

const workingHoursSchema = z.object({
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  off_days: z.array(z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])).max(7),
  break_hours: z.coerce.number().min(0).max(24),
});

const workScheduleSchema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  activity: z.string().trim().min(1).max(5000),
  assigned_task_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["Completed", "In Progress", "Pending"]),
});

const timezonePreferenceSchema = z.object({
  timezone: z.enum(["America/New_York", "Asia/Karachi"]),
});

let schemaPromise: Promise<void> | null = null;

function ensureEmployeeProgressSchema() {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const db = getDatabaseAdapter();
    const mysql = db.getType() === "mysql";

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_announcements (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        label VARCHAR(100) NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NULL,
        label TEXT NULL,
        created_by INTEGER NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_tasks (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        priority VARCHAR(20) NOT NULL,
        today_only BOOLEAN NOT NULL DEFAULT FALSE,
        task_date DATE NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee_progress_tasks_user (user_id)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NULL,
        priority TEXT NOT NULL,
        today_only INTEGER NOT NULL DEFAULT 0,
        task_date DATE NULL,
        created_by INTEGER NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_announcement_assignments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        announcement_id INT NULL,
        custom_title VARCHAR(255) NULL,
        custom_description TEXT NULL,
        custom_label VARCHAR(100) NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee_progress_announcements_user (user_id)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_announcement_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        announcement_id INTEGER NULL,
        custom_title TEXT NULL,
        custom_description TEXT NULL,
        custom_label TEXT NULL,
        created_by INTEGER NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_working_hours (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        off_days TEXT NOT NULL,
        break_hours DECIMAL(18,12) NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_working_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        off_days TEXT NOT NULL,
        break_hours REAL NOT NULL DEFAULT 0,
        created_by INTEGER NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (mysql) {
      await db.executeQuery(`
        ALTER TABLE employee_progress_working_hours
        MODIFY COLUMN break_hours DECIMAL(18,12) NOT NULL DEFAULT 0
      `);
    }

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_work_schedule (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        work_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        activity TEXT NOT NULL,
        assigned_task_id INT NULL,
        assigned_task_title VARCHAR(255) NULL,
        assigned_task_priority VARCHAR(20) NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee_work_schedule_user_date (user_id, work_date)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_work_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        work_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        activity TEXT NOT NULL,
        assigned_task_id INTEGER NULL,
        assigned_task_title TEXT NULL,
        assigned_task_priority TEXT NULL,
        status TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_attendance_sessions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        work_date DATE NOT NULL,
        clock_in_at VARCHAR(35) NOT NULL,
        clock_out_at VARCHAR(35) NULL,
        break_started_at VARCHAR(35) NULL,
        total_break_seconds INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee_attendance_user_date (user_id, work_date),
        INDEX idx_employee_attendance_open (user_id, clock_out_at)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_attendance_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        work_date TEXT NOT NULL,
        clock_in_at TEXT NOT NULL,
        clock_out_at TEXT NULL,
        break_started_at TEXT NULL,
        total_break_seconds INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_attendance_events (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        user_id INT NOT NULL,
        event_type VARCHAR(20) NOT NULL,
        event_at VARCHAR(35) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_employee_attendance_events_session (session_id),
        INDEX idx_employee_attendance_events_user (user_id)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_attendance_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_at TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeQuery(mysql ? `
      CREATE TABLE IF NOT EXISTS employee_progress_preferences (
        user_id INT NOT NULL PRIMARY KEY,
        timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS employee_progress_preferences (
        user_id INTEGER NOT NULL PRIMARY KEY,
        timezone TEXT NOT NULL DEFAULT 'America/New_York',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}

function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Super admin access required" });
  }
  next();
}

function requireSupport(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "support") {
    return res.status(403).json({ success: false, error: "Support access required" });
  }
  next();
}

async function requireSupportEmployee(userId: number) {
  const user = await getDatabaseAdapter().getQuery(
    "SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND role = 'support'",
    [userId],
  );
  return user || null;
}

function assignedAnnouncementQuery() {
  return `
    SELECT aa.id, aa.user_id, aa.announcement_id,
           COALESCE(a.title, aa.custom_title) AS title,
           COALESCE(a.description, aa.custom_description, '') AS description,
           COALESCE(a.label, aa.custom_label, '') AS label,
           CASE WHEN aa.announcement_id IS NULL THEN 1 ELSE 0 END AS is_custom,
           aa.created_at, aa.updated_at
    FROM employee_progress_announcement_assignments aa
    LEFT JOIN employee_progress_announcements a ON a.id = aa.announcement_id
    WHERE aa.user_id = ?
    ORDER BY aa.created_at DESC
  `;
}

function normalizeWorkingHours(row: any) {
  if (!row) return null;
  let offDays: string[] = [];
  try {
    offDays = Array.isArray(row.off_days) ? row.off_days : JSON.parse(row.off_days || "[]");
  } catch {
    offDays = [];
  }
  return {
    ...row,
    start_time: String(row.start_time || "").slice(0, 5),
    end_time: String(row.end_time || "").slice(0, 5),
    off_days: offDays,
    break_hours: Number(row.break_hours || 0),
  };
}

function currentEasternDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function workScheduleSelect(whereClause: string) {
  return `
    SELECT ws.id, CAST(ws.work_date AS CHAR) AS workDate, ws.start_time AS startTime, ws.end_time AS endTime,
           ws.activity, ws.assigned_task_id AS assignedTaskId,
           COALESCE(t.title, ws.assigned_task_title) AS assignedTaskTitle,
           ws.assigned_task_priority AS assignedTaskPriority,
           ws.status, ws.created_at AS createdAt, ws.updated_at AS updatedAt
    FROM employee_progress_work_schedule ws
    LEFT JOIN employee_progress_tasks t ON t.id = ws.assigned_task_id AND t.user_id = ws.user_id
    ${whereClause}
  `;
}

function normalizeWorkSchedule(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    workDate: String(row.workDate || "").slice(0, 10),
    startTime: String(row.startTime || "").slice(0, 5),
    endTime: String(row.endTime || "").slice(0, 5),
    assignedTaskId: row.assignedTaskId == null ? null : Number(row.assignedTaskId),
  };
}

function normalizeWorkSchedules(rows: any[]) {
  return rows.map(normalizeWorkSchedule);
}

function attendanceSessionSelect(whereClause: string) {
  return `
    SELECT id, user_id AS userId, CAST(work_date AS CHAR) AS workDate,
           clock_in_at AS clockInAt, clock_out_at AS clockOutAt,
           break_started_at AS breakStartedAt, total_break_seconds AS totalBreakSeconds,
           status, created_at AS createdAt, updated_at AS updatedAt
    FROM employee_progress_attendance_sessions
    ${whereClause}
  `;
}

function attendanceEventSelect(whereClause: string) {
  return `
    SELECT id, session_id AS sessionId, user_id AS userId,
           event_type AS eventType, event_at AS eventAt, created_at AS createdAt
    FROM employee_progress_attendance_events
    ${whereClause}
  `;
}

function normalizeAttendanceSession(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    userId: Number(row.userId),
    workDate: String(row.workDate || "").slice(0, 10),
    totalBreakSeconds: Number(row.totalBreakSeconds || 0),
  };
}

function normalizeAttendanceEvent(row: any) {
  return {
    ...row,
    id: Number(row.id),
    sessionId: Number(row.sessionId),
    userId: Number(row.userId),
  };
}

async function getAttendanceState(userId: number) {
  const db = getDatabaseAdapter();
  const workDate = currentEasternDate();
  const active = await db.getQuery(
    `${attendanceSessionSelect("WHERE user_id = ? AND clock_out_at IS NULL")} ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  const session = active || await db.getQuery(
    `${attendanceSessionSelect("WHERE user_id = ? AND work_date = ?")} ORDER BY id DESC LIMIT 1`,
    [userId, workDate],
  );
  const completedToday = await db.getQuery(
    "SELECT COUNT(*) AS completedCount FROM employee_progress_attendance_sessions WHERE user_id = ? AND work_date = ? AND clock_out_at IS NOT NULL",
    [userId, workDate],
  );
  const completedSessionsToday = Number(completedToday?.completedCount || 0);
  const events = session
    ? await db.allQuery(`${attendanceEventSelect("WHERE session_id = ? AND user_id = ?")} ORDER BY event_at ASC, id ASC`, [session.id, userId])
    : [];
  return {
    session: normalizeAttendanceSession(session),
    events: events.map(normalizeAttendanceEvent),
    completedSessionsToday,
    dailySessionLimit: MAX_DAILY_ATTENDANCE_SESSIONS,
    clockInLimitReached: completedSessionsToday >= MAX_DAILY_ATTENDANCE_SESSIONS,
  };
}

async function getAttendanceHistory(userId: number) {
  const db = getDatabaseAdapter();
  const sessions = await db.allQuery(
    `${attendanceSessionSelect("WHERE user_id = ?")} ORDER BY work_date DESC, clock_in_at DESC LIMIT 500`,
    [userId],
  );
  if (sessions.length === 0) return [];
  const events = await db.allQuery(
    `${attendanceEventSelect("WHERE user_id = ?")} ORDER BY event_at ASC, id ASC`,
    [userId],
  );
  const eventsBySession = new Map<number, any[]>();
  for (const rawEvent of events) {
    const event = normalizeAttendanceEvent(rawEvent);
    const list = eventsBySession.get(event.sessionId) || [];
    list.push(event);
    eventsBySession.set(event.sessionId, list);
  }
  return sessions.map((row: any) => {
    const session = normalizeAttendanceSession(row);
    return { ...session, events: eventsBySession.get(session.id) || [] };
  });
}

function secondsBetween(start: string, end: string) {
  const elapsed = Date.parse(end) - Date.parse(start);
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 1000)) : 0;
}

function easternWeekBounds() {
  const [year, month, day] = currentEasternDate().split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (current.getUTCDay() + 6) % 7;
  const start = new Date(current);
  start.setUTCDate(current.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return { weekStart: format(start), weekEnd: format(end) };
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const easternWallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayForDateKey(dateKey: string) {
  return WEEKDAY_NAMES[new Date(`${dateKey}T00:00:00Z`).getUTCDay()];
}

function easternWallClockMs(value: string | Date) {
  const parts = easternWallClockFormatter.formatToParts(value instanceof Date ? value : new Date(value));
  const numberPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  return Date.UTC(
    numberPart("year"),
    numberPart("month") - 1,
    numberPart("day"),
    numberPart("hour"),
    numberPart("minute"),
    numberPart("second"),
  );
}

function scheduledShiftBounds(dateKey: string, startTime: string, endTime: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startMs = Date.UTC(year, month - 1, day, startHour, startMinute);
  let endMs = Date.UTC(year, month - 1, day, endHour, endMinute);
  if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;
  return { startMs, endMs, scheduledSeconds: Math.max(0, Math.floor((endMs - startMs) / 1000)) };
}

function attendanceBreakSeconds(session: any, nowIso: string) {
  const saved = Number(session.totalBreakSeconds || session.total_break_seconds || 0);
  const activeStart = session.breakStartedAt || session.break_started_at;
  const clockOut = session.clockOutAt || session.clock_out_at;
  return saved + (activeStart && !clockOut ? secondsBetween(String(activeStart), nowIso) : 0);
}

async function getEmployeeProgressOverview() {
  const db = getDatabaseAdapter();
  const { weekStart, weekEnd } = easternWeekBounds();
  const now = new Date();
  const nowIso = now.toISOString();
  const nowWallClockMs = easternWallClockMs(now);
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStart, index));

  const [employees, hoursRows, attendanceRows, taskRows] = await Promise.all([
    db.allQuery("SELECT id, first_name, last_name, email FROM users WHERE role = 'support' ORDER BY first_name ASC, last_name ASC"),
    db.allQuery("SELECT * FROM employee_progress_working_hours"),
    db.allQuery(
      `SELECT id, user_id AS userId, CAST(work_date AS CHAR) AS workDate,
              clock_in_at AS clockInAt, clock_out_at AS clockOutAt,
              break_started_at AS breakStartedAt, total_break_seconds AS totalBreakSeconds, status
       FROM employee_progress_attendance_sessions
       WHERE work_date >= ? AND work_date <= ?`,
      [weekStart, weekEnd],
    ),
    db.allQuery(
      `SELECT user_id AS userId, priority, today_only AS todayOnly, CAST(task_date AS CHAR) AS taskDate
       FROM employee_progress_tasks
       WHERE today_only = 0 OR (task_date >= ? AND task_date <= ?)`,
      [weekStart, weekEnd],
    ),
  ]);

  const employeeMap = new Map<number, any>(employees.map((employee: any) => [Number(employee.id), employee]));
  const hoursByUser = new Map<number, any>();
  for (const row of hoursRows) {
    const userId = Number(row.user_id);
    if (employeeMap.has(userId)) hoursByUser.set(userId, normalizeWorkingHours(row));
  }

  const attendanceByUserDate = new Map<string, any[]>();
  for (const rawSession of attendanceRows) {
    const userId = Number(rawSession.userId);
    if (!employeeMap.has(userId)) continue;
    const workDate = String(rawSession.workDate || "").slice(0, 10);
    const key = `${userId}:${workDate}`;
    const sessions = attendanceByUserDate.get(key) || [];
    sessions.push({ ...rawSession, userId, workDate });
    attendanceByUserDate.set(key, sessions);
  }

  const daily = dates.map((date) => ({
    date,
    day: weekdayForDateKey(date).slice(0, 3),
    workedSeconds: 0,
    scheduledSeconds: 0,
    breakSeconds: 0,
    attendance: 0,
    nonAttendance: 0,
    accuracyTotal: 0,
    accuracyCount: 0,
  }));
  const dailyByDate = new Map(daily.map((entry) => [entry.date, entry]));
  const timeScoresByUser = new Map<number, { total: number; days: number; perfectDays: number }>();
  let totalWorkingSeconds = 0;
  let totalBreakSeconds = 0;
  let attendanceDays = 0;
  let nonAttendanceDays = 0;

  for (const session of attendanceRows) {
    if (!employeeMap.has(Number(session.userId))) continue;
    const workDate = String(session.workDate || "").slice(0, 10);
    const dailyEntry = dailyByDate.get(workDate);
    if (!dailyEntry) continue;
    const clockOut = session.clockOutAt || nowIso;
    const duration = secondsBetween(String(session.clockInAt), String(clockOut));
    const breakSeconds = Math.min(duration, attendanceBreakSeconds(session, nowIso));
    const workingSeconds = Math.max(0, duration - breakSeconds);
    dailyEntry.workedSeconds += workingSeconds;
    dailyEntry.breakSeconds += breakSeconds;
    totalWorkingSeconds += workingSeconds;
    totalBreakSeconds += breakSeconds;
  }

  for (const employee of employees) {
    const userId = Number(employee.id);
    const schedule = hoursByUser.get(userId);
    if (!schedule?.start_time || !schedule?.end_time) continue;
    const offDays = new Set<string>(schedule.off_days || []);

    for (const date of dates) {
      const dailyEntry = dailyByDate.get(date)!;
      if (offDays.has(weekdayForDateKey(date))) continue;
      const bounds = scheduledShiftBounds(date, schedule.start_time, schedule.end_time);
      dailyEntry.scheduledSeconds += bounds.scheduledSeconds;
      const sessions = attendanceByUserDate.get(`${userId}:${date}`) || [];

      if (bounds.startMs <= nowWallClockMs) {
        if (sessions.length > 0) {
          dailyEntry.attendance += 1;
          attendanceDays += 1;
        } else {
          dailyEntry.nonAttendance += 1;
          nonAttendanceDays += 1;
        }
      }

      if (bounds.endMs > nowWallClockMs) continue;
      let accuracy = 0;
      if (sessions.length > 0) {
        const coveredIntervals = sessions
          .map((session) => ({
            start: Math.max(bounds.startMs, easternWallClockMs(String(session.clockInAt))),
            end: Math.min(bounds.endMs, easternWallClockMs(String(session.clockOutAt || nowIso))),
          }))
          .filter((interval) => interval.end > interval.start)
          .sort((a, b) => a.start - b.start);
        let coveredMs = 0;
        let currentStart = 0;
        let currentEnd = 0;
        for (const interval of coveredIntervals) {
          if (!currentEnd || interval.start > currentEnd) {
            coveredMs += currentEnd ? currentEnd - currentStart : 0;
            currentStart = interval.start;
            currentEnd = interval.end;
          } else {
            currentEnd = Math.max(currentEnd, interval.end);
          }
        }
        coveredMs += currentEnd ? currentEnd - currentStart : 0;
        accuracy = Math.max(0, Math.min(100, (coveredMs / (bounds.scheduledSeconds * 1000)) * 100));
      }
      dailyEntry.accuracyTotal += accuracy;
      dailyEntry.accuracyCount += 1;
      const employeeScores = timeScoresByUser.get(userId) || { total: 0, days: 0, perfectDays: 0 };
      employeeScores.total += accuracy;
      employeeScores.days += 1;
      if (accuracy >= 99.995) employeeScores.perfectDays += 1;
      timeScoresByUser.set(userId, employeeScores);
    }
  }

  const workScoresByUser = new Map<number, { completed: number; total: number }>();
  for (const row of taskRows) {
    const userId = Number(row.userId);
    if (!employeeMap.has(userId)) continue;
    const score = workScoresByUser.get(userId) || { completed: 0, total: 0 };
    score.total += 1;
    if (row.priority === "Done") score.completed += 1;
    workScoresByUser.set(userId, score);
  }

  const employeeIdentity = (userId: number) => {
    const employee = employeeMap.get(userId);
    return {
      userId,
      name: `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() || employee?.email || `Employee ${userId}`,
      email: employee?.email || "",
    };
  };

  const topTimeRespecters = [...timeScoresByUser.entries()]
    .map(([userId, score]) => ({
      ...employeeIdentity(userId),
      accuracy: score.days ? Number((score.total / score.days).toFixed(1)) : 0,
      measuredDays: score.days,
      perfectDays: score.perfectDays,
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.perfectDays - a.perfectDays || b.measuredDays - a.measuredDays)
    .slice(0, 5);

  const topWorkRespecters = [...workScoresByUser.entries()]
    .filter(([, score]) => score.total > 0)
    .map(([userId, score]) => ({
      ...employeeIdentity(userId),
      completionRate: Number(((score.completed / score.total) * 100).toFixed(1)),
      completedPriorities: score.completed,
      totalPriorities: score.total,
    }))
    .sort((a, b) => b.completionRate - a.completionRate || b.completedPriorities - a.completedPriorities || a.totalPriorities - b.totalPriorities)
    .slice(0, 5);

  const totalAssignedPriorities = taskRows.filter((row: any) => employeeMap.has(Number(row.userId))).length;
  const completedAssignedPriorities = taskRows.filter((row: any) => employeeMap.has(Number(row.userId)) && row.priority === "Done").length;
  const measuredAccuracy = [...timeScoresByUser.values()].reduce((summary, score) => ({ total: summary.total + score.total, days: summary.days + score.days }), { total: 0, days: 0 });

  return {
    weekStart,
    weekEnd,
    generatedAt: nowIso,
    totals: {
      employees: employees.length,
      workingSeconds: totalWorkingSeconds,
      breakSeconds: totalBreakSeconds,
      attendanceDays,
      nonAttendanceDays,
      attendanceRate: attendanceDays + nonAttendanceDays ? Number(((attendanceDays / (attendanceDays + nonAttendanceDays)) * 100).toFixed(1)) : 0,
      timeAccuracy: measuredAccuracy.days ? Number((measuredAccuracy.total / measuredAccuracy.days).toFixed(1)) : 0,
      completedAssignedPriorities,
      totalAssignedPriorities,
      workCompletionRate: totalAssignedPriorities ? Number(((completedAssignedPriorities / totalAssignedPriorities) * 100).toFixed(1)) : 0,
    },
    daily: daily.map((entry) => ({
      date: entry.date,
      day: entry.day,
      workedHours: Number((entry.workedSeconds / 3600).toFixed(2)),
      scheduledHours: Number((entry.scheduledSeconds / 3600).toFixed(2)),
      breakHours: Number((entry.breakSeconds / 3600).toFixed(2)),
      attendance: entry.attendance,
      nonAttendance: entry.nonAttendance,
      timeAccuracy: entry.accuracyCount ? Number((entry.accuracyTotal / entry.accuracyCount).toFixed(1)) : 0,
    })),
    topTimeRespecters,
    topWorkRespecters,
  };
}

function scheduledSecondsForWeek(workingHours: any) {
  const schedule = normalizeWorkingHours(workingHours);
  if (!schedule?.start_time || !schedule?.end_time) return 0;
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return (hours * 60) + minutes;
  };
  const startMinutes = toMinutes(schedule.start_time);
  let endMinutes = toMinutes(schedule.end_time);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const workingDays = Math.max(0, 7 - schedule.off_days.length);
  return Math.max(0, endMinutes - startMinutes) * 60 * workingDays;
}

async function getWeeklyHoursSummary(userId: number, workingHours: any) {
  const db = getDatabaseAdapter();
  const { weekStart, weekEnd } = easternWeekBounds();
  const sessions = await db.allQuery(
    "SELECT clock_in_at, clock_out_at FROM employee_progress_attendance_sessions WHERE user_id = ? AND work_date >= ? AND work_date <= ?",
    [userId, weekStart, weekEnd],
  );
  const now = new Date().toISOString();
  const workedSeconds = sessions.reduce((total: number, session: any) => (
    total + secondsBetween(String(session.clock_in_at), String(session.clock_out_at || now))
  ), 0);
  return {
    weekStart,
    weekEnd,
    scheduledSeconds: scheduledSecondsForWeek(workingHours),
    workedSeconds,
  };
}

async function syncAssignedTaskCompletion(userId: number, taskId: number | null | undefined, fallbackPriority?: string | null) {
  if (!taskId) return;
  const db = getDatabaseAdapter();
  const completed = await db.getQuery(
    "SELECT id FROM employee_progress_work_schedule WHERE user_id = ? AND assigned_task_id = ? AND status = 'Completed' LIMIT 1",
    [userId, taskId],
  );
  if (completed) {
    await db.executeQuery("UPDATE employee_progress_tasks SET priority = 'Done', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [taskId, userId]);
    return;
  }
  const latest = await db.getQuery(
    "SELECT assigned_task_priority FROM employee_progress_work_schedule WHERE user_id = ? AND assigned_task_id = ? AND assigned_task_priority IS NOT NULL AND assigned_task_priority <> 'Done' ORDER BY updated_at DESC LIMIT 1",
    [userId, taskId],
  );
  const restorePriority = latest?.assigned_task_priority || fallbackPriority;
  if (restorePriority && restorePriority !== "Done") {
    await db.executeQuery("UPDATE employee_progress_tasks SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [restorePriority, taskId, userId]);
  }
}

superAdminRouter.use(authenticateToken, requireSuperAdmin);
supportRouter.use(authenticateToken, requireSupport);

superAdminRouter.get("/overview", async (_req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    res.json({ success: true, data: await getEmployeeProgressOverview() });
  } catch (error) {
    console.error("Failed to load employee progress overview:", error);
    res.status(500).json({ success: false, error: "Failed to load employee progress overview" });
  }
});

superAdminRouter.get("/announcements", async (_req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const data = await getDatabaseAdapter().allQuery(
      "SELECT * FROM employee_progress_announcements ORDER BY created_at DESC",
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error("Failed to list employee announcements:", error);
    res.status(500).json({ success: false, error: "Failed to load announcements" });
  }
});

superAdminRouter.post("/announcements", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const input = announcementSchema.parse(req.body);
    const result = await getDatabaseAdapter().executeQuery(
      "INSERT INTO employee_progress_announcements (title, description, label, created_by) VALUES (?, ?, ?, ?)",
      [input.title, input.description || null, input.label || null, req.user?.id || null],
    );
    const id = Number(result?.insertId ?? result?.lastID ?? 0);
    const data = await getDatabaseAdapter().getQuery("SELECT * FROM employee_progress_announcements WHERE id = ?", [id]);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    console.error("Failed to create employee announcement:", error);
    res.status(500).json({ success: false, error: "Failed to create announcement" });
  }
});

superAdminRouter.put("/announcements/:id", async (req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const input = announcementSchema.parse(req.body);
    await getDatabaseAdapter().executeQuery(
      "UPDATE employee_progress_announcements SET title = ?, description = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [input.title, input.description || null, input.label || null, Number(req.params.id)],
    );
    const data = await getDatabaseAdapter().getQuery("SELECT * FROM employee_progress_announcements WHERE id = ?", [Number(req.params.id)]);
    if (!data) return res.status(404).json({ success: false, error: "Announcement not found" });
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    res.status(500).json({ success: false, error: "Failed to update announcement" });
  }
});

superAdminRouter.delete("/announcements/:id", async (req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const id = Number(req.params.id);
    await getDatabaseAdapter().executeQuery("DELETE FROM employee_progress_announcement_assignments WHERE announcement_id = ?", [id]);
    await getDatabaseAdapter().executeQuery("DELETE FROM employee_progress_announcements WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete announcement" });
  }
});

superAdminRouter.get("/employees/:userId", async (req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.params.userId);
    const employee = await requireSupportEmployee(userId);
    if (!employee) return res.status(404).json({ success: false, error: "Support employee not found" });
    const db = getDatabaseAdapter();
    const [tasks, announcements, workingHours, workHistory, attendanceHistory] = await Promise.all([
      db.allQuery("SELECT * FROM employee_progress_tasks WHERE user_id = ? ORDER BY created_at DESC", [userId]),
      db.allQuery(assignedAnnouncementQuery(), [userId]),
      db.getQuery("SELECT * FROM employee_progress_working_hours WHERE user_id = ?", [userId]),
      db.allQuery(`${workScheduleSelect("WHERE ws.user_id = ?")} ORDER BY ws.work_date DESC, ws.start_time DESC LIMIT 500`, [userId]),
      getAttendanceHistory(userId),
    ]);
    res.json({ success: true, data: { employee, tasks, announcements, working_hours: normalizeWorkingHours(workingHours), work_history: normalizeWorkSchedules(workHistory), attendance_history: attendanceHistory } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load employee progress" });
  }
});

superAdminRouter.post("/employees/:userId/tasks", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.params.userId);
    if (!(await requireSupportEmployee(userId))) return res.status(404).json({ success: false, error: "Support employee not found" });
    const input = taskSchema.parse(req.body);
    const result = await getDatabaseAdapter().executeQuery(
      "INSERT INTO employee_progress_tasks (user_id, title, description, priority, today_only, task_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, input.title, input.description || null, input.priority, input.today_only ? 1 : 0, input.today_only ? new Date().toISOString().slice(0, 10) : null, req.user?.id || null],
    );
    const id = Number(result?.insertId ?? result?.lastID ?? 0);
    const data = await getDatabaseAdapter().getQuery("SELECT * FROM employee_progress_tasks WHERE id = ?", [id]);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    res.status(500).json({ success: false, error: "Failed to create task" });
  }
});

superAdminRouter.put("/employees/:userId/tasks/:taskId", async (req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const input = taskSchema.parse(req.body);
    await getDatabaseAdapter().executeQuery(
      "UPDATE employee_progress_tasks SET title = ?, description = ?, priority = ?, today_only = ?, task_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [input.title, input.description || null, input.priority, input.today_only ? 1 : 0, input.today_only ? new Date().toISOString().slice(0, 10) : null, Number(req.params.taskId), Number(req.params.userId)],
    );
    const data = await getDatabaseAdapter().getQuery("SELECT * FROM employee_progress_tasks WHERE id = ? AND user_id = ?", [Number(req.params.taskId), Number(req.params.userId)]);
    if (!data) return res.status(404).json({ success: false, error: "Task not found" });
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    res.status(500).json({ success: false, error: "Failed to update task" });
  }
});

superAdminRouter.delete("/employees/:userId/tasks/:taskId", async (req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    await getDatabaseAdapter().executeQuery("DELETE FROM employee_progress_tasks WHERE id = ? AND user_id = ?", [Number(req.params.taskId), Number(req.params.userId)]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete task" });
  }
});

superAdminRouter.post("/employees/:userId/announcements", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.params.userId);
    if (!(await requireSupportEmployee(userId))) return res.status(404).json({ success: false, error: "Support employee not found" });
    const input = assignmentSchema.parse(req.body);
    if (!input.announcement_id && !input.title) return res.status(400).json({ success: false, error: "Choose an announcement or enter a custom title" });

    if (input.announcement_id) {
      const source = await getDatabaseAdapter().getQuery("SELECT id FROM employee_progress_announcements WHERE id = ?", [input.announcement_id]);
      if (!source) return res.status(404).json({ success: false, error: "Announcement not found" });
      const existing = await getDatabaseAdapter().getQuery(
        "SELECT id FROM employee_progress_announcement_assignments WHERE user_id = ? AND announcement_id = ?",
        [userId, input.announcement_id],
      );
      if (existing) return res.status(409).json({ success: false, error: "This announcement is already assigned" });
    }

    const result = await getDatabaseAdapter().executeQuery(
      "INSERT INTO employee_progress_announcement_assignments (user_id, announcement_id, custom_title, custom_description, custom_label, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, input.announcement_id || null, input.announcement_id ? null : input.title, input.announcement_id ? null : input.description || null, input.announcement_id ? null : input.label || null, req.user?.id || null],
    );
    const id = Number(result?.insertId ?? result?.lastID ?? 0);
    const data = await getDatabaseAdapter().getQuery(`SELECT * FROM employee_progress_announcement_assignments WHERE id = ?`, [id]);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    res.status(500).json({ success: false, error: "Failed to assign announcement" });
  }
});

superAdminRouter.delete("/employees/:userId/announcements/:assignmentId", async (req, res) => {
  try {
    await ensureEmployeeProgressSchema();
    await getDatabaseAdapter().executeQuery(
      "DELETE FROM employee_progress_announcement_assignments WHERE id = ? AND user_id = ?",
      [Number(req.params.assignmentId), Number(req.params.userId)],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to remove announcement" });
  }
});

superAdminRouter.put("/employees/:userId/working-hours", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.params.userId);
    if (!(await requireSupportEmployee(userId))) return res.status(404).json({ success: false, error: "Support employee not found" });
    const input = workingHoursSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const params = [userId, input.start_time, input.end_time, JSON.stringify(input.off_days), input.break_hours, req.user?.id || null];

    if (db.getType() === "mysql") {
      await db.executeQuery(
        `INSERT INTO employee_progress_working_hours (user_id, start_time, end_time, off_days, break_hours, created_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), off_days = VALUES(off_days), break_hours = VALUES(break_hours), updated_at = CURRENT_TIMESTAMP`,
        params,
      );
    } else {
      await db.executeQuery(
        `INSERT INTO employee_progress_working_hours (user_id, start_time, end_time, off_days, break_hours, created_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET start_time = excluded.start_time, end_time = excluded.end_time, off_days = excluded.off_days, break_hours = excluded.break_hours, updated_at = CURRENT_TIMESTAMP`,
        params,
      );
    }

    const data = normalizeWorkingHours(await db.getQuery("SELECT * FROM employee_progress_working_hours WHERE user_id = ?", [userId]));
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    console.error("Failed to save employee working hours:", error);
    res.status(500).json({ success: false, error: "Failed to save working hours" });
  }
});

supportRouter.get("/", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const db = getDatabaseAdapter();
    const workDate = currentEasternDate();
    const [tasks, announcements, workingHours, workSchedule, attendance, preference] = await Promise.all([
      db.allQuery(
        "SELECT * FROM employee_progress_tasks WHERE user_id = ? AND (today_only = 0 OR task_date = CURRENT_DATE) ORDER BY created_at DESC",
        [userId],
      ),
      db.allQuery(assignedAnnouncementQuery(), [userId]),
      db.getQuery("SELECT * FROM employee_progress_working_hours WHERE user_id = ?", [userId]),
      db.allQuery(`${workScheduleSelect("WHERE ws.user_id = ? AND ws.work_date = ?")} ORDER BY ws.start_time ASC`, [userId, workDate]),
      getAttendanceState(userId),
      db.getQuery("SELECT timezone FROM employee_progress_preferences WHERE user_id = ?", [userId]),
    ]);
    const weeklySummary = await getWeeklyHoursSummary(userId, workingHours);
    res.json({ success: true, data: { tasks, announcements, working_hours: normalizeWorkingHours(workingHours), work_schedule: normalizeWorkSchedules(workSchedule), work_date: workDate, attendance, preferred_timezone: preference?.timezone || "America/New_York", weekly_summary: weeklySummary } });
  } catch (error) {
    console.error("Failed to load support employee progress:", error);
    res.status(500).json({ success: false, error: "Failed to load employee progress" });
  }
});

supportRouter.put("/preferences/timezone", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const input = timezonePreferenceSchema.parse(req.body);
    const db = getDatabaseAdapter();
    if (db.getType() === "mysql") {
      await db.executeQuery(
        `INSERT INTO employee_progress_preferences (user_id, timezone) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE timezone = VALUES(timezone), updated_at = CURRENT_TIMESTAMP`,
        [userId, input.timezone],
      );
    } else {
      await db.executeQuery(
        `INSERT INTO employee_progress_preferences (user_id, timezone) VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET timezone = excluded.timezone, updated_at = CURRENT_TIMESTAMP`,
        [userId, input.timezone],
      );
    }
    res.json({ success: true, data: { timezone: input.timezone } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    console.error("Failed to save employee timezone preference:", error);
    res.status(500).json({ success: false, error: "Failed to save timezone preference" });
  }
});

supportRouter.post("/attendance/clock-in", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const db = getDatabaseAdapter();
    const existing = await db.getQuery(
      "SELECT id FROM employee_progress_attendance_sessions WHERE user_id = ? AND clock_out_at IS NULL ORDER BY id DESC LIMIT 1",
      [userId],
    );
    if (existing) return res.status(409).json({ success: false, error: "You already have an active attendance session", data: await getAttendanceState(userId) });

    const workDate = currentEasternDate();
    const completedToday = await db.getQuery(
      "SELECT COUNT(*) AS completedCount FROM employee_progress_attendance_sessions WHERE user_id = ? AND work_date = ? AND clock_out_at IS NOT NULL",
      [userId, workDate],
    );
    if (Number(completedToday?.completedCount || 0) >= MAX_DAILY_ATTENDANCE_SESSIONS) {
      return res.status(409).json({
        success: false,
        error: DAILY_CLOCK_IN_LIMIT_MESSAGE,
        code: "DAILY_CLOCK_IN_LIMIT_REACHED",
        data: await getAttendanceState(userId),
      });
    }

    const eventAt = new Date().toISOString();
    const result = await db.executeQuery(
      `INSERT INTO employee_progress_attendance_sessions
       (user_id, work_date, clock_in_at, clock_out_at, break_started_at, total_break_seconds, status)
       VALUES (?, ?, ?, NULL, NULL, 0, 'clocked_in')`,
      [userId, workDate, eventAt],
    );
    const sessionId = Number(result?.insertId ?? result?.lastID ?? 0);
    await db.executeQuery(
      "INSERT INTO employee_progress_attendance_events (session_id, user_id, event_type, event_at) VALUES (?, ?, 'clock_in', ?)",
      [sessionId, userId, eventAt],
    );
    res.status(201).json({ success: true, data: await getAttendanceState(userId) });
  } catch (error) {
    console.error("Failed to clock in employee:", error);
    res.status(500).json({ success: false, error: "Failed to clock in" });
  }
});

supportRouter.post("/attendance/break-start", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const db = getDatabaseAdapter();
    const session = await db.getQuery(
      "SELECT * FROM employee_progress_attendance_sessions WHERE user_id = ? AND clock_out_at IS NULL ORDER BY id DESC LIMIT 1",
      [userId],
    );
    if (!session) return res.status(409).json({ success: false, error: "Clock in before starting a break" });
    if (session.break_started_at) return res.status(409).json({ success: false, error: "Your break is already active", data: await getAttendanceState(userId) });

    const eventAt = new Date().toISOString();
    await db.executeQuery(
      "UPDATE employee_progress_attendance_sessions SET break_started_at = ?, status = 'on_break', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [eventAt, session.id, userId],
    );
    await db.executeQuery(
      "INSERT INTO employee_progress_attendance_events (session_id, user_id, event_type, event_at) VALUES (?, ?, 'break_start', ?)",
      [session.id, userId, eventAt],
    );
    res.json({ success: true, data: await getAttendanceState(userId) });
  } catch (error) {
    console.error("Failed to start employee break:", error);
    res.status(500).json({ success: false, error: "Failed to start break" });
  }
});

supportRouter.post("/attendance/break-end", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const db = getDatabaseAdapter();
    const session = await db.getQuery(
      "SELECT * FROM employee_progress_attendance_sessions WHERE user_id = ? AND clock_out_at IS NULL ORDER BY id DESC LIMIT 1",
      [userId],
    );
    if (!session) return res.status(409).json({ success: false, error: "No active attendance session found" });
    if (!session.break_started_at) return res.status(409).json({ success: false, error: "No active break found", data: await getAttendanceState(userId) });

    const eventAt = new Date().toISOString();
    const totalBreakSeconds = Number(session.total_break_seconds || 0) + secondsBetween(String(session.break_started_at), eventAt);
    await db.executeQuery(
      "UPDATE employee_progress_attendance_sessions SET break_started_at = NULL, total_break_seconds = ?, status = 'clocked_in', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [totalBreakSeconds, session.id, userId],
    );
    await db.executeQuery(
      "INSERT INTO employee_progress_attendance_events (session_id, user_id, event_type, event_at) VALUES (?, ?, 'break_end', ?)",
      [session.id, userId, eventAt],
    );
    res.json({ success: true, data: await getAttendanceState(userId) });
  } catch (error) {
    console.error("Failed to end employee break:", error);
    res.status(500).json({ success: false, error: "Failed to end break" });
  }
});

supportRouter.post("/attendance/clock-out", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const db = getDatabaseAdapter();
    const session = await db.getQuery(
      "SELECT * FROM employee_progress_attendance_sessions WHERE user_id = ? AND clock_out_at IS NULL ORDER BY id DESC LIMIT 1",
      [userId],
    );
    if (!session) return res.status(409).json({ success: false, error: "No active attendance session found" });

    const eventAt = new Date().toISOString();
    let totalBreakSeconds = Number(session.total_break_seconds || 0);
    if (session.break_started_at) {
      totalBreakSeconds += secondsBetween(String(session.break_started_at), eventAt);
      await db.executeQuery(
        "INSERT INTO employee_progress_attendance_events (session_id, user_id, event_type, event_at) VALUES (?, ?, 'break_end', ?)",
        [session.id, userId, eventAt],
      );
    }
    await db.executeQuery(
      "UPDATE employee_progress_attendance_sessions SET clock_out_at = ?, break_started_at = NULL, total_break_seconds = ?, status = 'clocked_out', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [eventAt, totalBreakSeconds, session.id, userId],
    );
    await db.executeQuery(
      "INSERT INTO employee_progress_attendance_events (session_id, user_id, event_type, event_at) VALUES (?, ?, 'clock_out', ?)",
      [session.id, userId, eventAt],
    );
    res.json({ success: true, data: await getAttendanceState(userId) });
  } catch (error) {
    console.error("Failed to clock out employee:", error);
    res.status(500).json({ success: false, error: "Failed to clock out" });
  }
});

supportRouter.post("/work-schedule", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const input = workScheduleSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const task = input.assigned_task_id
      ? await db.getQuery("SELECT id, title, priority FROM employee_progress_tasks WHERE id = ? AND user_id = ?", [input.assigned_task_id, userId])
      : null;
    if (input.assigned_task_id && !task) return res.status(404).json({ success: false, error: "Assigned task not found" });
    const result = await db.executeQuery(
      `INSERT INTO employee_progress_work_schedule
       (user_id, work_date, start_time, end_time, activity, assigned_task_id, assigned_task_title, assigned_task_priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, input.work_date || currentEasternDate(), input.start_time, input.end_time, input.activity, task?.id || null, task?.title || null, task?.priority || null, input.status],
    );
    const id = Number(result?.insertId ?? result?.lastID ?? 0);
    await syncAssignedTaskCompletion(userId, task?.id, task?.priority);
    const data = await db.getQuery(workScheduleSelect("WHERE ws.id = ? AND ws.user_id = ?"), [id, userId]);
    res.status(201).json({ success: true, data: normalizeWorkSchedule(data) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    console.error("Failed to create work schedule:", error);
    res.status(500).json({ success: false, error: "Failed to create work schedule" });
  }
});

supportRouter.put("/work-schedule/:id", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const input = workScheduleSchema.parse(req.body);
    const db = getDatabaseAdapter();
    const existing = await db.getQuery("SELECT * FROM employee_progress_work_schedule WHERE id = ? AND user_id = ?", [id, userId]);
    if (!existing) return res.status(404).json({ success: false, error: "Work schedule not found" });
    const task = input.assigned_task_id
      ? await db.getQuery("SELECT id, title, priority FROM employee_progress_tasks WHERE id = ? AND user_id = ?", [input.assigned_task_id, userId])
      : null;
    if (input.assigned_task_id && !task) return res.status(404).json({ success: false, error: "Assigned task not found" });
    const originalPriority = Number(existing.assigned_task_id) === Number(task?.id) ? existing.assigned_task_priority : task?.priority;
    await db.executeQuery(
      `UPDATE employee_progress_work_schedule SET work_date = ?, start_time = ?, end_time = ?, activity = ?,
       assigned_task_id = ?, assigned_task_title = ?, assigned_task_priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [input.work_date || existing.work_date, input.start_time, input.end_time, input.activity, task?.id || null, task?.title || null, originalPriority || null, input.status, id, userId],
    );
    await syncAssignedTaskCompletion(userId, Number(existing.assigned_task_id) || null, existing.assigned_task_priority);
    if (Number(existing.assigned_task_id) !== Number(task?.id)) await syncAssignedTaskCompletion(userId, task?.id, task?.priority);
    const data = await db.getQuery(workScheduleSelect("WHERE ws.id = ? AND ws.user_id = ?"), [id, userId]);
    res.json({ success: true, data: normalizeWorkSchedule(data) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.issues[0]?.message });
    console.error("Failed to update work schedule:", error);
    res.status(500).json({ success: false, error: "Failed to update work schedule" });
  }
});

supportRouter.delete("/work-schedule/:id", async (req: AuthRequest, res) => {
  try {
    await ensureEmployeeProgressSchema();
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const db = getDatabaseAdapter();
    const existing = await db.getQuery("SELECT * FROM employee_progress_work_schedule WHERE id = ? AND user_id = ?", [id, userId]);
    if (!existing) return res.status(404).json({ success: false, error: "Work schedule not found" });
    await db.executeQuery("DELETE FROM employee_progress_work_schedule WHERE id = ? AND user_id = ?", [id, userId]);
    await syncAssignedTaskCompletion(userId, Number(existing.assigned_task_id) || null, existing.assigned_task_priority);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete work schedule" });
  }
});

export { supportRouter as supportEmployeeProgressRouter };
export default superAdminRouter;
