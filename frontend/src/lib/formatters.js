export function formatDate(date) {
  const normalized = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(normalized);
}

export function formatDateLong(date) {
  if (!date) {
    return "Never";
  }
  const normalized = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(normalized);
}

export function formatRelativeDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelativeTime(date) {
  if (!date) {
    return "Never";
  }
  const normalized = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - normalized;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "a few seconds ago";
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }
  if (diffDays === 1) {
    return "1 day ago";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return formatDateLong(date);
}
