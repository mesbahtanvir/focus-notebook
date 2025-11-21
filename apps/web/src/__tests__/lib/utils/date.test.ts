/**
 * Tests for date utility functions
 */

import {
  isSameDay,
  isTodayISO,
  getDateString,
  getLocalDateString,
  isWorkday,
  isWeekend,
  formatTimeGentle,
  getStartOfDay,
  getEndOfDay,
  getDaysDifference,
  isPast,
  isFuture,
  isTaskCompletedToday,
  formatTimeUntil,
} from '@/lib/utils/date';

describe('date utilities', () => {
  describe('isSameDay', () => {
    it('should return true for dates on the same day', () => {
      const date1 = new Date('2025-01-24T10:00:00');
      const date2 = new Date('2025-01-24T18:30:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for dates on different days', () => {
      const date1 = new Date('2025-01-24T10:00:00');
      const date2 = new Date('2025-01-25T10:00:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for dates in different months', () => {
      const date1 = new Date('2025-01-31T23:59:59');
      const date2 = new Date('2025-02-01T00:00:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for dates in different years', () => {
      const date1 = new Date('2024-12-31T23:59:59');
      const date2 = new Date('2025-01-01T00:00:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isTodayISO', () => {
    it('should return false for undefined', () => {
      expect(isTodayISO(undefined)).toBe(false);
    });

    it('should return true for today ISO string', () => {
      const today = new Date().toISOString();
      expect(isTodayISO(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isTodayISO(yesterday.toISOString())).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isTodayISO(tomorrow.toISOString())).toBe(false);
    });
  });

  describe('getDateString', () => {
    it('should return YYYY-MM-DD format', () => {
      const date = new Date('2025-01-24T15:30:00Z');
      const result = getDateString(date);
      expect(result).toBe('2025-01-24');
    });

    it('should return current date when no argument provided', () => {
      const result = getDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle single-digit months and days', () => {
      const date = new Date('2025-03-05T10:00:00Z');
      const result = getDateString(date);
      expect(result).toBe('2025-03-05');
    });
  });

  describe('getLocalDateString', () => {
    it('should return YYYY-MM-DD format in local timezone', () => {
      const date = new Date('2025-01-24T15:30:00');
      const result = getLocalDateString(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      expect(result).toBe(`${year}-${month}-${day}`);
    });

    it('should pad single-digit months', () => {
      const date = new Date('2025-03-15T10:00:00');
      const result = getLocalDateString(date);
      expect(result).toBe('2025-03-15');
    });

    it('should pad single-digit days', () => {
      const date = new Date('2025-01-05T10:00:00');
      const result = getLocalDateString(date);
      expect(result).toBe('2025-01-05');
    });

    it('should return current local date when no argument provided', () => {
      const result = getLocalDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isWorkday', () => {
    it('should return true for Monday', () => {
      const monday = new Date('2025-01-20'); // Known Monday
      expect(isWorkday(monday)).toBe(true);
    });

    it('should return true for Tuesday', () => {
      const tuesday = new Date('2025-01-21');
      expect(isWorkday(tuesday)).toBe(true);
    });

    it('should return true for Wednesday', () => {
      const wednesday = new Date('2025-01-22');
      expect(isWorkday(wednesday)).toBe(true);
    });

    it('should return true for Thursday', () => {
      const thursday = new Date('2025-01-23');
      expect(isWorkday(thursday)).toBe(true);
    });

    it('should return true for Friday', () => {
      const friday = new Date('2025-01-24');
      expect(isWorkday(friday)).toBe(true);
    });

    it('should return false for Saturday', () => {
      const saturday = new Date('2025-01-25');
      expect(isWorkday(saturday)).toBe(false);
    });

    it('should return false for Sunday', () => {
      const sunday = new Date('2025-01-26');
      expect(isWorkday(sunday)).toBe(false);
    });

    it('should default to current date when no argument provided', () => {
      const result = isWorkday();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2025-01-25');
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2025-01-26');
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for Monday', () => {
      const monday = new Date('2025-01-20');
      expect(isWeekend(monday)).toBe(false);
    });

    it('should return false for Friday', () => {
      const friday = new Date('2025-01-24');
      expect(isWeekend(friday)).toBe(false);
    });

    it('should default to current date when no argument provided', () => {
      const result = isWeekend();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatTimeGentle', () => {
    it('should return "Starting..." for 0 seconds', () => {
      expect(formatTimeGentle(0)).toBe('Starting...');
    });

    it('should format minutes only when less than an hour', () => {
      expect(formatTimeGentle(120)).toBe('2m');
      expect(formatTimeGentle(1800)).toBe('30m');
      expect(formatTimeGentle(3540)).toBe('59m');
    });

    it('should format hours only when no remaining minutes', () => {
      expect(formatTimeGentle(3600)).toBe('1h');
      expect(formatTimeGentle(7200)).toBe('2h');
      expect(formatTimeGentle(10800)).toBe('3h');
    });

    it('should format hours and minutes when both present', () => {
      expect(formatTimeGentle(5400)).toBe('1h 30m');
      expect(formatTimeGentle(9000)).toBe('2h 30m');
      expect(formatTimeGentle(3660)).toBe('1h 1m');
    });

    it('should handle large durations', () => {
      expect(formatTimeGentle(86400)).toBe('24h');
      expect(formatTimeGentle(90000)).toBe('25h');
    });

    it('should round down partial minutes', () => {
      expect(formatTimeGentle(59)).toBe('Starting...');
      expect(formatTimeGentle(119)).toBe('1m');
    });
  });

  describe('getStartOfDay', () => {
    it('should return midnight for a given date', () => {
      const date = new Date('2025-01-24T15:30:45.123');
      const result = getStartOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(date.getDate());
    });

    it('should not mutate the original date', () => {
      const date = new Date('2025-01-24T15:30:00');
      const originalTime = date.getTime();
      getStartOfDay(date);
      expect(date.getTime()).toBe(originalTime);
    });

    it('should default to current date when no argument provided', () => {
      const result = getStartOfDay();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day for a given date', () => {
      const date = new Date('2025-01-24T10:00:00');
      const result = getEndOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
      expect(result.getDate()).toBe(date.getDate());
    });

    it('should not mutate the original date', () => {
      const date = new Date('2025-01-24T10:00:00');
      const originalTime = date.getTime();
      getEndOfDay(date);
      expect(date.getTime()).toBe(originalTime);
    });

    it('should default to current date when no argument provided', () => {
      const result = getEndOfDay();
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('getDaysDifference', () => {
    it('should return positive number for future dates', () => {
      const today = new Date('2025-01-24');
      const tomorrow = new Date('2025-01-25');
      expect(getDaysDifference(today, tomorrow)).toBe(1);
    });

    it('should return negative number for past dates', () => {
      const today = new Date('2025-01-24');
      const yesterday = new Date('2025-01-23');
      expect(getDaysDifference(today, yesterday)).toBe(-1);
    });

    it('should return 0 for same date', () => {
      const date1 = new Date('2025-01-24T10:00:00');
      const date2 = new Date('2025-01-24T15:00:00');
      expect(getDaysDifference(date1, date2)).toBe(0);
    });

    it('should calculate week differences', () => {
      const date1 = new Date('2025-01-24');
      const date2 = new Date('2025-01-31');
      expect(getDaysDifference(date1, date2)).toBe(7);
    });

    it('should calculate month differences', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-31');
      expect(getDaysDifference(date1, date2)).toBe(30);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isPast(yesterday)).toBe(true);
    });

    it('should return false for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isPast(tomorrow)).toBe(false);
    });

    it('should return false for dates just ahead', () => {
      const future = new Date();
      future.setSeconds(future.getSeconds() + 10);
      expect(isPast(future)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isFuture(tomorrow)).toBe(true);
    });

    it('should return false for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isFuture(yesterday)).toBe(false);
    });

    it('should return true for dates just ahead', () => {
      const future = new Date();
      future.setSeconds(future.getSeconds() + 10);
      expect(isFuture(future)).toBe(true);
    });
  });

  describe('isTaskCompletedToday', () => {
    it('should return done value for non-recurring tasks', () => {
      const task = { done: true };
      expect(isTaskCompletedToday(task)).toBe(true);

      const task2 = { done: false };
      expect(isTaskCompletedToday(task2)).toBe(false);
    });

    it('should return done value for tasks with recurrence type "none"', () => {
      const task = { done: true, recurrence: { type: 'none' } };
      expect(isTaskCompletedToday(task)).toBe(true);
    });

    it('should check completion history for recurring tasks', () => {
      const today = getLocalDateString(new Date());
      const task = {
        done: true,
        recurrence: { type: 'daily' },
        completionHistory: [
          { date: today, completedAt: new Date().toISOString() },
        ],
      };
      expect(isTaskCompletedToday(task)).toBe(true);
    });

    it('should return false if no completion today for recurring task', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      const task = {
        done: false,
        recurrence: { type: 'daily' },
        completionHistory: [
          { date: yesterdayStr, completedAt: yesterday.toISOString() },
        ],
      };
      expect(isTaskCompletedToday(task)).toBe(false);
    });

    it('should return false if completionHistory is empty', () => {
      const task = {
        done: false,
        recurrence: { type: 'daily' },
        completionHistory: [],
      };
      expect(isTaskCompletedToday(task)).toBe(false);
    });

    it('should return false if completionHistory is undefined', () => {
      const task = {
        done: false,
        recurrence: { type: 'daily' },
      };
      expect(isTaskCompletedToday(task)).toBe(false);
    });
  });

  describe('formatTimeUntil', () => {
    it('should return days for near future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = formatTimeUntil(tomorrow.toISOString());

      expect(result.unit).toBe('day');
      expect(result.value).toBe(1);
      expect(result.isOverdue).toBe(false);
    });

    it('should return plural "days" for multiple days', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const result = formatTimeUntil(future.toISOString());

      expect(result.unit).toBe('days');
      expect(result.value).toBe(5);
      expect(result.isOverdue).toBe(false);
    });

    it('should return months for dates 30+ days away', () => {
      const future = new Date();
      future.setDate(future.getDate() + 35);
      const result = formatTimeUntil(future.toISOString());

      expect(result.unit).toBe('month');
      expect(result.value).toBe(1);
      expect(result.isOverdue).toBe(false);
    });

    it('should return plural "months" for multiple months', () => {
      const future = new Date();
      future.setDate(future.getDate() + 65);
      const result = formatTimeUntil(future.toISOString());

      expect(result.unit).toBe('months');
      expect(result.value).toBe(2);
      expect(result.isOverdue).toBe(false);
    });

    it('should return years for dates 365+ days away', () => {
      const future = new Date();
      future.setDate(future.getDate() + 370);
      const result = formatTimeUntil(future.toISOString());

      expect(result.unit).toBe('year');
      expect(result.value).toBe(1);
      expect(result.isOverdue).toBe(false);
    });

    it('should return plural "years" for multiple years', () => {
      const future = new Date();
      future.setDate(future.getDate() + 750);
      const result = formatTimeUntil(future.toISOString());

      expect(result.unit).toBe('years');
      expect(result.value).toBe(2);
      expect(result.isOverdue).toBe(false);
    });

    it('should mark past dates as overdue', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatTimeUntil(yesterday.toISOString());

      expect(result.isOverdue).toBe(true);
      expect(result.value).toBe(1);
      expect(result.unit).toBe('day');
    });

    it('should handle overdue by months', () => {
      const past = new Date();
      past.setDate(past.getDate() - 35);
      const result = formatTimeUntil(past.toISOString());

      expect(result.isOverdue).toBe(true);
      expect(result.value).toBe(1);
      expect(result.unit).toBe('month');
    });

    it('should handle overdue by years', () => {
      const past = new Date();
      past.setDate(past.getDate() - 370);
      const result = formatTimeUntil(past.toISOString());

      expect(result.isOverdue).toBe(true);
      expect(result.value).toBe(1);
      expect(result.unit).toBe('year');
    });
  });
});
