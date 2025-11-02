# Architecture

## System Overview

The extension follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│          Service Worker (Orchestrator)      │
│  - Event handling                           │
│  - Chrome API interactions                  │
│  - Badge management                         │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐       ┌──────────────┐
│  Rule Engine  │       │   Storage    │
│  (Business    │       │   Manager    │
│   Logic)      │       │   (Data)     │
└───────────────┘       └──────────────┘
        ↓                       ↓
┌───────────────────────────────────────┐
│         Pure Utilities                │
│  - URL matching                       │
│  - Time calculations                  │
│  - Access counting                    │
└───────────────────────────────────────┘
```

## Module Dependency Graph

```
service-worker.js
├── storage-manager.js ──→ schema.js
├── rule-engine.js
│   ├── url-matcher.js
│   ├── time-utils.js
│   └── access-calculator.js
└── url-matcher.js

settings-data.js
├── storage-manager.js
├── time-utils.js
└── (validation from schema.js)

blocked.js
└── (standalone, reads URL params)
```

**Key principle**: Dependencies flow downward. Pure utilities have no dependencies. Business logic uses utilities. Service worker orchestrates everything.

## Data Flow

### Navigation Event → Block Decision

```
1. User navigates to site
        ↓
2. webNavigation.onCommitted event fires
        ↓
3. Service worker checks: is this a refresh?
   - Compare with tabUrlMap[tabId]
   - If same domain → IGNORE (don't count)
   - If different → Continue
        ↓
4. Get current configuration from storage
        ↓
5. rule-engine.shouldBlockAccess(site, config, logs)
   - Find active rules for site (schedule check)
   - Calculate remaining accesses (rolling window)
   - Return block decision
        ↓
6a. If ALLOW:
    - Log access to storage
    - Update badge for tab
6b. If BLOCK:
    - Redirect to blocked.html with params
    - Update badge to show 0
```

### Settings Change → Badge Update

```
1. User changes config in settings page
        ↓
2. settings-data.js validates & saves to storage
        ↓
3. chrome.storage.onChanged event fires
        ↓
4. Service worker receives change event
        ↓
5. For each open tab:
   - Get active rules for tab's site
   - Calculate new remaining count
   - Update badge
```

### Tab Switch → Badge Update

```
1. User switches tabs
        ↓
2. chrome.tabs.onActivated event fires
        ↓
3. Service worker gets tab's URL
        ↓
4. Get active rules for that site
        ↓
5. Calculate remaining accesses
        ↓
6. Update badge (or clear if no rules)
```

## File Organization

```
src/
├── background/              # Service worker & business logic
│   ├── service-worker.js    # Event orchestration
│   └── rule-engine.js       # Pure blocking logic
│
├── storage/                 # Data layer
│   ├── schema.js            # Types, validation, defaults
│   └── storage-manager.js   # CRUD operations
│
├── utils/                   # Pure functions (no side effects)
│   ├── url-matcher.js
│   ├── time-utils.js
│   └── access-calculator.js
│
└── pages/                   # UI (independent)
    ├── settings/
    │   ├── settings.html
    │   ├── settings.css
    │   ├── settings.js      # UI logic
    │   └── settings-data.js # Data layer for settings
    ├── blocked/
    │   ├── blocked.html
    │   ├── blocked.css
    │   └── blocked.js
    └── debug.html           # Developer dashboard
```

## Separation of Concerns

### Pure Utilities (src/utils/)
- **No side effects**
- **No Chrome API calls**
- **Fully synchronous**
- **Deterministic**
- Easy to unit test
- Examples: URL parsing, time calculations, access filtering

### Business Logic (rule-engine.js)
- **Pure functions** (no side effects)
- **No Chrome API calls**
- Uses utilities to make decisions
- Returns data, doesn't perform actions
- Example: `shouldBlockAccess()` returns `{block: true/false}`, doesn't redirect

### Storage Layer (storage-manager.js)
- **Abstraction over Chrome storage API**
- **No business logic**
- Validation only (using schema.js)
- Handles async operations
- Error handling

### Service Worker (service-worker.js)
- **Orchestration only**
- **All side effects isolated here**
- Chrome API interactions
- Event handling
- Coordinates utilities + rule engine + storage
- Badge management

### Pages (settings/, blocked/)
- **Self-contained**
- Import only what they need
- No cross-page dependencies
- Settings page has its own data layer (settings-data.js)

## State Management

### In-Memory State (Service Worker)
```javascript
const tabUrlMap = new Map(); // tabId → last URL domain
```
- **Purpose**: Refresh detection
- **Lifetime**: Until service worker sleeps or restarts
- **Loss handling**: If lost, all navigations count as new accesses (conservative)

### Persistent State (chrome.storage.local)
```javascript
{
  configuration: Configuration,  // User's rules
  accessLogs: AccessLog[],       // All access history
  storageVersion: number         // Schema version
}
```
- **Survives**: Browser restart, extension disable/enable
- **Pruning**: Old logs pruned periodically (older than longest rule duration)

### No Global State in Utilities
- All functions take explicit parameters
- No module-level variables
- Makes testing trivial

## Chrome Extension Constraints

### Manifest V3 Specifics
- Service worker instead of background page
- No persistent background context
- Service worker can sleep/restart
- Must handle state loss gracefully

### Service Worker Lifecycle
- **Starts**: On browser start, navigation events, alarm events
- **Sleeps**: After ~30 seconds of inactivity
- **State loss**: In-memory state (tabUrlMap) is lost on sleep
- **Mitigation**: Only used for optimization (refresh detection), not critical

### Event-Driven Architecture
All logic triggered by events:
- `chrome.webNavigation.onCommitted` → Navigation tracking
- `chrome.tabs.onActivated` → Badge updates
- `chrome.tabs.onUpdated` → Badge updates
- `chrome.tabs.onRemoved` → Cleanup
- `chrome.storage.onChanged` → Config change handling

### Storage API
- **Async only**: All storage operations return Promises
- **Size limits**: 5MB for local storage (more than enough)
- **No transactions**: Handle race conditions carefully (current impl is safe)

## Key Design Decisions

### Why Pure Functions for Business Logic?
- Testable without mocking Chrome APIs
- Deterministic behavior
- Easy to reason about
- Can extract and test in isolation

### Why Track All Accesses, Not Just During Active Rules?
- Accesses during "off hours" may count toward overlapping rules
- Example: Access at 4:55pm counts toward rule starting at 5pm
- Simplifies logic: always log, filter by schedule when checking

### Why Domain-Only in Access Logs?
- Path tracking not needed for current feature set
- Reduces storage size
- Simplifies matching logic
- Can add later if needed

### Why Rolling Windows Instead of Fixed Windows?
- More intuitive user experience
- "Last 60 minutes" vs "this hour"
- No complex window boundary logic
- Natural expiration of old accesses

### Why No Background State Persistence for tabUrlMap?
- Refresh detection is an optimization, not critical
- False positives (counting refreshes) are acceptable
- Simpler code, no sync overhead
- Conservative approach: when in doubt, count it

## Extension Points

### Adding a New Field to Rules
1. Update `RuleGroup` type in `schema.js`
2. Add validation in `validateRuleGroup()`
3. Update `DEFAULT_CONFIGURATION` if needed
4. Update settings UI (settings.html/js)
5. Update rule-engine.js to use new field
6. Add tests

### Adding a New Validation Rule
1. Add function to `schema.js`
2. Call from appropriate validator
3. Add error message
4. Add tests

### Adding a New Page
1. Create HTML/CSS/JS in `src/pages/`
2. Import needed modules (storage-manager, etc.)
3. Add to manifest.json if needed
4. Keep it self-contained

### Modifying Blocking Logic
1. Change rule-engine.js (pure functions)
2. Update tests
3. Service worker automatically uses new logic

## Performance Considerations

### Badge Updates
- Called frequently (every tab switch)
- Optimized: early returns for ignored URLs
- Filtering is fast (small arrays)
- No noticeable lag

### Access Log Growth
- Unbounded growth would be a problem
- Solution: `pruneOldAccessLogs()` called periodically
- Removes logs older than longest rule duration + buffer
- Runs in background, doesn't block

### Storage Operations
- All async (non-blocking)
- Writes batched where possible
- Reads cached by Chrome

### Memory Usage
- Service worker sleeps when idle
- No persistent background process
- Minimal memory footprint when active

## Security Considerations

### XSS Prevention
- All user input escaped before display
- No `eval()` or `new Function()`
- Content Security Policy in manifest

### Data Integrity
- Validation on all writes
- Schema versioning for migrations
- Fallback to defaults on corruption

### No Bypass Mechanism
- Service worker can't be disabled while extension enabled
- Extension pages immune to own blocking (intentional)
- No "emergency override" (by design)
