import { describe, expect, it } from 'vitest';
import {
  formatPartialDobParts,
  normalizeUnifiedDob,
  normalizeYearOnlyDob,
} from '../shared/partialDob.js';

describe('partial DOB normalization', () => {
  it('does not invent a month or day for a year-only value', () => {
    expect(normalizeYearOnlyDob('1979')).toBe('--/--/1979');
    expect(normalizeUnifiedDob('1979')).toBe('--/--/1979');
  });

  it('treats an epoch stored in a BirthYear field as year-only', () => {
    expect(normalizeYearOnlyDob(631152000000)).toBe('--/--/1990');
  });

  it('preserves known parts and marks only missing parts', () => {
    expect(formatPartialDobParts({ year: 1979, month: 12 })).toBe('12/--/1979');
    expect(formatPartialDobParts({ year: 1979, day: 25 })).toBe('--/25/1979');
    expect(normalizeUnifiedDob('12/--/1979')).toBe('12/--/1979');
    expect(normalizeUnifiedDob('December 1979')).toBe('12/--/1979');
  });

  it('keeps genuine complete dates in unified ISO format', () => {
    expect(normalizeUnifiedDob('1979-12-25')).toBe('1979-12-25');
    expect(normalizeUnifiedDob('1979-12-25T00:00:00Z')).toBe('1979-12-25');
    expect(normalizeUnifiedDob('December 25, 1979')).toBe('1979-12-25');
    expect(formatPartialDobParts({ year: 1979, month: 12, day: 25 })).toBe('1979-12-25');
  });

  it('returns empty output when no reliable year is available', () => {
    expect(normalizeUnifiedDob('')).toBe('');
    expect(formatPartialDobParts({ month: 12, day: 25 })).toBe('');
  });
});
