# Storage Schema

## Overview

The extension uses Chrome's `storage.local` API to persist configuration and access logs.

## Storage Keys

```javascript
{
  configuration: Configuration,  // User's rule groups
  accessLogs: AccessLog[],       // All access history
  storageVersion: number         // Schema version (currently 1)
}
```

## Data Structures

### Configuration

```typescript
{
  groups: RuleGroup[]
}
```

### RuleGroup

```typescript
{
  name: string,            // User-friendly name
  duration: number,        // Time window in minutes
  maxAccesses: number,     // Max accesses allowed in window
  strictMode: boolean,     // If true, limit applies to all sites combined
  sites: string[],         // Array of site patterns
  schedule?: Schedule      // Optional - when rule is active
}
```

**Strict Mode Behavior:**
- `false`: Each site gets `maxAccesses` independently
- `true`: All sites share one pool of `maxAccesses`

### Schedule

```typescript
{
  days: number[],       // 0-6, where 0=Sunday, 6=Saturday
  times: string[]       // Array of "HHMM-HHMM" ranges in 24-hour format
}
```

**If schedule is undefined/null**: Rule is always active

**Examples:**
```javascript
// Monday-Friday, 9am-5pm
{ days: [1,2,3,4,5], times: ["0900-1700"] }

// Weekends, all day
{ days: [0,6], times: ["0000-2359"] }

// Split schedule (lunch break)
{ days: [1,2,3,4,5], times: ["0900-1200", "1300-1700"] }
```

### AccessLog

```typescript
{
  site: string,        // Domain only (e.g., "discord.com")
  timestamp: number,   // Unix timestamp in milliseconds
  tabId: number        // Chrome tab ID
}
```

**Note:** Path is not stored, only domain. Simplifies matching and reduces storage.

## Validation

All validation functions are in `src/storage/schema.js` and return:
```typescript
{
  valid: boolean,
  errors: string[]
}
```

### RuleGroup Validation Rules

- `name`: Non-empty string (whitespace trimmed)
- `duration`: Positive number (minutes)
- `maxAccesses`: Positive number (count)
- `strictMode`: Boolean
- `sites`: Non-empty array of non-empty strings
- `schedule.days`: Array of numbers 0-6 (inclusive)
- `schedule.times`: Array of strings matching `/^\d{4}-\d{4}$/`

### Configuration Validation

Validates:
1. Must have `groups` array
2. Each group passes `validateRuleGroup()`
3. Errors include group index and name

### AccessLog Validation Rules

- `site`: Non-empty string
- `timestamp`: Positive number
- `tabId`: Number (can be 0 or negative for special Chrome tabs)

## Default Configuration

```javascript
{
  groups: [
    {
      name: 'Example Rule - Delete Me',
      duration: 60,
      maxAccesses: 3,
      strictMode: false,
      sites: ['example.com'],
      schedule: {
        days: [0,1,2,3,4,5,6],
        times: ['0000-2400']
      }
    }
  ]
}
```

## Storage Manager API

Located in `src/storage/storage-manager.js`.

### Read Operations

```javascript
await getConfiguration()
// Returns: Configuration (or default if none exists)

await getAccessLogs()
// Returns: AccessLog[]

await getStorageStats()
// Returns: { configSize, logsCount, version }
```

### Write Operations

```javascript
await saveConfiguration(config)
// Validates, then saves
// Throws: ValidationError if invalid

await addAccessLog(site, timestamp, tabId)
// Validates, then appends to logs
// Throws: ValidationError if invalid

await pruneOldAccessLogs(maxAgeMinutes)
// Removes logs older than maxAgeMinutes
// Called automatically by service worker
```

### Utility Operations

```javascript
await initializeStorage()
// Sets defaults if storage is empty
// Called on extension install

await clearAllData()
// Wipes everything (dev/testing only)
```

## Storage Lifecycle

### First Install
1. Extension loads
2. `initializeStorage()` called
3. Default configuration saved
4. Empty access logs array created

### Normal Operation
1. User configures rules (settings page)
2. Validation runs before save
3. Configuration written to storage
4. Service worker receives `storage.onChanged` event
5. Badge updates for all tabs

### Access Logging
1. User navigates to tracked site
2. Service worker adds access log
3. Log appended to `accessLogs` array
4. Periodic pruning removes old logs

### Pruning
- Triggered periodically by service worker
- Removes logs older than: `max(all rule durations) + buffer`
- Keeps storage bounded (prevents unlimited growth)
- Runs asynchronously, doesn't block

## Storage Constraints

### Size Limits
- `storage.local` quota: ~10MB
- Configuration: Typically 1-5KB
- Access log entry: ~50-100 bytes
- Max logs before pruning needed: ~100,000+

### Performance
- All operations async
- Reads are fast (Chrome caches)
- Writes are batched internally by Chrome
- No performance issues observed

### Persistence
- Survives browser restart: ✅
- Survives extension disable/enable: ✅ (usually)
- Survives Chrome updates: ✅
- Lost on extension uninstall: ✅ (expected)

## Schema Versioning

Current version: **1**

### Migration Strategy (Future)
If schema changes:
1. Increment `STORAGE_VERSION` in `schema.js`
2. Add migration function in `storage-manager.js`
3. Check version on load
4. Run migrations if needed
5. Update stored version

**Current approach:** No migrations implemented yet (v1 is stable)

## Error Handling

### Validation Errors
- Thrown before write operations
- Contain detailed error messages
- UI shows errors to user
- Storage remains unchanged

### Storage API Errors
- Caught and logged to console
- Fallback to defaults where possible
- User notified via UI when critical

### Corrupted Data
- Validation catches most corruption
- If read fails, fall back to defaults
- Warn user that config was reset
- Old config not recoverable (no backups yet)

## Example Configurations

### Simple Time Limit
```javascript
{
  groups: [{
    name: 'Limit Twitter',
    duration: 60,
    maxAccesses: 5,
    strictMode: false,
    sites: ['twitter.com'],
    schedule: null  // Always active
  }]
}
```

### Work Hours Restrictions
```javascript
{
  groups: [{
    name: 'No Social Media During Work',
    duration: 480,  // 8 hours
    maxAccesses: 0, // Complete block
    strictMode: true,
    sites: ['twitter.com', 'reddit.com', 'facebook.com'],
    schedule: {
      days: [1,2,3,4,5],
      times: ['0900-1700']
    }
  }]
}
```

### Multiple Time Windows
```javascript
{
  groups: [{
    name: 'Email Checks',
    duration: 60,
    maxAccesses: 3,
    strictMode: false,
    sites: ['gmail.com'],
    schedule: {
      days: [1,2,3,4,5],
      times: ['0900-1200', '1300-1700']  // Morning and afternoon
    }
  }]
}
```
