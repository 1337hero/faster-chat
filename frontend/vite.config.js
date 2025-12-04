import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    preact(),
    tailwindcss({
      config: {
        theme: {
          extend: {
            fontFamily: {
              mono: ["JetBrains Mono", "monospace"],
              sans: ["Sora", "sans-serif"],
            },
            transitionTimingFunction: {
              // T3 Chat's snappy easing - fast start, quick settle
              snappy: "cubic-bezier(.2, .4, .1, .95)",
            },
          },
        },
      },
    }),
  ],

  // Custom CSS Configuration
  css: {
    devSourcemap: true,
  },

  // Custom Alias and Extensions
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Map React to Preact for compatibility
      react: "@preact/compat",
      "react-dom": "@preact/compat",
      "react/jsx-runtime": "@preact/compat/jsx-runtime",
    },
    extensions: [".js", ".jsx"],
  },

  // Server Configuration
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["@preact/compat"],
  },
});
