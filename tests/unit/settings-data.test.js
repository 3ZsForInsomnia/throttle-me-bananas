import { describe, it, expect } from '@jest/globals';
import {
  formatDuration,
  parseDuration,
  getDayName,
  formatTimeRange,
  createDefaultRuleGroup
} from '../../src/pages/settings/settings-data.js';

describe('settings-data (pure functions)', () => {
  describe('formatDuration', () => {
    it('formats minutes when less than 60', () => {
      expect(formatDuration(1)).toBe('1 minute');
      expect(formatDuration(30)).toBe('30 minutes');
      expect(formatDuration(45)).toBe('45 minutes');
      expect(formatDuration(59)).toBe('59 minutes');
    });

    it('formats hours when exactly divisible by 60', () => {
      expect(formatDuration(60)).toBe('1 hour');
      expect(formatDuration(120)).toBe('2 hours');
      expect(formatDuration(180)).toBe('3 hours');
      expect(formatDuration(480)).toBe('8 hours');
    });

    it('formats hours and minutes when remainder exists', () => {
      expect(formatDuration(61)).toBe('1 hour 1 minute');
      expect(formatDuration(90)).toBe('1 hour 30 minutes');
      expect(formatDuration(125)).toBe('2 hours 5 minutes');
      expect(formatDuration(195)).toBe('3 hours 15 minutes');
    });

    it('uses singular for 1 hour', () => {
      expect(formatDuration(60)).toBe('1 hour');
      expect(formatDuration(61)).toBe('1 hour 1 minute');
    });

    it('uses plural for multiple hours', () => {
      expect(formatDuration(120)).toBe('2 hours');
      expect(formatDuration(180)).toBe('3 hours');
    });

    it('uses singular for 1 minute', () => {
      expect(formatDuration(1)).toBe('1 minute');
      expect(formatDuration(61)).toBe('1 hour 1 minute');
    });

    it('uses plural for multiple minutes', () => {
      expect(formatDuration(2)).toBe('2 minutes');
      expect(formatDuration(30)).toBe('30 minutes');
    });

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0 minutes');
    });

    it('handles large values', () => {
      expect(formatDuration(1440)).toBe('24 hours'); // 1 day
      expect(formatDuration(10080)).toBe('168 hours'); // 1 week
    });
  });

  describe('parseDuration', () => {
    it('parses hour format "Nh"', () => {
      expect(parseDuration('1h')).toBe(60);
      expect(parseDuration('2h')).toBe(120);
      expect(parseDuration('24h')).toBe(1440);
    });

    it('parses minute format "Nm"', () => {
      expect(parseDuration('30m')).toBe(30);
      expect(parseDuration('45m')).toBe(45);
      expect(parseDuration('90m')).toBe(90);
    });

    it('parses combined format "Nh Nm"', () => {
      expect(parseDuration('1h 30m')).toBe(90);
      expect(parseDuration('2h 15m')).toBe(135);
      expect(parseDuration('3h 45m')).toBe(225);
    });

    it('parses word format "N hours"', () => {
      expect(parseDuration('1 hour')).toBe(60);
      expect(parseDuration('2 hours')).toBe(120);
      expect(parseDuration('3 hours')).toBe(180);
    });

    it('parses word format "N minutes"', () => {
      expect(parseDuration('30 minutes')).toBe(30);
      expect(parseDuration('45 minutes')).toBe(45);
    });

    it('parses combined word format', () => {
      expect(parseDuration('1 hour 30 minutes')).toBe(90);
      expect(parseDuration('2 hours 45 minutes')).toBe(165);
    });

    it('is case insensitive', () => {
      expect(parseDuration('1H')).toBe(60);
      expect(parseDuration('30M')).toBe(30);
      expect(parseDuration('1H 30M')).toBe(90);
      expect(parseDuration('2 HOURS')).toBe(120);
    });

    it('handles extra whitespace', () => {
      expect(parseDuration('  1h  ')).toBe(60);
      expect(parseDuration('1h  30m')).toBe(90);
      expect(parseDuration('  2  hours  ')).toBe(120);
    });

    it('parses plain number as minutes', () => {
      expect(parseDuration('60')).toBe(60);
      expect(parseDuration('90')).toBe(90);
      expect(parseDuration('120')).toBe(120);
    });

    it('handles variant spellings', () => {
      expect(parseDuration('1hr')).toBe(60);
      expect(parseDuration('2hrs')).toBe(120);
      expect(parseDuration('30min')).toBe(30);
      expect(parseDuration('45mins')).toBe(45);
    });

    it('returns null for invalid input', () => {
      expect(parseDuration('abc')).toBeNull();
      expect(parseDuration('invalid')).toBeNull();
      expect(parseDuration('')).toBeNull();
      expect(parseDuration('   ')).toBeNull();
    });

    it('parses numbers from strings with negative signs (extracts positive number)', () => {
      // The regex (\d+) captures positive digits, so -1h extracts 1
      expect(parseDuration('-5')).toBeNull();
      expect(parseDuration('-1h')).toBe(60); // Extracts 1, ignores negative sign
    });

    it('returns null for zero', () => {
      expect(parseDuration('0')).toBeNull();
      expect(parseDuration('0h')).toBeNull();
    });

    it('handles only hours when minutes part is missing', () => {
      expect(parseDuration('2h 0m')).toBe(120);
    });

    it('handles only minutes when hours part is missing', () => {
      expect(parseDuration('0h 30m')).toBe(30);
    });
  });

  describe('getDayName', () => {
    it('returns correct day names', () => {
      expect(getDayName(0)).toBe('Sunday');
      expect(getDayName(1)).toBe('Monday');
      expect(getDayName(2)).toBe('Tuesday');
      expect(getDayName(3)).toBe('Wednesday');
      expect(getDayName(4)).toBe('Thursday');
      expect(getDayName(5)).toBe('Friday');
      expect(getDayName(6)).toBe('Saturday');
    });

    it('returns Unknown for invalid indices', () => {
      expect(getDayName(-1)).toBe('Unknown');
      expect(getDayName(7)).toBe('Unknown');
      expect(getDayName(100)).toBe('Unknown');
    });
  });

  describe('formatTimeRange', () => {
    it('formats standard business hours', () => {
      expect(formatTimeRange('0900-1700')).toBe('9:00 AM - 5:00 PM');
    });

    it('formats morning hours', () => {
      expect(formatTimeRange('0600-1200')).toBe('6:00 AM - 12:00 PM');
    });

    it('formats afternoon/evening hours', () => {
      expect(formatTimeRange('1300-2100')).toBe('1:00 PM - 9:00 PM');
    });

    it('formats midnight hour', () => {
      expect(formatTimeRange('0000-0100')).toBe('12:00 AM - 1:00 AM');
    });

    it('formats noon hour', () => {
      expect(formatTimeRange('1200-1300')).toBe('12:00 PM - 1:00 PM');
    });

    it('formats full day', () => {
      expect(formatTimeRange('0000-2359')).toBe('12:00 AM - 11:59 PM');
    });

    it('formats time with minutes', () => {
      expect(formatTimeRange('0930-1730')).toBe('9:30 AM - 5:30 PM');
      expect(formatTimeRange('0815-1645')).toBe('8:15 AM - 4:45 PM');
    });

    it('handles edge time 23:59', () => {
      expect(formatTimeRange('2300-2359')).toBe('11:00 PM - 11:59 PM');
    });

    it('handles early morning times', () => {
      expect(formatTimeRange('0100-0500')).toBe('1:00 AM - 5:00 AM');
    });

    it('handles late night times', () => {
      expect(formatTimeRange('2000-2359')).toBe('8:00 PM - 11:59 PM');
    });

    it('handles time crossing noon', () => {
      expect(formatTimeRange('1100-1300')).toBe('11:00 AM - 1:00 PM');
    });

    it('preserves minutes including :00', () => {
      const result = formatTimeRange('0900-1700');
      expect(result).toContain(':00');
    });
  });

  describe('createDefaultRuleGroup', () => {
    it('creates a valid default rule group', () => {
      const group = createDefaultRuleGroup();
      
      expect(group).toBeDefined();
      expect(group.name).toBe('New Rule');
      expect(group.duration).toBe(60);
      expect(group.maxAccesses).toBe(3);
      expect(group.strictMode).toBe(false);
      expect(Array.isArray(group.sites)).toBe(true);
      expect(group.sites).toEqual([]);
    });

    it('creates rule with all-day schedule', () => {
      const group = createDefaultRuleGroup();
      
      expect(group.schedule).toBeDefined();
      expect(group.schedule.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(group.schedule.times).toEqual(['0000-2359']);
    });

    it('creates a new object each time', () => {
      const group1 = createDefaultRuleGroup();
      const group2 = createDefaultRuleGroup();
      
      expect(group1).not.toBe(group2);
      expect(group1.sites).not.toBe(group2.sites);
      expect(group1.schedule).not.toBe(group2.schedule);
    });

    it('creates a valid rule group (passes validation)', () => {
      const group = createDefaultRuleGroup();
      
      // Basic validation checks
      expect(typeof group.name).toBe('string');
      expect(group.name.length).toBeGreaterThan(0);
      expect(typeof group.duration).toBe('number');
      expect(group.duration).toBeGreaterThan(0);
      expect(typeof group.maxAccesses).toBe('number');
      expect(group.maxAccesses).toBeGreaterThan(0);
      expect(typeof group.strictMode).toBe('boolean');
      expect(Array.isArray(group.sites)).toBe(true);
    });
  });
});
