/**
 * Logger Utility
 * Centralized logging with structured JSON output
 */

/**
 * Log an event with level, event name, and optional metadata
 * @param {string} level - Log level (info, warn, error)
 * @param {string} event - Event name
 * @param {Object} meta - Additional metadata
 */
export const logEvent = (level, event, meta = {}) => {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  });
  
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

/**
 * Log an info message
 * @param {string} event - Event name
 * @param {Object} meta - Additional metadata
 */
export const logInfo = (event, meta = {}) => {
  logEvent("info", event, meta);
};

/**
 * Log a warning message
 * @param {string} event - Event name
 * @param {Object} meta - Additional metadata
 */
export const logWarn = (event, meta = {}) => {
  logEvent("warn", event, meta);
};

/**
 * Log an error message
 * @param {string} event - Event name
 * @param {Object} meta - Additional metadata
 */
export const logError = (event, meta = {}) => {
  logEvent("error", event, meta);
};
