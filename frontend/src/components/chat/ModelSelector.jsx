import { useEffect, useRef, useState } from "preact/hooks";
import { useQuery } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";

const ZapIcon = ({ className, size = 14 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
};

const ChevronDownIcon = ({ className, size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
};

const ModelSelector = ({ currentModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["models", "enabled"],
    queryFn: () => providersClient.getEnabledModels(),
    staleTime: 5 * 60 * 1000,
  });

  const models = data?.models || [];
  const currentModelData = models.find((m) => m.model_id === currentModel) || models.find((m) => m.is_default) || models[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading || !currentModelData) {
    return (
      <div className="bg-latte-surface0 dark:bg-macchiato-surface0 rounded-xl px-3 py-2 text-sm">
        <span className="text-latte-subtext0 dark:text-macchiato-subtext0">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-latte-surface0 hover:bg-latte-surface1 dark:bg-macchiato-surface0 dark:hover:bg-macchiato-surface1 text-latte-text dark:text-macchiato-text flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ boxShadow: "var(--shadow-depth-sm)" }}>
        <span className="flex items-center gap-2">
          <ZapIcon className="text-latte-mauve dark:text-macchiato-mauve" size={14} />
          {currentModelData.display_name}
        </span>
        <ChevronDownIcon
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="bg-latte-surface0 dark:bg-macchiato-surface0 border-latte-surface1 dark:border-macchiato-surface1 animate-in fade-in zoom-in-95 absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border duration-100"
          style={{ boxShadow: "var(--shadow-depth-lg)" }}>
          <div className="max-h-96 overflow-y-auto p-1">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.model_id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  currentModel === model.model_id
                    ? "bg-latte-surface1 dark:bg-macchiato-surface1"
                    : "hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50"
                }`}>
                <div className="flex-1">
                  <div className="text-latte-text dark:text-macchiato-text font-medium">
                    {model.display_name}
                  </div>
                  <div className="text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
                    {model.provider_display_name}
                  </div>
                </div>
                {model.is_default && (
                  <span className="rounded bg-latte-blue/20 dark:bg-macchiato-blue/20 text-latte-blue dark:text-macchiato-blue px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
