# Testing Setup

## Test Files

All pure functions (no Chrome API dependencies) are tested:

- `tests/unit/url-matcher.test.js` - URL parsing and pattern matching
- `tests/unit/time-utils.test.js` - Time parsing, range checking, schedule validation
- `tests/unit/access-calculator.test.js` - Rolling window filtering, remaining access calculation
- `tests/unit/rule-engine.test.js` - Active rule determination, blocking decisions
- `tests/unit/schema.test.js` - Data validation functions
- `tests/unit/settings-data.test.js` - Pure utility functions (duration formatting, time formatting, etc.)

Shared test data: `tests/fixtures/test-data.js`

## Not Tested (Chrome Storage Dependencies)

- `settings-data.js` CRUD operations (loadConfiguration, saveConfiguration, addRuleGroup, etc.)
- `storage-manager.js` functions
- Service worker event handlers

## Test Patterns Used

### 1. Describe Blocks for Organization
```javascript
describe('moduleName', () => {
  describe('functionName', () => {
    it('does something specific', () => {
      // test
    });
  });
});
```

### 2. Date Mocking for Time Tests
```javascript
const mockDate = new Date('2024-01-01T10:00:00');
global.Date = class extends originalDate {
  constructor() {
    return mockDate;
  }
};
```

### 3. Test Data Fixtures
```javascript
import { mockRuleGroups, mockAccessLogs } from '../fixtures/test-data.js';
```

### 4. Edge Case Testing
- Empty inputs
- Boundary conditions
- Invalid data
- Extreme values

## Next Steps

1. **Run the tests**: `npm test`
2. **Add remaining tests** (optional):
   - `rule-engine.test.js`
   - `schema.test.js`
   - `settings-data.test.js`
3. **Run coverage**: `npm run test:coverage`
4. **Keep tests updated** when changing code

## Integration with Development

### When to Run Tests
- ✅ Before committing changes
- ✅ After modifying any utility function
- ✅ After fixing a bug (add regression test first)
- ✅ In CI/CD pipeline (future)

### Test-Driven Development
1. Write failing test
2. Implement feature
3. Test passes
4. Refactor
5. Tests still pass

### Continuous Integration (Future)
Add to GitHub Actions:
```yaml
- name: Run tests
  run: npm test
```

## Troubleshooting

### "Cannot find module"
- Make sure you ran `npm install`
- Check import paths (should end with `.js`)

### "Transform failed"
- Ensure `jest.config.js` has correct ES module config
- Check `package.json` has `"type": "module"`

### Date mocking not working
- Make sure to restore original Date in `afterEach()`
- Use the pattern shown in `time-utils.test.js`

### Tests timeout
- Default timeout is 5 seconds
- If needed, add `jest.setTimeout(10000)` in test file

## Documentation References

- **Full testing strategy**: See `TESTING_STRATEGY.md`
- **Manual test scenarios**: See `TESTING.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md`

---

**Status**: ✅ Jest is configured and 3/6 recommended test files are complete. Run `npm install` and `npm test` to get started!
