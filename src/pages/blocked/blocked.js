// Blocked page JavaScript

/**
 * Parse URL parameters
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    site: params.get('site') || 'unknown',
    rule: params.get('rule') || 'Unknown Rule',
    duration: params.get('duration') || '0',
    maxAccesses: params.get('maxAccesses') || '0',
    unblockTime: params.get('unblockTime') || ''
  };
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes) {
  minutes = parseInt(minutes, 10);
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} min`;
}

/**
 * Format a date/time for display
 */
function formatUnblockTime(isoString) {
  if (!isoString) {
    return 'Unknown';
  }
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date - now;
    
    if (diffMs <= 0) {
      return 'Now';
    }
    
    const diffMinutes = Math.ceil(diffMs / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (remainingMinutes === 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    
    return `${diffHours}h ${remainingMinutes}m`;
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Update the countdown timer
 */
function updateCountdown(unblockTimeIso) {
  const timeElement = document.getElementById('unblockTime');
  
  if (!unblockTimeIso) {
    return;
  }
  
  // Update every second
  setInterval(() => {
    timeElement.textContent = formatUnblockTime(unblockTimeIso);
  }, 1000);
}

/**
 * Initialize the page
 */
function init() {
  const params = getUrlParams();
  
  // Update site info
  document.getElementById('site').textContent = params.site;
  document.getElementById('rule').textContent = params.rule;
  document.getElementById('limit').textContent = `${params.maxAccesses} accesses`;
  document.getElementById('duration').textContent = formatDuration(params.duration);
  
  // Update unblock time
  const unblockTimeElement = document.getElementById('unblockTime');
  if (params.unblockTime) {
    unblockTimeElement.textContent = formatUnblockTime(params.unblockTime);
    updateCountdown(params.unblockTime);
  } else {
    document.getElementById('unblock-row').style.display = 'none';
  }
  
  // Settings button handler
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  console.log('Blocked page loaded for:', params.site);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
