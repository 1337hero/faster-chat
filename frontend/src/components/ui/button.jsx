import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { forwardRef } from "@preact/compat";
import { Link } from "./link";

const styles = {
  base: [
    // Base
    "relative isolate inline-flex items-center justify-center gap-x-2 rounded-lg border text-base/6 font-semibold",
    // Sizing
    "px-[calc(theme(spacing[3.5])-1px)] py-[calc(theme(spacing[2.5])-1px)] sm:px-[calc(theme(spacing.3)-1px)] sm:py-[calc(theme(spacing[1.5])-1px)] sm:text-sm/6",
    // Focus
    "focus:outline-none data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-offset-2 data-[focus]:outline-blue-500",
    // Disabled
    "data-[disabled]:opacity-50",
    // Icon
    "[&>[data-slot=icon]]:-mx-0.5 [&>[data-slot=icon]]:my-0.5 [&>[data-slot=icon]]:size-5 [&>[data-slot=icon]]:shrink-0 [&>[data-slot=icon]]:text-[--btn-icon] [&>[data-slot=icon]]:sm:my-1 [&>[data-slot=icon]]:sm:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-[hover]:[--btn-icon:ButtonText]",
  ],
  solid: [
    // Optical border, implemented as the button background to avoid corner artifacts
    "border-transparent bg-[--btn-border]",
    // Dark mode: border is rendered on `after` so background is set to button background
    "dark:bg-[--btn-bg] dark:shadow-black/50",
    // Button background, implemented as foreground layer to stack on top of pseudo-border layer
    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-[--btn-bg]",
    // Drop shadow, applied to the inset `before` layer so it blends with the border
    "before:shadow-sm dark:before:shadow-none",
    // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
    "dark:before:hidden",
    // Dark mode: Subtle white outline is applied using a border
    "dark:border-white/5",
    // Shim/overlay, inset to match button foreground and used for hover state + highlight shadow
    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)] after:bg-gradient-to-b from-transparent from-0% to-black/5 to-100%",
    // Inner highlight shadow
    "after:shadow-[shadow:inset_0_1px_theme(colors.white/15%)]",
    // White overlay on hover
    "after:data-[active]:bg-[--btn-hover-overlay] after:data-[hover]:bg-[--btn-hover-overlay]",
    // Dark mode: `after` layer expands to cover entire button
    "dark:after:-inset-px dark:after:rounded-lg",
    // Disabled
    "before:data-[disabled]:shadow-none after:data-[disabled]:shadow-none",
  ],
  outline: [
    // Base
    "border-theme-border text-theme-text data-[active]:bg-theme-surface data-[hover]:bg-theme-surface",
    "dark:[--btn-bg:transparent]",
    // Icon
    "[--btn-icon:var(--theme-text-muted)] data-[active]:[--btn-icon:var(--theme-text)] data-[hover]:[--btn-icon:var(--theme-text)]",
  ],
  plain: [
    // Base
    "border-transparent text-theme-text data-[active]:bg-theme-surface data-[hover]:bg-theme-surface",
    // Icon
    "[--btn-icon:var(--theme-text-muted)] data-[active]:[--btn-icon:var(--theme-text)] data-[hover]:[--btn-icon:var(--theme-text)]",
  ],
  colors: {
    theme: [
      "text-[var(--inverted-text)] [--btn-bg:var(--theme-primary)] [--btn-border:color-mix(in srgb,var(--theme-primary) 92%, var(--theme-overlay) 8%)] [--btn-hover-overlay:color-mix(in srgb,var(--theme-overlay) 25%, transparent)]",
      "[--btn-icon:var(--inverted-text)] data-[active]:[--btn-icon:var(--inverted-text)] data-[hover]:[--btn-icon:var(--inverted-text)]",
    ],
    red: [
      "text-white [--btn-hover-overlay:theme(colors.white/10%)] [--btn-bg:theme(colors.red.600)] [--btn-border:theme(colors.red.700/90%)]",
      "[--btn-icon:theme(colors.red.300)] data-[active]:[--btn-icon:theme(colors.red.200)] data-[hover]:[--btn-icon:theme(colors.red.200)]",
    ],
    orange: [
      "text-white [--btn-hover-overlay:theme(colors.white/10%)] [--btn-bg:theme(colors.orange.500)] [--btn-border:theme(colors.orange.600/90%)]",
      "[--btn-icon:theme(colors.orange.300)] data-[active]:[--btn-icon:theme(colors.orange.200)] data-[hover]:[--btn-icon:theme(colors.orange.200)]",
    ],
    blue: [
      "text-white [--btn-hover-overlay:theme(colors.white/10%)] [--btn-bg:theme(colors.blue.600)] [--btn-border:theme(colors.blue.700/90%)]",
      "[--btn-icon:theme(colors.blue.400)] data-[active]:[--btn-icon:theme(colors.blue.300)] data-[hover]:[--btn-icon:theme(colors.blue.300)]",
    ],
  },
};

export const Button = forwardRef(function Button(
  { color, outline, plain, className, children, ...props },
  ref
) {
  const classes = clsx(
    className,
    styles.base,
    outline
      ? styles.outline
      : plain
        ? styles.plain
        : clsx(styles.solid, styles.colors[color ?? "theme"])
  );

  return "href" in props ? (
    <Link {...props} className={classes} ref={ref}>
      <TouchTarget>{children}</TouchTarget>
    </Link>
  ) : (
    <Headless.Button {...props} className={clsx(classes, "cursor-pointer")} ref={ref}>
      <TouchTarget>{children}</TouchTarget>
    </Headless.Button>
  );
});

const TouchTarget = ({ children }) => {
  return (
    <>
      <span
        className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
        aria-hidden="true"
      />
      {children}
    </>
  );
};
