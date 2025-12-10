/**
 * Folder constants shared between frontend and backend
 */

export const FOLDER_CONSTANTS = {
  MAX_NAME_LENGTH: 50,
  DEFAULT_COLOR: "#6b7280",
  DEFAULT_POSITION: 0,
  ICON_BG_OPACITY: "20", // hex opacity (12.5%)
};

export const FOLDER_COLORS = [
  "#6b7280", // gray
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export const FOLDER_VALIDATION = {
  HEX_COLOR_REGEX: /^#[0-9A-Fa-f]{6}$/,
  HEX_COLOR_ERROR: "Color must be a valid hex color (e.g., #FF5733)",
};
