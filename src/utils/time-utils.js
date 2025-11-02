/**
 * Time and scheduling utilities
 */

/**
 * Parse a time range string like "0900-1700" into start and end objects
 * @param {string} timeString - Time range in format "HHMM-HHMM"
 * @returns {{start: {hours: number, minutes: number}, end: {hours: number, minutes: number}}}
 */
export function parseTimeRange(timeString) {
  const [start, end] = timeString.split('-');
  
  return {
    start: {
      hours: parseInt(start.slice(0, 2), 10),
      minutes: parseInt(start.slice(2, 4), 10)
    },
    end: {
      hours: parseInt(end.slice(0, 2), 10),
      minutes: parseInt(end.slice(2, 4), 10)
    }
  };
}

/**
 * Check if current time falls within a time range
 * @param {Date} currentTime - The current time
 * @param {{hours: number, minutes: number}} startTime - Start time object
 * @param {{hours: number, minutes: number}} endTime - End time object
 * @returns {boolean} True if current time is in range
 */
export function isTimeInRange(currentTime, startTime, endTime) {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Check if a rule's schedule is currently active
 * @param {Object} schedule - Schedule object with days and times arrays
 * @param {number[]} schedule.days - Array of day indices (0=Sunday, 6=Saturday)
 * @param {string[]} schedule.times - Array of time ranges like ["0900-1700", "1900-2300"]
 * @returns {boolean} True if the rule is active now
 */
export function isRuleActiveNow(schedule) {
  // If no schedule provided, rule is always active
  if (!schedule || !schedule.days || !schedule.times) {
    return true;
  }
  
  const now = new Date();
  const currentDay = now.getDay(); // 0-6, where 0 is Sunday
  
  // Check if current day is in the schedule
  if (!schedule.days.includes(currentDay)) {
    return false;
  }
  
  // Check if current time falls within any of the time ranges
  for (const timeRange of schedule.times) {
    const { start, end } = parseTimeRange(timeRange);
    if (isTimeInRange(now, start, end)) {
      return true;
    }
  }
  
  return false;
}
