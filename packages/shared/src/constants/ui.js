/**
 * UI Constants
 *
 * Central location for all magic numbers used throughout the UI.
 * Following DHH's principle: No magic numbers - name everything.
 */

export const UI_CONSTANTS = {
  // Input Area
  INPUT_MAX_HEIGHT: 240,

  // Chat Interface
  MESSAGE_LIST_PADDING_BOTTOM: 180,
  MESSAGE_LIST_PADDING_TOP: 16,
  CHAT_CONTAINER_MAX_WIDTH: "48rem", // max-w-3xl in Tailwind

  // Chat Management
  CHAT_TITLE_MAX_LENGTH: 50,
  CHAT_TITLE_ELLIPSIS: "...",

  // Sidebar
  SIDEBAR_WIDTH_MOBILE_PERCENT: "90%",
  SIDEBAR_WIDTH_DESKTOP_COLLAPSED: 80,
  SIDEBAR_WIDTH_DESKTOP_EXPANDED: 320,
  SIDEBAR_FOCUS_DELAY_MS: 100,

  // Breakpoints (matches Tailwind defaults)
  BREAKPOINT_MD: 768,
  BREAKPOINT_SM: 640,

  // Scrollbar
  SCROLLBAR_WIDTH: "0.25rem",

  // Feedback Durations
  SUCCESS_MESSAGE_DURATION_MS: 2000,
  COPY_FEEDBACK_DURATION_MS: 1500,

  // Form Inputs
  APP_NAME_MAX_LENGTH: 50,

  // Icon Picker
  ICON_PICKER_COLUMNS: 10,
};

// Semantic icon sizes for lucide-react (in pixels)
export const ICON_SIZE = {
  XS: 12,
  SM: 14,
  MD: 16,
  LG: 18,
  XL: 20,
  XXL: 24,
};
