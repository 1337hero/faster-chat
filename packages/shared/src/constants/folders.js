/**
 * Folder constants shared between frontend and backend
 */

export const FOLDER_CONSTANTS = {
  MAX_NAME_LENGTH: 50,
  DEFAULT_COLOR: "#6b7280",
  DEFAULT_POSITION: 0,
  ICON_BG_OPACITY: "20", // hex opacity (12.5%)
};

export const FOLDER_VALIDATION = {
  HEX_COLOR_REGEX: /^#[0-9A-Fa-f]{6}$/,
  HEX_COLOR_ERROR: "Color must be a valid hex color (e.g., #FF5733)",
};
