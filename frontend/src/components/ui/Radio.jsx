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
          "bg-theme-surface/40",
          "border-theme-surface-stronger",
          "checked:bg-theme-surface-strong/70",
          "outline-theme-lavender",
          "disabled:cursor-not-allowed disabled:opacity-60",
          {
            // Color variants when checked
            "checked:border-theme-blue": color === "blue",
            "checked:border-theme-lavender": color === "lavender",
            "checked:border-theme-green": color === "green",
            "checked:border-theme-red": color === "red",
          }
        )}
        style={{
          "--radio-color":
            color === "blue"
              ? "var(--theme-blue)"
              : color === "lavender"
                ? "var(--theme-lavender)"
                : color === "green"
                  ? "var(--theme-green)"
                  : "var(--theme-red)",
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
