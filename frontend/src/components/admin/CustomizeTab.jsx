import { useState } from "preact/hooks";
import * as LucideIcons from "lucide-react";
import { Check, ChevronRight, RotateCcw, Zap } from "lucide-react";
import { useAppSettings } from "@/state/useAppSettings";
import { Button } from "@/components/ui/button";
import { LOGO_ICON_NAMES, UI_CONSTANTS, ICON_SIZE } from "@faster-chat/shared";

// Build icon map from shared names
const LOGO_ICONS = LOGO_ICON_NAMES.reduce((acc, name) => {
  acc[name] = LucideIcons[name];
  return acc;
}, {});

const CustomizeTab = () => {
  const appName = useAppSettings((state) => state.appName);
  const logoIcon = useAppSettings((state) => state.logoIcon);
  const isFetching = useAppSettings((state) => state.isFetching);
  const isSaving = useAppSettings((state) => state.isSaving);
  const updateSettings = useAppSettings((state) => state.updateSettings);
  const [localAppName, setLocalAppName] = useState(() => appName);
  const [localLogoIcon, setLocalLogoIcon] = useState(() => logoIcon);
  const [saveStatus, setSaveStatus] = useState(null);

  const hasUnsavedChanges = localAppName !== appName || localLogoIcon !== logoIcon;

  const handleSave = async () => {
    setSaveStatus(null);
    const result = await updateSettings({ appName: localAppName, logoIcon: localLogoIcon });
    if (result.success) {
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), UI_CONSTANTS.SUCCESS_MESSAGE_DURATION_MS);
    } else {
      setSaveStatus("error");
    }
  };

  const handleReset = () => {
    setLocalAppName(appName);
    setLocalLogoIcon(logoIcon);
    setSaveStatus(null);
  };

  const SelectedIcon = LOGO_ICONS[localLogoIcon] || Zap;

  return (
    <div className="flex h-full flex-col">
      <div className="border-theme-surface flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-theme-text text-lg font-semibold">Customize</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl space-y-8">
          <section>
            <h3 className="text-theme-text mb-1 text-sm font-semibold">Branding</h3>
            <p className="text-theme-text-muted mb-4 text-sm">
              Customize how your application appears to users.
            </p>

            <div className="bg-theme-canvas-alt border-theme-surface space-y-4 rounded-lg border p-4">
              <div>
                <label htmlFor="appName" className="text-theme-text mb-2 block text-sm font-medium">
                  Application Name
                </label>
                <input
                  id="appName"
                  type="text"
                  value={localAppName}
                  onInput={(e) => setLocalAppName(e.target.value)}
                  placeholder="Faster Chat"
                  maxLength={UI_CONSTANTS.APP_NAME_MAX_LENGTH}
                  className="border-theme-surface-strong bg-theme-canvas text-theme-text placeholder-theme-text-muted focus:border-theme-blue w-full rounded-lg border px-4 py-2 text-sm focus:outline-none"
                />
                <p className="text-theme-text-muted mt-1 text-xs">
                  This name appears in the sidebar header and browser tab.
                </p>
              </div>

              <div>
                <label className="text-theme-text mb-2 block text-sm font-medium">Logo Icon</label>
                <div className="mb-3 flex items-center gap-3">
                  <div className="bg-theme-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg shadow-lg">
                    <SelectedIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-theme-text-muted flex items-center gap-1 text-sm">
                    <ChevronRight size={ICON_SIZE.SM} />
                    <span>Select an icon below</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-2">
                  {LOGO_ICON_NAMES.map((iconName) => {
                    const Icon = LOGO_ICONS[iconName];
                    const isSelected = localLogoIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setLocalLogoIcon(iconName)}
                        title={iconName}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                          isSelected
                            ? "border-theme-primary bg-theme-primary/10 text-theme-primary"
                            : "border-theme-surface-strong bg-theme-canvas text-theme-text-muted hover:border-theme-primary/50 hover:text-theme-text"
                        }`}>
                        <Icon size={ICON_SIZE.LG} />
                      </button>
                    );
                  })}
                </div>
                <p className="text-theme-text-muted mt-2 text-xs">
                  This icon appears in the sidebar logo.
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving || isFetching} color="blue">
              {isSaving ? (
                "Saving..."
              ) : saveStatus === "success" ? (
                <>
                  <Check size={ICON_SIZE.MD} className="mr-1" />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </Button>

            {hasUnsavedChanges && (
              <Button onClick={handleReset} color="plain">
                <RotateCcw size={ICON_SIZE.MD} className="mr-1" />
                Reset
              </Button>
            )}

            {saveStatus === "error" && (
              <span className="text-theme-red text-sm">Failed to save. Please try again.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizeTab;
