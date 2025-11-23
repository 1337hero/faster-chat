import { useId } from "preact/hooks";
import { clsx } from "clsx";

export const Radio = ({ color = "blue", label, disabled = false, ...props }) => {
  const id = useId();

  return (
    <div className="inline-flex items-center">
      <input
        type="radio"
        id={id}
        className={clsx(
          "radio-after inline-flex h-7 w-7 cursor-pointer appearance-none items-center justify-center rounded-full border-2 transition-colors",
          "bg-latte-surface0/40 dark:bg-macchiato-surface0/40",
          "border-latte-surface2 dark:border-macchiato-surface2",
          "checked:bg-latte-surface1/70 dark:checked:bg-macchiato-surface1/70",
          "outline-latte-lavender dark:outline-macchiato-lavender",
          "disabled:cursor-not-allowed disabled:opacity-60",
          {
            // Color variants when checked
            "checked:border-latte-blue dark:checked:border-macchiato-blue": color === "blue",
            "checked:border-latte-lavender dark:checked:border-macchiato-lavender":
              color === "lavender",
            "checked:border-latte-green dark:checked:border-macchiato-green": color === "green",
            "checked:border-latte-red dark:checked:border-macchiato-red": color === "red",
          }
        )}
        style={{
          "--radio-color":
            color === "blue"
              ? "var(--ctp-latte-blue, var(--ctp-macchiato-blue))"
              : color === "lavender"
                ? "var(--ctp-latte-lavender, var(--ctp-macchiato-lavender))"
                : color === "green"
                  ? "var(--ctp-latte-green, var(--ctp-macchiato-green))"
                  : "var(--ctp-latte-red, var(--ctp-macchiato-red))",
        }}
        disabled={disabled}
        {...props}
      />

      {label && (
        <label htmlFor={id} className="ml-2 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};
