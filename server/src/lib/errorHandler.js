import { z } from "zod";

export function handleRouteError(error, c) {
  if (error instanceof z.ZodError) {
    return c.json({ error: "Invalid input", details: error.issues }, 400);
  }

  console.error("Unhandled route error:", error);
  return c.json({ error: "Internal server error" }, 500);
}

export function installRouteErrorHandler(app) {
  app.onError(handleRouteError);
}
