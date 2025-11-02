/**
 * Settings page data management layer
 * Handles configuration CRUD operations, validation, and analysis
 */

import {
  getConfiguration,
  saveConfiguration as saveConfigToStorage
} from '../../storage/storage-manager.js';
import { validateRuleGroup } from '../../storage/schema.js';
import { isRuleActiveNow } from '../../utils/time-utils.js';

/**
 * Load the current configuration from storage
 * @returns {Promise<Configuration>} Current configuration
 */
export async function loadConfiguration() {
  try {
    const config = await getConfiguration();
    console.log('Configuration loaded:', config);
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
}

/**
 * Save configuration to storage after validation
 * @param {Configuration} config - Configuration object to save
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
export async function saveConfiguration(config) {
  try {
    // Validate entire configuration
    const validation = validateConfiguration(config);
    
    if (!validation.valid) {
      console.error('Cannot save invalid configuration:', validation.errors);
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    await saveConfigToStorage(config);
    console.log('Configuration saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving configuration:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

/**
 * Add a new rule group to the configuration
 * @param {RuleGroup} group - Rule group to add
 * @returns {Promise<{success: boolean, errors?: string[], index?: number}>}
 */
export async function addRuleGroup(group) {
  try {
    // Validate the group
    const validation = validateRuleGroup(group);
    if (!validation.valid) {
      console.error('Cannot add invalid rule group:', validation.errors);
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Load current config
    const config = await loadConfiguration();
    
    // Add the new group
    config.groups.push(group);
    
    // Save updated config
    const saveResult = await saveConfiguration(config);
    
    if (saveResult.success) {
      return {
        success: true,
        index: config.groups.length - 1
      };
    } else {
      return saveResult;
    }
  } catch (error) {
    console.error('Error adding rule group:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

/**
 * Update an existing rule group
 * @param {number} index - Index of the group to update
 * @param {RuleGroup} group - New group data
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
export async function updateRuleGroup(index, group) {
  try {
    // Validate the group
    const validation = validateRuleGroup(group);
    if (!validation.valid) {
      console.error('Cannot update with invalid rule group:', validation.errors);
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Load current config
    const config = await loadConfiguration();
    
    // Check index bounds
    if (index < 0 || index >= config.groups.length) {
      return {
        success: false,
        errors: [`Invalid index: ${index}. Must be between 0 and ${config.groups.length - 1}`]
      };
    }
    
    // Update the group
    config.groups[index] = group;
    
    // Save updated config
    return await saveConfiguration(config);
  } catch (error) {
    console.error('Error updating rule group:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

/**
 * Delete a rule group
 * @param {number} index - Index of the group to delete
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
export async function deleteRuleGroup(index) {
  try {
    // Load current config
    const config = await loadConfiguration();
    
    // Check index bounds
    if (index < 0 || index >= config.groups.length) {
      return {
        success: false,
        errors: [`Invalid index: ${index}. Must be between 0 and ${config.groups.length - 1}`]
      };
    }
    
    // Remove the group
    const deletedGroup = config.groups.splice(index, 1)[0];
    console.log('Deleted rule group:', deletedGroup.name);
    
    // Save updated config
    return await saveConfiguration(config);
  } catch (error) {
    console.error('Error deleting rule group:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

/**
 * Validate configuration object (re-export from schema with better error messages)
 * @param {any} config - Configuration to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateConfiguration(config) {
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
      errors.push(`Group ${index + 1} "${group.name || 'unnamed'}": ${validation.errors.join(', ')}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect sites that appear in multiple groups with overlapping schedules
 * This can lead to confusing behavior where a site is blocked by one rule but not another
 * @returns {Promise<Array<{site: string, groups: Array<{index: number, name: string, overlapping: boolean}>}>>}
 */
export async function detectOverlappingSites() {
  try {
    const config = await loadConfiguration();
    const siteMap = new Map(); // site -> array of {groupIndex, groupName, schedule}
    
    // Build map of sites to groups
    config.groups.forEach((group, index) => {
      group.sites.forEach(site => {
        if (!siteMap.has(site)) {
          siteMap.set(site, []);
        }
        siteMap.get(site).push({
          index,
          name: group.name,
          schedule: group.schedule
        });
      });
    });
    
    // Find sites in multiple groups and check for overlaps
    const overlaps = [];
    
    for (const [site, groups] of siteMap.entries()) {
      if (groups.length > 1) {
        // Check if any schedules overlap
        const hasOverlap = checkScheduleOverlap(groups.map(g => g.schedule));
        
        overlaps.push({
          site,
          groups: groups.map(g => ({
            index: g.index,
            name: g.name,
            overlapping: hasOverlap
          }))
        });
      }
    }
    
    return overlaps;
  } catch (error) {
    console.error('Error detecting overlapping sites:', error);
    return [];
  }
}

/**
 * Check if multiple schedules have any temporal overlap
 * @param {Array<Schedule|undefined>} schedules - Array of schedule objects
 * @returns {boolean} True if any schedules overlap
 */
function checkScheduleOverlap(schedules) {
  // If any schedule is undefined (always active), that's an overlap
  if (schedules.some(s => !s)) {
    return true;
  }
  
  // Check each pair of schedules for overlap
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      if (schedulesOverlap(schedules[i], schedules[j])) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if two schedules overlap (have any common active time)
 * @param {Schedule} schedule1 - First schedule
 * @param {Schedule} schedule2 - Second schedule
 * @returns {boolean} True if schedules overlap
 */
function schedulesOverlap(schedule1, schedule2) {
  // Find common days
  const commonDays = schedule1.days.filter(day => schedule2.days.includes(day));
  
  if (commonDays.length === 0) {
    return false; // No common days
  }
  
  // Check if time ranges overlap on common days
  for (const timeRange1 of schedule1.times) {
    for (const timeRange2 of schedule2.times) {
      if (timeRangesOverlap(timeRange1, timeRange2)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if two time ranges overlap
 * @param {string} range1 - Time range like "0900-1700"
 * @param {string} range2 - Time range like "1600-2200"
 * @returns {boolean} True if ranges overlap
 */
function timeRangesOverlap(range1, range2) {
  const [start1, end1] = range1.split('-').map(t => parseInt(t, 10));
  const [start2, end2] = range2.split('-').map(t => parseInt(t, 10));
  
  // Check if ranges overlap: start1 < end2 && start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Export configuration as JSON string
 * @returns {Promise<string>} JSON string of current configuration
 */
export async function exportConfiguration() {
  try {
    const config = await loadConfiguration();
    return JSON.stringify(config, null, 2);
  } catch (error) {
    console.error('Error exporting configuration:', error);
    throw error;
  }
}

/**
 * Import configuration from JSON string
 * @param {string} jsonString - JSON string containing configuration
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
export async function importConfiguration(jsonString) {
  try {
    // Parse JSON
    let config;
    try {
      config = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        success: false,
        errors: [`Invalid JSON: ${parseError.message}`]
      };
    }
    
    // Validate configuration
    const validation = validateConfiguration(config);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Save the configuration
    const saveResult = await saveConfiguration(config);
    
    if (saveResult.success) {
      console.log('Configuration imported successfully');
    }
    
    return saveResult;
  } catch (error) {
    console.error('Error importing configuration:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

/**
 * Create a default rule group template
 * @returns {RuleGroup} Default rule group object
 */
export function createDefaultRuleGroup() {
  return {
    name: 'New Rule',
    duration: 60, // 1 hour
    maxAccesses: 3,
    strictMode: false,
    sites: [],
    schedule: {
      days: [0, 1, 2, 3, 4, 5, 6], // All days
      times: ['0000-2359'] // All day
    }
  };
}

/**
 * Get human-readable duration string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Human-readable string like "2 hours" or "90 minutes"
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Parse human-readable duration to minutes
 * Supports formats like "2h", "90m", "1h30m", "2 hours", etc.
 * @param {string} str - Duration string
 * @returns {number|null} Duration in minutes, or null if invalid
 */
export function parseDuration(str) {
  str = str.toLowerCase().trim();
  
  // Try to match patterns like "2h 30m" or "2 hours 30 minutes"
  const hourMatch = str.match(/(\d+)\s*h(?:our|r)?s?/);
  const minuteMatch = str.match(/(\d+)\s*m(?:inute|in)?s?/);
  
  let totalMinutes = 0;
  
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1], 10);
  }
  
  // If we found something, return it
  if (totalMinutes > 0) {
    return totalMinutes;
  }
  
  // Try parsing as plain number (assume minutes)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 0) {
    return num;
  }
  
  return null;
}

/**
 * Get day name from day index
 * @param {number} dayIndex - Day index (0=Sunday, 6=Saturday)
 * @returns {string} Day name
 */
export function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || 'Unknown';
}

/**
 * Format time for display
 * @param {string} timeRange - Time range like "0900-1700"
 * @returns {string} Formatted string like "9:00 AM - 5:00 PM"
 */
export function formatTimeRange(timeRange) {
  const [start, end] = timeRange.split('-');
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * Format time string like "0900" to "9:00 AM"
 * @param {string} time - Time string in HHMM format
 * @returns {string} Formatted time
 */
function formatTime(time) {
  const hours = parseInt(time.slice(0, 2), 10);
  const minutes = time.slice(2, 4);
  
  if (hours === 0) {
    return `12:${minutes} AM`;
  } else if (hours < 12) {
    return `${hours}:${minutes} AM`;
  } else if (hours === 12) {
    return `12:${minutes} PM`;
  } else {
    return `${hours - 12}:${minutes} PM`;
  }
}

/**
 * Get summary statistics about the current configuration
 * @returns {Promise<{totalGroups: number, totalSites: number, activeGroups: number, hasOverlaps: boolean}>}
 */
export async function getConfigurationStats() {
  try {
    const config = await loadConfiguration();
    const overlaps = await detectOverlappingSites();
    
    // Count unique sites
    const allSites = new Set();
    config.groups.forEach(group => {
      group.sites.forEach(site => allSites.add(site));
    });
    
    // Count currently active groups
    const activeGroups = config.groups.filter(group => isRuleActiveNow(group.schedule)).length;
    
    return {
      totalGroups: config.groups.length,
      totalSites: allSites.size,
      activeGroups,
      hasOverlaps: overlaps.length > 0
    };
  } catch (error) {
    console.error('Error getting configuration stats:', error);
    return {
      totalGroups: 0,
      totalSites: 0,
      activeGroups: 0,
      hasOverlaps: false
    };
  }
}
