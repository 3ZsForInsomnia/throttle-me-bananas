/**
 * Access calculation utilities
 */

/**
 * Filter accesses to only those within the rolling time window
 * @param {Array<{site: string, timestamp: number, tabId: number}>} accesses - Array of access logs
 * @param {number} durationMinutes - Duration of the rolling window in minutes
 * @returns {Array} Filtered array of accesses within the window
 */
export function filterAccessesInWindow(accesses, durationMinutes) {
  const now = Date.now();
  const windowStart = now - (durationMinutes * 60 * 1000);
  
  return accesses.filter(access => access.timestamp >= windowStart);
}

/**
 * Calculate remaining accesses for a site based on rules and history
 * @param {Array<{site: string, timestamp: number, tabId: number}>} accesses - All access logs
 * @param {number} maxAccesses - Maximum allowed accesses in the window
 * @param {number} durationMinutes - Duration of the rolling window in minutes
 * @param {boolean} strictMode - If true, count all sites together; if false, count per-site
 * @param {string[]} sites - Array of site patterns in the rule group
 * @param {string} currentSite - The site we're calculating for (domain)
 * @returns {number} Number of remaining accesses (0 means blocked)
 */
export function calculateRemainingAccesses(
  accesses,
  maxAccesses,
  durationMinutes,
  strictMode,
  sites,
  currentSite
) {
  // Filter to accesses within the time window
  const recentAccesses = filterAccessesInWindow(accesses, durationMinutes);
  
  let relevantAccesses;
  
  if (strictMode) {
    // In strict mode, count all accesses to ANY site in the group
    relevantAccesses = recentAccesses.filter(access => 
      sites.some(sitePattern => {
        // Check if the access site matches any pattern in the group
        // We need to reconstruct a URL for matching, use https as default
        const accessUrl = `https://${access.site}`;
        const patternParts = sitePattern.split('/');
        const patternDomain = patternParts[0];
        const patternPath = patternParts.slice(1).join('/');
        
        const domainMatches = access.site === patternDomain || 
                            access.site.endsWith('.' + patternDomain);
        
        if (!domainMatches) return false;
        if (!patternPath) return true;
        
        // For path checking, we'd need to store the full path in access logs
        // For now, we'll assume domain-only matching in strict mode
        return true;
      })
    );
  } else {
    // In non-strict mode, only count accesses to the current specific site
    relevantAccesses = recentAccesses.filter(access => access.site === currentSite);
  }
  
  const accessCount = relevantAccesses.length;
  const remaining = maxAccesses - accessCount;
  
  return Math.max(0, remaining);
}
