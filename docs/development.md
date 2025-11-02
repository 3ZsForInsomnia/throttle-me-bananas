# Development Guide

## Running Locally

### Load Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `throttle-me-bananas` directory
5. Extension loads with banana icon 🍌

### Access Extension ID

Find your extension ID at `chrome://extensions/` (looks like `abcdefghijklmnopqrstuvwxyz`)

Use it to access extension pages:
```
chrome-extension://<ID>/src/pages/settings/settings.html
chrome-extension://<ID>/src/pages/debug.html
```

### Reload After Changes

**When to reload:**
- Changed service worker code
- Changed manifest.json
- Changed any background scripts

**How:**
- Click reload icon on extension card at `chrome://extensions/`
- Or use `Cmd+R` / `Ctrl+R` on extensions page

**No reload needed:**
- UI page changes (just refresh the page)
- CSS changes (just refresh the page)

## Project Structure

```
throttle-me-bananas/
├── manifest.json              # Extension configuration
├── src/
│   ├── background/            # Service worker & business logic
│   │   ├── service-worker.js  # Main orchestrator
│   │   └── rule-engine.js     # Pure blocking logic
│   ├── storage/               # Data layer
│   │   ├── schema.js          # Validation & types
│   │   └── storage-manager.js # CRUD operations
│   ├── utils/                 # Pure utilities (no side effects)
│   │   ├── url-matcher.js
│   │   ├── time-utils.js
│   │   └── access-calculator.js
│   └── pages/                 # UI pages (self-contained)
│       ├── settings/
│       ├── blocked/
│       └── debug.html
├── tests/                     # Unit tests
│   ├── unit/
│   └── fixtures/
└── docs/                      # Documentation
```

### Where to Find Things

**Blocking logic:** `src/background/rule-engine.js`  
**Navigation tracking:** `src/background/service-worker.js`  
**Data validation:** `src/storage/schema.js`  
**URL matching:** `src/utils/url-matcher.js`  
**Time/schedule logic:** `src/utils/time-utils.js`  
**Access counting:** `src/utils/access-calculator.js`  
**Settings UI:** `src/pages/settings/`  
**Blocked page:** `src/pages/blocked/`  

## Development Workflow

### Making Changes

1. **Edit code** in your editor
2. **Reload extension** at `chrome://extensions/` (if backend)
3. **Test** manually or with unit tests
4. **Check service worker console** for errors

### Debugging

**Service Worker Console:**
```
chrome://extensions/ → Click "service worker" link
```
Shows:
- Console logs from service worker
- Errors in background scripts
- Network activity

**Page Console:**
- Right-click extension page → Inspect
- Normal Chrome DevTools

**Debug Dashboard:**
```
chrome-extension://<ID>/src/pages/debug.html
```
- View live stats
- See access logs
- Test blocking logic
- Check which rules apply

### Testing

**Run unit tests:**
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

**Manual testing:**
See `TESTING.md` for comprehensive manual test scenarios.

**Quick smoke test:**
1. Open new tab → tracked site
2. Verify badge updates
3. Open more tabs until blocked
4. Verify blocked page shows

## Common Development Tasks

### Add a New Field to Configuration

1. Update `RuleGroup` type in `src/storage/schema.js`
2. Add validation in `validateRuleGroup()`
3. Update UI in `src/pages/settings/`
4. Add tests in `tests/unit/schema.test.js`

See `docs/extending.md` for detailed guide.

### Modify Blocking Logic

1. Edit `src/background/rule-engine.js`
2. Update tests in `tests/unit/rule-engine.test.js`
3. Service worker automatically uses new logic

### Add a New UI Page

1. Create HTML/CSS/JS in `src/pages/your-page/`
2. Import needed modules (storage-manager, etc.)
3. Keep it self-contained
4. Add navigation link if needed

### Change Badge Behavior

Edit badge logic in `src/background/service-worker.js`:
```javascript
async function updateBadgeForTab(tabId) {
  // Your changes here
}
```

## Debug Tools

### Debug Dashboard (`debug.html`)

**Features:**
- Real-time statistics
- View current configuration
- View access logs
- Test which sites would be blocked
- "Check Site" tool
- Auto-refresh mode

**Access:** Navigate to `chrome-extension://<ID>/src/pages/debug.html`

### Storage Test Page (`test-storage.html`)

**Features:**
- View raw storage data
- Manually edit configuration
- Save test configurations
- View/clear access logs
- Test validation

**Access:** Navigate to `chrome-extension://<ID>/src/pages/test-storage.html`

### Chrome DevTools

**Storage inspection:**
1. Inspect any extension page
2. Application tab → Storage → Extension Storage
3. View/edit raw data

**Network inspection:**
- Extension makes no network requests
- All data is local

## Code Style

### Pure Functions

All utilities should be pure:
```javascript
// ✅ Good: Pure function
export function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// ❌ Bad: Side effect
export function extractDomain(url) {
  console.log('Extracting:', url); // Side effect!
  return new URL(url).hostname;
}
```

### Early Returns

Prefer early returns over nesting:
```javascript
// ✅ Good
function shouldBlockAccess(site, config, logs) {
  if (!config) return { block: false };
  if (logs.length === 0) return { block: false };
  // ... main logic
}

// ❌ Bad
function shouldBlockAccess(site, config, logs) {
  if (config) {
    if (logs.length > 0) {
      // ... deeply nested logic
    }
  }
}
```

### Validation

Always validate before writing to storage:
```javascript
// ✅ Good
export async function saveConfiguration(config) {
  const validation = validateConfiguration(config);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  await chrome.storage.local.set({ configuration: config });
}

// ❌ Bad
export async function saveConfiguration(config) {
  await chrome.storage.local.set({ configuration: config });
}
```

### Async/Await

Use async/await over promise chains:
```javascript
// ✅ Good
async function loadData() {
  const config = await getConfiguration();
  const logs = await getAccessLogs();
  return processData(config, logs);
}

// ❌ Bad
function loadData() {
  return getConfiguration()
    .then(config => getAccessLogs()
      .then(logs => processData(config, logs)));
}
```

## Performance Tips

### Minimize Storage Writes

```javascript
// ✅ Good: Batch updates
const updates = {
  configuration: newConfig,
  accessLogs: newLogs
};
await chrome.storage.local.set(updates);

// ❌ Bad: Multiple writes
await chrome.storage.local.set({ configuration: newConfig });
await chrome.storage.local.set({ accessLogs: newLogs });
```

### Early Exit in Event Handlers

```javascript
chrome.webNavigation.onCommitted.addListener((details) => {
  // Exit early for ignored cases
  if (details.frameId !== 0) return;
  if (!details.url.startsWith('http')) return;
  
  // Main logic only runs when needed
  handleNavigation(details);
});
```

### Prune Old Logs Periodically

Done automatically by service worker, but manual trigger available in debug dashboard.

## Gotchas & Common Issues

### Service Worker Sleeping

**Issue:** In-memory state lost after 30 seconds of inactivity

**Solution:** 
- Only use in-memory state for optimization (like `tabUrlMap`)
- Critical data goes in `chrome.storage.local`

### Badge Not Updating

**Check:**
1. Service worker console for errors
2. Event listeners registered correctly
3. `updateBadgeForTab()` being called

### Storage Not Persisting

**Check:**
1. Validation passing
2. No errors in service worker console
3. Chrome storage quota not exceeded (unlikely)

### Tests Failing

**Run:** `npm test`

**Common issues:**
- Forgot to update tests after changing logic
- Date mocking not working (see `TESTING_SETUP.md`)
- Missing expected parameters

## External Dependencies

**None!** Pure vanilla JavaScript.

### Chrome APIs Used

- `chrome.storage.local` - Persistence
- `chrome.tabs` - Tab management
- `chrome.webNavigation` - Navigation tracking
- `chrome.action` - Badge management
- `chrome.runtime` - Extension utilities

### Browser Requirements

- Chrome 88+ (Manifest V3 support)
- Modern ES6+ JavaScript

## File Imports

All imports use ES modules with `.js` extension:
```javascript
import { extractDomain } from '../utils/url-matcher.js';
import { validateRuleGroup } from '../storage/schema.js';
```

**Note:** Extension required in imports for ES modules.

## Documentation

- **Architecture:** `docs/architecture.md` - System design
- **Core Logic:** `docs/core-logic.md` - How blocking works
- **Storage:** `docs/storage-schema.md` - Data structures
- **Chrome Extension:** `docs/chrome-extension.md` - Platform specifics
- **Extending:** `docs/extending.md` - How to add features
- **Testing:** `docs/testing.md` - Test patterns and manual tests

## Getting Unstuck

### Extension Not Loading

1. Check manifest.json syntax
2. Look for errors at `chrome://extensions/`
3. Try reloading browser

### Logic Not Working as Expected

1. Add console.logs
2. Check service worker console
3. Use debug dashboard
4. Write a unit test

### UI Not Updating

1. Hard refresh page (`Cmd+Shift+R`)
2. Check browser console for errors
3. Verify data in storage (DevTools → Application → Storage)

### Need to Reset Everything

In service worker console:
```javascript
chrome.storage.local.clear();
location.reload();
```

Or use "Clear All Data" button in test-storage.html page.
