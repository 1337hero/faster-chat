import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { installRouteErrorHandler } from "./lib/errorHandler.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { chatsRouter } from "./routes/chats.js";
import { filesRouter } from "./routes/files.js";
import { modelsRouter } from "./routes/models.js";
import { providersRouter } from "./routes/providers.js";
import { settingsRouter } from "./routes/settings.js";
import { versionRouter } from "./routes/version.js";
import { imagesRouter } from "./routes/images.js";
import { importRouter } from "./routes/import.js";
import { foldersRouter } from "./routes/folders.js";
import { memoryRouter } from "./routes/memory.js";

const REQUEST_BODY_LIMIT_BYTES = 50 * 1024 * 1024;

export function createApp({ enableLogger = false } = {}) {
  const app = new Hono();

  installRouteErrorHandler(app);

  app.use("*", securityHeaders());
  if (enableLogger) {
    app.use("*", logger());
  }

  app.use(
    "/api/*",
    bodyLimit({
      maxSize: REQUEST_BODY_LIMIT_BYTES,
      onError: (c) => c.json({ error: "Request body too large" }, 413),
    })
  );

  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        if (process.env.NODE_ENV === "production") {
          const allowedOrigin = process.env.APP_URL;
          return origin === allowedOrigin ? origin : null;
        }
        if (!origin) {
          return null;
        }
        try {
          const url = new URL(origin);
          return url.hostname === "localhost" || url.hostname === "127.0.0.1" ? origin : null;
        } catch {
          return null;
        }
      },
      credentials: true,
    })
  );

  app.route("/api/auth", authRouter);
  app.route("/api/admin", adminRouter);
  app.route("/api/admin/providers", providersRouter);
  app.route("/api", modelsRouter);
  app.route("/api/files", filesRouter);
  app.route("/api/chats", chatsRouter);
  app.route("/api/settings", settingsRouter);
  app.route("/api/version", versionRouter);
  app.route("/api/images", imagesRouter);
  app.route("/api/import", importRouter);
  app.route("/api/folders", foldersRouter);
  app.route("/api/memory", memoryRouter);

  return app;
}
