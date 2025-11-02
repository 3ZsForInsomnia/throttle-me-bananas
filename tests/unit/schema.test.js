import { describe, it, expect } from '@jest/globals';
import {
  validateRuleGroup,
  validateConfiguration,
  validateAccessLog,
  STORAGE_KEYS,
  STORAGE_VERSION,
  DEFAULT_CONFIGURATION
} from '../../src/storage/schema.js';

describe('schema', () => {
  describe('validateRuleGroup', () => {
    it('validates a valid rule group', () => {
      const validGroup = {
        name: 'Test Rule',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      
      const result = validateRuleGroup(validGroup);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates a rule group with schedule', () => {
      const validGroup = {
        name: 'Work Hours',
        duration: 480,
        maxAccesses: 10,
        strictMode: false,
        sites: ['slack.com', 'email.com'],
        schedule: {
          days: [1, 2, 3, 4, 5],
          times: ['0900-1700']
        }
      };
      
      const result = validateRuleGroup(validGroup);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates a rule group with multiple sites', () => {
      const validGroup = {
        name: 'Social Media',
        duration: 120,
        maxAccesses: 5,
        strictMode: true,
        sites: ['twitter.com', 'facebook.com', 'instagram.com'],
        schedule: null
      };
      
      const result = validateRuleGroup(validGroup);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects null or undefined', () => {
      expect(validateRuleGroup(null).valid).toBe(false);
      expect(validateRuleGroup(undefined).valid).toBe(false);
      expect(validateRuleGroup(null).errors[0]).toContain('must be an object');
    });

    it('rejects non-object values', () => {
      expect(validateRuleGroup('string').valid).toBe(false);
      expect(validateRuleGroup(123).valid).toBe(false);
      expect(validateRuleGroup([]).valid).toBe(false);
    });

    it('rejects missing or empty name', () => {
      const group = {
        name: '',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('rejects whitespace-only name', () => {
      const group = {
        name: '   ',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('rejects invalid duration values', () => {
      const testCases = [
        { duration: 0, desc: 'zero' },
        { duration: -5, desc: 'negative' },
        { duration: 'string', desc: 'string' },
        { duration: null, desc: 'null' }
      ];
      
      testCases.forEach(({ duration, desc }) => {
        const group = {
          name: 'Test',
          duration,
          maxAccesses: 3,
          strictMode: false,
          sites: ['example.com'],
          schedule: null
        };
        
        const result = validateRuleGroup(group);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Duration'))).toBe(true);
      });
    });

    it('rejects invalid maxAccesses values', () => {
      const testCases = [
        { maxAccesses: 0, desc: 'zero' },
        { maxAccesses: -1, desc: 'negative' },
        { maxAccesses: 'five', desc: 'string' },
        { maxAccesses: null, desc: 'null' }
      ];
      
      testCases.forEach(({ maxAccesses, desc }) => {
        const group = {
          name: 'Test',
          duration: 60,
          maxAccesses,
          strictMode: false,
          sites: ['example.com'],
          schedule: null
        };
        
        const result = validateRuleGroup(group);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Max accesses'))).toBe(true);
      });
    });

    it('rejects non-boolean strictMode', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: 'true',
        sites: ['example.com'],
        schedule: null
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Strict mode'))).toBe(true);
    });

    it('rejects missing or empty sites array', () => {
      const noSites = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: [],
        schedule: null
      };
      
      const result1 = validateRuleGroup(noSites);
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.includes('Sites'))).toBe(true);
      
      const missingSites = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        schedule: null
      };
      
      const result2 = validateRuleGroup(missingSites);
      expect(result2.valid).toBe(false);
    });

    it('rejects non-array sites', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: 'example.com',
        schedule: null
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Sites'))).toBe(true);
    });

    it('rejects empty or non-string site entries', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com', '', '  ', 123, null],
        schedule: null
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('index 1'))).toBe(true);
      expect(result.errors.some(e => e.includes('index 2'))).toBe(true);
      expect(result.errors.some(e => e.includes('index 3'))).toBe(true);
      expect(result.errors.some(e => e.includes('index 4'))).toBe(true);
    });

    it('rejects invalid schedule days', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: {
          days: [1, 2, 7], // 7 is invalid
          times: ['0900-1700']
        }
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('days') && e.includes('0') && e.includes('6'))).toBe(true);
    });

    it('rejects negative schedule days', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: {
          days: [1, 2, -1],
          times: ['0900-1700']
        }
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('days'))).toBe(true);
    });

    it('rejects non-array schedule days', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: {
          days: 'Monday',
          times: ['0900-1700']
        }
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('days') && e.includes('array'))).toBe(true);
    });

    it('rejects invalid time range format', () => {
      const invalidFormats = [
        '9:00-17:00',  // Wrong format
        '900-1700',    // Missing digit
        '09001700',    // No separator
        '0900-17:00',  // Mixed format
        'morning'      // Not a time
      ];
      
      invalidFormats.forEach(timeFormat => {
        const group = {
          name: 'Test',
          duration: 60,
          maxAccesses: 3,
          strictMode: false,
          sites: ['example.com'],
          schedule: {
            days: [1, 2, 3],
            times: [timeFormat]
          }
        };
        
        const result = validateRuleGroup(group);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('format HHMM-HHMM'))).toBe(true);
      });
    });

    it('rejects non-array schedule times', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: {
          days: [1, 2, 3],
          times: '0900-1700'
        }
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('times') && e.includes('array'))).toBe(true);
    });

    it('accepts valid schedule with multiple time ranges', () => {
      const group = {
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: {
          days: [1, 2, 3, 4, 5],
          times: ['0900-1200', '1300-1700']
        }
      };
      
      const result = validateRuleGroup(group);
      expect(result.valid).toBe(true);
    });

    it('accumulates multiple errors', () => {
      const badGroup = {
        name: '',
        duration: -5,
        maxAccesses: 0,
        strictMode: 'yes',
        sites: [],
        schedule: {
          days: [7, 8],
          times: ['invalid']
        }
      };
      
      const result = validateRuleGroup(badGroup);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });
  });

  describe('validateConfiguration', () => {
    it('validates a valid configuration', () => {
      const config = {
        groups: [
          {
            name: 'Test',
            duration: 60,
            maxAccesses: 3,
            strictMode: false,
            sites: ['example.com'],
            schedule: null
          }
        ]
      };
      
      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates configuration with multiple groups', () => {
      const config = {
        groups: [
          {
            name: 'Rule 1',
            duration: 60,
            maxAccesses: 3,
            strictMode: false,
            sites: ['example.com'],
            schedule: null
          },
          {
            name: 'Rule 2',
            duration: 120,
            maxAccesses: 5,
            strictMode: true,
            sites: ['test.com'],
            schedule: null
          }
        ]
      };
      
      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('validates empty groups array', () => {
      const config = { groups: [] };
      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('rejects null or undefined config', () => {
      expect(validateConfiguration(null).valid).toBe(false);
      expect(validateConfiguration(undefined).valid).toBe(false);
    });

    it('rejects non-object config', () => {
      expect(validateConfiguration('config').valid).toBe(false);
      expect(validateConfiguration([]).valid).toBe(false);
    });

    it('rejects missing groups array', () => {
      const config = { notGroups: [] };
      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('groups array');
    });

    it('rejects non-array groups', () => {
      const config = { groups: 'not an array' };
      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('groups array');
    });

    it('rejects config with invalid groups', () => {
      const config = {
        groups: [
          {
            name: 'Valid',
            duration: 60,
            maxAccesses: 3,
            strictMode: false,
            sites: ['example.com'],
            schedule: null
          },
          {
            name: '',
            duration: -1,
            maxAccesses: 0,
            strictMode: false,
            sites: [],
            schedule: null
          }
        ]
      };
      
      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Group 1'))).toBe(true);
    });

    it('includes group name in error messages', () => {
      const config = {
        groups: [
          {
            name: 'Bad Rule',
            duration: -5,
            maxAccesses: 3,
            strictMode: false,
            sites: ['example.com'],
            schedule: null
          }
        ]
      };
      
      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Bad Rule'))).toBe(true);
    });

    it('handles unnamed groups gracefully', () => {
      const config = {
        groups: [
          {
            duration: 60,
            maxAccesses: 3,
            strictMode: false,
            sites: ['example.com'],
            schedule: null
          }
        ]
      };
      
      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unnamed'))).toBe(true);
    });
  });

  describe('validateAccessLog', () => {
    it('validates a valid access log', () => {
      const log = {
        site: 'example.com',
        timestamp: Date.now(),
        tabId: 123
      };
      
      const result = validateAccessLog(log);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects null or undefined', () => {
      expect(validateAccessLog(null).valid).toBe(false);
      expect(validateAccessLog(undefined).valid).toBe(false);
    });

    it('rejects non-object values', () => {
      expect(validateAccessLog('string').valid).toBe(false);
      expect(validateAccessLog(123).valid).toBe(false);
      expect(validateAccessLog([]).valid).toBe(false);
    });

    it('rejects missing or empty site', () => {
      const log = {
        site: '',
        timestamp: Date.now(),
        tabId: 123
      };
      
      const result = validateAccessLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('site'))).toBe(true);
    });

    it('rejects whitespace-only site', () => {
      const log = {
        site: '   ',
        timestamp: Date.now(),
        tabId: 123
      };
      
      const result = validateAccessLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('site'))).toBe(true);
    });

    it('rejects non-string site', () => {
      const log = {
        site: 123,
        timestamp: Date.now(),
        tabId: 456
      };
      
      const result = validateAccessLog(log);
      expect(result.valid).toBe(false);
    });

    it('rejects invalid timestamp values', () => {
      const testCases = [
        { timestamp: 0, desc: 'zero' },
        { timestamp: -100, desc: 'negative' },
        { timestamp: 'now', desc: 'string' },
        { timestamp: null, desc: 'null' }
      ];
      
      testCases.forEach(({ timestamp, desc }) => {
        const log = {
          site: 'example.com',
          timestamp,
          tabId: 123
        };
        
        const result = validateAccessLog(log);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
      });
    });

    it('rejects non-number tabId', () => {
      const log = {
        site: 'example.com',
        timestamp: Date.now(),
        tabId: 'tab123'
      };
      
      const result = validateAccessLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tabId'))).toBe(true);
    });

    it('accepts tabId of 0', () => {
      const log = {
        site: 'example.com',
        timestamp: Date.now(),
        tabId: 0
      };
      
      const result = validateAccessLog(log);
      expect(result.valid).toBe(true);
    });

    it('accumulates multiple errors', () => {
      const badLog = {
        site: '',
        timestamp: -1,
        tabId: 'invalid'
      };
      
      const result = validateAccessLog(badLog);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe('constants', () => {
    it('exports STORAGE_KEYS', () => {
      expect(STORAGE_KEYS).toBeDefined();
      expect(STORAGE_KEYS.CONFIGURATION).toBe('configuration');
      expect(STORAGE_KEYS.ACCESS_LOGS).toBe('accessLogs');
      expect(STORAGE_KEYS.VERSION).toBe('storageVersion');
    });

    it('exports STORAGE_VERSION', () => {
      expect(STORAGE_VERSION).toBeDefined();
      expect(typeof STORAGE_VERSION).toBe('number');
      expect(STORAGE_VERSION).toBeGreaterThan(0);
    });

    it('exports DEFAULT_CONFIGURATION', () => {
      expect(DEFAULT_CONFIGURATION).toBeDefined();
      expect(DEFAULT_CONFIGURATION.groups).toBeDefined();
      expect(Array.isArray(DEFAULT_CONFIGURATION.groups)).toBe(true);
      
      // Validate that default config is actually valid
      const result = validateConfiguration(DEFAULT_CONFIGURATION);
      expect(result.valid).toBe(true);
    });
  });
});
