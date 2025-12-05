import { toast } from "sonner";

/**
 * Extract error message from various error formats
 */
export function extractErrorMessage(error) {
  if (!error) return "An unexpected error occurred.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    if (typeof error.message === "string") return error.message;
    if (typeof error.error === "string") return error.error;
    if (error.error && typeof error.error.message === "string") return error.error.message;
  }

  try {
    return String(error);
  } catch {
    return "An unexpected error occurred.";
  }
}

/**
 * Categorize error type for better UX
 */
function categorizeError(message) {
  if (!message) return "error";

  const msg = message.toLowerCase();
  if (msg.includes("network") || msg.includes("offline") || msg.includes("connection")) {
    return "network";
  }
  if (msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("auth")) {
    return "auth";
  }
  if (msg.includes("validation") || msg.includes("invalid")) {
    return "validation";
  }
  if (msg.includes("not found") || msg.includes("404")) {
    return "notfound";
  }
  if (msg.includes("timeout")) {
    return "timeout";
  }
  return "error";
}

/**
 * Show enhanced error toast with smart categorization and copy action
 * @param {string|Error|object} error - The error to display
 * @param {number} duration - Toast duration in ms (default: 4000)
 */
export function showErrorToast(error, duration = 4000) {
  const message = extractErrorMessage(error);
  const category = categorizeError(message);

  const copyAction = {
    label: "Copy",
    onClick: () => navigator.clipboard.writeText(message),
  };

  switch (category) {
    case "network":
      toast.error("Connection Error", {
        description: "Check your internet connection or verify the server is running.",
        duration,
        action: copyAction,
      });
      break;

    case "timeout":
      toast.error("Request Timeout", {
        description: "The request took too long. Try again.",
        duration,
        action: copyAction,
      });
      break;

    case "auth":
      toast.error("Authentication Error", {
        description: "Your session may have expired. Please log in again.",
        duration,
      });
      break;

    case "validation":
      toast.warning("Invalid Input", {
        description: message,
        duration,
      });
      break;

    case "notfound":
      toast.error("Not Found", {
        description: message,
        duration,
      });
      break;

    default:
      toast.error("Error", {
        description: message,
        duration,
        action: copyAction,
      });
  }
}
