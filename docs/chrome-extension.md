# Chrome Extension Specifics

## Manifest V3

The extension uses Manifest V3 (required for new Chrome extensions since 2023).

### Key MV3 Changes from MV2
- **Service worker** instead of background page
- **No persistent background context**
- **Event-driven architecture** (worker sleeps when idle)
- **Stricter content security policy**

## Service Worker Lifecycle

**Location:** `src/background/service-worker.js`

### Startup
Service worker starts when:
- Browser launches
- Extension installed/updated
- User navigates to a tracked site
- Alarm fires
- Storage change occurs

### Running
- Handles events
- Updates state (badge, storage)
- Maximum ~30 seconds of idle time before sleep

### Sleep
- After ~30 seconds of inactivity
- **All in-memory state is lost**
- Event listeners remain registered
- Next event wakes worker

### State Loss Handling

**In-memory state:**
```javascript
const tabUrlMap = new Map(); // Lost on sleep
```

**Mitigation:**
- Only used for optimization (refresh detection)
- Loss is acceptable: refreshes may count as accesses
- Conservative approach: when in doubt, count it

**Persistent state:**
- All critical data in `chrome.storage.local`
- Survives service worker restarts
- No data loss

## Event Handling

### Navigation Events

```javascript
chrome.webNavigation.onCommitted.addListener((details) => {
  // Main navigation handler
  // Filters: main_frame, http(s) only
  // Ignores: refresh detection via tabUrlMap
});
```

**Event details:**
- `tabId`: Chrome tab ID
- `url`: Full URL navigated to
- `transitionType`: How navigation occurred
- `frameId`: 0 for main frame

**Why `onCommitted` not `onCompleted`?**
- Fires earlier in navigation lifecycle
- Allows blocking before page loads
- More responsive user experience

**Ignored cases:**
- Sub-frames (`frameId !== 0`)
- Non-http(s) URLs (chrome://, file://, etc.)
- Extension pages (settings, blocked)
- Same domain navigations (refresh detection)

### Tab Events

```javascript
chrome.tabs.onActivated.addListener(({ tabId }) => {
  // User switched to this tab
  // Update badge for new tab's site
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Tab URL or status changed
  // Update badge if URL changed
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // Tab closed
  // Clean up tabUrlMap
});
```

**Why all three?**
- `onActivated`: Tab switch
- `onUpdated`: URL change in existing tab
- `onRemoved`: Cleanup

### Storage Events

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.configuration) {
    // Config changed (from settings page)
    // Update badges for all tabs
  }
});
```

**Trigger:** Settings page saves new configuration

**Response:** Recalculate badge for all open tabs with new rules

## Badge Management

### Badge API

```javascript
chrome.action.setBadgeText({ tabId, text: "3" });
chrome.action.setBadgeBackgroundColor({ tabId, color: "#22c55e" });
```

**Per-tab badges:**
- Each tab has independent badge
- Updates when tab becomes active
- Updates when tab URL changes
- Updates when config changes

### Badge Colors

```javascript
if (remaining === 0) {
  color = '#ef4444'; // Red
} else if (remaining <= 2) {
  color = '#eab308'; // Yellow
} else {
  color = '#22c55e'; // Green
}
```

**Visual feedback:**
- Green: 3+ accesses remaining
- Yellow: 1-2 accesses remaining  
- Red: 0 (blocked)

### Badge Text

- Shows remaining count: `"3"`, `"1"`, `"0"`
- Empty for non-tracked sites
- Empty for sites with no active rules

### Badge Update Triggers

1. **Tab switch** → Update for newly active tab
2. **Navigation** → Update after logging access
3. **Config change** → Update all tabs
4. **Tab URL change** → Update that tab

## Blocking Mechanism

### Redirect Approach

```javascript
chrome.tabs.update(tabId, {
  url: `chrome-extension://${chrome.runtime.id}/src/pages/blocked/blocked.html?site=...`
});
```

**Why redirect not content script?**
- Simpler
- Works before page loads
- No CSP issues
- Guaranteed to work

**Blocked page URL params:**
```
?site=discord.com
&ruleName=Social Media
&duration=120
&maxAccesses=5
```

**Blocked page reads params:**
```javascript
const params = new URLSearchParams(window.location.search);
const site = params.get('site');
```

### Timing

1. Navigation detected
2. Block decision made
3. Access logged (even if blocked)
4. Redirect issued
5. Blocked page loads

**Race condition:** None. Decision happens before redirect.

## Storage API Usage

### Read Operations

```javascript
const result = await chrome.storage.local.get(['configuration', 'accessLogs']);
const config = result.configuration || DEFAULT_CONFIGURATION;
const logs = result.accessLogs || [];
```

**Always provide defaults:** Storage may be empty on first run.

### Write Operations

```javascript
await chrome.storage.local.set({
  configuration: config,
  accessLogs: logs
});
```

**Validation:** Always validate before writing (done in `storage-manager.js`).

### Storage Change Events

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  
  if (changes.configuration) {
    const newConfig = changes.configuration.newValue;
    // Handle config change
  }
});
```

**Triggered by:** Settings page saving configuration.

**Not triggered by:** Service worker's own writes (Chrome filters these out).

## Permissions

### Required Permissions (manifest.json)

```json
{
  "permissions": [
    "storage",       // chrome.storage API
    "tabs",          // chrome.tabs API
    "webNavigation"  // chrome.webNavigation API
  ],
  "host_permissions": [
    "<all_urls>"     // Track navigation on all sites
  ]
}
```

### Why `<all_urls>`?

Need to:
- Track navigation to any site
- Read tab URLs
- Update badges for any domain

**User grants:** On installation (manifest declares permissions).

## Content Security Policy

**Default MV3 CSP:** Very strict

**Restrictions:**
- No inline scripts
- No `eval()`
- No remote scripts

**Our compliance:**
- All scripts in separate `.js` files
- No `eval()` or `new Function()`
- No remote dependencies
- Everything bundled with extension

## Extension Pages

### Settings Page

**Access:** Click extension icon

**Implementation:**
```json
"action": {
  "default_popup": "",
  "default_title": "Throttle Me, Bananas"
}
```

```javascript
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'src/pages/settings/settings.html' });
});
```

**Why not popup?**
- Settings UI too complex for small popup
- Full page provides better UX
- More space for forms and controls

### Blocked Page

**Access:** Automatic redirect when blocked

**URL pattern:** `chrome-extension://[id]/src/pages/blocked/blocked.html?params`

**Behavior:**
- Shows block reason
- Displays countdown to unblock
- "Open Settings" button
- Cannot be bypassed (by design)

### Debug Dashboard

**Access:** Manual navigation to `chrome-extension://[id]/src/pages/debug.html`

**Purpose:**
- Developer tool
- View live stats
- Test blocking logic
- Not exposed to users

## Incognito Mode

**Explicitly not supported**

**Implementation:** None (no special handling)

**Behavior:** Extension doesn't run in incognito

**Why?** User privacy. Incognito should be untracked.

## Refresh Detection Algorithm

**Problem:** Distinguish refresh from new access

**Solution:**

```javascript
const tabUrlMap = new Map();

function isRefresh(tabId, newUrl) {
  const oldDomain = tabUrlMap.get(tabId);
  const newDomain = extractDomain(newUrl);
  
  if (oldDomain === newDomain) {
    return true; // Same domain = refresh
  }
  
  tabUrlMap.set(tabId, newDomain);
  return false;
}
```

**Storage in memory:** Lost when service worker sleeps.

**Fallback:** If lost, all navigations count (conservative).

**Alternative considered:** Store in chrome.storage
- **Rejected:** Too much write overhead for marginal benefit

## Performance Optimizations

### Early Returns

```javascript
// Ignore non-http URLs
if (!url.startsWith('http')) return;

// Ignore extension pages
if (url.includes('chrome-extension://')) return;

// Ignore frames
if (frameId !== 0) return;
```

**Impact:** Most events filtered immediately.

### Lazy Loading

Configuration loaded on-demand:
```javascript
async function handleNavigation(url) {
  const config = await getConfiguration(); // Only when needed
  // ...
}
```

### Batched Updates

Chrome batches storage writes internally. No manual batching needed.

### Pruning Strategy

```javascript
// Prune logs older than longest rule duration
const maxDuration = Math.max(...config.groups.map(g => g.duration));
await pruneOldAccessLogs(maxDuration + 60); // +60 buffer
```

**Frequency:** Periodically (not every navigation).

## Debugging Tools

### Service Worker Console

**Access:** 
1. Go to `chrome://extensions/`
2. Find extension
3. Click "service worker" link

**Shows:**
- Console logs
- Errors
- Network requests (if any)

**Limitations:** Cleared when worker sleeps.

### Debug Dashboard

**Access:** Navigate to `chrome-extension://[id]/src/pages/debug.html`

**Features:**
- Live stats
- View configuration
- View access logs
- Test blocking logic
- Auto-refresh mode

### Storage Inspection

**Chrome DevTools:**
1. Inspect any extension page
2. Application tab → Storage → Extension Storage
3. View/edit raw storage data

**Test pages:**
- `test-storage.html` - Interactive storage testing
- `test-settings-data.html` - Settings data layer testing

## Common Issues & Solutions

### Service Worker Not Responding

**Symptom:** Events not firing

**Cause:** Worker may have crashed

**Solution:** Reload extension at `chrome://extensions/`

### Badge Not Updating

**Symptom:** Badge stuck on old value

**Cause:** Event handler not updating badge

**Debug:** Check service worker console for errors

### State Lost on Wake

**Symptom:** Refresh detection not working

**Cause:** Service worker slept, lost `tabUrlMap`

**Expected:** This is normal, conservative fallback

### Storage Quota Exceeded

**Symptom:** Writes failing

**Cause:** Too many access logs

**Solution:** `pruneOldAccessLogs()` should prevent this

## Extension Update Strategy

### On Update

```javascript
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // First install
    initializeStorage();
  } else if (reason === 'update') {
    // Extension updated
    // Run migrations if needed
  }
});
```

**Current:** No migrations needed (v1 schema stable).

**Future:** Add migration logic here if schema changes.

## Security Considerations

### Input Validation

All user input validated before storage:
- Configuration validated by `schema.js`
- Settings UI performs validation before save
- Double validation (UI + storage layer)

### XSS Prevention

- No `innerHTML` without escaping
- All user input escaped:
  ```javascript
  element.textContent = userInput; // Safe
  ```

### Extension Permissions

**Minimal necessary permissions:**
- `storage` - For persistence
- `tabs` - For URL reading and badge updates
- `webNavigation` - For tracking navigation
- `<all_urls>` - To track any site

**Not needed:**
- `cookies` - Not used
- `history` - Not used
- `bookmarks` - Not used

### Data Privacy

- All data stored locally
- No network requests
- No tracking or analytics
- No third-party services
