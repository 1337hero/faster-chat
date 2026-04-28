import { useQuery } from "@tanstack/react-query";
import { useState } from "preact/hooks";
import { apiFetch } from "@/lib/api";

const SIX_HOURS = 1000 * 60 * 60 * 6;
const DISMISS_KEY_PREFIX = "fc-update-dismissed-";

export function compareSemver(current, latest) {
  const [a, b] = [current, latest].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) {
      return (b[i] || 0) > (a[i] || 0);
    }
  }
  return false;
}

async function fetchCurrentVersion() {
  return apiFetch("/api/version");
}

async function fetchLatestRelease() {
  const data = await apiFetch("/api/version/latest-release");
  if (!data?.version) {
    return null;
  }
  return { version: data.version, url: data.url };
}

export function useUpdateCheck() {
  const [, bump] = useState(0);

  const { data: current } = useQuery({
    queryKey: ["appVersion"],
    queryFn: fetchCurrentVersion,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: latestRelease, isLoading } = useQuery({
    queryKey: ["latestRelease"],
    queryFn: fetchLatestRelease,
    staleTime: SIX_HOURS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const currentVersion = current?.version;
  const latestVersion = latestRelease?.version;
  const releaseUrl = latestRelease?.url;
  const hasUpdate =
    currentVersion && latestVersion ? compareSemver(currentVersion, latestVersion) : false;

  const isDismissed = latestVersion
    ? localStorage.getItem(`${DISMISS_KEY_PREFIX}${latestVersion}`) === "1"
    : false;

  const dismiss = () => {
    if (!latestVersion) {
      return;
    }
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${latestVersion}`, "1");
    bump((n) => n + 1);
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
