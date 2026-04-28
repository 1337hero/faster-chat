import { extractErrorMessage } from "@/lib/errorHandler";

const ErrorBanner = ({ message, className = "" }) => {
  if (!message) {
    return null;
  }

  const text = extractErrorMessage(message);
  if (!text) {
    return null;
  }

  // Handle multiline messages (e.g., attachment issue with multiple details)
  const lines = text.split("\n");

  return (
    <div
      role="alert"
      className={`bg-theme-red/10 text-theme-red rounded-lg px-4 py-2 text-sm ${className}`}>
      {lines.length > 1 ? (
        <div className="font-mono whitespace-pre-wrap">
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ) : (
        text
      )}
    </div>
  );
};

export default ErrorBanner;
