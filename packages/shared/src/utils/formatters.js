import { FILE_CONSTANTS } from "../constants/files.js";

export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = FILE_CONSTANTS.BYTES_PER_KB;
  const sizes = FILE_CONSTANTS.SIZE_UNITS;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format a price value for display
 * @param {number|null|undefined} price - Price in dollars per 1M tokens
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (!price) return "Free";
  return `$${price.toFixed(2)}`;
}

/**
 * Format a context window size for display
 * @param {number|null|undefined} tokens - Number of tokens
 * @returns {string} Formatted context window string (e.g., "128K", "1.5M")
 */
export function formatContextWindow(tokens) {
  if (!tokens) return "Unknown";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}
