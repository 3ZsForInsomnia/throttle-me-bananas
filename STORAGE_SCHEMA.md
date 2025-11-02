# Storage Schema Reference

This document describes the data structures used in Chrome storage.

## Storage Keys

- `configuration` - The main rule groups configuration
- `accessLogs` - Array of site access timestamps
- `storageVersion` - Schema version number (currently 1)

## Data Types

### Configuration

```javascript
{
  "groups": [RuleGroup, ...]
}
```

### RuleGroup

```javascript
{
  "name": "string",           // User-friendly name
  "duration": number,         // Time window in minutes
  "maxAccesses": number,      // Max accesses allowed in window
  "strictMode": boolean,      // If true, limit applies to all sites combined
  "sites": ["string", ...],   // Array of site patterns
  "schedule": Schedule        // Optional - when rule is active
}
```

### Schedule

```javascript
{
  "days": [number, ...],      // 0-6, where 0=Sunday, 6=Saturday
  "times": ["string", ...]    // Array of "HHMM-HHMM" ranges
}
```

**Example Schedule:**
```javascript
{
  "days": [1, 2, 3, 4, 5],              // Monday-Friday
  "times": ["0900-1200", "1300-1700"]   // 9am-12pm, 1pm-5pm
}
```

### AccessLog

```javascript
{
  "site": "string",      // Domain (e.g., "discord.com")
  "timestamp": number,   // Unix timestamp in milliseconds
  "tabId": number        // Chrome tab ID
}
```

## Example Configuration

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
      ]
    }
  ]
}
```

## Validation Rules

### RuleGroup Validation
- `name` must be a non-empty string
- `duration` must be a positive number
- `maxAccesses` must be a positive number
- `strictMode` must be a boolean
- `sites` must be a non-empty array of non-empty strings
- `schedule` (if present):
  - `days` must be array of numbers 0-6
  - `times` must be array of strings matching `HHMM-HHMM` format

### AccessLog Validation
- `site` must be a non-empty string
- `timestamp` must be a positive number
- `tabId` must be a number

## Storage API Functions

See `src/storage/storage-manager.js` for implementation.

### Read Operations
- `getConfiguration()` - Get current config or default
- `getAccessLogs()` - Get all access logs
- `getStorageStats()` - Get counts and version info

### Write Operations
- `saveConfiguration(config)` - Save config (validates first)
- `addAccessLog(site, timestamp, tabId)` - Add new access log
- `pruneOldAccessLogs(maxAgeMinutes)` - Remove old logs

### Utility Operations
- `initializeStorage()` - Initialize with defaults if needed
- `clearAllData()` - Clear everything (dev/testing only)

## Storage Size Considerations

Chrome's `storage.local` has a quota of approximately 10MB.

Estimated sizes:
- Configuration: ~1-5KB depending on number of groups
- Each access log entry: ~50-100 bytes
- At 100 bytes per log, 10MB = ~100,000 access logs

The extension automatically prunes logs older than the longest duration in the configuration to keep storage manageable.
