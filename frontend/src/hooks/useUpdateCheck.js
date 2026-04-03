import { useQuery } from "@tanstack/react-query";
import { useState } from "preact/hooks";
import { apiFetch } from "@/lib/api";

const GITHUB_RELEASES_URL = "https://api.github.com/repos/1337hero/faster-chat/releases/latest";
const SIX_HOURS = 1000 * 60 * 60 * 6;
const DISMISS_KEY_PREFIX = "fc-update-dismissed-";

export function compareSemver(current, latest) {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((b[i] || 0) > (a[i] || 0)) return true;
    if ((b[i] || 0) < (a[i] || 0)) return false;
  }
  return false;
}

async function fetchCurrentVersion() {
  const data = await apiFetch("/api/version");
  return data.version;
}

async function fetchLatestRelease() {
  const res = await fetch(GITHUB_RELEASES_URL);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    version: (data.tag_name || "").replace(/^v/, ""),
    url: data.html_url,
  };
}

export function useUpdateCheck() {
  const [dismissed, setDismissed] = useState(null);

  const { data: currentVersion } = useQuery({
    queryKey: ["appVersion"],
    queryFn: fetchCurrentVersion,
    staleTime: Infinity,
  });

  const { data: latestRelease, isLoading } = useQuery({
    queryKey: ["latestRelease"],
    queryFn: fetchLatestRelease,
    staleTime: SIX_HOURS,
  });

  const latestVersion = latestRelease?.version;
  const releaseUrl = latestRelease?.url;
  const hasUpdate =
    currentVersion && latestVersion ? compareSemver(currentVersion, latestVersion) : false;

  const isDismissed = latestVersion
    ? dismissed === latestVersion ||
      localStorage.getItem(`${DISMISS_KEY_PREFIX}${latestVersion}`) === "1"
    : false;

  const dismiss = () => {
    if (latestVersion) {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${latestVersion}`, "1");
      setDismissed(latestVersion);
    }
  };

  return {
    hasUpdate,
    latestVersion,
    currentVersion,
    releaseUrl,
    dismiss,
    isDismissed,
    isLoading,
  };
}
