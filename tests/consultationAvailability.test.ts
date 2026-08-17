import { describe, expect, it } from 'vitest';
import { generateConsultationSlots, zonedSlotToUtc } from '../server/services/consultationAvailability.js';

const settings = { timezone: 'America/New_York', booking_window_days: 365, minimum_notice_minutes: 0, active: true };
const mondayNineToFive = [{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', active: true }];
const now = new Date('2026-01-01T00:00:00Z');

describe('central consultation availability engine', () => {
  it('generates exactly sixteen 30-minute slots for Monday 9-5', () => {
    const slots = generateConsultationSlots({ date: '2026-08-17', settings, availability: mondayNineToFive, blockedPeriods: [], appointments: [], now });
    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({ time: '09:00', end_time: '09:30' });
    expect(slots.at(-1)).toMatchObject({ time: '16:30', end_time: '17:00' });
  });

  it('shares booked-slot exclusion across every booking source', () => {
    const start = zonedSlotToUtc('2026-08-17', '10:00', settings.timezone);
    const slots = generateConsultationSlots({ date: '2026-08-17', settings, availability: mondayNineToFive, blockedPeriods: [], now, appointments: [{ start_datetime_utc: start, end_datetime_utc: new Date(start.getTime() + 30 * 60_000) }] });
    expect(slots.some((slot) => slot.time === '10:00')).toBe(false);
    expect(slots.some((slot) => slot.time === '10:30')).toBe(true);
  });

  it('blocks full dates and partial periods', () => {
    expect(generateConsultationSlots({ date: '2026-08-17', settings, availability: mondayNineToFive, blockedPeriods: [{ blocked_date: '2026-08-17' }], appointments: [], now })).toHaveLength(0);
    const partial = generateConsultationSlots({ date: '2026-08-17', settings, availability: mondayNineToFive, blockedPeriods: [{ blocked_date: '2026-08-17', start_time: '14:00', end_time: '15:30' }], appointments: [], now });
    expect(partial.filter((slot) => ['14:00', '14:30', '15:00'].includes(slot.time))).toHaveLength(0);
  });

  it('uses IANA timezone rules across daylight-saving changes', () => {
    expect(zonedSlotToUtc('2026-03-02', '09:00', 'America/New_York').toISOString()).toBe('2026-03-02T14:00:00.000Z');
    expect(zonedSlotToUtc('2026-03-09', '09:00', 'America/New_York').toISOString()).toBe('2026-03-09T13:00:00.000Z');
  });

  it('supports multiple periods on one day without filling the break', () => {
    const slots = generateConsultationSlots({ date: '2026-08-17', settings, availability: [{ day_of_week: 1, start_time: '09:00', end_time: '12:00' }, { day_of_week: 1, start_time: '13:00', end_time: '17:00' }], blockedPeriods: [], appointments: [], now });
    expect(slots.some((slot) => slot.time === '12:00' || slot.time === '12:30')).toBe(false);
    expect(slots).toHaveLength(14);
  });
});
