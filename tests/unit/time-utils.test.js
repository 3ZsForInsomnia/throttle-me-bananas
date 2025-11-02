import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { parseTimeRange, isTimeInRange, isRuleActiveNow } from '../../src/utils/time-utils.js';

describe('time-utils', () => {
  describe('parseTimeRange', () => {
    it('parses standard time range', () => {
      const result = parseTimeRange('0900-1700');
      expect(result).toEqual({
        start: { hours: 9, minutes: 0 },
        end: { hours: 17, minutes: 0 }
      });
    });

    it('parses midnight to midnight', () => {
      const result = parseTimeRange('0000-2400');
      expect(result).toEqual({
        start: { hours: 0, minutes: 0 },
        end: { hours: 24, minutes: 0 }
      });
    });

    it('parses times with minutes', () => {
      const result = parseTimeRange('0930-1745');
      expect(result).toEqual({
        start: { hours: 9, minutes: 30 },
        end: { hours: 17, minutes: 45 }
      });
    });

    it('handles edge times', () => {
      expect(parseTimeRange('0000-0001')).toEqual({
        start: { hours: 0, minutes: 0 },
        end: { hours: 0, minutes: 1 }
      });
      
      expect(parseTimeRange('2358-2359')).toEqual({
        start: { hours: 23, minutes: 58 },
        end: { hours: 23, minutes: 59 }
      });
    });
  });

  describe('isTimeInRange', () => {
    it('returns true when time is within range', () => {
      const currentTime = new Date('2024-01-01T10:30:00');
      const start = { hours: 9, minutes: 0 };
      const end = { hours: 17, minutes: 0 };
      
      expect(isTimeInRange(currentTime, start, end)).toBe(true);
    });

    it('returns true at exact start time', () => {
      const currentTime = new Date('2024-01-01T09:00:00');
      const start = { hours: 9, minutes: 0 };
      const end = { hours: 17, minutes: 0 };
      
      expect(isTimeInRange(currentTime, start, end)).toBe(true);
    });

    it('returns true at exact end time', () => {
      const currentTime = new Date('2024-01-01T17:00:00');
      const start = { hours: 9, minutes: 0 };
      const end = { hours: 17, minutes: 0 };
      
      expect(isTimeInRange(currentTime, start, end)).toBe(true);
    });

    it('returns false before start time', () => {
      const currentTime = new Date('2024-01-01T08:59:00');
      const start = { hours: 9, minutes: 0 };
      const end = { hours: 17, minutes: 0 };
      
      expect(isTimeInRange(currentTime, start, end)).toBe(false);
    });

    it('returns false after end time', () => {
      const currentTime = new Date('2024-01-01T17:01:00');
      const start = { hours: 9, minutes: 0 };
      const end = { hours: 17, minutes: 0 };
      
      expect(isTimeInRange(currentTime, start, end)).toBe(false);
    });

    it('handles minute precision', () => {
      const currentTime = new Date('2024-01-01T09:30:00');
      const start = { hours: 9, minutes: 30 };
      const end = { hours: 9, minutes: 45 };
      
      expect(isTimeInRange(currentTime, start, end)).toBe(true);
    });
  });

  describe('isRuleActiveNow', () => {
    let originalDate;

    beforeEach(() => {
      // Save original Date
      originalDate = global.Date;
    });

    afterEach(() => {
      // Restore original Date
      global.Date = originalDate;
    });

    it('returns true when no schedule provided', () => {
      expect(isRuleActiveNow(null)).toBe(true);
      expect(isRuleActiveNow(undefined)).toBe(true);
      expect(isRuleActiveNow({})).toBe(true);
    });

    it('returns true when current day and time match', () => {
      // Mock Monday at 10:00 AM
      const mockDate = new Date('2024-01-01T10:00:00'); // Monday
      global.Date = class extends originalDate {
        constructor() {
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };

      const schedule = {
        days: [1], // Monday
        times: ['0900-1700']
      };

      expect(isRuleActiveNow(schedule)).toBe(true);
    });

    it('returns false when day does not match', () => {
      // Mock Saturday
      const mockDate = new Date('2024-01-06T10:00:00'); // Saturday
      global.Date = class extends originalDate {
        constructor() {
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };

      const schedule = {
        days: [1, 2, 3, 4, 5], // Mon-Fri
        times: ['0900-1700']
      };

      expect(isRuleActiveNow(schedule)).toBe(false);
    });

    it('returns false when time does not match', () => {
      // Mock Monday at 8:00 AM (before schedule)
      const mockDate = new Date('2024-01-01T08:00:00');
      global.Date = class extends originalDate {
        constructor() {
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };

      const schedule = {
        days: [1], // Monday
        times: ['0900-1700']
      };

      expect(isRuleActiveNow(schedule)).toBe(false);
    });

    it('checks multiple time ranges', () => {
      // Mock Monday at 1:00 PM
      const mockDate = new Date('2024-01-01T13:00:00');
      global.Date = class extends originalDate {
        constructor() {
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };

      const schedule = {
        days: [1],
        times: ['0900-1200', '1300-1700'] // Lunch break
      };

      expect(isRuleActiveNow(schedule)).toBe(true);
    });

    it('returns false when between time ranges', () => {
      // Mock Monday at 12:30 PM (lunch break)
      const mockDate = new Date('2024-01-01T12:30:00');
      global.Date = class extends originalDate {
        constructor() {
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };

      const schedule = {
        days: [1],
        times: ['0900-1200', '1300-1700']
      };

      expect(isRuleActiveNow(schedule)).toBe(false);
    });

    it('handles all-day schedules', () => {
      const mockDate = new Date('2024-01-01T23:59:00'); // Late Monday
      global.Date = class extends originalDate {
        constructor() {
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };

      const schedule = {
        days: [1],
        times: ['0000-2359']
      };

      expect(isRuleActiveNow(schedule)).toBe(true);
    });
  });
});
