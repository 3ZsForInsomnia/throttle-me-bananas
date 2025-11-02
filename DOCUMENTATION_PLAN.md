# Documentation Improvement Plan

## Current State

We have 8 markdown files that are somewhat fragmented between user-facing and developer-facing content:

**Existing Docs:**
- `README.md` - Mix of user features and dev status
- `YOU_ARE_HERE.md` - Current status
- `QUICK_START.md` - Getting started testing
- `TESTING.md` - Manual test scenarios
- `TROUBLESHOOTING.md` - Debug guide
- `IMPLEMENTATION_PLAN.md` - Development phases
- `STORAGE_SCHEMA.md` - Data structures
- `FILE_STRUCTURE.md` - Project organization

---

## Proposed Structure

### For Users/End Users

**1. USER_GUIDE.md** (New - Primary user documentation)
```markdown
# User Guide

## What Is This?
- Plain English explanation
- Who it's for
- What problem it solves

## Installation
- Load unpacked extension
- Basic setup
- Your first rule

## Creating Rules
- Step-by-step with screenshots
- Understanding time windows
- Understanding access limits
- Strict vs non-strict mode

## Schedules
- Setting up schedules
- Day selection
- Time ranges
- Examples (work hours, evenings only, etc.)

## Common Scenarios
- Limit social media during work hours
- Restrict news sites
- Time-box email checking
- Multiple schedules for one site

## Import/Export
- Backing up your config
- Sharing configs
- Restoring settings

## Troubleshooting
- Not getting blocked?
- Badge not showing?
- Lost your settings?

## FAQ
- How does counting work?
- What's a "rolling window"?
- Does refreshing count?
- Can I bypass it?
```

**2. README.md** (Simplified - Project overview)
```markdown
# Throttle Me, Bananas! 🍌

**Tagline**: Control website access by limiting visits within time windows

## Features (Bullet points)
## Quick Start (3 steps)
## For Users → See USER_GUIDE.md
## For Developers → See DEVELOPMENT.md
## License
## Contributing
```

---

### For Developers/You/AI

**3. DEVELOPMENT.md** (New - Developer setup & architecture)
```markdown
# Development Guide

## Quick Start for Developers
- Clone repo
- Load extension
- Run tests
- Make changes

## Architecture Overview
- High-level components
- Data flow diagram
- Event flow
- Module dependencies

## Project Structure
(Move content from FILE_STRUCTURE.md here)

## Core Concepts

### URL Matching
- How patterns work
- Domain vs path
- Subdomain handling

### Rolling Time Windows
- How counting works
- When accesses expire
- Examples with timeline diagrams

### Strict Mode
- Per-site vs shared pool
- Examples

### Schedule System
- Day/time representation
- Active rule determination
- Edge cases

## Testing
- Unit tests (see TESTING_STRATEGY.md)
- Manual testing (see TESTING.md)
- Debug tools

## Making Changes

### Adding a New Utility Function
- Where to put it
- How to test it
- Updating dependencies

### Modifying Business Logic
- Where logic lives
- What to test
- How to verify

### Changing UI
- Settings page
- Blocked page
- Debug dashboard

## Chrome Extension Specifics
- Manifest V3 requirements
- Service worker limitations
- Storage API usage
- Permissions needed

## Common Tasks
- Add a new field to config
- Change badge behavior
- Modify blocking logic
- Add new validation rules
```

**4. API_REFERENCE.md** (New - Function documentation)
```markdown
# API Reference

Complete reference for all exported functions, organized by module.

## Utilities

### URL Matcher (`src/utils/url-matcher.js`)

#### `extractDomain(url: string): string`
**Purpose**: Extract domain from URL
**Parameters**: 
- `url`: Full URL string
**Returns**: Domain (e.g., "discord.com")
**Examples**:
```javascript
extractDomain('https://discord.com/channels') // "discord.com"
extractDomain('https://sub.example.com') // "sub.example.com"
```

#### `matchesSitePattern(url: string, pattern: string): boolean`
**Purpose**: Check if URL matches configured pattern
**Parameters**:
- `url`: Full URL to check
- `pattern`: Pattern like "discord.com" or "discord.com/channels"
**Returns**: True if matches
**Examples**:
```javascript
matchesSitePattern('https://discord.com/any', 'discord.com') // true
matchesSitePattern('https://discord.com/channels/123', 'discord.com/channels') // true
```

[Continue for all modules...]

## Storage

### Schema Types

#### RuleGroup
```typescript
{
  name: string
  duration: number          // minutes
  maxAccesses: number       // count
  strictMode: boolean
  sites: string[]          // patterns
  schedule?: Schedule
}
```

[Continue...]

## Rule Engine

### Core Functions

#### `shouldBlockAccess(site, config, accessLogs)`
[Full documentation...]

[Continue for all public APIs...]
```

**5. ARCHITECTURE.md** (New - Deep dive for AI/senior devs)
```markdown
# Architecture Deep Dive

## System Design Philosophy

### Separation of Concerns
- Pure utilities (no side effects)
- Storage abstraction (no business logic)
- Rule engine (pure functions)
- Service worker (orchestration only)

### Data Flow

```
User Action (Settings UI)
    ↓
settings-data.js (validation)
    ↓
storage-manager.js (persistence)
    ↓
chrome.storage.local
    ↓ (change event)
service-worker.js (listener)
    ↓
Badge updates
```

```
Navigation Event
    ↓
service-worker.js (webNavigation listener)
    ↓
rule-engine.js (shouldBlockAccess?)
    ↓
storage-manager.js (add access log)
    ↓
Badge update / Redirect to blocked
```

### Module Dependency Graph

```
service-worker.js
├── storage-manager.js ─── schema.js
├── rule-engine.js
│   ├── url-matcher.js
│   ├── time-utils.js
│   └── access-calculator.js
└── url-matcher.js

settings-data.js
├── storage-manager.js
├── time-utils.js
└── url-matcher.js (indirectly)

blocked.js
└── (no dependencies)
```

## Implementation Details

### Refresh Detection
How we distinguish refresh from new access:
1. Maintain `tabUrlMap` in service worker memory
2. On navigation: compare new URL to last URL for tab
3. If same domain OR transitionType === 'reload' → refresh
4. Otherwise → new access

**Edge Cases**:
- Tab closed: clean up map
- Extension reload: map lost (all accesses count)
- Same site in different tabs: tracked separately

### Badge Management
How badge count works:
1. On any tab change/update: `updateBadgeForTab()`
2. Get all active rules for current site
3. Calculate remaining for each rule
4. Show lowest remaining (most restrictive)
5. Color code based on count

**Edge Cases**:
- No active rules: clear badge
- Extension pages: clear badge
- Chrome pages: clear badge
- Multiple rules: show strictest

### Rolling Windows
How time windows work:
1. Store all accesses with timestamp
2. Filter to those within `duration` minutes ago
3. Count filtered accesses
4. Compare to `maxAccesses`

**Why this works**:
- Old accesses automatically "fall out" of window
- No need to manually expire
- Works across browser restarts
- Handles timezone changes naturally

### Strict Mode Implementation
**Non-strict** (default):
```
Group: ["discord.com", "reddit.com"], max 3
- Can access discord.com 3 times
- AND reddit.com 3 times
- 6 total accesses possible
```

**Strict**:
```
Group: ["discord.com", "reddit.com"], max 3
- Can access EITHER site
- Total of 3 accesses combined
- After 3, both blocked
```

Implementation: `calculateRemainingAccesses()` filters logs differently based on `strictMode` flag.

### Schedule Activation
Rules are checked for schedule on every access:
1. `isRuleActiveNow()` checks current day/time
2. If not in schedule: rule ignored (doesn't block, doesn't count)
3. If in schedule: rule applies normally

**Edge Case**: Site in multiple groups, some active, some not
- Only active groups considered for blocking
- But accesses always logged (for when inactive groups become active)

### Overlap Detection
Why we warn about overlaps:
```
Rule 1: discord.com, Mon-Fri 9-5, max 3
Rule 2: discord.com, Mon-Fri 1-6, max 5

Problem: 1-5pm both rules active
- Which limit applies? (Lowest wins)
- User might be confused why blocked with 2 remaining
```

Detection algorithm:
1. Find sites in multiple groups
2. Check if schedules have common days
3. Check if time ranges overlap
4. Warn if both true

## Performance Considerations

### Badge Updates
- Could be called frequently (every tab switch)
- Optimized: early returns for ignored URLs
- Memoization not needed (fast enough)

### Access Log Growth
- Unbounded logs would grow forever
- Solution: `pruneOldAccessLogs()` called periodically
- Removes logs older than longest rule duration

### Storage Operations
- All async (non-blocking)
- Batched where possible
- Validation before write (prevent corruption)

## Security Considerations

### XSS Prevention
- All user input escaped in settings UI
- `escapeHtml()` before innerHTML
- No eval() or function constructors

### Data Integrity
- Validation on all writes
- Schema versioning for migrations
- Fallback to defaults on corruption

### Bypass Prevention
- Service worker can't be disabled while extension enabled
- Extension pages immune to own blocking
- No "override" mechanism (by design)

## Extensibility

### Adding New Features

**New rule option**:
1. Add to RuleGroup type in schema.js
2. Add validation in validateRuleGroup()
3. Update rule-engine.js to use it
4. Add UI controls in settings.html/js
5. Update documentation

**New validation**:
1. Add function to schema.js
2. Call from validateRuleGroup()
3. Add tests
4. Update error messages

**New utility**:
1. Create in src/utils/
2. Export pure functions
3. Add tests
4. Import where needed

## Future Improvements

### Planned (would be good)
- Temporary override mechanism
- Analytics/usage dashboard
- Custom blocked page messages
- Dark mode UI

### Possible (maybe)
- Chrome sync (multi-device)
- Keyboard shortcuts
- Group templates
- Drag-and-drop reordering
- Search/filter rules

### Won't Do (out of scope)
- Incognito mode support (explicitly ignored)
- Account system (local only)
- AI-based blocking (too complex)
- Content filtering (different use case)
```

---

## Consolidation Plan

### Files to Keep
- ✅ README.md (simplify)
- ✅ TESTING.md (keep as-is, manual tests)
- ✅ TROUBLESHOOTING.md (keep as-is)
- ✅ IMPLEMENTATION_PLAN.md (keep for historical reference)

### Files to Create
- 📝 USER_GUIDE.md (primary user docs with screenshots)
- 📝 DEVELOPMENT.md (dev setup & architecture overview)
- 📝 API_REFERENCE.md (function documentation)
- 📝 ARCHITECTURE.md (deep dive for AI context)
- 📝 TESTING_STRATEGY.md (already created)

### Files to Merge/Remove
- ❌ FILE_STRUCTURE.md → merge into DEVELOPMENT.md
- ❌ STORAGE_SCHEMA.md → merge into API_REFERENCE.md
- ❌ YOU_ARE_HERE.md → info goes into README.md status section
- ❌ QUICK_START.md → merge into USER_GUIDE.md

### Final Structure
```
docs/
├── README.md                  # Project overview (simplified)
├── USER_GUIDE.md             # For end users (with screenshots)
├── DEVELOPMENT.md            # For developers (setup & architecture)
├── API_REFERENCE.md          # Complete function docs
├── ARCHITECTURE.md           # Deep dive (for AI & senior devs)
├── TESTING_STRATEGY.md       # Unit/integration testing
├── TESTING.md                # Manual test scenarios
├── TROUBLESHOOTING.md        # Debug guide
└── IMPLEMENTATION_PLAN.md    # Historical reference
```

---

## Benefits

### For Users
- **Single source of truth**: USER_GUIDE.md has everything
- **Screenshots**: Visual learning
- **Common scenarios**: Real examples
- **No dev jargon**: Plain English

### For Developers
- **Quick onboarding**: DEVELOPMENT.md gets you started
- **Complete reference**: API_REFERENCE.md for details
- **Testing guide**: TESTING_STRATEGY.md for tests
- **Architecture context**: ARCHITECTURE.md for deep understanding

### For AI Assistants
- **ARCHITECTURE.md** provides complete mental model
- **API_REFERENCE.md** has all function signatures
- **Clear module boundaries** documented
- **Data flow** explicitly explained
- **Edge cases** documented

---

## Next Steps

1. **Create USER_GUIDE.md** with screenshots
2. **Create DEVELOPMENT.md** (merge FILE_STRUCTURE.md content)
3. **Create API_REFERENCE.md** (merge STORAGE_SCHEMA.md content)
4. **Create ARCHITECTURE.md** (deep dive for AI context)
5. **Simplify README.md** (remove dev details)
6. **Remove redundant files** (YOU_ARE_HERE.md, FILE_STRUCTURE.md, etc.)
7. **Add diagrams** (data flow, architecture)
8. **Take screenshots** for USER_GUIDE.md

Want me to start creating these?
