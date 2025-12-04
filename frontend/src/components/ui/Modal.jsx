import { useEffect } from "preact/hooks";

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="bg-theme-overlay/40 absolute inset-0 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="bg-theme-canvas relative z-10 w-full max-w-md rounded-lg p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-theme-text text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded-lg p-1">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
