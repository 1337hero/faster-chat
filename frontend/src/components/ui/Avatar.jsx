import { clsx } from "clsx";

const borderVariants = {
  none: "border-0",
  visible: "border-2 border-theme-lavender",
};

const backgroundVariants = {
  strong: "bg-theme-canvas-strong",
  subtle: "bg-theme-canvas-alt",
  base: "bg-theme-canvas",
};

const sizeVariants = {
  small: "h-9 w-9 text-md",
  medium: "h-12 w-12 text-xl",
  large: "h-16 w-16 text-2xl",
};

export const Avatar = ({
  src,
  name,
  border = "visible",
  background = "subtle",
  size = "medium",
  ...props
}) => {
  let initial = null;
  let last = null;

  if (name) {
    const split = name.split(" ");
    initial = split[0]?.slice(0, 1);

    if (split.length > 1) {
      last = split[split.length - 1]?.slice(0, 1);
    }
  }

  return (
    <span
      className={clsx(
        borderVariants[border],
        backgroundVariants[background],
        sizeVariants[size],
        "text-theme-text relative inline-flex items-center justify-center rounded-full font-medium"
      )}
      {...props}>
      {src ? (
        <span
          className="absolute inset-0 rounded-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${src}')` }}
        />
      ) : (
        <span>
          {initial?.toUpperCase()}
          {last?.toUpperCase()}
        </span>
      )}
    </span>
  );
};
