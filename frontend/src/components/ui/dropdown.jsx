import * as Headless from "@headlessui/react";
import { clsx } from "@/lib/clsx";
import { Link } from "./link";

export const Dropdown = (props) => <Headless.Menu {...props} />;

export const DropdownButton = ({ as = "button", className, ...props }) => {
  return (
    <Headless.MenuButton
      as={as}
      {...props}
      className={clsx(
        className,
        "text-theme-text-muted hover:bg-theme-overlay/50 flex items-center justify-between px-2 py-2 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      )}
    />
  );
};

export const DropdownMenu = ({ anchor = "bottom", className, ...props }) => {
  return (
    <Headless.MenuItems
      {...props}
      transition
      anchor={anchor}
      className={clsx(className, "bg-theme-overlay-strong p-2 shadow-md")}
    />
  );
};

export const DropdownItem = ({ className, ...props }) => {
  const classes = clsx(
    className,
    // Base styles
    "block px-4 py-2 text-sm text-theme-text hover:bg-theme-surface-strong"
  );

  return "href" in props ? (
    <Headless.MenuItem as={Link} {...props} className={classes} />
  ) : (
    <Headless.MenuItem as="button" type="button" {...props} className={classes} />
  );
};
