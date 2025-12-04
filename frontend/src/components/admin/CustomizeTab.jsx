import { useState } from "preact/hooks";
import { useAppSettings } from "@/state/useAppSettings";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";

const CustomizeTab = () => {
  const appName = useAppSettings((state) => state.appName);
  const isLoading = useAppSettings((state) => state.isLoading);
  const updateSettings = useAppSettings((state) => state.updateSettings);
  const [localAppName, setLocalAppName] = useState(appName);
  const [saveStatus, setSaveStatus] = useState(null);

  const hasChanges = localAppName !== appName;

  const handleSave = async () => {
    setSaveStatus(null);
    const result = await updateSettings({ appName: localAppName });
    if (result.success) {
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 2000);
    } else {
      setSaveStatus("error");
    }
  };

  const handleReset = () => {
    setLocalAppName(appName);
    setSaveStatus(null);
  };

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
                  maxLength={50}
                  className="border-theme-surface-strong bg-theme-canvas text-theme-text placeholder-theme-text-muted focus:border-theme-blue w-full rounded-lg border px-4 py-2 text-sm focus:outline-none"
                />
                <p className="text-theme-text-muted mt-1 text-xs">
                  This name appears in the sidebar header and browser tab.
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!hasChanges || isLoading} color="blue">
              {isLoading ? (
                "Saving..."
              ) : saveStatus === "success" ? (
                <>
                  <Check size={16} className="mr-1" />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </Button>

            {hasChanges && (
              <Button onClick={handleReset} color="plain">
                <RotateCcw size={16} className="mr-1" />
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
