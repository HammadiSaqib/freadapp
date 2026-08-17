import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const CONSULTATION_DURATION_MINUTES = 30 as const;

export type MeetingSettings = {
  timezone: string;
  booking_window_days: number;
  minimum_notice_minutes: number;
  active: boolean | number;
};

export type AvailabilityPeriod = {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active?: boolean | number;
};

export type BlockedPeriod = {
  blocked_date: string | Date;
  start_time?: string | null;
  end_time?: string | null;
};

export type ExistingAppointment = {
  start_datetime_utc: string | Date;
  end_datetime_utc: string | Date;
};

export type ConsultationSlot = {
  date: string;
  time: string;
  end_time: string;
  start_utc: string;
  end_utc: string;
  label: string;
};

const timeMinutes = (value: string) => {
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
};

const minuteTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const dateOnly = (value: string | Date, timezone: string) => {
  if (value instanceof Date) return formatInTimeZone(value, timezone, 'yyyy-MM-dd');
  return String(value).slice(0, 10);
};

export function isValidIanaTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function zonedSlotToUtc(date: string, time: string, timezone: string) {
  if (!isValidIanaTimezone(timezone)) throw new Error('Invalid IANA timezone');
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

export function generateConsultationSlots(input: {
  date: string;
  settings: MeetingSettings;
  availability: AvailabilityPeriod[];
  blockedPeriods: BlockedPeriod[];
  appointments: ExistingAppointment[];
  now?: Date;
}): ConsultationSlot[] {
  const { date, settings } = input;
  if (!settings.active || !isValidIanaTimezone(settings.timezone)) return [];

  const now = input.now || new Date();
  const requestedMidnight = zonedSlotToUtc(date, '00:00', settings.timezone);
  const todayInScheduleZone = formatInTimeZone(now, settings.timezone, 'yyyy-MM-dd');
  const maximumDate = addMinutes(
    zonedSlotToUtc(todayInScheduleZone, '00:00', settings.timezone),
    Number(settings.booking_window_days || 60) * 24 * 60,
  );
  if (requestedMidnight < zonedSlotToUtc(todayInScheduleZone, '00:00', settings.timezone) || requestedMidnight > maximumDate) return [];

  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const periods = input.availability.filter((period) => Number(period.day_of_week) === weekday && period.active !== false && Number(period.active) !== 0);
  const blocks = input.blockedPeriods.filter((period) => dateOnly(period.blocked_date, settings.timezone) === date);
  const minimumStart = addMinutes(now, Number(settings.minimum_notice_minutes || 0));
  const slots: ConsultationSlot[] = [];

  for (const period of periods) {
    const periodStart = timeMinutes(period.start_time);
    const periodEnd = timeMinutes(period.end_time);
    for (let cursor = periodStart; cursor + CONSULTATION_DURATION_MINUTES <= periodEnd; cursor += CONSULTATION_DURATION_MINUTES) {
      const time = minuteTime(cursor);
      const endTime = minuteTime(cursor + CONSULTATION_DURATION_MINUTES);
      const startUtc = zonedSlotToUtc(date, time, settings.timezone);
      const endUtc = addMinutes(startUtc, CONSULTATION_DURATION_MINUTES);
      if (startUtc < minimumStart) continue;

      const blocked = blocks.some((block) => {
        if (!block.start_time || !block.end_time) return true;
        return cursor < timeMinutes(block.end_time) && timeMinutes(block.start_time) < cursor + CONSULTATION_DURATION_MINUTES;
      });
      if (blocked) continue;

      const booked = input.appointments.some((appointment) => {
        const existingStart = new Date(appointment.start_datetime_utc);
        const existingEnd = new Date(appointment.end_datetime_utc);
        return startUtc < existingEnd && existingStart < endUtc;
      });
      if (booked) continue;

      slots.push({
        date,
        time,
        end_time: endTime,
        start_utc: startUtc.toISOString(),
        end_utc: endUtc.toISOString(),
        label: `${time} - ${endTime}`,
      });
    }
  }

  return slots.sort((a, b) => a.start_utc.localeCompare(b.start_utc));
}

export function formatAppointmentInTimezone(value: string | Date, timezone: string) {
  return formatInTimeZone(new Date(value), timezone, 'EEEE, MMMM d, yyyy h:mm a');
}
