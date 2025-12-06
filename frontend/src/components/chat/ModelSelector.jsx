import { providersClient } from "@/lib/providersClient";
import { CACHE_DURATIONS } from "@faster-chat/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "preact/hooks";
import ProviderLogo from "@/components/ui/ProviderLogo";

const ModelSelector = ({ currentModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["models", "text"],
    queryFn: () => providersClient.getEnabledModelsByType("text"),
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });

  const models = data?.models || [];
  const currentModelData =
    models.find((m) => m.model_id === currentModel) ||
    models.find((m) => m.is_default) ||
    models[0];
  const currentProviderId =
    currentModelData?.provider_name || currentModelData?.provider?.toLowerCase();

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
      <div className="bg-theme-surface rounded-xl px-3 py-2 text-sm">
        <span className="text-theme-text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-theme-surface hover:bg-theme-surface-strong border-theme-border hover:border-theme-primary/50 text-theme-text flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95">
        <span className="flex items-center gap-2">
          <ProviderLogo
            providerId={currentProviderId}
            displayName={currentModelData.provider_display_name}
            size="sm"
          />
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

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.model_id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    currentModel === model.model_id
                      ? "bg-theme-surface-strong"
                      : "hover:bg-theme-surface-strong/50"
                  }`}>
                  <div className="flex-1">
                    <div className="text-theme-text font-medium">{model.display_name}</div>
                    <div className="text-theme-text-muted flex items-center gap-1.5 text-xs">
                      <ProviderLogo
                        providerId={providerId}
                        displayName={model.provider_display_name}
                        size="xs"
                      />
                      {model.provider_display_name}
                    </div>
                  </div>
                  {model.is_default && (
                    <span className="bg-theme-blue/20 text-theme-blue rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
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
