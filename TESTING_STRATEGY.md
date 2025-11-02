# Testing Strategy

## Overview

This document outlines what should be tested and how. The goal is not 80%+ coverage, but a solid foundation to catch regressions when making changes.

## What to Test

### ✅ High Priority - Pure Functions (Perfect for Unit Tests)

These have **zero dependencies** on Chrome APIs and are **deterministic**:

#### 1. **URL Matcher** (`src/utils/url-matcher.js`)
**Why test**: Core logic for site matching, easy to break
```javascript
// Test cases:
- extractDomain(): valid URLs, invalid URLs, edge cases
- extractPath(): various URL formats
- matchesSitePattern(): 
  - Domain-only patterns (discord.com)
  - Path-specific patterns (discord.com/channels)
  - Subdomain matching
  - Edge cases (empty, invalid)
```

#### 2. **Time Utils** (`src/utils/time-utils.js`)
**Why test**: Time calculations are tricky, especially edge cases
```javascript
// Test cases:
- parseTimeRange(): valid formats, edge times (0000, 2359)
- isTimeInRange(): boundary conditions, edge times
- isRuleActiveNow(): 
  - No schedule (always active)
  - Day boundaries
  - Time boundaries
  - Multiple time ranges
  - Mock Date.now()
```

#### 3. **Access Calculator** (`src/utils/access-calculator.js`)
**Why test**: Business logic critical to correctness
```javascript
// Test cases:
- filterAccessesInWindow(): 
  - Empty arrays
  - All in window
  - All out of window
  - Mixed
- calculateRemainingAccesses():
  - Non-strict mode (per-site)
  - Strict mode (shared pool)
  - Edge: exactly at limit
  - Edge: no accesses
  - Edge: all expired
```

#### 4. **Rule Engine** (`src/background/rule-engine.js`)
**Why test**: Combines all utilities, complex logic
```javascript
// Test cases:
- getActiveRulesForSite():
  - No rules
  - Schedule inactive
  - Site doesn't match
  - Multiple matching rules
- shouldBlockAccess():
  - Should allow (under limit)
  - Should block (at limit)
  - Multiple rules, strictest wins
- getMostRestrictiveCount():
  - Multiple rules, lowest wins
  - No active rules (returns null)
```

#### 5. **Schema Validation** (`src/storage/schema.js`)
**Why test**: Prevents bad data from corrupting storage
```javascript
// Test cases:
- validateRuleGroup():
  - Valid group
  - Invalid: empty name, negative duration, etc.
  - Invalid schedule format
- validateConfiguration():
  - Valid config
  - Multiple groups
  - Invalid groups
- validateAccessLog():
  - Valid log
  - Invalid formats
```

#### 6. **Settings Data** (`src/pages/settings/settings-data.js`)
**Why test**: CRUD logic, overlap detection
```javascript
// Test cases (mock chrome.storage):
- formatDuration(): various inputs
- parseDuration(): various formats
- formatTimeRange(): edge times
- Overlap detection:
  - No overlaps
  - Same site, different schedules
  - Same site, overlapping schedules
```

---

### ⚠️ Medium Priority - Integration Tests

These need **mocking** of Chrome APIs:

#### 7. **Storage Manager** (`src/storage/storage-manager.js`)
**Why test**: Ensures data persistence works
```javascript
// Mock chrome.storage.local
// Test cases:
- getConfiguration(): with/without data
- saveConfiguration(): validation
- addAccessLog(): appends correctly
- pruneOldAccessLogs(): removes old entries
```

---

### ❌ Low Priority - Skip These

**Service Worker** (`src/background/service-worker.js`):
- Too many Chrome API dependencies
- Better tested manually or with E2E
- Event listeners hard to unit test

**UI Pages** (settings, blocked, debug):
- DOM manipulation
- Better with E2E or manual testing
- Would need jsdom setup

---

## Recommended Test Setup

### Tools
- **Jest** - Test runner, assertion library
- **@jest/globals** - ES modules support
- **No additional mocking libs needed** - Jest has built-in mocking

### Structure
```
tests/
├── unit/
│   ├── url-matcher.test.js
│   ├── time-utils.test.js
│   ├── access-calculator.test.js
│   ├── rule-engine.test.js
│   ├── schema.test.js
│   └── settings-data.test.js
├── integration/
│   └── storage-manager.test.js
└── fixtures/
    └── test-data.js          # Shared test data
```

### package.json
```json
{
  "type": "module",
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "npm test -- --watch",
    "test:coverage": "npm test -- --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

### jest.config.js
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/background/rule-engine.js',
    'src/storage/schema.js',
    'src/pages/settings/settings-data.js',
    '!src/**/*.test.js'
  ]
};
```

---

## Test Examples

### Example 1: URL Matcher
```javascript
// tests/unit/url-matcher.test.js
import { describe, it, expect } from '@jest/globals';
import { extractDomain, matchesSitePattern } from '../../src/utils/url-matcher.js';

describe('extractDomain', () => {
  it('extracts domain from valid URL', () => {
    expect(extractDomain('https://discord.com/channels')).toBe('discord.com');
    expect(extractDomain('https://sub.discord.com/path')).toBe('sub.discord.com');
  });

  it('handles invalid URLs', () => {
    expect(extractDomain('not a url')).toBe('');
    expect(extractDomain('')).toBe('');
  });
});

describe('matchesSitePattern', () => {
  it('matches domain-only patterns', () => {
    expect(matchesSitePattern('https://discord.com/any/path', 'discord.com')).toBe(true);
    expect(matchesSitePattern('https://sub.discord.com', 'discord.com')).toBe(true);
  });

  it('matches path-specific patterns', () => {
    expect(matchesSitePattern('https://discord.com/channels/123', 'discord.com/channels')).toBe(true);
    expect(matchesSitePattern('https://discord.com/other', 'discord.com/channels')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(matchesSitePattern('https://discord.com', '')).toBe(false);
    expect(matchesSitePattern('', 'discord.com')).toBe(false);
  });
});
```

### Example 2: Rule Engine
```javascript
// tests/unit/rule-engine.test.js
import { describe, it, expect } from '@jest/globals';
import { shouldBlockAccess } from '../../src/background/rule-engine.js';

describe('shouldBlockAccess', () => {
  it('allows access under limit', () => {
    const config = {
      groups: [{
        name: 'Test',
        duration: 60,
        maxAccesses: 3,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      }]
    };
    const logs = [
      { site: 'example.com', timestamp: Date.now() - 1000, tabId: 1 }
    ];

    const result = shouldBlockAccess('example.com', config, logs);
    expect(result.block).toBe(false);
  });

  it('blocks access at limit', () => {
    const config = {
      groups: [{
        name: 'Test',
        duration: 60,
        maxAccesses: 2,
        strictMode: false,
        sites: ['example.com'],
        schedule: null
      }]
    };
    const now = Date.now();
    const logs = [
      { site: 'example.com', timestamp: now - 1000, tabId: 1 },
      { site: 'example.com', timestamp: now - 2000, tabId: 2 }
    ];

    const result = shouldBlockAccess('example.com', config, logs);
    expect(result.block).toBe(true);
    expect(result.ruleName).toBe('Test');
  });
});
```

### Example 3: Mocking Storage
```javascript
// tests/integration/storage-manager.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  }
};

import { getConfiguration, saveConfiguration } from '../../src/storage/storage-manager.js';

describe('storage-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets configuration', async () => {
    const mockConfig = { groups: [] };
    chrome.storage.local.get.mockResolvedValue({ configuration: mockConfig });

    const result = await getConfiguration();
    expect(result).toEqual(mockConfig);
    expect(chrome.storage.local.get).toHaveBeenCalledWith('configuration');
  });
});
```

---

## Running Tests

```bash
# Install
npm install

# Run once
npm test

# Watch mode (recommended during development)
npm test:watch

# Coverage report
npm test:coverage
```

---

## What This Achieves

### ✅ Confidence in Core Logic
- URL matching won't break with edge cases
- Time calculations handle boundaries correctly
- Access counting works in strict/non-strict modes
- Validation catches bad data

### ✅ Regression Detection
- Changes to utils immediately tested
- Rule engine logic verified
- Breaking changes caught early

### ✅ Documentation
- Tests serve as usage examples
- Edge cases documented in tests
- Expected behavior codified

### ✅ Refactoring Safety
- Can refactor confidently
- Tests ensure behavior unchanged
- Catch unintended side effects

---

## What This Doesn't Do

### ❌ UI Testing
- Settings page UI not tested
- Blocked page not tested
- Use manual testing or E2E

### ❌ Chrome API Integration
- Service worker not tested
- Badge updates not tested
- Use manual testing

### ❌ Full E2E Flows
- Complete user journeys not tested
- Extension loading not tested
- Use manual testing (see TESTING.md)

---

## Maintenance

### When to Update Tests
- ✅ When adding new utility functions
- ✅ When changing business logic
- ✅ When fixing bugs (add regression test)
- ❌ Don't test implementation details

### Keep Tests Simple
- One concept per test
- Clear test names
- Avoid complex setup
- Use fixtures for shared data

### Test Naming Convention
```javascript
describe('functionName', () => {
  it('does something specific', () => {
    // ...
  });
});
```

---

## Next Steps

1. **Set up Jest** (see Tools section)
2. **Start with url-matcher.test.js** (easiest, no mocking)
3. **Add time-utils.test.js** (add Date mocking)
4. **Add access-calculator.test.js** (business logic)
5. **Add rule-engine.test.js** (integration of utils)
6. **Add schema.test.js** (validation logic)
7. **Optional**: Add storage-manager.test.js (needs chrome mocking)
8. **Optional**: Add settings-data.test.js (needs chrome mocking)

Start simple, add tests as you make changes. Don't aim for 100% coverage—aim for testing the parts that matter.
