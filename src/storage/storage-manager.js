/**
 * Storage manager - abstraction layer over Chrome storage API
 */

import {
  STORAGE_KEYS,
  STORAGE_VERSION,
  DEFAULT_CONFIGURATION,
  validateConfiguration,
  validateAccessLog
} from './schema.js';

/**
 * Get the current configuration from storage
 * @returns {Promise<Configuration>} Current configuration or default if not set
 */
export async function getConfiguration() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIGURATION);
    
    if (!result[STORAGE_KEYS.CONFIGURATION]) {
      // No configuration exists, return default
      console.log('No configuration found, using default');
      return DEFAULT_CONFIGURATION;
    }
    
    const config = result[STORAGE_KEYS.CONFIGURATION];
    const validation = validateConfiguration(config);
    
    if (!validation.valid) {
      console.error('Invalid configuration in storage:', validation.errors);
      console.log('Falling back to default configuration');
      return DEFAULT_CONFIGURATION;
    }
    
    return config;
  } catch (error) {
    console.error('Error getting configuration:', error);
    return DEFAULT_CONFIGURATION;
  }
}

/**
 * Save configuration to storage
 * @param {Configuration} config - Configuration to save
 * @returns {Promise<boolean>} True if saved successfully
 */
export async function saveConfiguration(config) {
  try {
    const validation = validateConfiguration(config);
    
    if (!validation.valid) {
      console.error('Cannot save invalid configuration:', validation.errors);
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.CONFIGURATION]: config
    });
    
    console.log('Configuration saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw error;
  }
}

/**
 * Get all access logs from storage
 * @returns {Promise<AccessLog[]>} Array of access logs
 */
export async function getAccessLogs() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACCESS_LOGS);
    
    if (!result[STORAGE_KEYS.ACCESS_LOGS]) {
      return [];
    }
    
    const logs = result[STORAGE_KEYS.ACCESS_LOGS];
    
    if (!Array.isArray(logs)) {
      console.error('Access logs in storage is not an array');
      return [];
    }
    
    return logs;
  } catch (error) {
    console.error('Error getting access logs:', error);
    return [];
  }
}

/**
 * Add a new access log entry
 * @param {string} site - Domain of the accessed site
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} tabId - Chrome tab ID
 * @returns {Promise<boolean>} True if added successfully
 */
export async function addAccessLog(site, timestamp, tabId) {
  try {
    const log = { site, timestamp, tabId };
    const validation = validateAccessLog(log);
    
    if (!validation.valid) {
      console.error('Cannot add invalid access log:', validation.errors);
      throw new Error(`Invalid access log: ${validation.errors.join(', ')}`);
    }
    
    const logs = await getAccessLogs();
    logs.push(log);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACCESS_LOGS]: logs
    });
    
    console.log('Access log added:', { site, timestamp, tabId });
    return true;
  } catch (error) {
    console.error('Error adding access log:', error);
    throw error;
  }
}

/**
 * Remove access logs older than the specified age
 * @param {number} maxAgeMinutes - Maximum age in minutes
 * @returns {Promise<number>} Number of logs removed
 */
export async function pruneOldAccessLogs(maxAgeMinutes) {
  try {
    const logs = await getAccessLogs();
    const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
    
    const before = logs.length;
    const filteredLogs = logs.filter(log => log.timestamp >= cutoffTime);
    const removed = before - filteredLogs.length;
    
    if (removed > 0) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.ACCESS_LOGS]: filteredLogs
      });
      console.log(`Pruned ${removed} old access logs`);
    }
    
    return removed;
  } catch (error) {
    console.error('Error pruning access logs:', error);
    throw error;
  }
}

/**
 * Clear all data from storage (for testing/development)
 * @returns {Promise<boolean>} True if cleared successfully
 */
export async function clearAllData() {
  try {
    await chrome.storage.local.clear();
    console.log('All storage data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
}

/**
 * Initialize storage with default values if needed
 * @returns {Promise<void>}
 */
export async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.VERSION,
      STORAGE_KEYS.CONFIGURATION,
      STORAGE_KEYS.ACCESS_LOGS
    ]);
    
    let needsInit = false;
    
    // Check version
    if (!result[STORAGE_KEYS.VERSION] || result[STORAGE_KEYS.VERSION] !== STORAGE_VERSION) {
      console.log(`Initializing storage (version ${STORAGE_VERSION})`);
      needsInit = true;
    }
    
    // Initialize configuration if missing
    if (!result[STORAGE_KEYS.CONFIGURATION]) {
      console.log('Initializing default configuration');
      await saveConfiguration(DEFAULT_CONFIGURATION);
    }
    
    // Initialize access logs if missing
    if (!result[STORAGE_KEYS.ACCESS_LOGS]) {
      console.log('Initializing access logs');
      await chrome.storage.local.set({
        [STORAGE_KEYS.ACCESS_LOGS]: []
      });
    }
    
    // Update version
    if (needsInit) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.VERSION]: STORAGE_VERSION
      });
    }
    
    console.log('Storage initialization complete');
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
}

/**
 * Get storage statistics
 * @returns {Promise<{configCount: number, logsCount: number, version: number}>}
 */
export async function getStorageStats() {
  try {
    const config = await getConfiguration();
    const logs = await getAccessLogs();
    const result = await chrome.storage.local.get(STORAGE_KEYS.VERSION);
    
    return {
      configCount: config.groups.length,
      logsCount: logs.length,
      version: result[STORAGE_KEYS.VERSION] || 0
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { configCount: 0, logsCount: 0, version: 0 };
  }
}
