import { getProviderLogoUrl, getProviderBranding } from "@/lib/providerUtils";

const SIZES = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const ICON_SIZES = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

/**
 * ProviderLogo - Display a provider's logo with branded background
 * @param {string} providerId - The provider identifier (e.g., 'anthropic', 'openai')
 * @param {string} displayName - Display name for alt text
 * @param {"xs"|"sm"|"md"|"lg"} size - Size variant (default: "md")
 * @param {string} className - Additional classes for the container
 */
const ProviderLogo = ({ providerId, displayName, size = "md", className = "" }) => {
  const branding = getProviderBranding(providerId);
  const logoUrl = getProviderLogoUrl(providerId);

  return (
    <div
      className={`flex items-center justify-center rounded-md ${
        branding.className || "from-theme-blue/10 to-theme-mauve/10 bg-gradient-to-br"
      } ${SIZES[size]} ${className}`}
      style={branding.style}>
      <img
        src={logoUrl}
        alt={`${displayName || providerId} logo`}
        className={`${ICON_SIZES[size]} dark:brightness-90 dark:invert`}
        onError={(e) => {
          e.target.parentElement.style.display = "none";
        }}
      />
    </div>
  );
};

export default ProviderLogo;
