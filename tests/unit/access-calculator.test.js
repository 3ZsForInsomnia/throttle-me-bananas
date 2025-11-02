import { describe, it, expect } from '@jest/globals';
import { filterAccessesInWindow, calculateRemainingAccesses } from '../../src/utils/access-calculator.js';

describe('access-calculator', () => {
  describe('filterAccessesInWindow', () => {
    it('returns accesses within time window', () => {
      const now = Date.now();
      const accesses = [
        { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },  // 5 min ago
        { site: 'example.com', timestamp: now - 30 * 60 * 1000, tabId: 2 }, // 30 min ago
        { site: 'example.com', timestamp: now - 120 * 60 * 1000, tabId: 3 } // 2 hours ago
      ];

      const result = filterAccessesInWindow(accesses, 60); // 60 minute window
      
      expect(result).toHaveLength(2);
      expect(result[0].tabId).toBe(1);
      expect(result[1].tabId).toBe(2);
    });

    it('returns empty array when all accesses are old', () => {
      const now = Date.now();
      const accesses = [
        { site: 'example.com', timestamp: now - 120 * 60 * 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 180 * 60 * 1000, tabId: 2 }
      ];

      const result = filterAccessesInWindow(accesses, 60);
      
      expect(result).toHaveLength(0);
    });

    it('returns all accesses when all are within window', () => {
      const now = Date.now();
      const accesses = [
        { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },
        { site: 'example.com', timestamp: now - 10 * 60 * 1000, tabId: 2 }
      ];

      const result = filterAccessesInWindow(accesses, 60);
      
      expect(result).toHaveLength(2);
    });

    it('handles empty array', () => {
      const result = filterAccessesInWindow([], 60);
      expect(result).toHaveLength(0);
    });

    it('handles edge case at exact boundary', () => {
      const now = Date.now();
      const exactlyAtBoundary = now - 60 * 60 * 1000; // Exactly 60 minutes ago
      const accesses = [
        { site: 'example.com', timestamp: exactlyAtBoundary, tabId: 1 }
      ];

      const result = filterAccessesInWindow(accesses, 60);
      
      // Should include accesses at exact boundary
      expect(result).toHaveLength(1);
    });
  });

  describe('calculateRemainingAccesses', () => {
    describe('non-strict mode', () => {
      it('calculates remaining accesses correctly', () => {
        const now = Date.now();
        const accesses = [
          { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 1 }
        ];

        const remaining = calculateRemainingAccesses(
          accesses,
          3,           // maxAccesses
          60,          // duration
          false,       // strictMode
          ['example.com'],
          'example.com'
        );

        expect(remaining).toBe(2); // 3 - 1 = 2
      });

      it('returns 0 when at limit', () => {
        const now = Date.now();
        const accesses = [
          { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },
          { site: 'example.com', timestamp: now - 10 * 60 * 1000, tabId: 2 },
          { site: 'example.com', timestamp: now - 15 * 60 * 1000, tabId: 3 }
        ];

        const remaining = calculateRemainingAccesses(
          accesses,
          3,
          60,
          false,
          ['example.com'],
          'example.com'
        );

        expect(remaining).toBe(0);
      });

      it('ignores accesses to other sites', () => {
        const now = Date.now();
        const accesses = [
          { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },
          { site: 'other.com', timestamp: now - 10 * 60 * 1000, tabId: 2 },
          { site: 'other.com', timestamp: now - 15 * 60 * 1000, tabId: 3 }
        ];

        const remaining = calculateRemainingAccesses(
          accesses,
          3,
          60,
          false,
          ['example.com', 'other.com'],
          'example.com'
        );

        expect(remaining).toBe(2); // Only 1 access to example.com
      });

      it('ignores old accesses outside window', () => {
        const now = Date.now();
        const accesses = [
          { site: 'example.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },
          { site: 'example.com', timestamp: now - 120 * 60 * 1000, tabId: 2 } // Too old
        ];

        const remaining = calculateRemainingAccesses(
          accesses,
          3,
          60,
          false,
          ['example.com'],
          'example.com'
        );

        expect(remaining).toBe(2); // Only 1 recent access counts
      });
    });

    describe('strict mode', () => {
      it('counts accesses across all sites in group', () => {
        const now = Date.now();
        const accesses = [
          { site: 'twitter.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },
          { site: 'facebook.com', timestamp: now - 10 * 60 * 1000, tabId: 2 },
          { site: 'instagram.com', timestamp: now - 15 * 60 * 1000, tabId: 3 }
        ];

        const remaining = calculateRemainingAccesses(
          accesses,
          5,
          60,
          true, // strict mode
          ['twitter.com', 'facebook.com', 'instagram.com'],
          'twitter.com'
        );

        expect(remaining).toBe(2); // 5 - 3 = 2 (counted all 3 sites)
      });

      it('returns 0 when strict limit reached across sites', () => {
        const now = Date.now();
        const accesses = [
          { site: 'twitter.com', timestamp: now - 5 * 60 * 1000, tabId: 1 },
          { site: 'twitter.com', timestamp: now - 10 * 60 * 1000, tabId: 2 },
          { site: 'facebook.com', timestamp: now - 15 * 60 * 1000, tabId: 3 },
          { site: 'instagram.com', timestamp: now - 20 * 60 * 1000, tabId: 4 },
          { site: 'instagram.com', timestamp: now - 25 * 60 * 1000, tabId: 5 }
        ];

        const remaining = calculateRemainingAccesses(
          accesses,
          5,
          60,
          true,
          ['twitter.com', 'facebook.com', 'instagram.com'],
          'twitter.com'
        );

        expect(remaining).toBe(0); // 5 total accesses across all sites
      });
    });

    describe('edge cases', () => {
      it('returns maxAccesses when no accesses exist', () => {
        const remaining = calculateRemainingAccesses(
          [],
          3,
          60,
          false,
          ['example.com'],
          'example.com'
        );

        expect(remaining).toBe(3);
      });

      it('never returns negative numbers', () => {
        const now = Date.now();
        const accesses = Array.from({ length: 10 }, (_, i) => ({
          site: 'example.com',
          timestamp: now - i * 60 * 1000,
          tabId: i + 1
        }));

        const remaining = calculateRemainingAccesses(
          accesses,
          3,
          60,
          false,
          ['example.com'],
          'example.com'
        );

        expect(remaining).toBe(0); // Should be 0, not negative
      });
    });
  });
});
