const ErrorBanner = ({ message, className = "" }) => {
  if (!message) return null;

  return (
    <div
      className={`bg-latte-red/10 dark:bg-macchiato-red/10 text-latte-red dark:text-macchiato-red rounded-lg px-4 py-2 text-sm ${className}`}>
      {message}
    </div>
  );
};

export default ErrorBanner;
