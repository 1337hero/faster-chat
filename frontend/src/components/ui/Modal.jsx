import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

const Modal = ({ isOpen, onClose, title, children }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="bg-theme-overlay/40 fixed inset-0 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-theme-canvas w-full max-w-md rounded-lg p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-theme-text text-xl font-semibold">{title}</DialogTitle>
            <button
              onClick={onClose}
              aria-label="Close"
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

          <div>{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default Modal;
