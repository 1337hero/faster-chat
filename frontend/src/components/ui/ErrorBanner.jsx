import { extractErrorMessage } from "@/lib/errorHandler";
import { XCircle } from "lucide-preact";

const ErrorBanner = ({ message, className = "", onDismiss }) => {
  if (!message) return null;

  const text = extractErrorMessage(message);
  if (!text) return null;

  return (
    <div
      role="alert"
      className={`bg-theme-red/10 text-theme-red rounded-lg px-4 py-3 text-sm ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-medium">Something went wrong</p>
          <p className="text-theme-red/80 mt-1">{text}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-theme-red/60 hover:text-theme-red flex-shrink-0 cursor-pointer transition-colors"
            aria-label="Dismiss error">
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorBanner;
