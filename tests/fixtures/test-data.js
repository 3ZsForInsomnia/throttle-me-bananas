/**
 * Shared test fixtures and mock data
 */

export const mockRuleGroups = {
  simple: {
    name: 'Simple Rule',
    duration: 60,
    maxAccesses: 3,
    strictMode: false,
    sites: ['example.com'],
    schedule: null
  },
  
  withSchedule: {
    name: 'Work Hours',
    duration: 480,
    maxAccesses: 10,
    strictMode: false,
    sites: ['slack.com', 'email.com'],
    schedule: {
      days: [1, 2, 3, 4, 5], // Mon-Fri
      times: ['0900-1700']
    }
  },
  
  strictMode: {
    name: 'Social Media',
    duration: 120,
    maxAccesses: 5,
    strictMode: true,
    sites: ['twitter.com', 'facebook.com', 'instagram.com'],
    schedule: null
  }
};

export const mockConfiguration = {
  groups: [
    mockRuleGroups.simple,
    mockRuleGroups.withSchedule,
    mockRuleGroups.strictMode
  ]
};

export const mockAccessLogs = {
  recent: [
    { site: 'example.com', timestamp: Date.now() - 5 * 60 * 1000, tabId: 1 },
    { site: 'example.com', timestamp: Date.now() - 10 * 60 * 1000, tabId: 2 },
  ],
  
  old: [
    { site: 'example.com', timestamp: Date.now() - 120 * 60 * 1000, tabId: 3 },
  ],
  
  atLimit: (site, count, windowMinutes = 60) => {
    const now = Date.now();
    return Array.from({ length: count }, (_, i) => ({
      site,
      timestamp: now - (i + 1) * 60 * 1000, // 1 min apart
      tabId: i + 1
    }));
  }
};

export const mockSchedules = {
  weekdays: {
    days: [1, 2, 3, 4, 5],
    times: ['0900-1700']
  },
  
  weekends: {
    days: [0, 6],
    times: ['0000-2359']
  },
  
  evenings: {
    days: [0, 1, 2, 3, 4, 5, 6],
    times: ['1800-2300']
  },
  
  splitDay: {
    days: [1, 2, 3, 4, 5],
    times: ['0900-1200', '1300-1700'] // Lunch break
  }
};
