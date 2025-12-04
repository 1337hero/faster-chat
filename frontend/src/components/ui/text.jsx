import { clsx } from "@/lib/clsx";
import { Link } from "./link";

export const Text = ({ className, ...props }) => {
  return (
    <p
      data-slot="text"
      {...props}
      className={clsx(className, "text-theme-text-muted text-base/6 sm:text-sm/6")}
    />
  );
};

export const TextLink = ({ className, ...props }) => {
  return (
    <Link
      {...props}
      className={clsx(
        className,
        "text-theme-text decoration-theme-text-muted/60 data-[hover]:decoration-theme-text underline"
      )}
    />
  );
};

export const Strong = ({ className, ...props }) => {
  return <strong {...props} className={clsx(className, "text-theme-text font-medium")} />;
};

export const Code = ({ className, ...props }) => {
  return (
    <code
      {...props}
      className={clsx(
        className,
        "sm:text/[0.8125rem] border-theme-overlay/20 bg-theme-surface/60 text-theme-text rounded border px-0.5 text-sm font-medium"
      )}
    />
  );
};
