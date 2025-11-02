# Troubleshooting Guide

## Extension Won't Load

### Error: "Service worker registration failed"
**Cause**: Syntax error or module import issue in service-worker.js

**Fix**:
1. Open `chrome://extensions/` 
2. Look for error message on extension card
3. Check service-worker.js for syntax errors
4. Verify all import paths are correct
5. Make sure manifest.json has `"type": "module"` in background section

### Error: "Manifest file is missing or unreadable"
**Cause**: Invalid JSON in manifest.json

**Fix**:
1. Validate manifest.json in a JSON validator
2. Check for trailing commas
3. Verify all quotes are correct

## Service Worker Issues

### Service worker shows "inactive"
**Fix**: Click the "service worker" link to activate it

### Service worker crashes repeatedly
**Cause**: Infinite loop or uncaught error

**Fix**:
1. Check service worker console for errors
2. Look for errors in storage operations
3. Add try/catch blocks around async operations
4. Check that all storage reads/writes are awaited

## Badge Issues

### Badge doesn't show up
**Possible causes**:
1. Not opening a NEW tab (refreshing doesn't count)
2. Site not in configuration
3. No active rules (check schedule)
4. Badge update failed

**Debug**:
```javascript
// In service worker console:
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  const tab = tabs[0];
  console.log('Current tab:', tab.url);
  // Manually trigger badge update
  // (paste updateBadgeForTab function call here)
});
```

### Badge shows wrong number
**Debug steps**:
1. Open debug dashboard
2. Check "Active Rules by Site" for the current site
3. Verify access logs are being recorded
4. Check if multiple rules apply (strictest wins)

### Badge doesn't update when switching tabs
**Fix**:
1. Reload extension
2. Check service worker console for errors in onActivated listener
3. Verify chrome.tabs permission in manifest

## Blocking Issues

### Not getting blocked when I should be
**Checklist**:
- [ ] Are you opening NEW tabs? (not refreshing)
- [ ] Is the rule active? (check schedule)
- [ ] Is today included in schedule days?
- [ ] Is current time in schedule times?
- [ ] Check service worker logs - is navigation detected?
- [ ] Check access logs - are accesses being recorded?

**Debug**:
1. Open debug dashboard
2. Enter the site in "Check Site" field
3. Should show if/why it would be blocked
4. Check service worker console for "shouldBlockAccess" decision

### Getting blocked when I shouldn't be
**Possible causes**:
1. Another rule is active (check for overlapping sites)
2. Access logs from previous sessions
3. Time zone issues with schedule

**Fix**:
1. Check debug dashboard - which rule is triggering?
2. Clear storage and test again
3. Verify schedule is correct for your timezone

### Blocked on refresh
**This is wrong** - refreshes shouldn't count!

**Debug**:
1. Check service worker console
2. Should see "Refresh detected" message
3. If not, check tabUrlMap tracking
4. Verify transitionType is being checked

## Blocked Page Issues

### Blank blocked page
**Causes**:
1. Incorrect path in manifest.json
2. JavaScript error loading
3. URL params not passed correctly

**Fix**:
1. Check browser console on blocked page
2. Verify path: `src/pages/blocked/blocked.html`
3. Check URL has params: `?site=...&rule=...`
4. Reload extension

### Blocked page shows "Unknown" for everything
**Cause**: URL parameters not passed from service worker

**Fix**:
1. Check service worker code - verify all params in blockedUrl
2. Check URL in address bar - are params present?
3. Verify blocked.js is parsing params correctly

### Countdown doesn't update
**Cause**: JavaScript error or invalid unblockTime

**Fix**:
1. Check browser console on blocked page
2. Verify unblockTime param is valid ISO string
3. Check setInterval is running

### "Open Settings" button doesn't work
**Cause**: chrome.runtime not available

**Fix**:
1. Verify blocked page is loaded as chrome-extension:// URL
2. Check for JavaScript errors
3. Ensure chrome.runtime.openOptionsPage is called correctly

## Storage Issues

### Configuration not persisting
**Causes**:
1. Storage permission missing
2. Validation failing
3. Storage quota exceeded

**Fix**:
1. Check manifest.json has "storage" permission
2. Check service worker console for validation errors
3. Check storage quota: `chrome.storage.local.getBytesInUse()`

### Access logs not saving
**Debug**:
```javascript
// In service worker console:
import { addAccessLog, getAccessLogs } from './src/storage/storage-manager.js';
await addAccessLog('test.com', Date.now(), 1);
console.log(await getAccessLogs());
```

### "Invalid configuration" errors
**Cause**: Configuration doesn't match schema

**Fix**:
1. Open storage test page
2. Click "Test Validation"
3. Check error messages
4. Verify all required fields present
5. Check types match schema

## Navigation Detection Issues

### Navigations not detected at all
**Checklist**:
- [ ] webNavigation permission in manifest?
- [ ] Service worker running?
- [ ] onCommitted listener registered?
- [ ] Checking frameId === 0?

**Debug**:
```javascript
// Add at top of onCommitted listener:
console.log('Navigation event:', details);
```

### Every navigation is "refresh"
**Cause**: tabUrlMap not being updated correctly

**Fix**:
1. Check that tabUrlMap.set() is called after successful access
2. Verify extractDomain() is working correctly
3. Check transitionType values in console

### Some sites never trigger navigation
**Cause**: Single-page apps (SPAs) don't trigger full navigations

**Note**: This is a known limitation. SPAs like Gmail that change content without navigation won't trigger events. Consider adding webRequest permission for more granular tracking (advanced).

## Testing Tips

### Can't wait 60 minutes for rolling window
**Solution**: Create short-duration test config

```javascript
// In browser console on storage test page:
import { saveConfiguration } from '../storage/storage-manager.js';
await saveConfiguration({
  groups: [{
    name: 'Quick Test',
    duration: 1, // 1 minute!
    maxAccesses: 2,
    strictMode: false,
    sites: ['example.com']
  }]
});
```

### Want to reset everything quickly
**Solution**: 
1. Open debug dashboard
2. Click "Clear Storage"
3. Or use storage test page "Clear All Data"

### Need to see what's happening in real-time
**Solution**:
1. Open debug dashboard
2. Enable "Auto-refresh"
3. Open service worker console
4. Have both visible while testing

## Advanced Debugging

### Enable verbose logging
Add to top of service-worker.js:
```javascript
const DEBUG = true;
function debug(...args) {
  if (DEBUG) console.log('[TMB]', ...args);
}
```

### Inspect storage directly
```javascript
// Browser console:
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
});
```

### Manual badge test
```javascript
// Service worker console:
chrome.action.setBadgeText({ text: '5', tabId: <TAB_ID> });
chrome.action.setBadgeBackgroundColor({ color: '#ff0000', tabId: <TAB_ID> });
```

### Check which tabs are tracked
```javascript
// Service worker console (where tabUrlMap is defined):
console.log('Tracked tabs:', Array.from(tabUrlMap.entries()));
```

## Getting Help

If you're stuck:

1. **Check service worker console** - most errors show here
2. **Use debug dashboard** - real-time view of state
3. **Check browser console** - for page-specific errors
4. **Verify test workflow** - follow QUICK_TEST.md exactly
5. **Compare with working code** - double-check against implementation

## Known Limitations (Not Bugs!)

- Single-page apps that change content without navigation won't always trigger tracking
- Extension pages themselves are always accessible
- Incognito mode is not supported
- Time zones: all times are local to the browser
- Sub-second timing precision is not guaranteed
