export const EST_TIME_ZONE = "America/New_York";
export const KARACHI_TIME_ZONE = "Asia/Karachi";
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface WorkingHoursSchedule {
  start_time: string;
  end_time: string;
  off_days: string[];
  break_hours: number;
}

export interface ConvertedScheduleDay {
  sourceDay: Weekday;
  day: string;
  startTime: string;
  endTime: string;
  endDay: string;
  isOff: boolean;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "0";
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    weekday: value("weekday"),
  };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return representedAsUtc - date.getTime();
}

function zonedDateTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  let result = new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone));
  result = new Date(guess.getTime() - getTimeZoneOffset(result, timeZone));
  return result;
}

function parseTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0, total: (hour || 0) * 60 + (minute || 0) };
}

export function formatScheduleTime(value: string) {
  const { hour, minute } = parseTime(value);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(new Date(2000, 0, 1, hour, minute));
}

export function convertWeeklySchedule(
  schedule: WorkingHoursSchedule,
  targetTimeZone: string,
  referenceDate = new Date(),
): ConvertedScheduleDay[] {
  const sourceToday = getZonedParts(referenceDate, EST_TIME_ZONE);
  const sourceCalendarDate = new Date(Date.UTC(sourceToday.year, sourceToday.month - 1, sourceToday.day));
  const sunday = new Date(sourceCalendarDate);
  sunday.setUTCDate(sourceCalendarDate.getUTCDate() - sourceCalendarDate.getUTCDay());
  const start = parseTime(schedule.start_time);
  const end = parseTime(schedule.end_time);

  return WEEKDAYS.map((sourceDay, index) => {
    const sourceDate = new Date(sunday);
    sourceDate.setUTCDate(sunday.getUTCDate() + index);
    const startUtc = zonedDateTimeToUtc(
      sourceDate.getUTCFullYear(),
      sourceDate.getUTCMonth() + 1,
      sourceDate.getUTCDate(),
      start.hour,
      start.minute,
      EST_TIME_ZONE,
    );
    const endDate = new Date(sourceDate);
    if (end.total <= start.total) endDate.setUTCDate(endDate.getUTCDate() + 1);
    const endUtc = zonedDateTimeToUtc(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth() + 1,
      endDate.getUTCDate(),
      end.hour,
      end.minute,
      EST_TIME_ZONE,
    );
    const targetStart = getZonedParts(startUtc, targetTimeZone);
    const targetEnd = getZonedParts(endUtc, targetTimeZone);
    return {
      sourceDay,
      day: targetStart.weekday,
      startTime: `${String(targetStart.hour).padStart(2, "0")}:${String(targetStart.minute).padStart(2, "0")}`,
      endTime: `${String(targetEnd.hour).padStart(2, "0")}:${String(targetEnd.minute).padStart(2, "0")}`,
      endDay: targetEnd.weekday,
      isOff: schedule.off_days.includes(sourceDay),
    };
  });
}

export function getCurrentWeekday(timeZone: string, date = new Date()) {
  return getZonedParts(date, timeZone).weekday;
}

export function getCurrentTimeLabel(timeZone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
}

export function isBeforeScheduledEnd(date: Date, schedule: WorkingHoursSchedule) {
  const current = getZonedParts(date, EST_TIME_ZONE);
  const currentMinutes = current.hour * 60 + current.minute;
  const start = parseTime(schedule.start_time).total;
  const end = parseTime(schedule.end_time).total;
  if (end > start) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
}
