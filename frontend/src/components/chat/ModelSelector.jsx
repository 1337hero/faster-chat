import { useEffect, useRef, useState } from "preact/hooks";
import { useQuery } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";
import { getProviderLogoUrl, getProviderBranding } from "@/lib/providerUtils";
import { ChevronDown } from "lucide-react";

const ModelSelector = ({ currentModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["models", "enabled"],
    queryFn: () => providersClient.getEnabledModels(),
    staleTime: 5 * 60 * 1000,
  });

  const models = data?.models || [];
  const currentModelData =
    models.find((m) => m.model_id === currentModel) ||
    models.find((m) => m.is_default) ||
    models[0];
  const currentProviderId =
    currentModelData?.provider_name || currentModelData?.provider?.toLowerCase();
  const currentBranding = getProviderBranding(currentProviderId);

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
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md ${
              currentBranding.className ||
              "from-latte-blue/10 to-latte-mauve/10 dark:from-macchiato-blue/20 dark:to-macchiato-mauve/20 bg-gradient-to-br"
            }`}
            style={currentBranding.style}>
            <img
              src={getProviderLogoUrl(currentProviderId)}
              alt={`${currentModelData.provider_display_name} logo`}
              className="h-3 w-3 dark:brightness-90 dark:invert"
              onError={(e) => {
                e.target.parentElement.style.display = "none";
              }}
            />
          </div>
          {currentModelData.display_name}
        </span>
        <ChevronDown
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="bg-latte-surface0 dark:bg-macchiato-surface0 border-latte-surface1 dark:border-macchiato-surface1 animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border duration-100"
          style={{ boxShadow: "var(--shadow-depth-lg)" }}>
          <div className="max-h-96 overflow-y-auto p-1">
            {models.map((model) => {
              const providerId = model.provider_name || model.provider?.toLowerCase();
              const branding = getProviderBranding(providerId);

              return (
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
                    <div className="text-latte-subtext0 dark:text-macchiato-subtext0 flex items-center gap-1.5 text-xs">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-md ${
                          branding.className ||
                          "from-latte-blue/10 to-latte-mauve/10 dark:from-macchiato-blue/20 dark:to-macchiato-mauve/20 bg-gradient-to-br"
                        }`}
                        style={branding.style}>
                        <img
                          src={getProviderLogoUrl(providerId)}
                          alt={`${model.provider_display_name} logo`}
                          className="h-2.5 w-2.5 dark:brightness-90 dark:invert"
                          onError={(e) => {
                            e.target.parentElement.style.display = "none";
                          }}
                        />
                      </div>
                      {model.provider_display_name}
                    </div>
                  </div>
                  {model.is_default && (
                    <span className="bg-latte-blue/20 dark:bg-macchiato-blue/20 text-latte-blue dark:text-macchiato-blue rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      Default
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
