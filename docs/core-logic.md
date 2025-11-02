# Core Logic

## URL Matching

**Location:** `src/utils/url-matcher.js`

### Domain Extraction

```javascript
extractDomain('https://sub.example.com/path') 
// Returns: 'sub.example.com'
```

- Uses URL API to parse
- Returns hostname only (no port, path, or protocol)
- Returns empty string for invalid URLs

### Pattern Matching

```javascript
matchesSitePattern(url, pattern)
```

**Domain-only patterns:**
```javascript
matchesSitePattern('https://discord.com/channels', 'discord.com')
// true - matches domain and all paths

matchesSitePattern('https://app.discord.com', 'discord.com')
// true - matches subdomains
```

**Path-specific patterns:**
```javascript
matchesSitePattern('https://discord.com/channels/123', 'discord.com/channels')
// true - path matches

matchesSitePattern('https://discord.com/settings', 'discord.com/channels')
// false - path doesn't match
```

**Matching logic:**
1. Extract domain from URL
2. Split pattern into domain and path parts
3. Check domain match (exact or subdomain)
4. If path in pattern, check URL path starts with it
5. Return true if both match

**Subdomain handling:**
- `pattern: "discord.com"` matches `discord.com`, `app.discord.com`, `ptb.discord.com`
- Uses `endsWith()` check: `domain.endsWith(patternDomain)`

## Time & Scheduling

**Location:** `src/utils/time-utils.js`

### Time Range Parsing

```javascript
parseTimeRange('0900-1700')
// Returns: {
//   start: { hours: 9, minutes: 0 },
//   end: { hours: 17, minutes: 0 }
// }
```

- Format: `HHMM-HHMM` (24-hour)
- Always in local timezone
- No validation (assumed valid from schema validation)

### Time Range Checking

```javascript
isTimeInRange(currentTime, startTime, endTime)
```

**Algorithm:**
1. Convert all to minutes since midnight
2. Check: `currentMinutes >= startMinutes && currentMinutes <= endMinutes`
3. Handles edge times (0000, 2359) correctly

**Note:** Does NOT handle ranges crossing midnight (e.g., `2300-0100`)

### Rule Activation

```javascript
isRuleActiveNow(schedule)
```

Returns `true` if rule should be active right now.

**Logic:**
1. If `schedule` is null/undefined → always active
2. Check if current day in `schedule.days`
3. If not → inactive
4. Check if current time in any of `schedule.times` ranges
5. If yes → active, else inactive

**Current time:** Uses `new Date()` (local timezone)

## Access Calculation

**Location:** `src/utils/access-calculator.js`

### Rolling Window Filtering

```javascript
filterAccessesInWindow(accesses, durationMinutes)
```

**Algorithm:**
1. Get current timestamp: `Date.now()`
2. Calculate window start: `now - (durationMinutes * 60 * 1000)`
3. Filter: `access.timestamp >= windowStart`
4. Return filtered array

**Why rolling?** Old accesses automatically "fall out" of the window. No manual expiration needed.

### Remaining Access Calculation

```javascript
calculateRemainingAccesses(
  accesses,
  maxAccesses,
  durationMinutes,
  strictMode,
  sites,
  currentSite
)
```

**Non-strict mode:**
1. Filter to window
2. Filter to current site only
3. Count: `remaining = maxAccesses - count`
4. Clamp to 0: `Math.max(0, remaining)`

**Strict mode:**
1. Filter to window
2. Filter to ANY site in the `sites` array
3. Count all matching accesses
4. Calculate remaining (shared pool)
5. Clamp to 0

**Returns:** Number (0 = blocked, >0 = remaining accesses)

**Note:** Always returns `>= 0`, never negative (clamped with `Math.max(0, ...)`)

## Blocking Logic

**Location:** `src/background/rule-engine.js`

### Active Rule Determination

```javascript
getActiveRulesForSite(site, config)
```

**Algorithm:**
1. Get all rule groups from config
2. For each group:
   - Check if schedule is active (`isRuleActiveNow()`)
   - Check if site matches any pattern in group
3. Return array of matching, active groups

**Edge cases:**
- No config → empty array
- Site not in any group → empty array
- Schedule inactive → group excluded

### Block Decision

```javascript
shouldBlockAccess(site, config, accessLogs)
```

**Algorithm:**
1. Get active rules for site
2. If no active rules → allow
3. For each active rule:
   - Calculate remaining accesses
   - If remaining <= 0 → block with this rule's info
4. If all rules allow → allow

**Returns:**
```javascript
// Allow
{ block: false }

// Block
{
  block: true,
  reason: "Access limit reached for rule \"Rule Name\"",
  ruleName: "Rule Name",
  duration: 60,
  maxAccesses: 3
}
```

**Most restrictive wins:** First rule with `remaining <= 0` causes block

### Badge Count Calculation

```javascript
getMostRestrictiveCount(site, config, accessLogs)
```

**Algorithm:**
1. Get active rules for site
2. If no active rules → return `null`
3. For each rule, calculate remaining
4. Return lowest (most restrictive) count

**Returns:** `number | null`
- `null` = no active rules (clear badge)
- `0` = blocked
- `>0` = accesses remaining

### Unblock Time Calculation

```javascript
calculateUnblockTime(site, rule, accessLogs)
```

**Algorithm:**
1. Filter logs to relevant sites (strict mode: all sites in group; non-strict: just this site)
2. Sort by timestamp (oldest first)
3. Get oldest access in window
4. Calculate: `oldestTimestamp + (rule.duration * 60 * 1000)`
5. Return as Date object

**Use case:** Shows countdown on blocked page

## Edge Cases & Behaviors

### Refresh Detection

**Problem:** Don't want refreshes to count as new accesses

**Solution:**
- Service worker maintains `tabUrlMap: Map<tabId, domain>`
- On navigation, compare new domain to stored domain
- If same → skip (refresh)
- If different → count as new access

**State loss:** If service worker restarts, map is lost. All navigations count. This is acceptable (conservative approach).

### Multiple Rules for Same Site

**Scenario:** Site is in 2+ groups

**Behavior:**
- Each access counts toward ALL applicable rules
- Badge shows most restrictive count
- Blocking happens if ANY rule is exceeded

**Example:**
- Rule A: max 5 accesses/hour
- Rule B: max 10 accesses/day
- User at 4 accesses in past hour, 9 in past day
- Badge shows: 1 (most restrictive)
- Next access triggers Rule A block

### Schedule Overlaps

**Scenario:** Same site in multiple groups with overlapping schedules

**Behavior:**
- Both rules apply during overlap
- Access counts toward both
- Most restrictive determines blocking
- Settings UI warns about this

### Access Logging vs Blocking

**Key principle:** Always log, conditionally block

- Accesses logged regardless of whether rule is active
- Blocking only happens when rule is active
- Why? Access at 4:55pm may count toward rule starting at 5pm

### Time Window Boundaries

**Hard boundaries:**
- Schedule times are hard boundaries
- Access at 4:59pm does NOT count toward rule starting at 5pm
- Exception: If site is in multiple rules, access counts for whichever are active

**Rolling windows:**
- Within a rule, windows are rolling
- "Last 60 minutes" not "this hour"
- Natural expiration of old accesses

### Strict Mode Nuances

**Non-strict (default):**
```
Group: ["discord.com", "reddit.com"], max: 3
Can access discord.com 3 times AND reddit.com 3 times
Total possible: 6 accesses
```

**Strict:**
```
Group: ["discord.com", "reddit.com"], max: 3
Can access EITHER site, 3 times total combined
After 3 accesses to ANY combination, both blocked
```

**Implementation:** Filter accesses differently in `calculateRemainingAccesses()`

### Path Matching

**Path in access logs:** Not stored

**Pattern matching:**
- `discord.com` → matches all paths
- `discord.com/channels` → only matches `/channels/*` paths

**Limitation:** Can't do "block /channels but allow /settings" for same domain without complex path tracking

### Subdomain Behavior

**Pattern:** `example.com`

**Matches:**
- `example.com`
- `www.example.com`
- `app.example.com`
- `any.subdomain.example.com`

**Implementation:** `domain === pattern || domain.endsWith('.' + pattern)`

### Time Zone Handling

**All times in local timezone**

- Schedule times interpreted in user's local timezone
- No UTC conversion
- User traveling across timezones: times shift with them
- This is by design (work hours relative to user's location)

### Access at Exactly Max Limit

```
maxAccesses: 3
Current count: 3
Remaining: 0
Block: YES
```

The limit is inclusive. At `maxAccesses`, you're blocked.

### Zero Max Accesses

```javascript
{ maxAccesses: 0 }
```

**Effect:** Complete block (no accesses allowed)

**Use case:** "Block entirely during work hours"

## Performance Characteristics

### URL Matching
- O(n) where n = number of sites in group
- Typically n < 10
- Very fast

### Time Range Checking
- O(m) where m = number of time ranges
- Typically m = 1-3
- Negligible

### Access Filtering
- O(k) where k = number of access logs
- With pruning, k < 1000
- Fast enough (< 1ms)

### Badge Updates
- Called on every tab switch
- Early returns for non-tracked sites
- No noticeable lag

## Testing Approach

All pure functions (utils + rule-engine) have unit tests. See `docs/testing.md` for patterns.

**Testable without Chrome:**
- `url-matcher.js` ✅
- `time-utils.js` ✅
- `access-calculator.js` ✅
- `rule-engine.js` ✅

**Requires Chrome API (tested manually):**
- `service-worker.js`
- Badge logic
- Storage operations
