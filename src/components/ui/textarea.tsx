import * as Headless from "@headlessui/react";
import clsx from "clsx";
import React, { forwardRef } from "react";

export const Textarea = forwardRef(function Textarea(
  {
    className,
    resizable = true,
    ...props
  }: { className?: string; resizable?: boolean } & Omit<Headless.TextareaProps, "as" | "className">,
  ref: React.ForwardedRef<HTMLTextAreaElement>
) {
  return (
    <Headless.Textarea
      ref={ref}
      {...props}
      className={clsx([
        className,
        "w-full resize-none bg-transparent text-base leading-6 text-neutral-100 outline-none disabled:opacity-0",
        resizable ? "resize-y" : "resize-none",
      ])}
    />
  );
});
