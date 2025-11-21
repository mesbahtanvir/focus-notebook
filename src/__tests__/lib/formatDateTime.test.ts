/**
 * Tests for formatDateTime utilities
 */

import {
  formatDate,
  formatTimeOfDay,
  formatDateTime,
  getTimeOfDayCategory,
} from '@/lib/formatDateTime';

describe('formatDateTime utilities', () => {
  describe('formatDate', () => {
    it('should format date with 1st suffix', () => {
      const result = formatDate('2025-10-01T12:00:00.000Z');
      expect(result).toBe('1st Oct 2025');
    });

    it('should format date with 2nd suffix', () => {
      const result = formatDate('2025-10-02T12:00:00.000Z');
      expect(result).toBe('2nd Oct 2025');
    });

    it('should format date with 3rd suffix', () => {
      const result = formatDate('2025-10-03T12:00:00.000Z');
      expect(result).toBe('3rd Oct 2025');
    });

    it('should format date with th suffix for 4-20', () => {
      expect(formatDate('2025-10-04T12:00:00.000Z')).toBe('4th Oct 2025');
      expect(formatDate('2025-10-11T12:00:00.000Z')).toBe('11th Oct 2025');
      expect(formatDate('2025-10-12T12:00:00.000Z')).toBe('12th Oct 2025');
      expect(formatDate('2025-10-13T12:00:00.000Z')).toBe('13th Oct 2025');
      expect(formatDate('2025-10-20T12:00:00.000Z')).toBe('20th Oct 2025');
    });

    it('should format date with 21st, 22nd, 23rd', () => {
      expect(formatDate('2025-10-21T12:00:00.000Z')).toBe('21st Oct 2025');
      expect(formatDate('2025-10-22T12:00:00.000Z')).toBe('22nd Oct 2025');
      expect(formatDate('2025-10-23T12:00:00.000Z')).toBe('23rd Oct 2025');
    });

    it('should format date with th suffix for 24-30', () => {
      expect(formatDate('2025-10-24T12:00:00.000Z')).toBe('24th Oct 2025');
      expect(formatDate('2025-10-30T12:00:00.000Z')).toBe('30th Oct 2025');
    });

    it('should format date with 31st', () => {
      const result = formatDate('2025-10-31T12:00:00.000Z');
      expect(result).toBe('31st Oct 2025');
    });

    it('should format different months correctly', () => {
      expect(formatDate('2025-01-15T12:00:00.000Z')).toBe('15th Jan 2025');
      expect(formatDate('2025-02-15T12:00:00.000Z')).toBe('15th Feb 2025');
      expect(formatDate('2025-03-15T12:00:00.000Z')).toBe('15th Mar 2025');
      expect(formatDate('2025-04-15T12:00:00.000Z')).toBe('15th Apr 2025');
      expect(formatDate('2025-05-15T12:00:00.000Z')).toBe('15th May 2025');
      expect(formatDate('2025-06-15T12:00:00.000Z')).toBe('15th Jun 2025');
      expect(formatDate('2025-07-15T12:00:00.000Z')).toBe('15th Jul 2025');
      expect(formatDate('2025-08-15T12:00:00.000Z')).toBe('15th Aug 2025');
      expect(formatDate('2025-09-15T12:00:00.000Z')).toBe('15th Sep 2025');
      expect(formatDate('2025-11-15T12:00:00.000Z')).toBe('15th Nov 2025');
      expect(formatDate('2025-12-15T12:00:00.000Z')).toBe('15th Dec 2025');
    });

    it('should handle different years', () => {
      expect(formatDate('2024-01-01T12:00:00.000Z')).toBe('1st Jan 2024');
      expect(formatDate('2026-12-31T12:00:00.000Z')).toBe('31st Dec 2026');
    });

    it('should handle leap year dates', () => {
      const result = formatDate('2024-02-29T12:00:00.000Z');
      expect(result).toBe('29th Feb 2024');
    });
  });

  describe('formatTimeOfDay', () => {
    it('should return Morning for hours 5-11', () => {
      expect(formatTimeOfDay('2025-10-15T05:00:00.000Z')).toBe('Morning');
      expect(formatTimeOfDay('2025-10-15T08:00:00.000Z')).toBe('Morning');
      expect(formatTimeOfDay('2025-10-15T11:59:00.000Z')).toBe('Morning');
    });

    it('should return Afternoon for hours 12-16', () => {
      expect(formatTimeOfDay('2025-10-15T12:00:00.000Z')).toBe('Afternoon');
      expect(formatTimeOfDay('2025-10-15T14:00:00.000Z')).toBe('Afternoon');
      expect(formatTimeOfDay('2025-10-15T16:59:00.000Z')).toBe('Afternoon');
    });

    it('should return Evening for hours 17-20', () => {
      expect(formatTimeOfDay('2025-10-15T17:00:00.000Z')).toBe('Evening');
      expect(formatTimeOfDay('2025-10-15T19:00:00.000Z')).toBe('Evening');
      expect(formatTimeOfDay('2025-10-15T20:59:00.000Z')).toBe('Evening');
    });

    it('should return Night for hours 21-4', () => {
      expect(formatTimeOfDay('2025-10-15T21:00:00.000Z')).toBe('Night');
      expect(formatTimeOfDay('2025-10-15T23:00:00.000Z')).toBe('Night');
      expect(formatTimeOfDay('2025-10-15T00:00:00.000Z')).toBe('Night');
      expect(formatTimeOfDay('2025-10-15T04:59:00.000Z')).toBe('Night');
    });

    it('should handle boundary conditions', () => {
      expect(formatTimeOfDay('2025-10-15T04:59:59.999Z')).toBe('Night');
      expect(formatTimeOfDay('2025-10-15T05:00:00.000Z')).toBe('Morning');
      expect(formatTimeOfDay('2025-10-15T11:59:59.999Z')).toBe('Morning');
      expect(formatTimeOfDay('2025-10-15T12:00:00.000Z')).toBe('Afternoon');
      expect(formatTimeOfDay('2025-10-15T16:59:59.999Z')).toBe('Afternoon');
      expect(formatTimeOfDay('2025-10-15T17:00:00.000Z')).toBe('Evening');
      expect(formatTimeOfDay('2025-10-15T20:59:59.999Z')).toBe('Evening');
      expect(formatTimeOfDay('2025-10-15T21:00:00.000Z')).toBe('Night');
    });
  });

  describe('formatDateTime', () => {
    it('should combine date and time of day', () => {
      const result = formatDateTime('2025-10-15T08:00:00.000Z');
      expect(result).toBe('15th Oct 2025, Morning');
    });

    it('should format afternoon datetime', () => {
      const result = formatDateTime('2025-10-15T14:00:00.000Z');
      expect(result).toBe('15th Oct 2025, Afternoon');
    });

    it('should format evening datetime', () => {
      const result = formatDateTime('2025-10-15T19:00:00.000Z');
      expect(result).toBe('15th Oct 2025, Evening');
    });

    it('should format night datetime', () => {
      const result = formatDateTime('2025-10-15T23:00:00.000Z');
      expect(result).toBe('15th Oct 2025, Night');
    });

    it('should handle different dates', () => {
      expect(formatDateTime('2024-01-01T05:00:00.000Z')).toBe('1st Jan 2024, Morning');
      expect(formatDateTime('2025-12-31T17:00:00.000Z')).toBe('31st Dec 2025, Evening');
    });
  });

  describe('getTimeOfDayCategory', () => {
    it('should return morning for UTC hours 5-11', () => {
      expect(getTimeOfDayCategory('2025-10-15T05:00:00.000Z')).toBe('morning');
      expect(getTimeOfDayCategory('2025-10-15T08:00:00.000Z')).toBe('morning');
      expect(getTimeOfDayCategory('2025-10-15T11:59:00.000Z')).toBe('morning');
    });

    it('should return afternoon for UTC hours 12-16', () => {
      expect(getTimeOfDayCategory('2025-10-15T12:00:00.000Z')).toBe('afternoon');
      expect(getTimeOfDayCategory('2025-10-15T14:00:00.000Z')).toBe('afternoon');
      expect(getTimeOfDayCategory('2025-10-15T16:59:00.000Z')).toBe('afternoon');
    });

    it('should return evening for UTC hours 17-20', () => {
      expect(getTimeOfDayCategory('2025-10-15T17:00:00.000Z')).toBe('evening');
      expect(getTimeOfDayCategory('2025-10-15T19:00:00.000Z')).toBe('evening');
      expect(getTimeOfDayCategory('2025-10-15T20:59:00.000Z')).toBe('evening');
    });

    it('should return night for UTC hours 21-4', () => {
      expect(getTimeOfDayCategory('2025-10-15T21:00:00.000Z')).toBe('night');
      expect(getTimeOfDayCategory('2025-10-15T23:00:00.000Z')).toBe('night');
      expect(getTimeOfDayCategory('2025-10-15T00:00:00.000Z')).toBe('night');
      expect(getTimeOfDayCategory('2025-10-15T04:59:00.000Z')).toBe('night');
    });

    it('should use UTC hours (different from formatTimeOfDay)', () => {
      // This function explicitly uses getUTCHours()
      const result = getTimeOfDayCategory('2025-10-15T12:00:00.000Z');
      expect(result).toBe('afternoon');
    });

    it('should handle boundary conditions', () => {
      expect(getTimeOfDayCategory('2025-10-15T04:59:59.999Z')).toBe('night');
      expect(getTimeOfDayCategory('2025-10-15T05:00:00.000Z')).toBe('morning');
      expect(getTimeOfDayCategory('2025-10-15T11:59:59.999Z')).toBe('morning');
      expect(getTimeOfDayCategory('2025-10-15T12:00:00.000Z')).toBe('afternoon');
      expect(getTimeOfDayCategory('2025-10-15T16:59:59.999Z')).toBe('afternoon');
      expect(getTimeOfDayCategory('2025-10-15T17:00:00.000Z')).toBe('evening');
      expect(getTimeOfDayCategory('2025-10-15T20:59:59.999Z')).toBe('evening');
      expect(getTimeOfDayCategory('2025-10-15T21:00:00.000Z')).toBe('night');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const result = formatDate('invalid-date');
      expect(result).toContain('NaN');
    });

    it('should handle very old dates', () => {
      const result = formatDate('1900-01-01T00:00:00.000Z');
      expect(result).toBe('1st Jan 1900');
    });

    it('should handle far future dates', () => {
      const result = formatDate('2100-12-31T23:59:59.999Z');
      expect(result).toBe('31st Dec 2100');
    });
  });
});
