# Implementation Plan: Throttle Me, Bananas!

This document outlines the step-by-step implementation plan for building the Chrome extension. Each phase is designed to be independently executable and testable.

## Overview

The implementation follows a bottom-up approach: core utilities → storage layer → business logic → UI → integration.

---

## Phase 1: Project Structure & Manifest

**Goal**: Set up the basic Chrome extension structure and manifest file.

**Tasks**:
1. Create `manifest.json` with:
   - Extension metadata (name, version, description)
   - Permissions: `storage`, `tabs`, `webNavigation`
   - Background service worker declaration
   - Action (for badge/icon)
   - Settings page declaration
2. Create folder structure:
   ```
   /src
     /background
     /pages
       /settings
       /blocked
     /utils
     /storage
   /assets
     /icons
   ```
3. Add basic icons (can be placeholder)
4. Verify extension loads in Chrome

**Deliverables**: 
- `manifest.json`
- Basic folder structure
- Extension loads without errors

---

## Phase 2: Core Utilities

**Goal**: Build foundational utility functions that other modules will depend on.

**File**: `src/utils/url-matcher.js`

**Functions**:
1. `extractDomain(url)` - Extract domain from URL
2. `extractPath(url)` - Extract path from URL
3. `matchesSitePattern(url, pattern)` - Check if URL matches a configured site pattern
   - Handle domain-only patterns (`discord.com`)
   - Handle path-specific patterns (`discord.com/channels`)
   - Return boolean

**File**: `src/utils/time-utils.js`

**Functions**:
1. `isRuleActiveNow(schedule)` - Check if a rule's schedule is currently active
   - Handle missing schedule (always active)
   - Check current day of week
   - Check current time against time ranges
   - Return boolean
2. `parseTimeRange(timeString)` - Parse "HHMM-HHMM" into start/end objects
3. `isTimeInRange(currentTime, startTime, endTime)` - Check if time falls in range

**File**: `src/utils/access-calculator.js`

**Functions**:
1. `filterAccessesInWindow(accesses, durationMinutes)` - Filter accesses to only those within the rolling window
   - Take array of timestamp objects
   - Return filtered array
2. `calculateRemainingAccesses(accesses, maxAccesses, durationMinutes, strictMode, sites, currentSite)` - Calculate remaining accesses
   - Handle strict mode (all sites combined)
   - Handle non-strict mode (per-site)
   - Return number

**Testing**: Create simple test HTML files that import and test each utility function

---

## Phase 3: Storage Layer

**Goal**: Create abstraction layer over Chrome storage API with typed data structures.

**File**: `src/storage/schema.js`

**Contents**:
- Define TypeScript-style JSDoc comments for:
  - `RuleGroup` type
  - `Schedule` type
  - `AccessLog` type (site, timestamp, tabId)
  - `Configuration` type (array of RuleGroups)

**File**: `src/storage/storage-manager.js`

**Functions**:
1. `getConfiguration()` - Retrieve all rule groups
2. `saveConfiguration(config)` - Save rule groups
3. `getAccessLogs()` - Retrieve all access logs
4. `addAccessLog(site, timestamp, tabId)` - Add new access log entry
5. `pruneOldAccessLogs(maxAgeMinutes)` - Remove logs older than longest duration in config
6. `clearAllData()` - Clear everything (for testing/development)

**Implementation Notes**:
- Use `chrome.storage.local` for all data
- All functions return Promises
- Add error handling and validation

**Testing**: Create test settings page that can call these functions and display results

---

## Phase 4: Background Service Worker - Core Logic

**Goal**: Implement the main business logic for tracking and blocking.

**File**: `src/background/rule-engine.js`

**Functions**:
1. `getActiveRulesForSite(site, allGroups)` - Return all currently active rules that apply to a site
   - Check schedule
   - Check site pattern matching
   - Return array of applicable RuleGroups
2. `shouldBlockAccess(site, allGroups, accessLogs)` - Determine if access should be blocked
   - Get active rules for site
   - For each rule, calculate remaining accesses
   - If any rule has 0 remaining, return { block: true, reason: ruleName }
   - Return { block: false }
3. `getMostRestrictiveCount(site, allGroups, accessLogs)` - Get the lowest remaining count for badge
   - Get active rules for site
   - Calculate remaining for each
   - Return lowest number (or null if no active rules)

**File**: `src/background/service-worker.js`

**Implementation**:
1. Listen to `chrome.webNavigation.onCommitted` events
   - Filter for main frame only (not iframes)
   - Extract URL
   - Check if it's the settings page or blocked page (skip if so)
2. On navigation:
   - Get configuration and access logs from storage
   - Check `shouldBlockAccess()`
   - If should block: redirect to blocked page
   - If not blocked: add access log entry
   - Update badge for current tab
3. Listen to `chrome.tabs.onActivated` - Update badge when switching tabs
4. Listen to `chrome.tabs.onUpdated` - Update badge when tab URL changes
5. Helper: `updateBadge(tabId, site)` - Set badge text to remaining count

**Implementation Notes**:
- Need to track tab IDs to avoid counting refreshes
- Store "last URL per tab" in memory to detect navigation vs refresh
- Handle edge case: same site in multiple tabs (each is separate for blocking, but uses same access log)

---

## Phase 5: Blocked Page

**Goal**: Simple page shown when access is denied.

**Files**:
- `src/pages/blocked/blocked.html`
- `src/pages/blocked/blocked.css`
- `src/pages/blocked/blocked.js`

**Implementation**:
1. HTML: Simple centered message "You've hit your access limit for this site"
2. CSS: Clean, minimal styling
3. JS: 
   - Read URL parameter to get blocked site and rule name
   - Display which site was blocked
   - Display which rule triggered it
   - Show when access will be available again (calculate based on oldest access in window)

---

## Phase 6: Settings Page - Data Management

**Goal**: Build backend functionality for settings page.

**File**: `src/pages/settings/settings-data.js`

**Functions**:
1. `loadConfiguration()` - Load and return current config
2. `saveConfiguration(config)` - Validate and save config
3. `addRuleGroup(group)` - Add new rule group
4. `updateRuleGroup(index, group)` - Update existing rule group
5. `deleteRuleGroup(index)` - Remove rule group
6. `validateRuleGroup(group)` - Validate rule group structure
7. `detectOverlappingSites()` - Find sites in multiple groups with overlapping schedules
8. `exportConfiguration()` - Return JSON string of config
9. `importConfiguration(jsonString)` - Parse and validate imported config

---

## Phase 7: Settings Page - UI

**Goal**: Build the user interface for configuration.

**Files**:
- `src/pages/settings/settings.html`
- `src/pages/settings/settings.css`
- `src/pages/settings/settings.js`

**Implementation**:

**HTML Structure**:
1. Header with title and import/export buttons
2. Warning section (for overlapping sites)
3. List of rule groups (cards)
4. "Add New Group" button
5. Each rule group card shows:
   - Name (editable)
   - Duration in minutes (editable, with human-friendly conversion)
   - Max accesses (editable)
   - Strict mode toggle
   - Sites list (add/remove)
   - Schedule configuration (day checkboxes + time ranges)
   - Delete group button

**JavaScript**:
1. On load: fetch and render configuration
2. Handle all form interactions (add/edit/delete groups, sites, schedules)
3. Show warnings for overlapping sites
4. Auto-save on changes (with debounce)
5. Import/export handlers

**CSS**:
- Clean, modern design
- Responsive layout
- Clear visual hierarchy
- Color coding for warnings

---

## Phase 8: Badge Management

**Goal**: Implement the extension icon badge counter.

**Location**: Enhance `src/background/service-worker.js`

**Implementation**:
1. `updateBadgeForTab(tabId)` function:
   - Get tab URL
   - Get configuration and access logs
   - Calculate most restrictive count
   - If count exists and > 0: set badge text to count
   - If count is 0: set badge color to red
   - If no active rules: clear badge
2. Call `updateBadgeForTab` on:
   - Tab activation
   - Tab URL update
   - After adding access log
   - After configuration changes (listen to storage changes)

---

## Phase 9: Integration & Polish

**Goal**: Connect all pieces and handle edge cases.

**Tasks**:
1. Ensure blocked page is never blocked
2. Ensure settings page is never blocked
3. Handle extension icon click (open settings page)
4. Add default configuration on first install
5. Handle storage changes (if config updated in settings, update behavior immediately)
6. Proper error handling throughout
7. Add console logging (dev mode, can be removed later)
8. Test all edge cases:
   - Browser restart
   - Extension reload
   - Sites in multiple groups
   - Schedule boundaries
   - Strict mode vs non-strict mode
   - Refresh vs new tab
   - Time zone changes (though we don't need to handle this specially)

---

## Phase 10: Testing & Refinement

**Goal**: Comprehensive testing and bug fixes.

**Testing Scenarios**:
1. Basic access limiting (hit limit, get blocked)
2. Rolling window (access should unblock as old accesses expire)
3. Multiple groups with same site
4. Strict mode limiting
5. Schedule activation/deactivation
6. URL pattern matching (domain vs path-specific)
7. Badge updates correctly
8. Settings page validation
9. Import/export functionality
10. Persistence across restarts

**Refinements**:
- Performance optimization if needed
- UI/UX improvements
- Code cleanup and documentation

---

## Phase 11: Documentation

**Goal**: Complete user-facing documentation.

**Tasks**:
1. Update README with installation instructions
2. Add screenshots to README
3. Create user guide in `USER_GUIDE.md`
4. Document configuration examples
5. Add troubleshooting section
6. Code comments for complex logic

---

## Development Notes

### Recommended Approach for AI Implementation

When requesting implementation:
1. **One phase at a time**: Complete each phase fully before moving to next
2. **Verify at each step**: Load extension and test after each phase
3. **Provide context**: Share relevant files when requesting next phase
4. **Iterative refinement**: Fix issues in current phase before proceeding

### Key Technical Decisions

- **Service Worker**: Chrome MV3 requires background service worker (not persistent background page)
- **Event-driven**: All background logic triggered by navigation/tab events
- **Storage strategy**: `chrome.storage.local` for all persistence
- **No external dependencies**: Vanilla JS, no frameworks
- **Modern JS**: ES6+ features (async/await, modules, etc.)

### Testing Strategy

Since Chrome extensions are difficult to unit test traditionally:
- Create test HTML pages for utilities
- Use extension's dev console for background script testing
- Manual testing for integration scenarios
- Consider creating a test configuration with short durations (1-2 minutes) for rapid testing

---

## Completion Checklist

- [x] Phase 1: Project structure
- [x] Phase 2: Core utilities
- [x] Phase 3: Storage layer
- [x] Phase 4: Background logic
- [x] Phase 5: Blocked page
- [x] Phase 6: Settings data management
- [x] Phase 7: Settings UI
- [x] Phase 8: Badge management
- [x] Phase 9: Integration
- [ ] Phase 10: Testing
- [ ] Phase 11: Documentation

---

## Future Enhancements (Post-MVP)

- Analytics dashboard showing usage patterns
- Temporary override mechanism
- Alternative blocking strategies (delay, distraction message, etc.)
- Chrome sync storage for multi-device support
- Dark mode for UI
- Keyboard shortcuts
 Custom blocked page messages per group
