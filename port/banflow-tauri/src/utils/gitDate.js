/**
 * Parse dates from git (%aI ISO-8601 or legacy %ai format).
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseGitDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Strict ISO-8601 from git %aI / committerdate:iso8601
  let date = new Date(str);
  if (!Number.isNaN(date.getTime())) return date;

  // Legacy git %ai: "2024-01-15 10:30:45 -0500" -> ISO-like
  const normalized = str.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$/,
    '$1T$2$3',
  );
  date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;

  // Space before timezone without T
  const withT = str.replace(' ', 'T');
  date = new Date(withT);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @param {string|number|Date|null|undefined} value
 * @param {(date: Date) => string} formatter
 * @param {string} [fallback='']
 */
export function formatGitDate(value, formatter, fallback = '') {
  const date = parseGitDate(value);
  if (!date) return fallback;
  return formatter(date);
}
