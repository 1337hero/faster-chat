import dns from "node:dns/promises";
import net from "node:net";

const METADATA_HOSTNAMES = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "100.100.100.200",
]);

function stripIPv6Brackets(hostname) {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function isMetadataAddress(ip) {
  return ip === "169.254.169.254" || ip === "100.100.100.200";
}

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map((part) => parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    const tail = lower.slice(7);
    if (tail.includes(".")) {
      return isPrivateIPv4(tail);
    }
    const parts = tail.split(":");
    if (parts.length === 2) {
      const hi = parseInt(parts[0], 16);
      const lo = parseInt(parts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        return isPrivateIPv4(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
      }
    }
  }
  return /^fe[89ab][0-9a-f]?:/.test(lower) || /^f[cd][0-9a-f]{2}:/.test(lower);
}

export function isPrivateAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateIPv4(ip);
  }
  if (family === 6) {
    return isPrivateIPv6(ip);
  }
  return true;
}

export function validateProviderBaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  const hostname = stripIPv6Brackets(parsed.hostname).toLowerCase();
  return !!hostname && !METADATA_HOSTNAMES.has(hostname);
}

export async function validatePublicFetchUrl(url, errorCodes) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "Invalid URL", code: errorCodes.SSRF_BLOCKED };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { error: "URL blocked for security reasons", code: errorCodes.SSRF_BLOCKED };
  }

  const hostname = stripIPv6Brackets(parsed.hostname).toLowerCase();
  if (!hostname || METADATA_HOSTNAMES.has(hostname)) {
    return { error: "URL blocked for security reasons", code: errorCodes.SSRF_BLOCKED };
  }

  if (net.isIP(hostname)) {
    if (isMetadataAddress(hostname) || isPrivateAddress(hostname)) {
      return { error: "URL blocked for security reasons", code: errorCodes.SSRF_BLOCKED };
    }
    return { valid: true, url: parsed.href };
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    return { error: "DNS resolution failed", code: errorCodes.FETCH_FAILED };
  }

  if (!addresses.length) {
    return { error: "Could not resolve hostname", code: errorCodes.FETCH_FAILED };
  }

  const blocked = addresses.find(
    ({ address }) => isMetadataAddress(address) || isPrivateAddress(address)
  );
  if (blocked) {
    return { error: "URL blocked for security reasons", code: errorCodes.SSRF_BLOCKED };
  }

  return { valid: true, url: parsed.href };
}
