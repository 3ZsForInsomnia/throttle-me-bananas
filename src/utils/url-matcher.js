/**
 * URL matching utilities for site pattern matching
 */

/**
 * Extract domain from a URL
 * @param {string} url - Full URL
 * @returns {string} Domain (e.g., "discord.com")
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error('Invalid URL:', url, e);
    return '';
  }
}

/**
 * Extract path from a URL
 * @param {string} url - Full URL
 * @returns {string} Path (e.g., "/channels/123")
 */
export function extractPath(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch (e) {
    console.error('Invalid URL:', url, e);
    return '';
  }
}

/**
 * Check if a URL matches a configured site pattern
 * @param {string} url - Full URL to check
 * @param {string} pattern - Pattern like "discord.com" or "discord.com/channels"
 * @returns {boolean} True if URL matches the pattern
 */
export function matchesSitePattern(url, pattern) {
  const domain = extractDomain(url);
  const path = extractPath(url);
  
  if (!domain || !pattern) {
    return false;
  }
  
  // Check if pattern includes a path
  const patternParts = pattern.split('/');
  const patternDomain = patternParts[0];
  const patternPath = patternParts.slice(1).join('/');
  
  // Domain must match (exact or subdomain)
  const domainMatches = domain === patternDomain || domain.endsWith('.' + patternDomain);
  
  if (!domainMatches) {
    return false;
  }
  
  // If pattern has no path, domain match is sufficient
  if (!patternPath) {
    return true;
  }
  
  // If pattern has a path, check if URL path starts with it
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return normalizedPath === patternPath || normalizedPath.startsWith(patternPath + '/');
}
