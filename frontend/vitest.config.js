import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: "@preact/compat",
      "react-dom": "@preact/compat",
      "react/jsx-runtime": "@preact/compat/jsx-runtime",
    },
    extensions: [".js", ".jsx"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx}"],
  },
});
