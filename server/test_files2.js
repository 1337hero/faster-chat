import { mkdir, writeFile } from "fs/promises";
import path from "path";

const FILE_CONFIG = {
  UPLOAD_DIR: "/home/mikekey/Builds/FasterChat/app/server/data/uploads"
};

async function main() {
  await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });
  
  const htmlPath = path.join(FILE_CONFIG.UPLOAD_DIR, "html-file-123.html");
  console.log("Writing to:", htmlPath);
  await writeFile(htmlPath, Buffer.from("<html><body>test</body></html>"));
  console.log("HTML file written");
  
  // Verify
  const { readFile } = await import("fs/promises");
  const content = await readFile(htmlPath);
  console.log("Content:", content.toString());
}

main().catch(console.error);
