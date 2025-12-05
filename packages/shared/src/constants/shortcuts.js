/**
 * Keyboard Shortcuts
 *
 * Single source of truth for all keyboard shortcuts.
 * Used by both the implementation (useKeyboardShortcuts) and UI display (Settings).
 */

export const KEYBOARD_SHORTCUTS = [
  {
    id: "focusSearch",
    keys: ["Ctrl", "K"],
    label: "Search chats",
    check: (e) => e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "k",
  },
  {
    id: "newChat",
    keys: ["Ctrl", "Shift", "O"],
    label: "New chat",
    check: (e) => e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "o",
  },
  {
    id: "toggleSidebar",
    keys: ["Ctrl", "B"],
    label: "Toggle sidebar",
    check: (e) => e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "b",
  },
];

// Helper to find shortcut by ID
export const getShortcut = (id) => KEYBOARD_SHORTCUTS.find((s) => s.id === id);
