# Testing

## Unit Tests

All pure functions (no Chrome API dependencies) have unit tests.

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### Test Files

- `tests/unit/url-matcher.test.js` - URL parsing and pattern matching
- `tests/unit/time-utils.test.js` - Time parsing, range checking, schedule validation  
- `tests/unit/access-calculator.test.js` - Rolling window filtering, remaining access calculation
- `tests/unit/rule-engine.test.js` - Active rule determination, blocking decisions
- `tests/unit/schema.test.js` - Data validation functions
- `tests/unit/settings-data.test.js` - Pure utility functions (duration formatting, etc.)

Shared test data: `tests/fixtures/test-data.js`

### Test Patterns

#### Describe Blocks
```javascript
describe('moduleName', () => {
  describe('functionName', () => {
    it('does something specific', () => {
      // test
    });
  });
});
```

#### Date Mocking
```javascript
const OriginalDate = Date;
let mockDate;

beforeEach(() => {
  mockDate = new Date('2024-01-01T10:00:00');
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) return mockDate;
      return new OriginalDate(...args);
    }
    static now() {
      return mockDate.getTime();
    }
  };
});

afterEach(() => {
  global.Date = OriginalDate;
});
```

#### Validation Testing
```javascript
it('validates a valid object', () => {
  const result = validateX(validObject);
  expect(result.valid).toBe(true);
  expect(result.errors).toEqual([]);
});

it('rejects invalid field', () => {
  const result = validateX(invalidObject);
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.includes('field name'))).toBe(true);
});
```

#### Edge Cases
```javascript
it('handles edge cases', () => {
  const testCases = [
    { input: value1, expected: result1 },
    { input: value2, expected: result2 }
  ];
  
  testCases.forEach(({ input, expected }) => {
    expect(functionName(input)).toBe(expected);
  });
});
```

### What's Tested

- ✅ All pure functions (utils + rule-engine + schema)
- ✅ Pure utility functions from settings-data
- ❌ Chrome storage operations (integration test territory)
- ❌ Service worker event handlers (manual testing)

### Adding Tests

When adding new pure functions:
1. Create test file or add to existing
2. Follow patterns above
3. Test edge cases (null, undefined, empty, boundary values)
4. Run `npm test` to verify

## Manual Testing

### Load Extension

1. `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select project folder
4. Extension loads with 🍌 icon

### Quick Smoke Test

1. Click extension icon → opens settings
2. Add rule: gmail.com, max 3, duration 60
3. Open 3 NEW tabs to gmail.com
4. Badge counts down: 3 → 2 → 1
5. 4th tab gets blocked

### Test Scenarios

#### Settings UI
- Add/edit/delete rules
- Import/export configuration
- Overlap warnings appear for duplicate sites
- Auto-save works (500ms delay)

#### Basic Blocking
- Badge shows remaining count
- Countdown works (3, 2, 1, blocked)
- Blocked page displays correctly
- Countdown timer on blocked page

#### Refresh Behavior
- Refresh existing tab → doesn't count
- Service worker console shows "Refresh detected"
- Can refresh blocked site if tab already open

#### Strict Mode
- Multiple sites share access pool
- Badge shows shared count
- Blocking applies to all sites in group

#### Badge Updates
- Updates on tab switch
- Updates when config changes
- Clears for non-tracked sites
- Colors: green (3+), yellow (1-2), red (0)

#### Schedule Activation
- Rule inactive outside schedule → no blocking
- Rule active inside schedule → blocking works
- Check debug dashboard for active rules

#### Multiple Rules
- Same site in multiple groups
- Badge shows most restrictive count
- All rules checked independently

### Debug Tools

**Service Worker Console:**
```
chrome://extensions/ → "service worker" link
```
- Console logs
- Navigation events
- Block decisions
- Errors

**Debug Dashboard:**
```
chrome-extension://<ID>/src/pages/debug.html
```
- Live stats
- Active rules by site
- Access logs viewer
- "Check Site" tool
- Auto-refresh mode

**Storage Test Page:**
```
chrome-extension://<ID>/src/pages/test-storage.html
```
- View raw storage
- Test configurations
- Clear all data
- Manual storage operations

## Troubleshooting

### Extension Won't Load

**Manifest error:**
- Check JSON syntax in manifest.json
- Validate with JSON linter

**Service worker error:**
- Check service worker console for errors
- Verify import paths end with `.js`
- Check for syntax errors

### Badge Not Showing

**Checklist:**
- Opening NEW tabs (not refreshing)?
- Site in configuration?
- Rule active (check schedule)?
- Service worker console for errors?

**Debug:**
```javascript
// In service worker console:
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  console.log('Current tab:', tabs[0].url);
});
```

### Not Getting Blocked

**Checklist:**
- Opening NEW tabs (not refreshing)?
- Rule schedule active?
- Current day in schedule days?
- Current time in schedule times?
- Check service worker logs?

**Debug:**
- Use debug dashboard "Check Site" feature
- Check "Active Rules by Site"
- Verify access logs being recorded

### Getting Blocked Incorrectly

**Possible causes:**
- Multiple rules overlapping
- Old access logs
- Schedule timezone issue

**Fix:**
- Check debug dashboard - which rule triggered?
- Clear storage and retest
- Verify schedule for your timezone

### Blocked on Refresh

**This is wrong** - refreshes shouldn't count

**Debug:**
- Check service worker console
- Look for "Refresh detected" message
- If missing, `tabUrlMap` may be lost (service worker restarted)

### Storage Not Persisting

**Check:**
- Validation passing?
- Service worker console errors?
- Chrome storage limits (very unlikely)

**Debug:**
```javascript
// In any extension page console:
chrome.storage.local.get(null, (result) => {
  console.log('Storage:', result);
});
```

### Tests Failing

**Common issues:**
- Forgot to update tests after code changes
- Date mocking pattern incorrect
- Missing imports

**Fix:**
- Run `npm test` to see failures
- Check error messages
- Update tests to match new behavior

### Service Worker Inactive

**Click "service worker" link** at `chrome://extensions/` to activate

### Service Worker Crashes

**Check console for:**
- Infinite loops
- Uncaught errors
- Storage operation failures

**Add error handling:**
```javascript
try {
  await storageOperation();
} catch (error) {
  console.error('Storage error:', error);
}
```

## Test Configuration

Quick test config for manual testing:

```json
{
  "groups": [
    {
      "name": "Gmail Test",
      "duration": 60,
      "maxAccesses": 3,
      "strictMode": false,
      "sites": ["gmail.com"],
      "schedule": null
    },
    {
      "name": "Social Media Strict",
      "duration": 120,
      "maxAccesses": 5,
      "strictMode": true,
      "sites": ["discord.com", "reddit.com", "twitter.com"],
      "schedule": null
    }
  ]
}
```

Save via settings UI import or test-storage.html page.

## Performance Testing

No formal performance tests, but verify:
- Badge updates immediately on tab switch
- No lag when navigating
- Service worker doesn't crash with many tabs
- Storage writes complete quickly

## Regression Testing

When fixing bugs:
1. Write failing test first (if possible)
2. Fix bug
3. Test passes
4. Manual verification
5. Check related functionality didn't break
