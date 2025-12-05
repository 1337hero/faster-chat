/**
 * ToolbarGroup - Shared backdrop pill for grouping icon buttons
 *
 * Provides consistent visual styling for toolbar button clusters.
 * Children should be icon buttons with the toolbar button styling.
 */
export const ToolbarGroup = ({ children, className = "" }) => (
  <div className={`relative flex items-center gap-0.5 p-1 ${className}`}>
    <div className="bg-theme-surface border-theme-border pointer-events-none absolute inset-0 -z-10 rounded-xl border shadow-lg" />
    {children}
  </div>
);

/**
 * ToolbarButton - Consistent icon button styling for use within ToolbarGroup
 */
export const ToolbarButton = ({ onClick, title, children, className = "" }) => (
  <button
    onClick={onClick}
    className={`text-theme-text-muted hover:bg-theme-surface-strong/50 hover:text-theme-text flex h-8 w-8 items-center justify-center rounded-md transition-colors ${className}`}
    title={title}>
    {children}
  </button>
);
