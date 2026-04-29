import { parse } from "node-html-parser";
import { WEB_SEARCH_CONSTANTS, SEARCH_ERROR_CODES } from "@faster-chat/shared";
import { validatePublicFetchUrl } from "../ssrf.js";

const { MAX_CONTENT_LENGTH, FETCH_TIMEOUT_MS } = WEB_SEARCH_CONSTANTS;
const { SSRF_BLOCKED, FETCH_FAILED } = SEARCH_ERROR_CODES;

const MAX_REDIRECTS = 5;
const USER_AGENT = "FasterChat/1.0";

const STRIP_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "[hidden]",
  '[aria-hidden="true"]',
  "noscript",
  "svg",
  "iframe",
];

const CONTENT_SELECTORS = ["article", "main", "[role='main']", "body"];

// --- HTML extraction ---

function extractContent(html) {
  const root = parse(html);

  for (const sel of STRIP_SELECTORS) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const title = root.querySelector("title")?.textContent?.trim() || "";
  const description = root.querySelector('meta[name="description"]')?.getAttribute("content") || "";

  let contentNode;
  for (const sel of CONTENT_SELECTORS) {
    contentNode = root.querySelector(sel);
    if (contentNode) {
      break;
    }
  }

  const rawText = (contentNode || root).textContent;
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  const originalLength = cleaned.length;
  const content = cleaned.slice(0, MAX_CONTENT_LENGTH);

  return {
    title,
    description,
    content,
    contentLength: originalLength,
    truncated: content.length < originalLength,
  };
}

// --- Main export ---

export async function fetchAndExtract(url) {
  const validation = await validatePublicFetchUrl(url, { SSRF_BLOCKED, FETCH_FAILED });
  if (!validation.valid) {
    return validation;
  }

  let currentUrl = validation.url;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return { error: "Redirect with no Location header", code: FETCH_FAILED };
        }

        const next = new URL(location, currentUrl).href;
        const redirectCheck = await validatePublicFetchUrl(next, { SSRF_BLOCKED, FETCH_FAILED });
        if (!redirectCheck.valid) {
          return redirectCheck;
        }

        currentUrl = redirectCheck.url;
        continue;
      }

      if (!res.ok) {
        return { error: `HTTP ${res.status}`, code: FETCH_FAILED };
      }

      const html = await res.text();
      const extracted = extractContent(html);
      return { ...extracted, url: currentUrl };
    }

    return { error: "Too many redirects", code: FETCH_FAILED };
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { error: "Request timed out", code: FETCH_FAILED };
    }
    return { error: err.message, code: FETCH_FAILED };
  }
}
