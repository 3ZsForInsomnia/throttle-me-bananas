# Comprehensive Testing Guide

## Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `throttle-me-bananas` directory
5. The extension should load with a banana icon 🍌

## Quick Verification

✅ Extension appears in extensions list
✅ No errors in the extension's service worker (click "service worker" link to see console)
✅ Extension icon appears in toolbar
✅ Right-click extension icon → "Options" opens settings page

### Test Refresh Behavior
1. Go to an open Gmail tab
2. Press Cmd+R / Ctrl+R to refresh
3. ✅ Page loads (refreshes don't count)
4. Check service worker console: "Refresh detected"

## Test 1: Settings UI (Phase 7)

### Create a Rule via UI
1. Click extension icon → opens settings page
2. Click "Add New Rule Group"
3. Enter rule details:
   - Name: "Test Rule"
   - Time Window: 60
   - Max Accesses: 3
   - Sites: gmail.com
   - Days: Mon-Fri
   - Times: 0900-1700
4. Wait 500ms for auto-save
5. Reload page
6. ✅ Rule should still be there (persisted)

### Test Import/Export
1. Click "Export" → downloads JSON file
2. Click "Import" → paste JSON
3. ✅ Configuration loads correctly

### Test Overlap Detection
1. Add two rules with the same site
2. ✅ Warning appears showing overlap
3. Delete one rule
4. ✅ Warning disappears

---

## Test 2: Basic Blocking (Phases 4-5)

### Setup
1. Open settings page (click extension icon)
2. Create a rule:
   - Name: "Gmail Test"
   - Duration: 60 minutes
   - Max Accesses: 3
   - Sites: gmail.com
   - Schedule: All days, all times
3. Let it auto-save

### Test Blocking
1. Open NEW tab → `gmail.com`
   - ✅ Badge shows "3" (green)
2. Open NEW tab → `gmail.com`
   - ✅ Badge shows "2" (yellow)
3. Open NEW tab → `gmail.com`
   - ✅ Badge shows "1" (yellow)
4. Open NEW tab → `gmail.com`
   - ✅ **BLOCKED!** Shows blocked page
   - ✅ Countdown timer works

---

---

## Test 3: Strict Mode

1. Create a rule with strict mode ON
2. Add sites: discord.com, reddit.com, twitter.com
3. Max accesses: 5
1. Open `discord.com` in new tab
2. ✅ **Expected**: Badge shows "5"
3. Open `reddit.com` in new tab
4. ✅ **Expected**: Badge shows "4" (counts against same pool)
5. Open `twitter.com` in new tab
6. ✅ **Expected**: Badge shows "3"
7. Continue until you hit 5 total accesses across all three sites
8. ✅ **Expected**: 6th access to ANY of these sites is blocked

---

## Test 4: Badge Updates

**Test Tab Switching:**
1. Have multiple tabs open (some tracked, some not)
2. Switch between tabs
3. ✅ **Expected**: Badge updates to show remaining count for current tab
4. ✅ **Expected**: Tabs without active rules show no badge

**Test Sites Not in Config:**
1. Open `google.com` (not in test config)
2. ✅ **Expected**: No badge appears
3. ✅ **Expected**: No access logged
4. ✅ **Expected**: Can access unlimited times

---

## Test 5: Rolling Time Window

This test requires patience or modifying the test config for shorter durations.

**Quick Test (2 minutes):**
1. Create a rule via settings UI:
   - Duration: 2 (minutes)
   - Max accesses: 2
   - Sites: example.com
2. Visit `example.com` twice (new tabs)
3. Get blocked
4. Wait 2 minutes
5. ✅ Can access again

---

## Test 6: Schedule Activation

1. Create a rule with schedule: Mon-Fri, 0900-1700
2. If outside schedule: sites accessible, no badge
3. If inside schedule: blocking works
4. Use debug dashboard to check "active rules"

---

## Test 7: Persistence

1. Access a site a few times (check badge)
2. Close and reopen Chrome
3. Open the same site
4. ✅ Badge shows correct remaining count
5. ✅ Access logs persisted

---

## Debug Tools

**Debug Dashboard:**
`chrome-extension://<ID>/src/pages/debug.html`
- View live stats
- See access logs
- Check which rules apply to a site
- Enable auto-refresh

**Storage Test Page:**
`chrome-extension://<ID>/src/pages/test-storage.html`
- View/edit raw configuration
- Save test configurations
- Clear all data
- View access logs

**Settings Data Test Page:**
`chrome-extension://<ID>/src/pages/test-settings-data.html`
- Test Phase 6 data functions
- Test overlap detection
- Test import/export

**Service Worker Console:**
`chrome://extensions/` → Details → "service worker"
- Watch navigation events
- See blocking decisions
- Monitor errors

## Troubleshooting

### Badge Not Showing
- Check service worker console for errors
- Verify configuration is loaded (check storage test page)
- Make sure you're using NEW tabs (not refreshing)
- Check that current time is within schedule

### Not Getting Blocked
- Verify you're opening NEW tabs (not refreshing existing)
- Check that rule is active (no schedule restrictions in test config)
- Check service worker logs - is it detecting navigation?
- Use debug dashboard "Check Site" feature

### Blocked Page Not Loading
- Check manifest.json has correct path
- Verify URL params in address bar
- Check browser console for errors

### Access Logs Not Saving
- Check storage permission in manifest
- Look for errors in service worker console
- Verify storage test page can write data
## Complete Test Checklist
     ---
- [ ] Can successfully block access after N visits
- [ ] Badge shows correct remaining count
- [ ] Badge updates when switching tabs
- [ ] Refreshes don't count as new accesses
- [ ] Blocked page displays correctly with all info
- [ ] Countdown timer works
- [ ] Strict mode shares count across sites
- [ ] Non-strict mode counts per-site
- [ ] Access logs persist across browser restart
- [ ] Settings UI loads and works
- [ ] Can add/edit/delete rules via UI
- [ ] Auto-save works (500ms delay)
- [ ] Import/export works
- [ ] Overlap warnings appear when appropriate
- [ ] Sites not in config are not tracked
- [ ] Extension icon opens settings
- [ ] Schedule activation/deactivation works

See `TROUBLESHOOTING.md` for more debugging help.
