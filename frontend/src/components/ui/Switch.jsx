import { useId } from "preact/hooks";
import { clsx } from "clsx";

export const Switch = ({ color = "blue", value, label, onChange, disabled, ...props }) => {
  const id = useId();

  const onClickEvent = (event) => {
    event.preventDefault();
    if (disabled) return;
    if (onChange && typeof onChange === "function") {
      onChange(!value);
    }
  };

  const onKeyEvent = (event) => {
    if (event.code !== "Space" && event.code !== "Enter") {
      return;
    }

    event.preventDefault();
    if (disabled) return;
    if (onChange && typeof onChange === "function") {
      onChange(!value);
    }
  };

  return (
    <div
      id={id}
      onClick={onClickEvent}
      className={clsx("inline-flex items-center", {
        "cursor-not-allowed opacity-50": disabled,
      })}
      {...props}>
      <div
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyEvent}
        className={clsx(
          "switch-pseudo outline-latte-lavender dark:outline-macchiato-lavender relative inline-flex h-7 w-12 items-center overflow-hidden rounded-[20px] border-2 p-[2px] transition-colors",
          {
            "cursor-pointer": !disabled,
            "cursor-not-allowed": disabled,
            // Off state
            "border-latte-surface2 dark:border-macchiato-surface2": !value,
            // On state - different colors
            "border-latte-blue dark:border-macchiato-blue": value && color === "blue",
            "border-latte-lavender dark:border-macchiato-lavender": value && color === "lavender",
            "border-latte-green dark:border-macchiato-green": value && color === "green",
            "border-latte-red dark:border-macchiato-red": value && color === "red",
            active: value,
          }
        )}
        style={{
          color: value
            ? color === "blue"
              ? "var(--ctp-latte-blue, var(--ctp-macchiato-blue))"
              : color === "lavender"
                ? "var(--ctp-latte-lavender, var(--ctp-macchiato-lavender))"
                : color === "green"
                  ? "var(--ctp-latte-green, var(--ctp-macchiato-green))"
                  : "var(--ctp-latte-red, var(--ctp-macchiato-red))"
            : undefined,
        }}>
        <span
          className={clsx("relative z-10 h-full w-5 rounded-full transition-all duration-300", {
            "bg-latte-surface2 dark:bg-macchiato-surface2": !value,
            "bg-current": value,
            "translate-x-full": value,
          })}
        />
      </div>

      {label && (
        <label htmlFor={id} className="ml-2 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};
