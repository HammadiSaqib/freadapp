const UNKNOWN_DATE_PART = '--';

const isValidYear = (year) => Number.isInteger(year) && year >= 1000 && year <= 9999;
const isValidMonth = (month) => Number.isInteger(month) && month >= 1 && month <= 12;
const isValidDay = (day) => Number.isInteger(day) && day >= 1 && day <= 31;

const parseKnownPart = (value) => {
  const text = String(value ?? '').trim();
  if (!text || text === UNKNOWN_DATE_PART || text === '??') return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatFullDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Formats a DOB without inventing missing month/day values.
 * Complete dates retain the unified YYYY-MM-DD format. Partial dates use
 * explicit placeholders, such as --/--/1979 or 12/--/1979.
 */
export function formatPartialDobParts({ year, month, day } = {}) {
  const parsedYear = parseKnownPart(year);
  const parsedMonth = parseKnownPart(month);
  const parsedDay = parseKnownPart(day);

  if (!isValidYear(parsedYear)) return '';

  if (parsedMonth !== null && !isValidMonth(parsedMonth)) return '';
  if (parsedDay !== null && !isValidDay(parsedDay)) return '';

  if (parsedMonth !== null && parsedDay !== null) {
    return formatFullDate(parsedYear, parsedMonth, parsedDay);
  }

  const monthPart = parsedMonth === null ? UNKNOWN_DATE_PART : String(parsedMonth).padStart(2, '0');
  const dayPart = parsedDay === null ? UNKNOWN_DATE_PART : String(parsedDay).padStart(2, '0');
  return `${monthPart}/${dayPart}/${parsedYear}`;
}

const extractYear = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getUTCFullYear();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (isValidYear(value)) return value;
    const epochDate = new Date(value);
    return Number.isNaN(epochDate.getTime()) ? null : epochDate.getUTCFullYear();
  }

  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^\d{4}$/.test(text)) return Number(text);
  if (/^\d{10,13}$/.test(text)) {
    const epochDate = new Date(Number(text));
    return Number.isNaN(epochDate.getTime()) ? null : epochDate.getUTCFullYear();
  }

  const yearMatch = text.match(/\b(\d{4})\b/);
  return yearMatch ? Number(yearMatch[1]) : null;
};

export function normalizeYearOnlyDob(value) {
  const year = extractYear(value);
  return isValidYear(year) ? formatPartialDobParts({ year }) : '';
}

export function normalizeUnifiedDob(value) {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date || typeof value === 'number') {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return formatFullDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  if (typeof value === 'object') {
    return formatPartialDobParts({
      year: value.year ?? value.Year ?? value['@year'],
      month: value.month ?? value.Month ?? value['@month'],
      day: value.day ?? value.Day ?? value['@day'],
    });
  }

  const text = String(value).trim();
  if (!text) return '';

  if (/^\d{4}$/.test(text)) return normalizeYearOnlyDob(text);
  if (/^\d{10,13}$/.test(text)) return normalizeUnifiedDob(Number(text));

  let match = text.match(/^(\d{4})[-/](\d{1,2}|--|\?\?)[-/](\d{1,2}|--|\?\?)$/);
  if (match) {
    return formatPartialDobParts({ year: match[1], month: match[2], day: match[3] });
  }

  match = text.match(/^(\d{1,2}|--|\?\?)[-/](\d{1,2}|--|\?\?)[-/](\d{4})$/);
  if (match) {
    return formatPartialDobParts({ year: match[3], month: match[1], day: match[2] });
  }

  match = text.match(/^(\d{4})[-/](\d{1,2})$/);
  if (match) {
    return formatPartialDobParts({ year: match[1], month: match[2] });
  }

  match = text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match) {
    return formatPartialDobParts({ year: match[2], month: match[1] });
  }

  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T/i);
  if (match) {
    return formatPartialDobParts({ year: match[1], month: match[2], day: match[3] });
  }

  const monthNames = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };
  const namedMonthMatch = text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/i);
  const namedYearMatch = text.match(/\b(\d{4})\b/);
  if (namedMonthMatch && namedYearMatch) {
    const withoutYear = text.replace(namedYearMatch[0], ' ');
    const withoutMonth = withoutYear.replace(namedMonthMatch[0], ' ');
    const dayMatch = withoutMonth.match(/\b([1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\b/i);
    return formatPartialDobParts({
      year: namedYearMatch[1],
      month: monthNames[namedMonthMatch[1].toLowerCase()],
      day: dayMatch?.[1],
    });
  }

  return '';
}
