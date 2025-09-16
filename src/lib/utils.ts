export function safeHydration<T extends object>(props: T): T {
  if (typeof window === "undefined") {
    // On server, return clean props
    return props;
  }
  
  // On client, filter out browser extension attributes
  const cleanProps = { ...props };
  const browserExtensionAttrs = [
    "data-lt-installed",
    "inmaintabuse",
    "cz-shortcut-listen"
  ];
  
  browserExtensionAttrs.forEach(attr => {
    delete (cleanProps as Record<string, unknown>)[attr];
  });
  
  return cleanProps;
}