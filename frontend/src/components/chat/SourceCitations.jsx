import { useState } from "preact/hooks";
import { Globe } from "lucide-preact";

export const TOOL_ERROR_MESSAGES = {
  RATE_LIMITED: "Search provider rate limited. Try again in a moment.",
  AUTH_FAILED: "Search API key is invalid or expired. Contact your admin.",
  PROVIDER_ERROR: "Search provider returned an error. Try again.",
  FETCH_FAILED: "Could not fetch the requested URL.",
  SSRF_BLOCKED: "URL blocked for security reasons.",
};

export function extractSources(parts) {
  if (!parts) return [];
  const sources = [];
  const seen = new Set();
  for (const part of parts) {
    if (part.type !== "tool-invocation" || part.state !== "result") continue;
    if (part.toolName === "webSearch" && part.result?.results) {
      for (const r of part.result.results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          sources.push({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            domain: r.domain,
          });
        }
      }
    }
    if (part.toolName === "fetchUrl" && part.result?.url && !part.result?.error) {
      if (!seen.has(part.result.url)) {
        seen.add(part.result.url);
        sources.push({
          title: part.result.title,
          url: part.result.url,
          domain: new URL(part.result.url).hostname,
        });
      }
    }
  }
  return sources;
}

export default function SourceCitations({ sources }) {
  if (!sources?.length) return null;

  const [expanded, setExpanded] = useState(false);
  const visibleSources = expanded ? sources : sources.slice(0, 5);
  const hasMore = sources.length > 5;

  return (
    <div className="mt-4 border-t border-theme-border/30 pt-3">
      <div className="text-theme-text-muted mb-2 flex items-center gap-1.5 text-xs font-medium">
        <Globe className="h-3 w-3" />
        Sources
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleSources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={source.snippet}
            className="bg-theme-surface/60 border-theme-border/40 hover:bg-theme-surface hover:border-theme-border text-theme-text-muted hover:text-theme-text ease-snappy group inline-flex max-w-[200px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors duration-75">
            <img
              src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
              alt=""
              className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <span className="truncate">{source.title}</span>
          </a>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-theme-text-muted hover:text-theme-text text-xs font-medium">
            {expanded ? "Show less" : `+${sources.length - 5} more`}
          </button>
        )}
      </div>
    </div>
  );
}
