import { X, ArrowUpRight } from "lucide-preact";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { useAuthState } from "@/state/useAuthState";

const UpdateBanner = () => {
  const user = useAuthState((state) => state.user);
  const { hasUpdate, latestVersion, releaseUrl, dismiss, isDismissed, isLoading } = useUpdateCheck();

  if (!user || user.role !== "admin" || isLoading || !hasUpdate || isDismissed) return null;

  return (
    <div className="bg-theme-primary/10 border-theme-primary/20 text-theme-primary flex items-center justify-between border-b px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">v{latestVersion} available</span>
        {releaseUrl && (
          <a
            href={releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-theme-primary/80 inline-flex items-center gap-1 underline underline-offset-2">
            Release Notes
            <ArrowUpRight size={14} />
          </a>
        )}
      </div>
      <button
        onClick={dismiss}
        className="hover:bg-theme-primary/10 ease-snappy rounded p-1 transition-colors duration-75"
        title="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
};

export default UpdateBanner;
