/**
 * App Settings Constants
 *
 * Centralized definition of app settings defaults and logo icons.
 * Used across frontend (CustomizeTab, Sidebar) and backend (validation).
 */

// Logo icon names in display order
export const LOGO_ICON_NAMES = [
  "Zap",
  "Rocket",
  "Sparkles",
  "Bot",
  "Cpu",
  "Terminal",
  "Code",
  "Braces",
  "MessageSquare",
  "MessagesSquare",
  "Send",
  "Mail",
  "AtSign",
  "Circle",
  "Square",
  "Triangle",
  "Hexagon",
  "Star",
  "Heart",
  "Diamond",
  "Flame",
  "Sun",
  "Moon",
  "Cloud",
  "Leaf",
  "Mountain",
  "Ghost",
  "Smile",
  "Trophy",
  "ChessKnight",
  "ChessQueen",
  "Atom", 
  "BadgeDollarSign", 
  "Bookmark", 
  "Cat",
  "Dog",
  "Fish",
  "Coffee",
  "Pizza",
  "IceCream",
  "Gem",
  "Command",
  "Hash",
  "Flag",
  "Pin",
  "Home",
  "Library",
  "Cherry",
  "Sprout", 
  "Sword"
];

// Default app settings
export const DEFAULT_APP_SETTINGS = {
  appName: "Faster Chat",
  logoIcon: "Zap",
};

/**
 * Normalize settings with defaults
 * @param {Object} settings - Raw settings from API or DB
 * @returns {Object} Settings with defaults applied
 */
export const normalizeAppSettings = (settings = {}) => ({
  appName: settings.appName || DEFAULT_APP_SETTINGS.appName,
  logoIcon: settings.logoIcon || DEFAULT_APP_SETTINGS.logoIcon,
});
