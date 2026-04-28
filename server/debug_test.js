import { describe, it, expect, beforeAll } from "bun:test";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

const FILE_CONFIG = {
  UPLOAD_DIR: "/home/mikekey/Builds/FasterChat/app/server/data/uploads"
};

describe("debug", () => {
  let uploadDir;

  beforeAll(async () => {
    console.log("BEFORE ALL running...");
    uploadDir = FILE_CONFIG.UPLOAD_DIR;
    console.log("UPLOAD_DIR:", uploadDir);
    await mkdir(uploadDir, { recursive: true });
    console.log("Directory created");
    
    const filePath = path.join(uploadDir, "debug-test.html");
    console.log("Writing file to:", filePath);
    await writeFile(filePath, Buffer.from("<html>test</html>"));
    console.log("File written");
  });

  it("should pass", async () => {
    console.log("IT running...");
    const { readFile } = await import("fs/promises");
    const content = await readFile(path.join(uploadDir, "debug-test.html"));
    expect(content.toString()).toBe("<html>test</html>");
  });
});
