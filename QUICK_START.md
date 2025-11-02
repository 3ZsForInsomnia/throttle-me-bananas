# 🚀 Quick Start - Test Your Extension NOW

## ⚡ 5-Minute Functional Test

### Step 1: Load Extension (30 seconds)
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `throttle-me-bananas` folder
5. ✅ Extension appears with banana icon 🍌

### Step 2: Open Settings (30 seconds)
1. Right-click extension icon → "Inspect service worker" (keep this open)
2. Click extension icon in toolbar (or right-click → "Options")
3. You should see the settings page

**Option A: Use the Settings UI** (Recommended)
1. Click "Add New Rule Group"
2. Name: "Gmail Test"
3. Time Window: 60 (minutes)
4. Max Accesses: 3
5. Add site: `gmail.com`
6. Select all days (Sun-Sat)
7. Changes auto-save (wait ~500ms)

**Option B: Use Test Configuration** (Quick setup)
1. Replace `/settings.html` in URL with `/test-storage.html`
2. Click **"Save Test Configuration"** button
3. ✅ Should see success message

### Step 3: Test Blocking (3 minutes)
1. Open a **NEW TAB** → go to `gmail.com`
   - ✅ Badge shows **3** (green)
   - ✅ Service worker logs: "Access allowed to gmail.com"

2. Open **ANOTHER NEW TAB** → go to `gmail.com`
   - ✅ Badge shows **2** (yellow)

3. Open **ANOTHER NEW TAB** → go to `gmail.com`
   - ✅ Badge shows **1** (yellow)

4. Open **ANOTHER NEW TAB** → go to `gmail.com`
   - ✅ **BLOCKED!** Redirected to beautiful blocked page
   - ✅ Shows site, rule name, limit, countdown timer

### Step 4: Verify Refresh Behavior (30 seconds)
1. Go back to one of your open Gmail tabs
2. Hit **Cmd+R** (Mac) or **Ctrl+R** (Windows) to refresh
3. ✅ Page loads normally (NOT blocked)
4. ✅ Service worker logs: "Refresh detected"

### Step 5: Test Strict Mode (1 minute)
1. Open `discord.com` in new tab → badge shows **5**
2. Open `reddit.com` in new tab → badge shows **4**
3. Open `twitter.com` in new tab → badge shows **3**
4. ✅ Notice: All three sites share the same counter!

---

## 🎉 If All Above Worked: SUCCESS!

Your extension is **fully functional**. Everything else is bonus features.

---

## 🛠️ Useful Pages

Find your extension ID at `chrome://extensions/`, then bookmark these:

### Debug Dashboard
`chrome-extension://<YOUR_ID>/src/pages/debug.html`
- Real-time stats
- View access logs
- Test which sites would be blocked
- Enable auto-refresh

### Storage Test Page
`chrome-extension://<YOUR_ID>/src/pages/test-storage.html`
- Manually edit configuration
- Add/view access logs
- Clear all data
- Test validation

### Settings Data Test Page
`chrome-extension://<YOUR_ID>/src/pages/test-settings-data.html`
- Test Phase 6 data management functions
- Test overlap detection
- Test import/export
- Validate rule groups

---

## 🔧 Quick Config Changes

Want to test with a 2-minute window instead of 60 minutes?

1. Open storage test page
2. Open browser console (F12)
3. Paste this:

```javascript
import { saveConfiguration } from '../storage/storage-manager.js';
await saveConfiguration({
  groups: [{
    name: 'Quick Test',
    duration: 2,          // 2 minutes!
    maxAccesses: 2,       // 2 accesses
    strictMode: false,
    sites: ['example.com']
  }]
});
console.log('Config saved! Visit example.com twice.');
```

4. Visit `example.com` twice in new tabs
5. Get blocked
6. Wait 2 minutes
7. Try again - should work!

---

## 🐛 Something Broken?

### Extension won't load?
- Check `chrome://extensions/` for error messages
- Verify manifest.json is valid JSON
- Reload extension (refresh icon)

### Not getting blocked?
- Are you opening **NEW TABS**? (not refreshing)
- Check service worker console for logs
- Verify config exists (storage test page)
- Open debug dashboard → "Check Site"

### Badge not showing?
- Refresh extension
- Make sure you opened a **new tab**
- Check that site is in config
- Verify rule is active (check schedule)

### See TROUBLESHOOTING.md for more

---

## 📊 What The Test Config Does

**Rule 1: "Test Work Hours"**
- Sites: `gmail.com`, `mail.google.com`
- Limit: 3 accesses per 60 minutes
- Mode: Non-strict (3 accesses PER SITE)
- Schedule: Mon-Fri, 9am-5pm

**Rule 2: "Test Social Media"**
- Sites: `discord.com`, `reddit.com`, `twitter.com`
- Limit: 5 accesses per 120 minutes
- Mode: **Strict** (5 accesses TOTAL across all 3)
- Schedule: Always active

---

## ✅ Success Checklist

- [ ] Extension loaded
- [ ] Service worker shows no errors
- [ ] Badge appears and counts down
- [ ] Got blocked after 3 Gmail accesses
- [ ] Blocked page looks good
- [ ] Refresh didn't count as new access
- [ ] Strict mode shared counter across sites
- [ ] Countdown timer updates

**If you checked all boxes: YOU'RE DONE!** 🎊

The extension is fully functional!

---

## 🎯 Next Steps

### Want to actually USE the extension?
Just click the extension icon and use the settings page!

### Want to keep developing?
Continue to Phase 8-11 for polish and testing

### Want to customize the blocked page?
Edit `src/pages/blocked/blocked.html` and `.css`

### Want different badge colors?
Edit the color codes in `service-worker.js` → `updateBadgeForTab()`

---

## 💡 Pro Tips

1. **Keep service worker console open** while testing
2. **Use debug dashboard** with auto-refresh enabled
3. **Test with short durations** (2 min) for fast iteration
4. **Clear storage between major tests** (debug dashboard)
5. **Check "Check Site" tool** to debug blocking decisions

---

## 🏁 You Did It!

You've built a fully functional Chrome extension with:
- ✅ Complex business logic
- ✅ Persistent storage
- ✅ Real-time UI updates
- ✅ Modern MV3 architecture
- ✅ Comprehensive error handling
- ✅ Beautiful UI

**Congrats!** 🎉🍌

Now go test it and let me know what breaks! 😄
