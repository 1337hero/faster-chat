import { providersClient } from "@/lib/providersClient";
import { getProviderBranding, getProviderLogoUrl } from "@/lib/providerUtils";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "preact/hooks";

const ImageModelSelector = ({ currentModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["models", "image"],
    queryFn: () => providersClient.getEnabledModelsByType("image"),
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

  if (isLoading) {
    return (
      <div className="bg-theme-surface rounded-xl px-3 py-2 text-sm">
        <span className="text-theme-text-muted">Loading image models...</span>
      </div>
    );
  }

  if (models.length === 0 || !currentModelData) {
    return (
      <div className="bg-theme-pink/10 border-theme-pink/30 rounded-xl border px-3 py-2 text-sm">
        <span className="text-theme-pink">No image models - add Replicate or OpenRouter</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-theme-pink/10 border-theme-pink/30 hover:border-theme-pink text-theme-text flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95">
        <span className="flex items-center gap-2">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md ${
              currentBranding.className || "from-theme-blue/10 to-theme-mauve/10 bg-gradient-to-br"
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
        <div className="bg-theme-surface border-theme-surface-strong animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border shadow-lg duration-100">
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
                      ? "bg-theme-pink/20"
                      : "hover:bg-theme-surface-strong/50"
                  }`}>
                  <div className="flex-1">
                    <div className="text-theme-text font-medium">{model.display_name}</div>
                    <div className="text-theme-text-muted flex items-center gap-1.5 text-xs">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-md ${
                          branding.className ||
                          "from-theme-blue/10 to-theme-mauve/10 bg-gradient-to-br"
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
                    <span className="bg-theme-pink/20 text-theme-pink rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
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

export default ImageModelSelector;
