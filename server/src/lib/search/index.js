import { WEB_SEARCH_CONSTANTS } from "@faster-chat/shared";
import { searchBrave } from "./providers/brave.js";

const cache = new Map();

export async function searchWeb(query, { apiKey }) {
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
  return results;
}
