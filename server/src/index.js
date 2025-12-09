import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { resolve } from "node:path";

// Load environment variables
config();

// Import routes
import { initializeModelsDevCache } from "./lib/modelsdev.js";
import { ensureSession } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { chatsRouter } from "./routes/chats.js";
import { filesRouter } from "./routes/files.js";
import { modelsRouter } from "./routes/models.js";
import { providersRouter } from "./routes/providers.js";
import { settingsRouter } from "./routes/settings.js";
import { imagesRouter } from "./routes/images.js";
import { importRouter } from "./routes/import.js";
import { foldersRouter } from "./routes/folders.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      // Allow localhost in development
      if (process.env.NODE_ENV !== "production") {
        return origin || "*";
      }
      // In production, only allow configured origin
      const allowedOrigin = process.env.APP_URL;
      return origin === allowedOrigin ? origin : null;
    },
    credentials: true,
  })
);

// Public auth routes
app.route("/api/auth", authRouter);

// Protected admin routes
app.route("/api/admin", adminRouter);
app.route("/api/admin/providers", providersRouter);

// Models routes (includes both public and admin)
app.route("/api", modelsRouter);

// Files routes (authentication handled in router)
app.route("/api/files", filesRouter);

// Chats routes (authentication handled in router)
app.route("/api/chats", chatsRouter);

// Settings routes (public GET, admin-only PUT)
app.route("/api/settings", settingsRouter);

// Images routes (image generation)
app.route("/api/images", imagesRouter);

// Import routes (conversation import from other platforms)
app.route("/api/import", importRouter);

// Folders routes (chat organization)
app.route("/api/folders", foldersRouter);

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
