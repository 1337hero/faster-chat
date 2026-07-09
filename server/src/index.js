import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables
config();

import { createApp } from "./app.js";
import { initializeModelsDevCache } from "./lib/modelsdev.js";

const app = createApp({ enableLogger: true });

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = resolve(process.cwd(), "../frontend/dist");
  console.log(`Serving static files from ${distPath}`);
  app.use("/*", serveStatic({ root: distPath }));

  // Fallback to index.html for SPA routing
  app.get("*", serveStatic({ path: resolve(distPath, "index.html") }));
}

// Initialize models.dev cache
console.log("Initializing models.dev cache...");
initializeModelsDevCache()
  .then(() => {
    console.log("✓ Models.dev cache initialized");
  })
  .catch((error) => {
    console.warn("⚠ Failed to initialize models.dev cache:", error.message);
    console.warn("  Server will continue, but provider/model data may be limited");
  });

// Start server
const port = parseInt(process.env.PORT || "3001", 10);

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: (request, connInfo) => app.fetch(request, connInfo),
  port,
});
