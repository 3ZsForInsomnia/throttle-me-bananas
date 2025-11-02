import {
  getConfiguration,
  saveConfiguration,
  getAccessLogs,
  addAccessLog,
  pruneOldAccessLogs,
  clearAllData,
  initializeStorage,
  getStorageStats
} from '../storage/storage-manager.js';

import {
  validateConfiguration,
  validateRuleGroup,
  validateAccessLog,
  DEFAULT_CONFIGURATION
} from '../storage/schema.js';

const output = document.getElementById('output');
const statsDiv = document.getElementById('stats');

function log(message, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const color = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
  output.innerHTML += `<div class="${color}">[${time}] ${message}</div>`;
  output.scrollTop = output.scrollHeight;
}

function logObject(obj) {
  output.innerHTML += `<pre>${JSON.stringify(obj, null, 2)}</pre>`;
  output.scrollTop = output.scrollHeight;
}

async function updateStats() {
  const stats = await getStorageStats();
  statsDiv.innerHTML = `
    <div class="stat-card">
      <h4>Rule Groups</h4>
      <div class="value">${stats.configCount}</div>
    </div>
    <div class="stat-card">
      <h4>Access Logs</h4>
      <div class="value">${stats.logsCount}</div>
    </div>
    <div class="stat-card">
      <h4>Storage Version</h4>
      <div class="value">${stats.version}</div>
    </div>
  `;
}

async function testGetConfig() {
  log('Getting configuration...');
  try {
    const config = await getConfiguration();
    log('Configuration retrieved successfully', 'success');
    logObject(config);
    await updateStats();
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  }
}

async function testSaveConfig() {
  log('Saving test configuration...');
  try {
    const testConfig = {
      groups: [
        {
          name: 'Test Work Hours',
          duration: 60,
          maxAccesses: 3,
          strictMode: false,
          sites: ['gmail.com', 'mail.google.com'],
          schedule: {
            days: [1, 2, 3, 4, 5],
            times: ['0900-1700']
          }
        },
        {
          name: 'Test Social Media',
          duration: 120,
          maxAccesses: 5,
          strictMode: true,
          sites: ['discord.com', 'reddit.com', 'twitter.com']
        }
      ]
    };
    
    await saveConfiguration(testConfig);
    log('Configuration saved successfully', 'success');
    logObject(testConfig);
    await updateStats();
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  }
}

async function testAddAccessLog() {
  log('Adding test access log...');
  try {
    const sites = ['discord.com', 'gmail.com', 'reddit.com', 'twitter.com'];
    const randomSite = sites[Math.floor(Math.random() * sites.length)];
    const timestamp = Date.now();
    const tabId = Math.floor(Math.random() * 100);
    
    await addAccessLog(randomSite, timestamp, tabId);
    log(`Access log added: ${randomSite} (tab ${tabId})`, 'success');
    await updateStats();
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  }
}

async function testGetAccessLogs() {
  log('Getting access logs...');
  try {
    const logs = await getAccessLogs();
    log(`Retrieved ${logs.length} access logs`, 'success');
    if (logs.length > 0) {
      // Show last 10 logs
      const recentLogs = logs.slice(-10);
      logObject(recentLogs);
    } else {
      log('No access logs found');
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  }
}

async function testPruneLogs() {
  log('Pruning logs older than 60 minutes...');
  try {
    const removed = await pruneOldAccessLogs(60);
    log(`Pruned ${removed} old access logs`, 'success');
    await updateStats();
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  }
}

function testValidation() {
  log('Testing validation functions...');
  
  // Test valid rule group
  const validGroup = {
    name: 'Test Group',
    duration: 60,
    maxAccesses: 3,
    strictMode: false,
    sites: ['example.com'],
    schedule: {
      days: [1, 2, 3],
      times: ['0900-1700']
    }
  };
  
  const validResult = validateRuleGroup(validGroup);
  log(`Valid group validation: ${validResult.valid ? 'PASS' : 'FAIL'}`, 
      validResult.valid ? 'success' : 'error');
  
  // Test invalid rule group
  const invalidGroup = {
    name: '',
    duration: -1,
    maxAccesses: 0,
    strictMode: 'not a boolean',
    sites: []
  };
  
  const invalidResult = validateRuleGroup(invalidGroup);
  log(`Invalid group validation: ${!invalidResult.valid ? 'PASS' : 'FAIL'}`, 
      !invalidResult.valid ? 'success' : 'error');
  if (!invalidResult.valid) {
    log(`Expected errors: ${invalidResult.errors.join(', ')}`);
  }
  
  // Test access log validation
  const validLog = {
    site: 'example.com',
    timestamp: Date.now(),
    tabId: 123
  };
  
  const logResult = validateAccessLog(validLog);
  log(`Valid access log validation: ${logResult.valid ? 'PASS' : 'FAIL'}`, 
      logResult.valid ? 'success' : 'error');
}

async function testStats() {
  await updateStats();
  log('Stats updated', 'success');
}

async function testClearAll() {
  if (!confirm('Are you sure you want to clear all storage data?')) {
    return;
  }
  
  log('Clearing all data...');
  try {
    await clearAllData();
    log('All data cleared successfully', 'success');
    
    // Reinitialize
    log('Reinitializing storage...');
    await initializeStorage();
    log('Storage reinitialized', 'success');
    
    await updateStats();
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  }
}

// Set up event listeners
document.getElementById('btn-get-config').addEventListener('click', testGetConfig);
document.getElementById('btn-save-config').addEventListener('click', testSaveConfig);
document.getElementById('btn-add-log').addEventListener('click', testAddAccessLog);
document.getElementById('btn-get-logs').addEventListener('click', testGetAccessLogs);
document.getElementById('btn-prune-logs').addEventListener('click', testPruneLogs);
document.getElementById('btn-validation').addEventListener('click', testValidation);
document.getElementById('btn-stats').addEventListener('click', testStats);
document.getElementById('btn-clear-all').addEventListener('click', testClearAll);

// Initialize stats on load
updateStats();
log('Storage test page loaded. Use the buttons above to test storage functionality.', 'info');
