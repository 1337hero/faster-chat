// Lazy-loaded Shiki highlighter to avoid blocking app load

let highlighterPromise = null;
let highlighterFailed = false;

// Pre-load common/modern languages - others load on-demand
const PRELOADED_LANGS = [
  // Web
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "sass",
  "less",
  "jsonc",
  "json",
  "markdown",
  // Backend
  "python",
  "ruby",
  "php",
  "java",
  "kotlin",
  "csharp",
  "go",
  "rust",
  "zig",
  "c",
  "cpp",
  "swift",
  // Shell/Config
  "bash",
  "shell",
  "powershell",
  "dockerfile",
  "yaml",
  "toml",
  "ini",
  // Data/Query
  "sql",
  "graphql",
  // Other
  "lua",
  "r",
  "scala",
  "elixir",
  "haskell",
  "ocaml",
];

// TODO: Align with app theme system when implementing code block theme selector
// See roadmap.md "Syntax highlighting theme selector" - Shiki has matching themes
// for catppuccin, nord, dracula, tokyo-night, etc. that could sync with useThemeStore
const THEMES = {
  light: "github-light",
  dark: "github-dark",
};

/**
 * Resolve language - loads on-demand if not pre-loaded.
 */
async function resolveLanguage(highlighter, lang) {
  if (!lang) return "plaintext";

  const normalizedLang = lang.toLowerCase();
  const loadedLangs = highlighter.getLoadedLanguages();

  if (loadedLangs.includes(normalizedLang)) {
    return normalizedLang;
  }

  // Try to load dynamically (covers languages not in PRELOADED_LANGS)
  try {
    await highlighter.loadLanguage(normalizedLang);
    return normalizedLang;
  } catch {
    // Language doesn't exist in Shiki, use plaintext
    return "plaintext";
  }
}

/**
 * Lazily create the highlighter on first use.
 * Pre-loads common languages; others load on-demand.
 */
async function getHighlighter() {
  if (highlighterFailed) return null;

  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      try {
        const { createHighlighter } = await import("shiki");
        return await createHighlighter({
          themes: [THEMES.light, THEMES.dark],
          langs: PRELOADED_LANGS,
        });
      } catch (err) {
        console.error("Failed to create Shiki highlighter:", err);
        highlighterFailed = true;
        return null;
      }
    })();
  }
  return highlighterPromise;
}

/**
 * Highlight code with dual-theme CSS variables.
 * Returns HTML string that responds to .dark class on documentElement.
 * Returns null if highlighting fails (caller should show fallback).
 */
export async function highlightCode(code, lang = "") {
  try {
    const highlighter = await getHighlighter();
    if (!highlighter) return null;

    const resolvedLang = await resolveLanguage(highlighter, lang);

    return highlighter.codeToHtml(code, {
      lang: resolvedLang,
      themes: THEMES,
      defaultColor: false,
    });
  } catch (err) {
    console.error("Shiki highlight error:", err);
    return null;
  }
}
