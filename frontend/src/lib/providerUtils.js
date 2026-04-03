/**
 * Get the logo URL for a provider from models.dev
 * @param {string} providerId - The provider identifier (e.g., 'anthropic', 'openai')
 * @returns {string} The URL to the provider's logo SVG
 */
export function getProviderLogoUrl(providerId) {
  return `https://models.dev/logos/${providerId}.svg`;
}

// RGB tuples keyed by provider id for tinted logo backgrounds
export const providerBrandColors = {
  openai: [116, 170, 156],
  anthropic: [222, 115, 86],
  google: [66, 133, 244],
  mistral: [65, 33, 144],
  xai: [160, 103, 232],
  perplexity: [48, 85, 245],
  ollama: [33, 33, 33],
  deepseek: [78, 130, 238],
  cohere: [57, 95, 205],
  meta: [0, 102, 204],
  qwen: [97, 60, 230],
};

export function getProviderBranding(providerId) {
  const brandRgb = providerBrandColors[providerId];

  if (!brandRgb) {
    return { className: "", style: undefined };
  }

  return {
    className: "",
    style: {
      backgroundColor: `rgba(${brandRgb.join(",")}, 1)`,
    },
  };
}
