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

  // Breakpoints (matches Tailwind defaults)
  BREAKPOINT_MD: 768,
  BREAKPOINT_SM: 640,

  // Scrollbar
  SCROLLBAR_WIDTH: "0.25rem",
};
