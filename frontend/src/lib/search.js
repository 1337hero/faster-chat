/**
 * Fuzzy search utilities using fuzzysort v3.
 * Lightweight wrapper for consistent search behavior across the app.
 */

import fuzzysort from "fuzzysort";

// Default search options
const DEFAULT_OPTIONS = {
  threshold: -10000, // Allow loose matches
  limit: 50,
};

/**
 * Search items by a single key.
 * Returns items sorted by match score (best first).
 *
 * @param {string} query - Search query
 * @param {Array} items - Items to search
 * @param {string} key - Object key to search on
 * @returns {Array} Matched items (original objects, not fuzzysort results)
 */
export function searchByKey(query, items, key) {
  if (!query?.trim()) return items;

  const results = fuzzysort.go(query, items, {
    ...DEFAULT_OPTIONS,
    key,
  });

  return results.map((result) => result.obj);
}

/**
 * Search items by multiple keys.
 * Searches all specified keys and returns best matches.
 *
 * @param {string} query - Search query
 * @param {Array} items - Items to search
 * @param {string[]} keys - Object keys to search on
 * @returns {Array} Matched items (original objects)
 */
export function searchByKeys(query, items, keys) {
  if (!query?.trim()) return items;

  const results = fuzzysort.go(query, items, {
    ...DEFAULT_OPTIONS,
    keys,
  });

  return results.map((result) => result.obj);
}

/**
 * Search with highlighted results.
 * Returns results with both original objects and highlighted text.
 *
 * @param {string} query - Search query
 * @param {Array} items - Items to search
 * @param {string} key - Object key to search on
 * @returns {Array<{item: object, highlighted: string|null}>}
 */
export function searchWithHighlights(query, items, key) {
  if (!query?.trim()) {
    return items.map((item) => ({ item, highlighted: null }));
  }

  const results = fuzzysort.go(query, items, {
    ...DEFAULT_OPTIONS,
    key,
  });

  // v3 API: result[0] contains the match for single-key search
  return results.map((result) => ({
    item: result.obj,
    highlighted: result[0]?.highlight("<mark>", "</mark>") ?? null,
  }));
}
