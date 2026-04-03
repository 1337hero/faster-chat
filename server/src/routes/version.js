import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf-8")
);

export const versionRouter = new Hono();

versionRouter.get("/", (c) => c.json({ version: pkg.version }));
