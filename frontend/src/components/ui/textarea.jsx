import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { forwardRef } from "@preact/compat";

export const Textarea = forwardRef(function Textarea(
  { className, resizable = true, ...props },
  ref
) {
  return (
    <Headless.Textarea
      ref={ref}
      {...props}
      className={clsx([
        className,
        "text-theme-text w-full resize-none bg-transparent text-base leading-6 outline-none disabled:opacity-50",
        resizable ? "resize-y" : "resize-none",
      ])}
    />
  );
});
