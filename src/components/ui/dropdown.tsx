import * as Headless from "@headlessui/react";
import clsx from "clsx";
import type React from "react";
import { Link } from "./link";

export function Dropdown(props: Headless.MenuProps) {
  return <Headless.Menu {...props} />;
}

export function DropdownButton<T extends React.ElementType = "button">({
  as = "button",
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuButtonProps<T>, "className">) {
  return (
    <Headless.MenuButton
      as={as}
      {...props}
      className={clsx(
        className,
        "flex items-center justify-between px-2 py-2 text-sm font-medium text-macchiato-subtext0 transition-colors hover:bg-macchiato-overlay0/50 focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
      )}
    />
  );
}

export function DropdownMenu({
  anchor = "bottom",
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuItemsProps, "as" | "className">) {
  return (
    <Headless.MenuItems
      {...props}
      transition
      anchor={anchor}
      className={clsx(className, "bg-macchiato-overlay2 p-2 shadow-md")}
    />
  );
}

export function DropdownItem({
  className,
  ...props
}: { className?: string } & (
  | Omit<Headless.MenuItemProps<"button">, "as" | "className">
  | Omit<Headless.MenuItemProps<typeof Link>, "as" | "className">
)) {
  const classes = clsx(
    className,
    // Base styles
    "block px-4 py-2 text-sm text-surface1 hover:bg-neutral-800/40"
  );

  return "href" in props ? (
    <Headless.MenuItem as={Link} {...props} className={classes} />
  ) : (
    <Headless.MenuItem as="button" type="button" {...props} className={classes} />
  );
}
