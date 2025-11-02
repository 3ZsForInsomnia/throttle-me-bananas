# Throttle Me, Bananas! 🍌

Control website access by limiting visits within time windows. A Chrome extension for managing digital distractions.

## Core Concept

Track and limit website visits within rolling time windows. Each new tab/navigation counts as an access. Refreshing doesn't count. When you hit your limit, access is blocked until the window rolls forward.

**Example:** 3 accesses per hour to gmail.com → After 3 visits in 60 minutes, blocked until oldest access expires.

## Installation

1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `throttle-me-bananas` folder
6. Click the extension icon to configure rules

## Key Features

### Access Tracking & Blocking

- **Visit-based counting**: Each time you open a new tab or navigate to a tracked site counts as an "access"
  - Opening a new tab to a site you already have open = new access
  - Navigating to a site you weren't on before = new access
  - Refreshing an existing tab = NOT a new access
- **Rolling time windows**: Only accesses within the past N minutes/hours count toward your limit
- **Persistent tracking**: Access counts persist across browser restarts and (when possible) extension disable/re-enable
- **Always-on tracking**: Accesses are tracked continuously, even when rules aren't actively blocking
  - Blocking only occurs when a rule is active (based on schedule)
  - This ensures accesses made during one time period can count toward overlapping rules

### Rule Groups

Each rule group can be configured with:

- **Name**: User-friendly identifier for the group
- **Duration**: Time window in minutes (e.g., 60 = 1 hour rolling window)
- **Max Accesses**: Number of allowed accesses within the duration
- **Sites**: List of websites to track (see URL Matching below)
- **Schedule**: Days and times when the rule is active (optional)
- **Strict Mode**: When enabled, `maxAccesses` applies to ALL sites in the group combined; when disabled, you get `maxAccesses` per individual site

### URL Matching

- **Domain-only matching**: `discord.com` matches `discord.com/*` and all subdomains
- **Path-specific matching**: `discord.com/channels` only matches that path and deeper (e.g., `discord.com/channels/*`)
- Matching is based on domain, not exact URL strings

### Scheduling

Rules can be configured to only apply during specific days and times:

```json
{
  "days": [0, 1, 2, 3, 4],  // 0-indexed, 0=Sunday, 6=Saturday (like JS Date)
  "times": ["0000-0900", "1900-2400"]  // 24-hour format, always local timezone
}
```

- **Default behavior**: If no schedule is configured, the rule is always active
- **Day boundaries are hard**: Access windows DO NOT extend across day/time boundaries
  - If a rule ends at 5pm, accesses at 4:59pm do NOT count toward a rule starting at 5pm
  - EXCEPTION: If a site is in multiple rules and an access occurs during an overlap period, it counts for all applicable rules

### Multi-Group Handling

- **Sites in multiple groups**: A site can appear in multiple rule groups
  - Each access counts against ALL active groups containing that site
  - The strictest group "wins" (whichever would block first)
- **Settings page warnings**: The settings page will warn users when a site appears in multiple groups that have overlapping active times

### User Interface

#### Badge/Icon Counter
- Shows **accesses remaining** for the current site
- Only displays when an active rule applies to the current site
- When multiple rules apply, shows the most restrictive (lowest) count

#### Blocked Page
- When access is blocked, redirects to a simple page stating "You've hit the limit"
- No notifications, counters, or visual noise
- No "reset counters" button

#### Settings Page
- Always accessible (never blocked)
- Configure multiple rule groups
- Warnings for sites in multiple groups with overlapping schedules
- Import/export configuration as JSON

### Data Storage

- Uses Chrome's built-in storage APIs
- Persists across browser restarts
- Persists across extension disable/re-enable (when possible)

### Incognito Mode

- Explicitly ignored/not supported

## Configuration Format

```json
{
  "groups": [
    {
      "name": "Work Hours Email Limit",
      "duration": 60,
      "maxAccesses": 3,
      "strictMode": false,
      "sites": [
        "gmail.com",
        "mail.google.com"
      ],
      "schedule": {
        "days": [1, 2, 3, 4, 5],
        "times": ["0900-1700"]
      }
    },
    {
      "name": "Social Media Blocker",
      "duration": 120,
      "maxAccesses": 5,
      "strictMode": true,
      "sites": [
        "discord.com",
        "reddit.com",
        "twitter.com"
      ],
      "schedule": {
        "days": [0, 1, 2, 3, 4, 5, 6],
        "times": ["0000-2400"]
      }
    }
  ]
}
```

## Edge Cases & Clarifications

### Existing Tabs
- If you've already accessed a site N times and leave a tab open, that tab remains accessible
- New attempts to access the site will be blocked
- The settings page is always accessible regardless of rules

### Time Windows
- Rolling windows: If duration is 60 minutes, only accesses in the past 60 minutes count
- Windows do NOT carry over across rule boundaries (unless the site is in multiple groups)

### Access Counting Examples

#### Non-Strict Mode (Default)
- Group has `gmail.com` and `discord.com` with `maxAccesses: 3`
- You can access gmail.com 3 times AND discord.com 3 times

#### Strict Mode
- Same group with strict mode enabled
- You get 3 total accesses across BOTH gmail.com AND discord.com combined

## Technical Architecture

### Core Components
1. **Background Script**: Tracks navigation events, manages access counts, enforces blocking
2. **Content Script**: (If needed) Handles blocked page redirects
3. **Settings Page**: UI for configuration management
4. **Blocked Page**: Simple page shown when access is denied
5. **Storage Manager**: Handles persistence of configuration and access logs

### Storage Structure
- **Configuration**: User-defined rule groups
- **Access Logs**: Timestamped records of site accesses
- **State**: Current access counts and remaining accesses per site/group

## Future Considerations

- Analytics/reporting on usage patterns
- Temporary "emergency access" override
- Different blocking strategies (delay instead of block, etc.)
- Sync across devices via Chrome sync storage

## Development Status

**Status**: Phases 1-9 complete - production ready!

### What's Implemented

- ✅ **Phase 1-2**: Core utilities and project structure
- ✅ **Phase 3**: Storage layer with validation
- ✅ **Phase 4**: Background service worker with blocking logic
- ✅ **Phase 5**: Blocked page with countdown timer
- ✅ **Phase 6**: Settings data management (CRUD, import/export, validation, overlap detection)
- ✅ **Phase 7**: Full settings UI with auto-save, real-time statistics, overlap warnings
- ✅ **Phase 8**: Badge management (color-coded counters, updates on all events)
- ✅ **Phase 9**: Integration & polish (all edge cases, error handling, storage changes)

### What's Left

- Phase 10: Comprehensive testing
- Phase 11: Documentation finalization

The extension is **production-ready**. Click the extension icon to open settings and configure your rules.

See `IMPLEMENTATION_PLAN.md` for details.
