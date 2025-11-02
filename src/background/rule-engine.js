/**
 * Rule engine - determines which rules apply and whether to block access
 */

import { matchesSitePattern } from '../utils/url-matcher.js';
import { isRuleActiveNow } from '../utils/time-utils.js';
import { calculateRemainingAccesses } from '../utils/access-calculator.js';

/**
 * Get all currently active rules that apply to a given site
 * @param {string} site - Domain to check
 * @param {Configuration} config - Current configuration
 * @returns {RuleGroup[]} Array of applicable active rule groups
 */
export function getActiveRulesForSite(site, config) {
  if (!config || !config.groups) {
    return [];
  }
  
  return config.groups.filter(group => {
    // Check if rule is currently active based on schedule
    if (!isRuleActiveNow(group.schedule)) {
      return false;
    }
    
    // Check if site matches any pattern in this group
    const siteUrl = `https://${site}`;
    return group.sites.some(pattern => matchesSitePattern(siteUrl, pattern));
  });
}

/**
 * Determine if access to a site should be blocked
 * @param {string} site - Domain to check
 * @param {Configuration} config - Current configuration
 * @param {AccessLog[]} accessLogs - All access logs
 * @returns {{block: boolean, reason?: string, ruleName?: string}} Block decision
 */
export function shouldBlockAccess(site, config, accessLogs) {
  const activeRules = getActiveRulesForSite(site, config);
  
  if (activeRules.length === 0) {
    return { block: false };
  }
  
  // Check each active rule
  for (const rule of activeRules) {
    const remaining = calculateRemainingAccesses(
      accessLogs,
      rule.maxAccesses,
      rule.duration,
      rule.strictMode,
      rule.sites,
      site
    );
    
    if (remaining <= 0) {
      return {
        block: true,
        reason: `Access limit reached for rule "${rule.name}"`,
        ruleName: rule.name,
        duration: rule.duration,
        maxAccesses: rule.maxAccesses
      };
    }
  }
  
  return { block: false };
}

/**
 * Get the most restrictive (lowest) remaining access count for a site
 * @param {string} site - Domain to check
 * @param {Configuration} config - Current configuration
 * @param {AccessLog[]} accessLogs - All access logs
 * @returns {number|null} Lowest remaining count, or null if no active rules
 */
export function getMostRestrictiveCount(site, config, accessLogs) {
  const activeRules = getActiveRulesForSite(site, config);
  
  if (activeRules.length === 0) {
    return null;
  }
  
  let lowestRemaining = Infinity;
  
  for (const rule of activeRules) {
    const remaining = calculateRemainingAccesses(
      accessLogs,
      rule.maxAccesses,
      rule.duration,
      rule.strictMode,
      rule.sites,
      site
    );
    
    lowestRemaining = Math.min(lowestRemaining, remaining);
  }
  
  return lowestRemaining === Infinity ? null : lowestRemaining;
}

/**
 * Calculate when access will be unblocked based on oldest access in window
 * @param {string} site - Domain to check
 * @param {RuleGroup} rule - The rule that blocked access
 * @param {AccessLog[]} accessLogs - All access logs
 * @returns {Date|null} When access will be available, or null if can't determine
 */
export function calculateUnblockTime(site, rule, accessLogs) {
  // Filter logs to this site (or all sites if strict mode)
  let relevantLogs;
  
  if (rule.strictMode) {
    // In strict mode, need to consider all sites in the group
    relevantLogs = accessLogs.filter(log => 
      rule.sites.some(pattern => {
        const logUrl = `https://${log.site}`;
        return matchesSitePattern(logUrl, pattern);
      })
    );
  } else {
    // In non-strict mode, only this specific site
    relevantLogs = accessLogs.filter(log => log.site === site);
  }
  
  // Sort by timestamp
  relevantLogs.sort((a, b) => a.timestamp - b.timestamp);
  
  if (relevantLogs.length === 0) {
    return null;
  }
  
  // The oldest access in the window determines when we can access again
  const oldestAccess = relevantLogs[0];
  const unblockTime = new Date(oldestAccess.timestamp + (rule.duration * 60 * 1000));
  
  return unblockTime;
}
