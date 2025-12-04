const ErrorBanner = ({ message, className = "" }) => {
  if (!message) return null;

  return (
    <div className={`bg-theme-red/10 text-theme-red rounded-lg px-4 py-2 text-sm ${className}`}>
      {message}
    </div>
  );
};

export default ErrorBanner;
