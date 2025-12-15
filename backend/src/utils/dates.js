/**
 * Date Utility Functions
 *
 * Helper functions for date formatting and manipulation
 */

/**
 * Format a date as YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date
 */
export function getTodayString() {
  return formatDateString(new Date());
}

/**
 * Get start of day ISO string for a date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} ISO string for start of day
 */
export function getStartOfDay(dateString) {
  return `${dateString}T00:00:00.000Z`;
}

/**
 * Get end of day ISO string for a date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} ISO string for end of day
 */
export function getEndOfDay(dateString) {
  return `${dateString}T23:59:59.999Z`;
}

/**
 * Get date range for the past N days
 * @param {number} days - Number of days to go back
 * @returns {Object} Object with startDate and endDate strings
 */
export function getDateRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: formatDateString(startDate),
    endDate: formatDateString(endDate),
  };
}

/**
 * Get the start of the week (Sunday) for a given date
 * @param {Date} date - Date object
 * @returns {Date} Start of week date
 */
export function getStartOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Parse a date string or return current date
 * @param {string|undefined} dateString - Optional date string (YYYY-MM-DD)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function parseDateOrToday(dateString) {
  if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  return getTodayString();
}

/**
 * Check if a date string is valid
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
export function isValidDateString(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Get day of week name
 * @param {Date} date - Date object
 * @returns {string} Day name (e.g., "Monday")
 */
export function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}
