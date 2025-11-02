/**
 * Type definitions and schemas for storage data structures
 * Using JSDoc for type documentation
 */

/**
 * @typedef {Object} Schedule
 * @property {number[]} days - Array of day indices (0=Sunday, 6=Saturday)
 * @property {string[]} times - Array of time ranges like ["0900-1700", "1900-2300"]
 */

/**
 * @typedef {Object} RuleGroup
 * @property {string} name - User-friendly name for the rule group
 * @property {number} duration - Time window in minutes (e.g., 60 = 1 hour)
 * @property {number} maxAccesses - Maximum allowed accesses within the duration
 * @property {boolean} strictMode - If true, maxAccesses applies to all sites combined
 * @property {string[]} sites - Array of site patterns (e.g., ["discord.com", "gmail.com"])
 * @property {Schedule} [schedule] - Optional schedule for when rule is active
 */

/**
 * @typedef {Object} Configuration
 * @property {RuleGroup[]} groups - Array of rule groups
 */

/**
 * @typedef {Object} AccessLog
 * @property {string} site - Domain of the accessed site
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {number} tabId - Chrome tab ID
 */

/**
 * Storage keys used in chrome.storage.local
 */
export const STORAGE_KEYS = {
  CONFIGURATION: 'configuration',
  ACCESS_LOGS: 'accessLogs',
  VERSION: 'storageVersion'
};

/**
 * Current storage schema version
 */
export const STORAGE_VERSION = 1;

/**
 * Default configuration for new installations
 * @type {Configuration}
 */
export const DEFAULT_CONFIGURATION = {
  groups: [
    {
      name: 'Example Rule - Delete Me',
      duration: 60,
      maxAccesses: 3,
      strictMode: false,
      sites: ['example.com'],
      schedule: {
        days: [0, 1, 2, 3, 4, 5, 6],
        times: ['0000-2400']
      }
    }
  ]
};

/**
 * Validate a rule group object
 * @param {any} group - Object to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateRuleGroup(group) {
  const errors = [];
  
  if (!group || typeof group !== 'object') {
    errors.push('Rule group must be an object');
    return { valid: false, errors };
  }
  
  if (typeof group.name !== 'string' || group.name.trim() === '') {
    errors.push('Rule group must have a non-empty name');
  }
  
  if (typeof group.duration !== 'number' || group.duration <= 0) {
    errors.push('Duration must be a positive number');
  }
  
  if (typeof group.maxAccesses !== 'number' || group.maxAccesses <= 0) {
    errors.push('Max accesses must be a positive number');
  }
  
  if (typeof group.strictMode !== 'boolean') {
    errors.push('Strict mode must be a boolean');
  }
  
  if (!Array.isArray(group.sites) || group.sites.length === 0) {
    errors.push('Sites must be a non-empty array');
  } else {
    group.sites.forEach((site, index) => {
      if (typeof site !== 'string' || site.trim() === '') {
        errors.push(`Site at index ${index} must be a non-empty string`);
      }
    });
  }
  
  if (group.schedule) {
    if (!group.schedule.days || !Array.isArray(group.schedule.days)) {
      errors.push('Schedule days must be an array');
    } else if (group.schedule.days.some(d => d < 0 || d > 6)) {
      errors.push('Schedule days must be between 0 (Sunday) and 6 (Saturday)');
    }
    
    if (!group.schedule.times || !Array.isArray(group.schedule.times)) {
      errors.push('Schedule times must be an array');
    } else {
      group.schedule.times.forEach((time, index) => {
        if (!/^\d{4}-\d{4}$/.test(time)) {
          errors.push(`Time range at index ${index} must be in format HHMM-HHMM`);
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a configuration object
 * @param {any} config - Object to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateConfiguration(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }
  
  if (!Array.isArray(config.groups)) {
    errors.push('Configuration must have a groups array');
    return { valid: false, errors };
  }
  
  config.groups.forEach((group, index) => {
    const validation = validateRuleGroup(group);
    if (!validation.valid) {
      errors.push(`Group ${index} (${group.name || 'unnamed'}): ${validation.errors.join(', ')}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate an access log entry
 * @param {any} log - Object to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateAccessLog(log) {
  const errors = [];
  
  if (!log || typeof log !== 'object') {
    errors.push('Access log must be an object');
    return { valid: false, errors };
  }
  
  if (typeof log.site !== 'string' || log.site.trim() === '') {
    errors.push('Access log must have a site (domain) string');
  }
  
  if (typeof log.timestamp !== 'number' || log.timestamp <= 0) {
    errors.push('Access log must have a valid timestamp');
  }
  
  if (typeof log.tabId !== 'number') {
    errors.push('Access log must have a tabId');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
