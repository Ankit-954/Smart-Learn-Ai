/**
 * Escape special characters in a string for safe use in RegExp
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for RegExp
 */
export const escapeRegExp = (str) => {
  if (typeof str !== 'string') {
    return '';
  }
  // Escape all regex special characters: . * + ? ^ $ { } ( ) | [ ] \
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validate and sanitize user input for search queries
 * @param {string} query - The search query
 * @returns {string} - Sanitized query
 */
export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }
  // Trim and limit length to prevent ReDoS
  const trimmed = query.trim().slice(0, 100);
  return escapeRegExp(trimmed);
};

/**
 * Create a safe RegExp from user input
 * @param {string} pattern - The pattern to convert to RegExp
 * @param {string} flags - RegExp flags (default: 'i' for case-insensitive)
 * @returns {RegExp|null} - Safe RegExp or null if pattern is empty
 */
export const createSafeRegExp = (pattern, flags = 'i') => {
  if (!pattern || typeof pattern !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeSearchQuery(pattern);
  if (!sanitized) {
    return null;
  }
  
  try {
    return new RegExp(sanitized, flags);
  } catch (error) {
    console.error('Failed to create RegExp:', error.message);
    return null;
  }
};
