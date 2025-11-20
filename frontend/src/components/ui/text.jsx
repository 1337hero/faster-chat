import { clsx } from "@/lib/clsx";
import { Link } from "./link";

export const Text = ({ className, ...props }) => {
  return (
    <p
      data-slot="text"
      {...props}
      className={clsx(className, "text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400")}
    />
  );
};

export const TextLink = ({ className, ...props }) => {
  return (
    <Link
      {...props}
      className={clsx(
        className,
        "text-zinc-950 underline decoration-zinc-950/50 data-[hover]:decoration-zinc-950 dark:text-white dark:decoration-white/50 dark:data-[hover]:decoration-white"
      )}
    />
  );
};

export const Strong = ({ className, ...props }) => {
  return (
    <strong {...props} className={clsx(className, "font-medium text-zinc-950 dark:text-white")} />
  );
};

export const Code = ({ className, ...props }) => {
  return (
    <code
      {...props}
      className={clsx(
        className,
        "sm:text/[0.8125rem] rounded border border-zinc-950/10 bg-zinc-950/[2.5%] px-0.5 text-sm font-medium text-zinc-950 dark:border-white/20 dark:bg-white/5 dark:text-white"
      )}
    />
  );
};
