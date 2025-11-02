/**
 * Settings Page - Phase 7
 * User interface for managing rule groups
 */

import {
  loadConfiguration,
  saveConfiguration,
  addRuleGroup,
  updateRuleGroup,
  deleteRuleGroup,
  detectOverlappingSites,
  exportConfiguration,
  importConfiguration,
  createDefaultRuleGroup,
  formatDuration,
  parseDuration,
  getDayName,
  formatTimeRange,
  getConfigurationStats
} from './settings-data.js';

// State
let currentConfig = null;
let saveTimeout = null;

// DOM Elements
const groupsContainer = document.getElementById('groups-container');
const addGroupBtn = document.getElementById('add-group-btn');
const emptyState = document.getElementById('empty-state');
const messageArea = document.getElementById('message-area');
const overlapWarning = document.getElementById('overlap-warning');
const overlapDetails = document.getElementById('overlap-details');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importModal = document.getElementById('import-modal');
const importModalClose = document.getElementById('import-modal-close');
const importCancel = document.getElementById('import-cancel');
const importConfirm = document.getElementById('import-confirm');
const importJson = document.getElementById('import-json');
const importFile = document.getElementById('import-file');
const importErrors = document.getElementById('import-errors');
const fileName = document.getElementById('file-name');

// Statistics elements
const statGroups = document.getElementById('stat-groups');
const statSites = document.getElementById('stat-sites');
const statActive = document.getElementById('stat-active');

/**
 * Initialize the settings page
 */
async function init() {
  console.log('Settings page initializing...');
  
  // Load initial configuration
  await loadAndRender();
  
  // Set up event listeners
  setupEventListeners();
  
  console.log('Settings page ready!');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  addGroupBtn.addEventListener('click', handleAddGroup);
  exportBtn.addEventListener('click', handleExport);
  importBtn.addEventListener('click', () => showModal(importModal));
  importModalClose.addEventListener('click', () => hideModal(importModal));
  importCancel.addEventListener('click', () => hideModal(importModal));
  importConfirm.addEventListener('click', handleImport);
  importFile.addEventListener('change', handleFileSelect);
  
  // Close modal on backdrop click
  importModal.addEventListener('click', (e) => {
    if (e.target === importModal) {
      hideModal(importModal);
    }
  });
}

/**
 * Load configuration and render UI
 */
async function loadAndRender() {
  try {
    currentConfig = await loadConfiguration();
    await renderAll();
  } catch (error) {
    console.error('Error loading configuration:', error);
    showMessage('Failed to load configuration', 'error');
  }
}

/**
 * Render entire UI
 */
async function renderAll() {
  renderGroups();
  await updateStatistics();
  await checkOverlaps();
}

/**
 * Render all rule groups
 */
function renderGroups() {
  if (!currentConfig || currentConfig.groups.length === 0) {
    groupsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  groupsContainer.innerHTML = '';
  
  currentConfig.groups.forEach((group, index) => {
    const groupElement = createGroupElement(group, index);
    groupsContainer.appendChild(groupElement);
  });
}

/**
 * Create a rule group element
 */
function createGroupElement(group, index) {
  const div = document.createElement('div');
  div.className = 'rule-group';
  div.dataset.index = index;
  
  div.innerHTML = `
    <div class="group-header">
      <div class="group-title">
        <input type="text" 
               value="${escapeHtml(group.name)}" 
               data-field="name"
               placeholder="Rule Group Name">
      </div>
      <div class="group-actions">
        <button class="btn btn-danger btn-small btn-delete" title="Delete this rule group">
          🗑️ Delete
        </button>
      </div>
    </div>
    
    <div class="group-body">
      <div class="group-section">
        <div class="section-title">⚙️ Settings</div>
        
        <div class="form-group">
          <label class="form-label">Time Window</label>
          <input type="text" 
                 class="form-input" 
                 value="${group.duration}" 
                 data-field="duration"
                 placeholder="e.g., 60 or '1h' or '90m'">
          <span class="form-hint">${formatDuration(group.duration)}</span>
        </div>
        
        <div class="form-group">
          <label class="form-label">Max Accesses</label>
          <input type="number" 
                 class="form-input" 
                 value="${group.maxAccesses}" 
                 data-field="maxAccesses"
                 min="1"
                 placeholder="e.g., 3">
          <span class="form-hint">Allowed accesses within the time window</span>
        </div>
        
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" 
                   ${group.strictMode ? 'checked' : ''}
                   data-field="strictMode">
            <span class="toggle-slider"></span>
          </label>
          <div>
            <div class="toggle-label">Strict Mode</div>
            <span class="form-hint">Share limit across all sites</span>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">🌐 Sites</label>
          <div class="sites-list" data-field="sites">
            ${group.sites.map((site, siteIndex) => `
              <div class="site-item">
                <input type="text" 
                       value="${escapeHtml(site)}"
                       data-site-index="${siteIndex}"
                       placeholder="example.com">
                <button class="btn btn-danger btn-small btn-icon btn-remove-site" 
                        data-site-index="${siteIndex}"
                        title="Remove site">
                  ×
                </button>
              </div>
            `).join('')}
          </div>
          <button class="add-site-btn">+ Add Site</button>
        </div>
      </div>
      
      <div class="group-section">
        <div class="section-title">📅 Schedule</div>
        
        <div class="form-group">
          <label class="form-label">Active Days</label>
          <div class="days-selector">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => `
              <div class="day-checkbox">
                <input type="checkbox" 
                       id="day-${index}-${dayIndex}"
                       ${group.schedule?.days?.includes(dayIndex) ? 'checked' : ''}
                       data-day="${dayIndex}">
                <label for="day-${index}-${dayIndex}">${day}</label>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Time Ranges</label>
          <div class="time-ranges" data-field="times">
            ${(group.schedule?.times || ['0000-2359']).map((timeRange, timeIndex) => `
              <div class="time-range-item">
                <input type="text" 
                       value="${timeRange}"
                       data-time-index="${timeIndex}"
                       placeholder="0900-1700"
                       pattern="\\d{4}-\\d{4}">
                <button class="btn btn-danger btn-small btn-icon btn-remove-time" 
                        data-time-index="${timeIndex}"
                        title="Remove time range">
                  ×
                </button>
              </div>
            `).join('')}
          </div>
          <button class="add-time-btn btn btn-secondary btn-small" style="width: 100%; margin-top: 8px;">
            + Add Time Range
          </button>
          <span class="form-hint">Format: HHMM-HHMM (e.g., 0900-1700)</span>
        </div>
      </div>
    </div>
  `;
  
  // Set up event listeners for this group
  setupGroupEventListeners(div, index);
  
  return div;
}

/**
 * Set up event listeners for a group element
 */
function setupGroupEventListeners(groupElement, index) {
  // Delete button
  const deleteBtn = groupElement.querySelector('.btn-delete');
  deleteBtn.addEventListener('click', () => handleDeleteGroup(index));
  
  // Name input
  const nameInput = groupElement.querySelector('[data-field="name"]');
  nameInput.addEventListener('input', (e) => {
    debouncedUpdate(index, 'name', e.target.value);
  });
  
  // Duration input
  const durationInput = groupElement.querySelector('[data-field="duration"]');
  durationInput.addEventListener('input', (e) => {
    let value = e.target.value;
    // Try to parse as duration string
    const parsed = parseDuration(value);
    if (parsed !== null) {
      value = parsed;
    } else {
      value = parseInt(value, 10);
    }
    
    if (!isNaN(value) && value > 0) {
      debouncedUpdate(index, 'duration', value);
      // Update hint
      const hint = durationInput.nextElementSibling;
      hint.textContent = formatDuration(value);
    }
  });
  
  // Max accesses input
  const maxAccessesInput = groupElement.querySelector('[data-field="maxAccesses"]');
  maxAccessesInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      debouncedUpdate(index, 'maxAccesses', value);
    }
  });
  
  // Strict mode toggle
  const strictModeInput = groupElement.querySelector('[data-field="strictMode"]');
  strictModeInput.addEventListener('change', (e) => {
    debouncedUpdate(index, 'strictMode', e.target.checked);
  });
  
  // Sites
  const sitesContainer = groupElement.querySelector('[data-field="sites"]');
  sitesContainer.addEventListener('input', (e) => {
    if (e.target.hasAttribute('data-site-index')) {
      const siteIndex = parseInt(e.target.dataset.siteIndex, 10);
      updateSite(index, siteIndex, e.target.value);
    }
  });
  
  sitesContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-site')) {
      const siteIndex = parseInt(e.target.dataset.siteIndex, 10);
      removeSite(index, siteIndex);
    }
  });
  
  const addSiteBtn = groupElement.querySelector('.add-site-btn');
  addSiteBtn.addEventListener('click', () => addSite(index));
  
  // Days
  const daysSelector = groupElement.querySelector('.days-selector');
  daysSelector.addEventListener('change', (e) => {
    if (e.target.hasAttribute('data-day')) {
      updateScheduleDays(index, groupElement);
    }
  });
  
  // Time ranges
  const timeRanges = groupElement.querySelector('[data-field="times"]');
  timeRanges.addEventListener('input', (e) => {
    if (e.target.hasAttribute('data-time-index')) {
      const timeIndex = parseInt(e.target.dataset.timeIndex, 10);
      updateTimeRange(index, timeIndex, e.target.value);
    }
  });
  
  timeRanges.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-time')) {
      const timeIndex = parseInt(e.target.dataset.timeIndex, 10);
      removeTimeRange(index, timeIndex);
    }
  });
  
  const addTimeBtn = groupElement.querySelector('.add-time-btn');
  addTimeBtn.addEventListener('click', () => addTimeRange(index));
}

/**
 * Handle adding a new group
 */
async function handleAddGroup() {
  const newGroup = createDefaultRuleGroup();
  newGroup.name = `New Rule ${currentConfig.groups.length + 1}`;
  
  const result = await addRuleGroup(newGroup);
  
  if (result.success) {
    showMessage('Rule group added!', 'success');
    await loadAndRender();
    // Scroll to the new group
    setTimeout(() => {
      const groups = document.querySelectorAll('.rule-group');
      groups[groups.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  } else {
    showMessage('Failed to add rule group: ' + result.errors.join(', '), 'error');
  }
}

/**
 * Handle deleting a group
 */
async function handleDeleteGroup(index) {
  const group = currentConfig.groups[index];
  
  if (!confirm(`Delete rule group "${group.name}"?\n\nThis cannot be undone.`)) {
    return;
  }
  
  const result = await deleteRuleGroup(index);
  
  if (result.success) {
    showMessage('Rule group deleted', 'success');
    await loadAndRender();
  } else {
    showMessage('Failed to delete rule group: ' + result.errors.join(', '), 'error');
  }
}

/**
 * Debounced update function
 */
function debouncedUpdate(index, field, value) {
  // Update local state immediately for responsiveness
  currentConfig.groups[index][field] = value;
  
  // Debounce the save
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveGroup(index);
  }, 500);
}

/**
 * Save a group to storage
 */
async function saveGroup(index) {
  const group = currentConfig.groups[index];
  const result = await updateRuleGroup(index, group);
  
  if (!result.success) {
    showMessage('Validation error: ' + result.errors.join(', '), 'error');
    // Reload to reset
    await loadAndRender();
  } else {
    // Check for overlaps after save
    await checkOverlaps();
  }
}

/**
 * Update a site in the list
 */
function updateSite(groupIndex, siteIndex, value) {
  currentConfig.groups[groupIndex].sites[siteIndex] = value.trim();
  debouncedUpdate(groupIndex, 'sites', currentConfig.groups[groupIndex].sites);
}

/**
 * Add a new site to the list
 */
function addSite(groupIndex) {
  currentConfig.groups[groupIndex].sites.push('');
  renderGroups();
  // Focus the new input
  setTimeout(() => {
    const group = document.querySelector(`[data-index="${groupIndex}"]`);
    const inputs = group.querySelectorAll('[data-site-index]');
    inputs[inputs.length - 1]?.focus();
  }, 50);
}

/**
 * Remove a site from the list
 */
function removeSite(groupIndex, siteIndex) {
  currentConfig.groups[groupIndex].sites.splice(siteIndex, 1);
  
  // Ensure at least one site
  if (currentConfig.groups[groupIndex].sites.length === 0) {
    currentConfig.groups[groupIndex].sites.push('');
  }
  
  renderGroups();
  saveGroup(groupIndex);
}

/**
 * Update schedule days based on checkboxes
 */
function updateScheduleDays(groupIndex, groupElement) {
  const checkboxes = groupElement.querySelectorAll('[data-day]');
  const days = [];
  
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      days.push(parseInt(checkbox.dataset.day, 10));
    }
  });
  
  if (!currentConfig.groups[groupIndex].schedule) {
    currentConfig.groups[groupIndex].schedule = { days: [], times: ['0000-2359'] };
  }
  
  currentConfig.groups[groupIndex].schedule.days = days;
  debouncedUpdate(groupIndex, 'schedule', currentConfig.groups[groupIndex].schedule);
}

/**
 * Update a time range
 */
function updateTimeRange(groupIndex, timeIndex, value) {
  if (!currentConfig.groups[groupIndex].schedule) {
    currentConfig.groups[groupIndex].schedule = { 
      days: [0, 1, 2, 3, 4, 5, 6], 
      times: [] 
    };
  }
  
  currentConfig.groups[groupIndex].schedule.times[timeIndex] = value.trim();
  debouncedUpdate(groupIndex, 'schedule', currentConfig.groups[groupIndex].schedule);
}

/**
 * Add a new time range
 */
function addTimeRange(groupIndex) {
  if (!currentConfig.groups[groupIndex].schedule) {
    currentConfig.groups[groupIndex].schedule = { 
      days: [0, 1, 2, 3, 4, 5, 6], 
      times: [] 
    };
  }
  
  currentConfig.groups[groupIndex].schedule.times.push('0900-1700');
  renderGroups();
}

/**
 * Remove a time range
 */
function removeTimeRange(groupIndex, timeIndex) {
  if (!currentConfig.groups[groupIndex].schedule) {
    return;
  }
  
  currentConfig.groups[groupIndex].schedule.times.splice(timeIndex, 1);
  
  // Ensure at least one time range
  if (currentConfig.groups[groupIndex].schedule.times.length === 0) {
    currentConfig.groups[groupIndex].schedule.times.push('0000-2359');
  }
  
  renderGroups();
  saveGroup(groupIndex);
}

/**
 * Update statistics display
 */
async function updateStatistics() {
  try {
    const stats = await getConfigurationStats();
    statGroups.textContent = stats.totalGroups;
    statSites.textContent = stats.totalSites;
    statActive.textContent = stats.activeGroups;
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

/**
 * Check for overlapping sites and display warnings
 */
async function checkOverlaps() {
  try {
    const overlaps = await detectOverlappingSites();
    
    if (overlaps.length === 0) {
      overlapWarning.classList.add('hidden');
      return;
    }
    
    overlapWarning.classList.remove('hidden');
    overlapDetails.innerHTML = overlaps.map(overlap => `
      <div class="overlap-item">
        <div class="overlap-site">
          <strong>${escapeHtml(overlap.site)}</strong>
          ${overlap.groups[0].overlapping ? 
            '<span style="color: #856404;">⚠️ Schedules overlap</span>' : 
            '<span style="color: #155724;">✓ Schedules don\'t overlap</span>'}
        </div>
        <div class="overlap-groups">
          ${overlap.groups.map(g => 
            `<span class="group-badge">${escapeHtml(g.name)}</span>`
          ).join('')}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error checking overlaps:', error);
  }
}

/**
 * Handle export
 */
async function handleExport() {
  try {
    const json = await exportConfiguration();
    
    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `throttle-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Configuration exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting:', error);
    showMessage('Failed to export configuration', 'error');
  }
}

/**
 * Handle file selection for import
 */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  fileName.textContent = file.name;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    importJson.value = event.target.result;
  };
  reader.readAsText(file);
}

/**
 * Handle import
 */
async function handleImport() {
  const json = importJson.value.trim();
  
  if (!json) {
    importErrors.innerHTML = '<p>Please paste JSON or select a file</p>';
    importErrors.style.display = 'block';
    return;
  }
  
  const result = await importConfiguration(json);
  
  if (result.success) {
    hideModal(importModal);
    showMessage('Configuration imported successfully!', 'success');
    await loadAndRender();
    
    // Reset modal
    importJson.value = '';
    fileName.textContent = '';
    importErrors.style.display = 'none';
  } else {
    importErrors.innerHTML = `
      <strong>Import failed:</strong>
      <ul>
        ${result.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
      </ul>
    `;
    importErrors.style.display = 'block';
  }
}

/**
 * Show a modal
 */
function showModal(modal) {
  modal.classList.remove('hidden');
}

/**
 * Hide a modal
 */
function hideModal(modal) {
  modal.classList.add('hidden');
}

/**
 * Show a message to the user
 */
function showMessage(text, type = 'success') {
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.innerHTML = `
    <span>${type === 'success' ? '✓' : '✗'}</span>
    <span>${escapeHtml(text)}</span>
  `;
  
  messageArea.appendChild(message);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    message.style.opacity = '0';
    message.style.transform = 'translateY(-10px)';
    message.style.transition = 'all 0.3s';
    setTimeout(() => message.remove(), 300);
  }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
