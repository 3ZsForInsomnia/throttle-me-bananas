// Service worker for Throttle Me, Bananas!
// Phases 3-4: Storage initialization and navigation tracking

import { 
  initializeStorage, 
  getConfiguration, 
  getAccessLogs, 
  addAccessLog,
  pruneOldAccessLogs 
} from '../storage/storage-manager.js';

import { 
  shouldBlockAccess, 
  getMostRestrictiveCount,
  calculateUnblockTime 
} from './rule-engine.js';

import { extractDomain } from '../utils/url-matcher.js';

console.log('Throttle Me, Bananas! service worker loaded');

// Track last URL per tab to detect navigation vs refresh
const tabUrlMap = new Map();

// Basic installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // Initialize storage with defaults
  try {
    await initializeStorage();
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
});

/**
 * Check if a URL should be ignored (settings page, blocked page, etc.)
 */
function shouldIgnoreUrl(url) {
  if (!url) return true;
  
  // Ignore chrome:// and other browser pages
  if (url.startsWith('chrome://') || 
      url.startsWith('chrome-extension://') || 
      url.startsWith('about:') ||
      url.startsWith('edge://')) {
    return true;
  }
  
  return false;
}

/**
 * Check if this is our own extension page
 */
function isOwnExtensionPage(url) {
  return url.includes(chrome.runtime.id);
}

/**
 * Update badge for a specific tab
 */
async function updateBadgeForTab(tabId, url = null) {
  try {
    // Get URL from tab if not provided
    if (!url) {
      const tab = await chrome.tabs.get(tabId);
      url = tab.url;
    }
    
    if (shouldIgnoreUrl(url) || isOwnExtensionPage(url)) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }
    
    const site = extractDomain(url);
    if (!site) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }
    
    const config = await getConfiguration();
    const accessLogs = await getAccessLogs();
    
    const remaining = getMostRestrictiveCount(site, config, accessLogs);
    
    if (remaining === null) {
      // No active rules for this site
      chrome.action.setBadgeText({ text: '', tabId });
    } else {
      chrome.action.setBadgeText({ text: String(remaining), tabId });
      
      // Set color based on remaining count
      if (remaining === 0) {
        chrome.action.setBadgeBackgroundColor({ color: '#dc3545', tabId }); // Red
      } else if (remaining === 1) {
        chrome.action.setBadgeBackgroundColor({ color: '#ffc107', tabId }); // Yellow
      } else {
        chrome.action.setBadgeBackgroundColor({ color: '#28a745', tabId }); // Green
      }
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

/**
 * Handle navigation events
 */
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // Only process main frame navigations
  if (details.frameId !== 0) {
    return;
  }
  
  const { tabId, url, transitionType } = details;
  
  // Ignore extension pages and chrome:// URLs
  if (shouldIgnoreUrl(url) || isOwnExtensionPage(url)) {
    return;
  }
  
  const site = extractDomain(url);
  if (!site) {
    return;
  }
  
  console.log(`Navigation detected: ${site} (tab ${tabId}, type: ${transitionType})`);
  
  // Check if this is a refresh or a new navigation
  const lastUrl = tabUrlMap.get(tabId);
  const lastSite = lastUrl ? extractDomain(lastUrl) : null;
  const isRefresh = (lastSite === site) || transitionType === 'reload';
  
  if (isRefresh) {
    console.log(`Refresh detected for ${site}, not counting as new access`);
    tabUrlMap.set(tabId, url);
    await updateBadgeForTab(tabId, url);
    return;
  }
  
  // This is a new navigation - check if we should block
  try {
    const config = await getConfiguration();
    const accessLogs = await getAccessLogs();
    
    const blockDecision = shouldBlockAccess(site, config, accessLogs);
    
    if (blockDecision.block) {
      console.log(`Blocking access to ${site}: ${blockDecision.reason}`);
      
      // Calculate unblock time
      const rule = config.groups.find(g => g.name === blockDecision.ruleName);
      const unblockTime = rule ? calculateUnblockTime(site, rule, accessLogs) : null;
      
      // Redirect to blocked page with info
      const blockedUrl = chrome.runtime.getURL('src/pages/blocked/blocked.html') +
        `?site=${encodeURIComponent(site)}` +
        `&rule=${encodeURIComponent(blockDecision.ruleName || '')}` +
        `&duration=${encodeURIComponent(blockDecision.duration || '')}` +
        `&maxAccesses=${encodeURIComponent(blockDecision.maxAccesses || '')}` +
        `&unblockTime=${encodeURIComponent(unblockTime ? unblockTime.toISOString() : '')}`;
      
      chrome.tabs.update(tabId, { url: blockedUrl });
      return;
    }
    
    // Not blocked - record the access
    console.log(`Access allowed to ${site}`);
    const timestamp = Date.now();
    await addAccessLog(site, timestamp, tabId);
    
    // Update the tab's last URL
    tabUrlMap.set(tabId, url);
    
    // Update badge
    await updateBadgeForTab(tabId, url);
    
    // Prune old logs periodically (find longest duration in config)
    const maxDuration = Math.max(...config.groups.map(g => g.duration), 0);
    if (maxDuration > 0) {
      // Prune logs older than 2x the longest duration (keep extra buffer)
      await pruneOldAccessLogs(maxDuration * 2);
    }
  } catch (error) {
    console.error('Error handling navigation:', error);
  }
});

/**
 * Update badge when tab is activated (switched to)
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateBadgeForTab(activeInfo.tabId);
});

/**
 * Update badge when tab is updated (URL changes)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await updateBadgeForTab(tabId, changeInfo.url);
  }
});

/**
 * Clean up when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabUrlMap.delete(tabId);
});

/**
 * Handle storage changes (e.g., config updated in settings)
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.configuration) {
    console.log('Configuration changed, updating badges for all tabs');
    
    // Update badges for all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        await updateBadgeForTab(tab.id, tab.url);
      }
    }
  }
});

/**
 * Handle extension icon click - open settings
 */
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
