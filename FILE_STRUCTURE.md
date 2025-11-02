# Project File Structure

## Overview
```
throttle-me-bananas/
├── manifest.json                   # Extension manifest (MV3)
│
├── assets/
│   └── icons/                      # Extension icons
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       ├── icon128.png
│       └── generate-icons.html     # Icon generator utility
│
├── src/
│   ├── background/                 # Service worker & logic
│   │   ├── service-worker.js       # Main background script
│   │   └── rule-engine.js          # Blocking logic
│   │
│   ├── storage/                    # Data layer
│   │   ├── schema.js               # Type definitions & validation
│   │   └── storage-manager.js      # Storage abstraction
│   │
│   ├── utils/                      # Pure utilities
│   │   ├── url-matcher.js          # URL/domain matching
│   │   ├── time-utils.js           # Schedule/time calculations
│   │   └── access-calculator.js    # Access counting logic
│   │
│   └── pages/                      # UI pages
│       ├── settings/               # Settings page
│       │   ├── settings.html
│       │   ├── settings.css
│       │   ├── settings.js
│       │   └── settings-data.js    # Phase 6 data layer
│       │
│       ├── blocked/                # Blocked page
│       │   ├── blocked.html
│       │   ├── blocked.css
│       │   └── blocked.js
│       │
│       ├── debug.html              # Debug dashboard
│       ├── test-storage.html       # Storage layer tests
│       └── test-settings-data.html # Settings data tests
│
└── docs/                           # Documentation
    ├── README.md                   # Project overview
    ├── IMPLEMENTATION_PLAN.md      # Development roadmap
    ├── STORAGE_SCHEMA.md           # Data structure docs
    ├── TESTING.md                  # Test instructions
    ├── QUICK_START.md              # 5-minute getting started
    ├── TROUBLESHOOTING.md          # Debug guide
    ├── FILE_STRUCTURE.md           # This file
    └── YOU_ARE_HERE.md             # Current status
```

## File Purposes

### Core Extension Files

**`manifest.json`**
- Extension metadata and configuration
- Declares permissions (storage, tabs, webNavigation)
- Defines service worker and pages
- MV3 compliant

### Background Scripts (Service Worker)

**`src/background/service-worker.js`** (~200 lines)
- Main entry point for background logic
- Navigation event listeners
- Tab tracking and badge management
- Blocking enforcement
- Storage change listeners
- Refresh detection

**`src/background/rule-engine.js`** (~200 lines)
- Pure business logic
- `getActiveRulesForSite()` - Find applicable rules
- `shouldBlockAccess()` - Block decision
- `getMostRestrictiveCount()` - Badge count calculation
- `calculateUnblockTime()` - When access available

### Storage Layer

**`src/storage/schema.js`** (~250 lines)
- Type definitions (JSDoc)
- Default configuration
- Validation functions for all data types
- Storage key constants
- Schema versioning

**`src/storage/storage-manager.js`** (~200 lines)
- Abstraction over chrome.storage.local
- CRUD operations for config and logs
- Validation integration
- Error handling
- Initialization and pruning

### Utilities (Pure Functions)

**`src/utils/url-matcher.js`** (~60 lines)
- `extractDomain()` - Parse domain from URL
- `extractPath()` - Parse path from URL
- `matchesSitePattern()` - Pattern matching logic
- Handles subdomains and path-specific patterns

**`src/utils/time-utils.js`** (~70 lines)
- `parseTimeRange()` - Parse "HHMM-HHMM"
- `isTimeInRange()` - Check if time in range
- `isRuleActiveNow()` - Schedule checking
- Local timezone support

**`src/utils/access-calculator.js`** (~70 lines)
- `filterAccessesInWindow()` - Rolling window filtering
- `calculateRemainingAccesses()` - Main counting logic
- Strict/non-strict mode support
- Per-site vs. group-wide counting

### Pages

**`src/pages/blocked/`** (~300 lines total)
- Beautiful blocked page with gradient background
- Displays block reason, rule info
- Live countdown timer
- "Open Settings" button
- URL parameter parsing
- Responsive design

**`src/pages/settings/`** (~1650 lines total)
- Full visual rule editor UI
- Add/edit/delete groups via forms
- Auto-save with 500ms debounce
- Schedule builder (day selector + time ranges)
- Import/export with validation
- Overlap detection warnings
- Real-time statistics dashboard
- `settings-data.js` - Phase 6 data management layer (CRUD, validation, overlap detection)

**`src/pages/debug.html`** (~300 lines)
- Real-time monitoring dashboard
- View stats, config, logs
- "Check Site" testing tool
- Auto-refresh mode
- Dark theme

**`src/pages/test-storage.html`** (~200 lines)
- Interactive storage API testing
- Test all CRUD operations
- Validation testing
- Quick test config button

**`src/pages/test-settings-data.html`** (~700 lines)
- Test all Phase 6 data management functions
- CRUD operations testing
- Import/export testing
- Overlap detection demo
- Validation testing
- Visual test suite with statistics

### Documentation

**`README.md`**
- Project overview and features
- Core concept explanation
- Configuration format examples
- Architecture overview

**`IMPLEMENTATION_PLAN.md`**
- 11-phase development plan
- Each phase with tasks and deliverables
- AI-friendly step-by-step guide
- Completion checklist

**`STORAGE_SCHEMA.md`**
- Complete data structure reference
- Validation rules
- Example configurations
- Storage API documentation

**`TESTING.md`**
- Phase-by-phase test instructions
- Comprehensive test scenarios
- Expected behaviors
- Troubleshooting per phase

**`QUICK_START.md`**
- Absolute beginner guide
- 5-minute functional test
- Step-by-step with checkboxes
- Troubleshooting quick fixes

**`TROUBLESHOOTING.md`**
- Common issues and solutions
- Debug techniques
- Advanced debugging
- Known limitations

**`YOU_ARE_HERE.md`**
- Current implementation status
- What's complete vs what's left
- Quick links to docs and testing

## Dependencies

### External Dependencies
**None!** Pure vanilla JavaScript.

### Chrome APIs Used
- `chrome.storage.local` - Data persistence
- `chrome.tabs` - Tab management
- `chrome.webNavigation` - Navigation tracking
- `chrome.action` - Badge management
- `chrome.runtime` - Extension utilities

### Browser Requirements
- Chrome 88+ (Manifest V3 support)
- Modern ES6+ JavaScript support

## Import Graph

```
service-worker.js
├── imports storage-manager.js
│   └── imports schema.js
├── imports rule-engine.js
│   ├── imports url-matcher.js
│   ├── imports time-utils.js
│   └── imports access-calculator.js
└── imports url-matcher.js

blocked.js
└── (no imports, standalone)

debug.html
├── imports storage-manager.js
└── imports rule-engine.js

test-storage.html
└── imports storage-manager.js
    └── imports schema.js

test-utils.html
├── imports url-matcher.js
├── imports time-utils.js
└── imports access-calculator.js
```

## Code Statistics

| Category | Files | Lines | Purpose |
|----------|-------|-------|---------|
| Background Logic | 2 | ~400 | Service worker + rule engine |
| Storage Layer | 2 | ~450 | Schemas + storage manager |
| Utilities | 3 | ~200 | Pure functions |
| UI Pages | 5 | ~2250 | Blocked, settings (data+UI), debug |
| Test Pages | 2 | ~900 | Storage + settings-data tests |
| Documentation | 7 | ~2000 | Complete guides |
| **Total** | **21** | **~6200** | **Complete extension** |

## Module Responsibilities

### Utilities (No dependencies)
- Pure functions only
- No side effects
- Fully testable in isolation
- No Chrome API calls

### Storage (Depends on Chrome API only)
- Abstraction layer
- Validation and error handling
- No business logic

### Rule Engine (Depends on utilities + storage types)
- Pure business logic
- No Chrome API calls
- No side effects
- Deterministic output

### Service Worker (Orchestrates everything)
- Event handling
- Chrome API interactions
- Coordinates utilities + storage + rule engine
- Side effects isolated here

### Pages (Independent)
- Each page self-contained
- Import only what they need
- No cross-page dependencies

## Testing Strategy

| Layer | Test Method | Location |
|-------|-------------|----------|
| Utilities | Unit tests | `test-utils.html` |
| Storage | Integration tests | `test-storage.html` |
| Rule Engine | Manual testing | `debug.html` |
| Service Worker | End-to-end testing | Browser usage |
| UI Pages | Manual inspection | Visual testing |

## Future Organization

As the project grows, consider:
- Move docs to `/docs` folder
- Create `/tests` folder for formal test suites
- Add `/scripts` for build/development tools
- Separate `/lib` for third-party code (if needed)
- Create `/types` for TypeScript definitions

## Getting Started

1. **Read first**: `QUICK_START.md`
2. **Load extension**: Follow Quick Start steps
3. **Test**: Use `QUICK_TEST.md` workflow
4. **Debug**: Use `debug.html` and service worker console
5. **Develop**: Follow `IMPLEMENTATION_PLAN.md`

## Key Files for Development

- **Modify blocking logic**: `rule-engine.js`
- **Change storage structure**: `schema.js`
- **Adjust UI**: `blocked.html`, `blocked.css`
- **Add features**: Start with `service-worker.js`
- **Test changes**: `debug.html` + service worker console
