export function safeHydration(props) {
  if (typeof window === "undefined") {
    return props;
  }

  const cleanProps = { ...props };
  const browserExtensionAttrs = ["data-lt-installed", "inmaintabuse", "cz-shortcut-listen"];

  browserExtensionAttrs.forEach((attr) => {
    delete cleanProps[attr];
  });

  return cleanProps;
}

export function formatDate(date) {
  const normalized = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(normalized);
}
