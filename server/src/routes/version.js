import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf-8")
);

const GITHUB_RELEASES_URL = "https://api.github.com/repos/1337hero/faster-chat/releases/latest";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

let releaseCache = { data: null, fetchedAt: 0 };

async function getLatestRelease() {
  const now = Date.now();
  if (releaseCache.data !== null && now - releaseCache.fetchedAt < CACHE_TTL_MS) {
    return releaseCache.data;
  }

  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      releaseCache = { data: { version: null, url: null }, fetchedAt: now };
      return releaseCache.data;
    }
    const data = await res.json();
    releaseCache = {
      data: {
        version: (data.tag_name || "").replace(/^v/, ""),
        url: data.html_url || null,
      },
      fetchedAt: now,
    };
    return releaseCache.data;
  } catch {
    releaseCache = { data: { version: null, url: null }, fetchedAt: now };
    return releaseCache.data;
  }
}

export const versionRouter = new Hono();

versionRouter.get("/", (c) => c.json({ version: pkg.version }));

versionRouter.get("/latest-release", async (c) => {
  const data = await getLatestRelease();
  return c.json(data);
});
