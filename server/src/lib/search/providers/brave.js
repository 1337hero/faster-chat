import { SEARCH_ERROR_CODES, WEB_SEARCH_CONSTANTS } from "@faster-chat/shared";

export async function searchBrave(query, options = {}) {
  const { apiKey, count = WEB_SEARCH_CONSTANTS.MAX_RESULTS } = options;

  if (!apiKey) {
    return { error: "Brave API key required", code: SEARCH_ERROR_CODES.AUTH_FAILED };
  }

  try {
    const params = new URLSearchParams({ q: query, count: String(count) });
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(WEB_SEARCH_CONSTANTS.FETCH_TIMEOUT_MS),
    });

    if (res.status === 429) {
      return { error: "Rate limited by Brave", code: SEARCH_ERROR_CODES.RATE_LIMITED };
    }

    if (res.status === 401 || res.status === 403) {
      return { error: "Invalid Brave API key", code: SEARCH_ERROR_CODES.AUTH_FAILED };
    }

    if (!res.ok) {
      return { error: `Brave returned ${res.status}`, code: SEARCH_ERROR_CODES.PROVIDER_ERROR };
    }

    const data = await res.json();
    const webResults = data.web?.results || [];

    if (!webResults.length) {
      return { error: "No results found", code: SEARCH_ERROR_CODES.NO_RESULTS };
    }

    return webResults.slice(0, count).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description || "",
      domain: new URL(r.url).hostname,
    }));
  } catch (err) {
    return { error: err.message, code: SEARCH_ERROR_CODES.FETCH_FAILED };
  }
}
