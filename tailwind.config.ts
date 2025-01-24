import type { Config } from "tailwindcss";

const colors = {
  // Catppuccin Macchiato palette
  macchiato: {
    rosewater: "#f4dbd6",
    flamingo: "#f0c6c6", 
    pink: "#f5bde6",
    mauve: "#c6a0f6",
    red: "#ed8796",
    maroon: "#ee99a0",
    peach: "#f5a97f", 
    yellow: "#eed49f",
    green: "#a6da95",
    teal: "#8bd5ca",
    sky: "#91d7e3",
    sapphire: "#7dc4e4",
    blue: "#8aadf4",
    lavender: "#b7bdf8",
    text: "#cad3f5",
    subtext1: "#b8c0e0",
    subtext0: "#a5adcb",
    overlay2: "#939ab7",
    overlay1: "#8087a2",
    overlay0: "#6e738d",
    surface2: "#5b6078",
    surface1: "#494d64",
    surface0: "#363a4f",
    base: "#24273a",
    mantle: "#1e2030",
    crust: "#181926",
  }
};

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-bricolage)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Add Catppuccin colors
        ...colors,
        // Map semantic colors to Catppuccin
        background: colors.macchiato.base,
        foreground: colors.macchiato.text,
        primary: colors.macchiato.mauve,
        secondary: colors.macchiato.surface0,
        accent: colors.macchiato.pink,
        muted: colors.macchiato.overlay0,
        border: colors.macchiato.surface2,
      },
      scrollbar: {
        width: '2px',
        track: 'transparent',
        thumb: {
          backgroundColor: 'rgb(55, 65, 81)',
          hover: {
            backgroundColor: 'rgb(75, 85, 99)',
          },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
} satisfies Config;
