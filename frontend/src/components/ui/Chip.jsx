// Shared pill chip for mutually-exclusive option rows: aspect ratios, counts,
// lengths, categories, the enhance toggle. `active` drives both the highlight
// and aria-pressed; `size="sm"` is the compact category variant.
export default function Chip({ active, size, className, children, ...buttonProps }) {
  const dimensions = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <button
      type="button"
      aria-pressed={active}
      {...buttonProps}
      className={`rounded-lg transition-colors duration-75 disabled:cursor-not-allowed disabled:opacity-50 ${dimensions} ${
        active
          ? "bg-theme-pink text-white"
          : "bg-theme-surface-strong text-theme-text-muted hover:text-theme-text"
      } ${className || ""}`}>
      {children}
    </button>
  );
}
