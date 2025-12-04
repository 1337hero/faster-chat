const ErrorBanner = ({ message, className = "" }) => {
  if (!message) return null;

  const getMessageText = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Error && typeof value.message === "string") return value.message;
    if (typeof value === "object") {
      if (typeof value.message === "string") return value.message;
      if (typeof value.error === "string") return value.error;
      if (value.error && typeof value.error.message === "string") return value.error.message;
    }

    try {
      return String(value);
    } catch {
      return "An unexpected error occurred.";
    }
  };

  const text = getMessageText(message);
  if (!text) return null;

  return (
    <div className={`bg-theme-red/10 text-theme-red rounded-lg px-4 py-2 text-sm ${className}`}>
      {text}
    </div>
  );
};

export default ErrorBanner;
