import { z } from "zod";

export function handleRouteError(error, c) {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue?.message || "Invalid input";
    return c.json({ error: message, details: error.issues }, 400);
  }

  console.error("Unhandled route error:", error);
  return c.json({ error: "Internal server error" }, 500);
}

export function installRouteErrorHandler(app) {
  app.onError(handleRouteError);
}
