# Extending the Extension

## Adding New Features Safely

This guide covers common extension tasks and how to do them without breaking existing functionality.

## Adding a New Field to Rule Groups

**Example:** Add a `color` field to visually distinguish rules in the UI.

### 1. Update Schema (`src/storage/schema.js`)

Add to the `RuleGroup` type definition:
```javascript
/**
 * @typedef {Object} RuleGroup
 * @property {string} name
 * @property {number} duration
 * @property {number} maxAccesses
 * @property {boolean} strictMode
 * @property {string[]} sites
 * @property {Schedule} [schedule]
 * @property {string} [color] // NEW: Optional color for UI
 */
```

Add validation in `validateRuleGroup()`:
```javascript
export function validateRuleGroup(group) {
  const errors = [];
  
  // ... existing validation ...
  
  // NEW: Validate color if present
  if (group.color !== undefined) {
    if (typeof group.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(group.color)) {
      errors.push('Color must be a valid hex color (e.g., #FF0000)');
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### 2. Update Default Configuration

```javascript
export const DEFAULT_CONFIGURATION = {
  groups: [
    {
      name: 'Example Rule - Delete Me',
      duration: 60,
      maxAccesses: 3,
      strictMode: false,
      sites: ['example.com'],
      schedule: { days: [0,1,2,3,4,5,6], times: ['0000-2400'] },
      color: '#3b82f6' // NEW: Default blue
    }
  ]
};
```

### 3. Update Settings UI (`src/pages/settings/`)

Add to `settings.html`:
```html
<div class="form-group">
  <label for="color-input">Color (optional)</label>
  <input type="color" id="color-input" value="#3b82f6">
</div>
```

Add to `settings.js`:
```javascript
function createDefaultRuleGroup() {
  return {
    name: 'New Rule',
    duration: 60,
    maxAccesses: 3,
    strictMode: false,
    sites: [],
    schedule: { days: [0,1,2,3,4,5,6], times: ['0000-2359'] },
    color: '#3b82f6' // NEW
  };
}
```

Update form read/write functions to include color field.

### 4. Use in Rule Engine (if needed)

If the field affects blocking logic:
```javascript
export function shouldBlockAccess(site, config, accessLogs) {
  // ... existing logic ...
  
  // If needed, pass color to blocked page
  if (result.block) {
    result.color = rule.color; // NEW
  }
  
  return result;
}
```

### 5. Add Tests

```javascript
// tests/unit/schema.test.js
it('validates optional color field', () => {
  const group = {
    ...validGroup,
    color: '#FF0000'
  };
  expect(validateRuleGroup(group).valid).toBe(true);
});

it('rejects invalid color format', () => {
  const group = {
    ...validGroup,
    color: 'red' // Invalid
  };
  expect(validateRuleGroup(group).valid).toBe(false);
});
```

## Adding a New Validation Rule

**Example:** Ensure `maxAccesses` doesn't exceed 100.

### 1. Update Validator (`src/storage/schema.js`)

```javascript
export function validateRuleGroup(group) {
  const errors = [];
  
  // ... existing validation ...
  
  if (typeof group.maxAccesses !== 'number' || group.maxAccesses <= 0) {
    errors.push('Max accesses must be a positive number');
  }
  
  // NEW: Add upper bound
  if (group.maxAccesses > 100) {
    errors.push('Max accesses cannot exceed 100');
  }
  
  return { valid: errors.length === 0, errors };
}
```

### 2. Add Tests

```javascript
it('rejects maxAccesses above 100', () => {
  const group = {
    ...validGroup,
    maxAccesses: 150
  };
  const result = validateRuleGroup(group);
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.includes('cannot exceed 100'))).toBe(true);
});
```

### 3. Update UI (if needed)

Add hint text in settings form:
```html
<label for="max-accesses">Max Accesses (1-100)</label>
<input type="number" id="max-accesses" min="1" max="100">
```

## Adding a New Utility Function

**Example:** Add function to format access logs for display.

### 1. Create or Extend Utility File

If related to existing utility:
```javascript
// src/utils/time-utils.js

export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
```

If new category, create new file:
```javascript
// src/utils/log-formatter.js

export function formatAccessLog(log) {
  return `${log.site} at ${new Date(log.timestamp).toLocaleString()}`;
}
```

### 2. Keep it Pure

```javascript
// ✅ Good: Pure function
export function formatDuration(minutes) {
  return minutes < 60 
    ? `${minutes} minutes` 
    : `${Math.floor(minutes/60)} hours`;
}

// ❌ Bad: Side effect
export function formatDuration(minutes) {
  console.log('Formatting:', minutes); // Side effect!
  return `${minutes} minutes`;
}
```

### 3. Add Tests

```javascript
// tests/unit/time-utils.test.js

describe('formatTimestamp', () => {
  it('formats timestamp as locale string', () => {
    const timestamp = new Date('2024-01-01T12:00:00').getTime();
    const result = formatTimestamp(timestamp);
    expect(result).toContain('2024');
    expect(result).toContain('12:00');
  });
});
```

### 4. Import Where Needed

```javascript
// src/pages/debug.html
import { formatTimestamp } from '../utils/time-utils.js';
```

## Modifying Blocking Logic

**Example:** Add "warning" state before blocking.

### 1. Update Rule Engine (`src/background/rule-engine.js`)

```javascript
export function shouldBlockAccess(site, config, accessLogs) {
  const activeRules = getActiveRulesForSite(site, config);
  
  if (activeRules.length === 0) {
    return { block: false };
  }
  
  for (const rule of activeRules) {
    const remaining = calculateRemainingAccesses(/* ... */);
    
    // NEW: Warning state
    if (remaining === 1) {
      return {
        block: false,
        warning: true,
        message: 'Last access remaining!'
      };
    }
    
    if (remaining <= 0) {
      return {
        block: true,
        reason: `Access limit reached for rule "${rule.name}"`,
        ruleName: rule.name
      };
    }
  }
  
  return { block: false };
}
```

### 2. Update Service Worker (`src/background/service-worker.js`)

```javascript
async function handleNavigation(tabId, url) {
  // ... existing code ...
  
  const decision = shouldBlockAccess(site, config, logs);
  
  if (decision.block) {
    // Existing block logic
  } else if (decision.warning) {
    // NEW: Show warning
    chrome.action.setBadgeText({ tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#f59e0b' });
  } else {
    // Normal flow
  }
}
```

### 3. Add Tests

```javascript
it('returns warning state at 1 remaining', () => {
  const config = { groups: [/* max 3 */] };
  const logs = [/* 2 recent accesses */];
  
  const result = shouldBlockAccess('example.com', config, logs);
  
  expect(result.block).toBe(false);
  expect(result.warning).toBe(true);
  expect(result.message).toBe('Last access remaining!');
});
```

### 4. Update Badge Logic

```javascript
function updateBadgeForTab(tabId) {
  // ... get remaining count ...
  
  // NEW: Handle warning state
  if (decision.warning) {
    chrome.action.setBadgeText({ tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#f59e0b' });
    return;
  }
  
  // Existing badge logic
}
```

## Adding a New Page

**Example:** Add statistics/analytics page.

### 1. Create Page Files

```
src/pages/stats/
├── stats.html
├── stats.css
└── stats.js
```

### 2. Import Required Modules

```javascript
// stats.js
import { getConfiguration, getAccessLogs } from '../../storage/storage-manager.js';

async function loadStats() {
  const config = await getConfiguration();
  const logs = await getAccessLogs();
  
  // Generate statistics
  displayStats(config, logs);
}
```

### 3. Add Navigation (if needed)

In settings page:
```html
<nav>
  <a href="../stats/stats.html">View Statistics</a>
</nav>
```

### 4. Keep Self-Contained

- Don't share state with other pages
- Import only what you need
- Use standard module imports

## Adding Chrome API Usage

**Example:** Add notification on block.

### 1. Add Permission (`manifest.json`)

```json
{
  "permissions": [
    "storage",
    "tabs",
    "webNavigation",
    "notifications"  // NEW
  ]
}
```

### 2. Use in Service Worker

```javascript
async function handleNavigation(tabId, url) {
  // ... existing code ...
  
  if (decision.block) {
    // Existing redirect
    chrome.tabs.update(tabId, { url: blockedUrl });
    
    // NEW: Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: 'Site Blocked',
      message: `You've reached your limit for ${site}`
    });
  }
}
```

### 3. Test Manually

Chrome API usage requires manual testing:
1. Load extension
2. Trigger blocking
3. Verify notification appears

## Refactoring Existing Code

### Safe Refactoring Process

1. **Add tests first** (if not already tested)
2. **Refactor**
3. **Verify tests still pass**
4. **Test manually** for anything not unit-tested

### Example: Extract Complex Logic

**Before:**
```javascript
function shouldBlockAccess(site, config, logs) {
  // 50 lines of complex logic here
}
```

**After:**
```javascript
function shouldBlockAccess(site, config, logs) {
  const activeRules = getActiveRulesForSite(site, config);
  if (activeRules.length === 0) return { block: false };
  
  return checkRulesForBlocking(activeRules, logs, site);
}

function checkRulesForBlocking(rules, logs, site) {
  // Extracted logic
}
```

**Test both:**
```javascript
// Test the main function
it('allows access when no rules', () => {
  expect(shouldBlockAccess('example.com', emptyConfig, [])).toEqual({ block: false });
});

// Test the extracted helper
it('checks rules correctly', () => {
  expect(checkRulesForBlocking(rules, logs, 'example.com')).toEqual({ block: true });
});
```

## Common Patterns

### Adding Optional Features

Use feature flags:
```javascript
// schema.js
export const FEATURE_FLAGS = {
  enableNotifications: false,
  enableAnalytics: false
};

// service-worker.js
if (FEATURE_FLAGS.enableNotifications) {
  chrome.notifications.create(/* ... */);
}
```

### Backward Compatibility

When adding fields:
```javascript
// Always provide defaults
const color = rule.color || '#3b82f6';
const schedule = rule.schedule || null;

// Check existence before using
if (rule.newField !== undefined) {
  // Use new field
}
```

### Migration Strategy

If schema changes:
```javascript
// storage-manager.js
async function migrateIfNeeded() {
  const { storageVersion } = await chrome.storage.local.get('storageVersion');
  
  if (storageVersion < 2) {
    await migrateV1ToV2();
    await chrome.storage.local.set({ storageVersion: 2 });
  }
}

async function migrateV1ToV2() {
  const { configuration } = await chrome.storage.local.get('configuration');
  
  // Add new fields with defaults
  configuration.groups.forEach(group => {
    if (!group.color) {
      group.color = '#3b82f6';
    }
  });
  
  await chrome.storage.local.set({ configuration });
}
```

## Testing New Features

### Unit Tests for Pure Logic

All utilities and rule engine logic:
```javascript
// tests/unit/new-feature.test.js
import { newFunction } from '../../src/utils/new-feature.js';

describe('newFunction', () => {
  it('handles basic case', () => {
    expect(newFunction(input)).toBe(expectedOutput);
  });
  
  it('handles edge case', () => {
    expect(newFunction(edgeInput)).toBe(edgeOutput);
  });
});
```

### Manual Tests for Chrome API

Service worker, badge, storage:
1. Load extension in Chrome
2. Test feature manually
3. Check service worker console for errors
4. Verify expected behavior

See `TESTING.md` for manual test procedures.

## Don't Break These

### Critical Invariants

1. **Always validate before saving to storage**
   - Use schema validators
   - Never write invalid data

2. **Keep utilities pure**
   - No side effects
   - No Chrome API calls
   - Makes testing possible

3. **Don't skip validation**
   - UI validates → storage validates again
   - Defense in depth

4. **Badge must update on config change**
   - Listen to `storage.onChanged`
   - Update all tabs

5. **Always log accesses**
   - Even if rule is inactive
   - Future rules may need the data

6. **Preserve user data**
   - Don't clear storage without user action
   - Validate before overwriting

### Code Organization

- Pure functions in `src/utils/`
- Business logic in `src/background/rule-engine.js`
- Chrome API in `src/background/service-worker.js`
- Data layer in `src/storage/`
- UI pages self-contained in `src/pages/`

### Testing Requirements

- All pure functions must have tests
- Tests run with `npm test`
- All tests must pass before committing

## Getting Help

### Documentation
- `docs/architecture.md` - System design
- `docs/core-logic.md` - How blocking works
- `docs/storage-schema.md` - Data structures
- `docs/chrome-extension.md` - Platform specifics

### Debugging
- Service worker console (`chrome://extensions/`)
- `debug.html` page for live stats
- `test-storage.html` for storage testing
- Console logs (but remove before committing)
