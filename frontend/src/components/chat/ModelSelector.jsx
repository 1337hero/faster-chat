import { providersClient } from "@/lib/providersClient";
import { CACHE_DURATIONS } from "@faster-chat/shared";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-preact";
import ProviderLogo from "@/components/ui/ProviderLogo";

const VARIANTS = {
  text: {
    queryKey: ["models", "text"],
    buttonClass: "bg-theme-surface hover:bg-theme-surface-strong border-theme-border hover:border-theme-primary/50",
    activeItemClass: "bg-theme-surface-strong",
    badgeClass: "bg-theme-blue/20 text-theme-blue",
    emptyWrapClass: "",
    emptyTextClass: "",
  },
  image: {
    queryKey: ["models", "image"],
    buttonClass: "bg-theme-pink/10 border-theme-pink/30 hover:border-theme-pink",
    activeItemClass: "bg-theme-pink/20",
    badgeClass: "bg-theme-pink/20 text-theme-pink",
    emptyWrapClass: "bg-theme-pink/10 border-theme-pink/30",
    emptyTextClass: "text-theme-pink",
  },
};

const ModelSelector = ({ type = "text", currentModel, onModelChange }) => {
  const variant = VARIANTS[type];

  const { data, isLoading } = useQuery({
    queryKey: variant.queryKey,
    queryFn: () => providersClient.getEnabledModelsByType(type),
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });

  const models = data?.models || [];
  const currentModelData =
    models.find((m) => m.model_id === currentModel) ||
    models.find((m) => m.is_default) ||
    models[0];
  const currentProviderId =
    currentModelData?.provider_name || currentModelData?.provider?.toLowerCase();

  if (isLoading) {
    return (
      <div className="bg-theme-surface rounded-xl px-3 py-2 text-sm">
        <span className="text-theme-text-muted">Loading...</span>
      </div>
    );
  }

  if (type === "image" && (models.length === 0 || !currentModelData)) {
    return (
      <div className={`${variant.emptyWrapClass} rounded-xl border px-3 py-2 text-sm`}>
        <span className={variant.emptyTextClass}>
          No image models - add Replicate or OpenRouter
        </span>
      </div>
    );
  }

  if (!currentModelData) {
    return (
      <div className="bg-theme-surface rounded-xl px-3 py-2 text-sm">
        <span className="text-theme-text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={`${variant.buttonClass} text-theme-text flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95`}>
        <span className="flex items-center gap-2">
          <ProviderLogo
            providerId={currentProviderId}
            displayName={currentModelData.provider_display_name}
            size="sm"
          />
          {currentModelData.display_name}
        </span>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
      </MenuButton>

      <MenuItems className="bg-theme-surface border-theme-surface-strong animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border shadow-lg duration-100">
        <div className="max-h-96 overflow-y-auto p-1">
          {models.map((model) => {
            const providerId = model.provider_name || model.provider?.toLowerCase();
            const isActive = currentModel === model.model_id;

            return (
              <MenuItem key={model.id} as="button"
                onClick={() => onModelChange(model.model_id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? variant.activeItemClass
                    : "hover:bg-theme-surface-strong/50 data-[focus]:bg-theme-surface-strong/50"
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
                  <span className={`${variant.badgeClass} rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase`}>
                    Default
                  </span>
                )}
              </MenuItem>
            );
          })}
        </div>
      </MenuItems>
    </Menu>
  );
};

export default ModelSelector;
