import { MapPin, BadgeCheck, Users } from "lucide-preact";
import { categorizeProvider } from "@faster-chat/shared";

const BADGE_CONFIGS = {
  "openai-compatible": {
    colors: "bg-theme-green/10 text-theme-green",
    Icon: MapPin,
    label: "OpenAI Compatible",
  },
  local: {
    colors: "bg-theme-green/10 text-theme-green",
    Icon: MapPin,
    label: "Local",
  },
  official: {
    colors: "bg-theme-blue/10 text-theme-blue",
    Icon: BadgeCheck,
    label: "Official",
  },
  community: {
    colors: "bg-theme-mauve/10 text-theme-mauve",
    Icon: Users,
    label: "Community",
  },
};

/**
 * Resolve the badge type from provider data
 */
function resolveBadgeType(provider) {
  // Use explicit type/category from provider data
  if (provider.type) return provider.type;
  if (provider.category) return provider.category;

  // Fall back to ID-based categorization
  return categorizeProvider(provider.id || provider.name || "");
}

/**
 * ProviderBadge - Display a badge indicating provider type
 * @param {object} provider - Provider object with type, category, id, or name
 * @param {boolean} showLabel - Whether to show the label text (default: true)
 * @param {string} labelOverride - Optional label to override the default
 */
const ProviderBadge = ({ provider, showLabel = true, labelOverride }) => {
  const badgeType = resolveBadgeType(provider);
  const config = BADGE_CONFIGS[badgeType] || BADGE_CONFIGS.community;
  const { colors, Icon } = config;

  // Determine label: "Native SDK" for official with .type, otherwise default
  const label =
    labelOverride ??
    (provider.id === "openrouter"
      ? "OpenRouter API"
      : badgeType === "official" && provider.type
        ? "Native SDK"
        : config.label);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${colors}`}>
      <Icon className="h-3 w-3" />
      {showLabel && label}
    </span>
  );
};

export default ProviderBadge;
