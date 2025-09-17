import * as Headless from "@headlessui/react";
import { clsx } from '@/lib/clsx';
import { forwardRef } from '@preact/compat';

export const Textarea = forwardRef(function Textarea(
  {
    className,
    resizable = true,
    ...props
  },
  ref
) {
  return (
    <Headless.Textarea
      ref={ref}
      {...props}
      className={clsx([
        className,
        "w-full resize-none bg-transparent text-base leading-6 text-latte-text dark:text-macchiato-text outline-none disabled:opacity-0",
        resizable ? "resize-y" : "resize-none",
      ])}
    />
  );
});
