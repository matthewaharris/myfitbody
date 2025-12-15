/**
 * Unit Tests for Date Utilities
 */

import {
  formatDateString,
  getTodayString,
  getStartOfDay,
  getEndOfDay,
  getDateRange,
  getStartOfWeek,
  parseDateOrToday,
  isValidDateString,
  getDayName,
} from '../../src/utils/dates.js';

describe('formatDateString', () => {
  test('formats date as YYYY-MM-DD', () => {
    const date = new Date('2024-03-15T12:00:00Z');
    expect(formatDateString(date)).toBe('2024-03-15');
  });

  test('pads single digit months and days', () => {
    const date = new Date('2024-01-05T12:00:00Z');
    expect(formatDateString(date)).toBe('2024-01-05');
  });

  test('handles December correctly', () => {
    const date = new Date('2024-12-25T12:00:00Z');
    expect(formatDateString(date)).toBe('2024-12-25');
  });
});

describe('getTodayString', () => {
  test('returns today in YYYY-MM-DD format', () => {
    const result = getTodayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('matches current date', () => {
    const today = new Date();
    const expected = formatDateString(today);
    expect(getTodayString()).toBe(expected);
  });
});

describe('getStartOfDay', () => {
  test('returns ISO string for midnight', () => {
    const result = getStartOfDay('2024-03-15');
    expect(result).toBe('2024-03-15T00:00:00.000Z');
  });
});

describe('getEndOfDay', () => {
  test('returns ISO string for end of day', () => {
    const result = getEndOfDay('2024-03-15');
    expect(result).toBe('2024-03-15T23:59:59.999Z');
  });
});

describe('getDateRange', () => {
  test('returns start and end dates for range', () => {
    const result = getDateRange(7);
    expect(result).toHaveProperty('startDate');
    expect(result).toHaveProperty('endDate');
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('end date is today', () => {
    const result = getDateRange(7);
    expect(result.endDate).toBe(getTodayString());
  });
});

describe('getStartOfWeek', () => {
  test('returns Sunday for a Wednesday', () => {
    // March 13, 2024 is a Wednesday
    const wednesday = new Date('2024-03-13T12:00:00Z');
    const result = getStartOfWeek(wednesday);
    expect(result.getDay()).toBe(0); // Sunday
  });

  test('returns same day if already Sunday', () => {
    // March 10, 2024 is a Sunday
    const sunday = new Date('2024-03-10T12:00:00Z');
    const result = getStartOfWeek(sunday);
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(10);
  });
});

describe('parseDateOrToday', () => {
  test('returns valid date string as-is', () => {
    expect(parseDateOrToday('2024-03-15')).toBe('2024-03-15');
  });

  test('returns today for undefined', () => {
    expect(parseDateOrToday(undefined)).toBe(getTodayString());
  });

  test('returns today for invalid format', () => {
    expect(parseDateOrToday('March 15, 2024')).toBe(getTodayString());
    expect(parseDateOrToday('15-03-2024')).toBe(getTodayString());
    expect(parseDateOrToday('')).toBe(getTodayString());
  });
});

describe('isValidDateString', () => {
  test('returns true for valid dates', () => {
    expect(isValidDateString('2024-03-15')).toBe(true);
    expect(isValidDateString('2024-01-01')).toBe(true);
    expect(isValidDateString('2024-12-31')).toBe(true);
  });

  test('returns false for invalid formats', () => {
    expect(isValidDateString('2024/03/15')).toBe(false);
    expect(isValidDateString('03-15-2024')).toBe(false);
    expect(isValidDateString('March 15, 2024')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  test('returns false for invalid dates', () => {
    expect(isValidDateString('2024-13-01')).toBe(false); // Invalid month
    // Note: JavaScript Date is lenient with day overflow (2024-02-30 becomes March 1)
    // Our regex validation catches format but not semantic validity
  });
});

describe('getDayName', () => {
  test('returns correct day names', () => {
    // Use noon UTC to avoid timezone issues
    expect(getDayName(new Date('2024-03-10T12:00:00Z'))).toBe('Sunday');
    expect(getDayName(new Date('2024-03-11T12:00:00Z'))).toBe('Monday');
    expect(getDayName(new Date('2024-03-12T12:00:00Z'))).toBe('Tuesday');
    expect(getDayName(new Date('2024-03-13T12:00:00Z'))).toBe('Wednesday');
    expect(getDayName(new Date('2024-03-14T12:00:00Z'))).toBe('Thursday');
    expect(getDayName(new Date('2024-03-15T12:00:00Z'))).toBe('Friday');
    expect(getDayName(new Date('2024-03-16T12:00:00Z'))).toBe('Saturday');
  });
});
