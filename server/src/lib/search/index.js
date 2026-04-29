import { WEB_SEARCH_CONSTANTS } from "@faster-chat/shared";
import { searchBrave } from "./providers/brave.js";

const cache = new Map();
const MAX_CACHE_ENTRIES = 100;

function pruneCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp >= WEB_SEARCH_CONSTANTS.CACHE_TTL_MS) {
      cache.delete(key);
    }
  }

  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

export async function searchWeb(query, { apiKey }) {
  pruneCache();
  const cacheKey = query;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEB_SEARCH_CONSTANTS.CACHE_TTL_MS) {
    return cached.results;
  }

  const results = await searchBrave(query, { apiKey, count: WEB_SEARCH_CONSTANTS.MAX_RESULTS });

  if (results.error) {
    return results;
  }

  cache.set(cacheKey, { results, timestamp: Date.now() });
  pruneCache();
  return results;
}
