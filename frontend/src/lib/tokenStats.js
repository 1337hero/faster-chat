/**
 * Token performance stats for assistant messages.
 * Usage comes from the provider via stream metadata; timing is measured client-side.
 */

export function buildTokenStats({ usage, ttftMs, durationMs }) {
  const outputTokens = usage?.outputTokens;
  if (!outputTokens || !durationMs) return null;

  const generationMs = ttftMs != null ? Math.max(durationMs - ttftMs, 1) : durationMs;

  return {
    inputTokens: usage.inputTokens ?? null,
    outputTokens,
    ttftMs: ttftMs ?? null,
    durationMs,
    tokensPerSecond: Math.round((outputTokens / (generationMs / 1000)) * 10) / 10,
  };
}

function formatDuration(ms) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatTokenStats(stats) {
  if (!stats) return "";

  const parts = [];
  if (stats.ttftMs != null) parts.push(`TTFT ${formatDuration(stats.ttftMs)}`);
  if (stats.tokensPerSecond != null) parts.push(`${stats.tokensPerSecond} tok/s`);
  if (stats.outputTokens != null) {
    parts.push(
      stats.inputTokens != null
        ? `${stats.inputTokens.toLocaleString("en-US")} in · ${stats.outputTokens.toLocaleString("en-US")} out`
        : `${stats.outputTokens.toLocaleString("en-US")} tokens`
    );
  }
  return parts.join(" · ");
}
