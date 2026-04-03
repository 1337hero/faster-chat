import { Globe, Link2 } from "lucide-preact";

const TOOL_STATUS = {
  webSearch: {
    Icon: Globe,
    color: "text-theme-green",
    label: "Searching the web",
  },
  fetchUrl: {
    Icon: Link2,
    color: "text-theme-blue",
    getLabel: (args) => {
      try {
        return `Reading ${new URL(args?.url).hostname}`;
      } catch {
        return "Reading page";
      }
    },
  },
};

export default function SearchStatus({ toolName, args }) {
  const config = TOOL_STATUS[toolName];
  if (!config) return null;

  const Icon = config.Icon;
  const label = config.getLabel ? config.getLabel(args) : config.label;
  const color = config.color;

  return (
    <div className={`${color} mt-3 flex transform-gpu items-center gap-2`}>
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute h-full w-full transform-gpu animate-ping rounded-full bg-current opacity-30" />
        <Icon className="relative h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-medium">{label}</span>
      <span className="flex items-center gap-0.5">
        <span
          className="h-1 w-1 transform-gpu animate-bounce rounded-full bg-current"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1 w-1 transform-gpu animate-bounce rounded-full bg-current"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1 w-1 transform-gpu animate-bounce rounded-full bg-current"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  );
}
