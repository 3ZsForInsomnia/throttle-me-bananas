import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getActiveRulesForSite,
  shouldBlockAccess,
  getMostRestrictiveCount,
  calculateUnblockTime
} from '../../src/background/rule-engine.js';
import { mockRuleGroups } from '../fixtures/test-data.js';

describe('rule-engine', () => {
  // Store original Date for restoration
  const OriginalDate = Date;
  let mockDate;

  beforeEach(() => {
    // Mock current time to Monday, 10:00 AM for schedule tests
    mockDate = new Date('2024-01-01T10:00:00'); // This is a Monday
    global.Date = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate;
        }
        return new OriginalDate(...args);
      }
      static now() {
        return mockDate.getTime();
      }
    };
  });

  afterEach(() => {
    // Restore original Date
    global.Date = OriginalDate;
  });

  describe('getActiveRulesForSite', () => {
    it('returns empty array when config is null', () => {
      const result = getActiveRulesForSite('example.com', null);
      expect(result).toEqual([]);
    });

    it('returns empty array when config has no groups', () => {
      const result = getActiveRulesForSite('example.com', { groups: [] });
      expect(result).toEqual([]);
    });

    it('returns empty array when site does not match any rule', () => {
      const config = { groups: [mockRuleGroups.simple] };
      const result = getActiveRulesForSite('nomatch.com', config);
      expect(result).toEqual([]);
    });

    it('returns matching rule when site matches', () => {
      const config = { groups: [mockRuleGroups.simple] };
      const result = getActiveRulesForSite('example.com', config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Simple Rule');
    });

    it('returns multiple matching rules', () => {
      const rule1 = {
        name: 'Rule 1',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      const rule2 = {
        name: 'Rule 2',
        duration: 120,
        maxAccesses: 5,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      const config = { groups: [rule1, rule2] };
      const result = getActiveRulesForSite('example.com', config);
      expect(result).toHaveLength(2);
    });

    it('filters out inactive rules based on schedule', () => {
      // Current mock time is Monday 10:00 AM
      const config = { groups: [mockRuleGroups.withSchedule] };
      
      // This rule is active Mon-Fri 9-5, so should be active
      const result = getActiveRulesForSite('slack.com', config);
      expect(result).toHaveLength(1);
    });

    it('filters out rules with inactive schedule (weekend)', () => {
      // Set to Sunday
      mockDate = new Date('2024-01-07T10:00:00'); // Sunday
      
      const config = { groups: [mockRuleGroups.withSchedule] };
      const result = getActiveRulesForSite('slack.com', config);
      expect(result).toHaveLength(0);
    });

    it('filters out rules with inactive schedule (outside time range)', () => {
      // Set to Monday 8:00 AM (before 9:00 AM start)
      mockDate = new Date('2024-01-01T08:00:00');
      
      const config = { groups: [mockRuleGroups.withSchedule] };
      const result = getActiveRulesForSite('slack.com', config);
      expect(result).toHaveLength(0);
    });

    it('matches sites with subdomains', () => {
      const config = { groups: [mockRuleGroups.simple] };
      const result = getActiveRulesForSite('sub.example.com', config);
      expect(result).toHaveLength(1);
    });

    it('matches multiple sites in strict mode rule', () => {
      const config = { groups: [mockRuleGroups.strictMode] };
      
      expect(getActiveRulesForSite('twitter.com', config)).toHaveLength(1);
      expect(getActiveRulesForSite('facebook.com', config)).toHaveLength(1);
      expect(getActiveRulesForSite('instagram.com', config)).toHaveLength(1);
    });
  });

  describe('shouldBlockAccess', () => {
    it('allows access when no active rules', () => {
      const config = { groups: [] };
      const logs = [];
      const result = shouldBlockAccess('example.com', config, logs);
      
      expect(result.block).toBe(false);
    });

    it('allows access when under limit', () => {
      const config = { groups: [mockRuleGroups.simple] };
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 }
      ];
      
      const result = shouldBlockAccess('example.com', config, logs);
      expect(result.block).toBe(false);
    });

    it('blocks access when at limit', () => {
      const config = { groups: [mockRuleGroups.simple] }; // maxAccesses: 3
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 },
        { site: 'example.com', timestamp: now - 3000, tabId: 3 }
      ];
      
      const result = shouldBlockAccess('example.com', config, logs);
      expect(result.block).toBe(true);
      expect(result.ruleName).toBe('Simple Rule');
      expect(result.reason).toContain('Simple Rule');
    });

    it('blocks access when exceeded limit', () => {
      const config = { groups: [mockRuleGroups.simple] }; // maxAccesses: 3
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 },
        { site: 'example.com', timestamp: now - 3000, tabId: 3 },
        { site: 'example.com', timestamp: now - 4000, tabId: 4 }
      ];
      
      const result = shouldBlockAccess('example.com', config, logs);
      expect(result.block).toBe(true);
    });

    it('allows access when old logs are outside time window', () => {
      const config = { groups: [mockRuleGroups.simple] }; // duration: 60 minutes
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 }, // Recent
        { site: 'example.com', timestamp: now - 120 * 60 * 1000, tabId: 2 }, // 2 hours old
        { site: 'example.com', timestamp: now - 180 * 60 * 1000, tabId: 3 }  // 3 hours old
      ];
      
      const result = shouldBlockAccess('example.com', config, logs);
      expect(result.block).toBe(false); // Only 1 recent access, limit is 3
    });

    it('blocks based on most restrictive rule when multiple rules apply', () => {
      const strictRule = {
        name: 'Strict',
        duration: 60,
        maxAccesses: 2,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      const lenientRule = {
        name: 'Lenient',
        duration: 60,
        maxAccesses: 10,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      const config = { groups: [strictRule, lenientRule] };
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 }
      ];
      
      const result = shouldBlockAccess('example.com', config, logs);
      expect(result.block).toBe(true);
      expect(result.ruleName).toBe('Strict');
    });

    it('handles strict mode correctly (blocks all sites in group)', () => {
      const config = { groups: [mockRuleGroups.strictMode] }; // maxAccesses: 5
      const now = Date.now();
      const logs = [
        { site: 'twitter.com', timestamp: now - 1000, tabId: 1 },
        { site: 'facebook.com', timestamp: now - 2000, tabId: 2 },
        { site: 'instagram.com', timestamp: now - 3000, tabId: 3 },
        { site: 'twitter.com', timestamp: now - 4000, tabId: 4 },
        { site: 'facebook.com', timestamp: now - 5000, tabId: 5 }
      ];
      
      // 5 accesses across all sites, should block any of them
      expect(shouldBlockAccess('twitter.com', config, logs).block).toBe(true);
      expect(shouldBlockAccess('facebook.com', config, logs).block).toBe(true);
      expect(shouldBlockAccess('instagram.com', config, logs).block).toBe(true);
    });

    it('returns duration and maxAccesses in block result', () => {
      const config = { groups: [mockRuleGroups.simple] };
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 },
        { site: 'example.com', timestamp: now - 3000, tabId: 3 }
      ];
      
      const result = shouldBlockAccess('example.com', config, logs);
      expect(result.duration).toBe(60);
      expect(result.maxAccesses).toBe(3);
    });
  });

  describe('getMostRestrictiveCount', () => {
    it('returns null when no active rules', () => {
      const config = { groups: [] };
      const logs = [];
      const result = getMostRestrictiveCount('example.com', config, logs);
      
      expect(result).toBeNull();
    });

    it('returns remaining count for single rule', () => {
      const config = { groups: [mockRuleGroups.simple] }; // maxAccesses: 3
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 }
      ];
      
      const result = getMostRestrictiveCount('example.com', config, logs);
      expect(result).toBe(2); // 3 - 1 = 2
    });

    it('returns lowest remaining count when multiple rules apply', () => {
      const rule1 = {
        name: 'Rule 1',
        duration: 60,
        maxAccesses: 5,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      const rule2 = {
        name: 'Rule 2',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      };
      const config = { groups: [rule1, rule2] };
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 }
      ];
      
      const result = getMostRestrictiveCount('example.com', config, logs);
      expect(result).toBe(2); // Rule 2 is most restrictive: 3 - 1 = 2
    });

    it('returns 0 when at limit', () => {
      const config = { groups: [mockRuleGroups.simple] }; // maxAccesses: 3
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 },
        { site: 'example.com', timestamp: now - 3000, tabId: 3 }
      ];
      
      const result = getMostRestrictiveCount('example.com', config, logs);
      expect(result).toBe(0);
    });

    it('returns 0 when over limit (clamped to 0)', () => {
      const config = { groups: [mockRuleGroups.simple] }; // maxAccesses: 3
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 2000, tabId: 2 },
        { site: 'example.com', timestamp: now - 3000, tabId: 3 },
        { site: 'example.com', timestamp: now - 4000, tabId: 4 }
      ];
      
      const result = getMostRestrictiveCount('example.com', config, logs);
      expect(result).toBe(0); // calculateRemainingAccesses uses Math.max(0, remaining)
    });

    it('handles strict mode correctly', () => {
      const config = { groups: [mockRuleGroups.strictMode] }; // maxAccesses: 5, strict mode
      const now = Date.now();
      const logs = [
        { site: 'twitter.com', timestamp: now - 1000, tabId: 1 },
        { site: 'facebook.com', timestamp: now - 2000, tabId: 2 }
      ];
      
      // All sites in the group share the pool
      expect(getMostRestrictiveCount('twitter.com', config, logs)).toBe(3);
      expect(getMostRestrictiveCount('facebook.com', config, logs)).toBe(3);
      expect(getMostRestrictiveCount('instagram.com', config, logs)).toBe(3);
    });
  });

  describe('calculateUnblockTime', () => {
    it('returns null when no relevant logs', () => {
      const logs = [];
      const result = calculateUnblockTime('example.com', mockRuleGroups.simple, logs);
      
      expect(result).toBeNull();
    });

    it('calculates unblock time based on oldest access in window', () => {
      const now = Date.now();
      const oldestTime = now - 30 * 60 * 1000; // 30 minutes ago
      const logs = [
        { site: 'example.com', timestamp: oldestTime, tabId: 1 },
        { site: 'example.com', timestamp: now - 10 * 60 * 1000, tabId: 2 },
        { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 3 }
      ];
      
      const result = calculateUnblockTime('example.com', mockRuleGroups.simple, logs);
      
      // Should be oldestTime + 60 minutes
      const expectedTime = new Date(oldestTime + 60 * 60 * 1000);
      expect(result.getTime()).toBe(expectedTime.getTime());
    });

    it('handles strict mode by considering all sites in group', () => {
      const now = Date.now();
      const oldestTime = now - 40 * 60 * 1000; // 40 minutes ago
      const logs = [
        { site: 'twitter.com', timestamp: oldestTime, tabId: 1 },
        { site: 'facebook.com', timestamp: now - 20 * 60 * 1000, tabId: 2 },
        { site: 'instagram.com', timestamp: now - 10 * 60 * 1000, tabId: 3 }
      ];
      
      // Asking about facebook, but oldest is on twitter
      const result = calculateUnblockTime('facebook.com', mockRuleGroups.strictMode, logs);
      
      const expectedTime = new Date(oldestTime + 120 * 60 * 1000); // duration is 120 min
      expect(result.getTime()).toBe(expectedTime.getTime());
    });

    it('handles non-strict mode by only considering the specific site', () => {
      const now = Date.now();
      const logs = [
        { site: 'example.com', timestamp: now - 20 * 60 * 1000, tabId: 1 },
        { site: 'other.com', timestamp: now - 50 * 60 * 1000, tabId: 2 }
      ];
      
      const result = calculateUnblockTime('example.com', mockRuleGroups.simple, logs);
      
      // Should only consider example.com logs
      const expectedTime = new Date((now - 20 * 60 * 1000) + 60 * 60 * 1000);
      expect(result.getTime()).toBe(expectedTime.getTime());
    });

    it('uses the correct duration from the rule', () => {
      const now = Date.now();
      const oldestTime = now - 100 * 60 * 1000; // 100 minutes ago
      const logs = [
        { site: 'slack.com', timestamp: oldestTime, tabId: 1 }
      ];
      
      // withSchedule rule has duration of 480 minutes
      const result = calculateUnblockTime('slack.com', mockRuleGroups.withSchedule, logs);
      
      const expectedTime = new Date(oldestTime + 480 * 60 * 1000);
      expect(result.getTime()).toBe(expectedTime.getTime());
    });
  });
});
