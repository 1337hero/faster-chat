const HEADER_INVALID_RE = /Header '\d+' has invalid value/i;
const LOAD_API_KEY_RE = /API key (is missing|must be a string)/i;

export function humanizeProviderError(error, providerLabel = "provider") {
  const message = error?.message || String(error || "");
  const status = error?.statusCode || error?.status;

  if (HEADER_INVALID_RE.test(message)) {
    return `Saved API key for ${providerLabel} contains invalid characters. Open Settings → Connections and re-enter the key.`;
  }
  if (LOAD_API_KEY_RE.test(message) || error?.name === "LoadAPIKeyError") {
    return `No API key configured for ${providerLabel}. Add it in Settings → Connections.`;
  }
  if (
    status === 401 ||
    status === 403 ||
    /unauthor|invalid.*api.*key|incorrect api key/i.test(message)
  ) {
    return `${providerLabel} rejected the API key. Check it in Settings → Connections.`;
  }
  if (status === 429 || /rate.?limit/i.test(message)) {
    return `${providerLabel} rate limit hit. Wait a moment and try again.`;
  }
  if (status === 404 || /model.*not.?found|no such model/i.test(message)) {
    return `${providerLabel} could not find the requested model. Check the model id in Settings → Connections.`;
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(message)) {
    return `Could not reach ${providerLabel}. Check the base URL or your network.`;
  }

  return `${providerLabel} request failed: ${message}`;
}

export function isLikelyValidApiKey(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // HTTP header values: visible ASCII (0x21-0x7E) plus space and tab.
    if (code === 0x09 || code === 0x20) continue;
    if (code < 0x21 || code > 0x7e) return false;
  }
  return true;
}
