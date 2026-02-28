import { extractErrorMessage } from "@/lib/errorHandler";

const ErrorBanner = ({ message, className = "" }) => {
  if (!message) return null;

  const text = extractErrorMessage(message);
  if (!text) return null;

  return (
    <div role="alert" className={`bg-theme-red/10 text-theme-red rounded-lg px-4 py-2 text-sm ${className}`}>
      {text}
    </div>
  );
};

export default ErrorBanner;
