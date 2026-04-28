import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import path from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import { createTestApp, seedAdminUser, makeRequest } from "./helpers.js";
import { encryptApiKey } from "../lib/encryption.js";
import { FILE_CONFIG } from "../lib/fileUtils.js";

describe("file routes", () => {
  let app, adminCookie, adminUserId;

  beforeAll(async () => {
    const { resetDatabase } = await import("./helpers.js");
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUserId = admin.user.id;

    // Ensure upload directory exists
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup upload directory
    try {
      await rm(FILE_CONFIG.UPLOAD_DIR, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("GET /api/files/:id/content", () => {
    let htmlFileId, svgFileId, jsFileId, pngFileId, jpgFileId, pdfFileId, xmlFileId;

    beforeAll(async () => {
      const { dbUtils } = await import("../lib/db.js");
      const { encryptedKey, iv, authTag } = encryptApiKey("sk-test-key");
      const providerId = dbUtils.createProvider(
        "test-provider",
        "Test Provider",
        "official",
        null,
        encryptedKey,
        iv,
        authTag
      );
      dbUtils.createModel(providerId, "stub-model", "Stub Model", true, "text");

      // Create HTML file - relative path is server/data/uploads/...
      const htmlPath = path.join(FILE_CONFIG.UPLOAD_DIR, "html-file-123.html");
      await writeFile(htmlPath, Buffer.from("<html><body>test</body></html>"));
      dbUtils.createFile(
        "html-file-123",
        adminUserId,
        "test.html",
        "html-file-123.html",
        "server/data/uploads/html-file-123.html",
        "text/html",
        30
      );
      htmlFileId = "html-file-123";

      // Create SVG file
      const svgPath = path.join(FILE_CONFIG.UPLOAD_DIR, "svg-file-123.svg");
      await writeFile(svgPath, Buffer.from("<svg>test</svg>"));
      dbUtils.createFile(
        "svg-file-123",
        adminUserId,
        "test.svg",
        "svg-file-123.svg",
        "server/data/uploads/svg-file-123.svg",
        "image/svg+xml",
        20
      );
      svgFileId = "svg-file-123";

      // Create JS file
      const jsPath = path.join(FILE_CONFIG.UPLOAD_DIR, "js-file-123.js");
      await writeFile(jsPath, Buffer.from("console.log('test');"));
      dbUtils.createFile(
        "js-file-123",
        adminUserId,
        "test.js",
        "js-file-123.js",
        "server/data/uploads/js-file-123.js",
        "application/javascript",
        25
      );
      jsFileId = "js-file-123";

      // Create PNG file
      const pngPath = path.join(FILE_CONFIG.UPLOAD_DIR, "png-file-123.png");
      await writeFile(pngPath, Buffer.from("fake png data"));
      dbUtils.createFile(
        "png-file-123",
        adminUserId,
        "test.png",
        "png-file-123.png",
        "server/data/uploads/png-file-123.png",
        "image/png",
        14
      );
      pngFileId = "png-file-123";

      // Create JPEG file
      const jpgPath = path.join(FILE_CONFIG.UPLOAD_DIR, "jpg-file-123.jpg");
      await writeFile(jpgPath, Buffer.from("fake jpg data"));
      dbUtils.createFile(
        "jpg-file-123",
        adminUserId,
        "test.jpg",
        "jpg-file-123.jpg",
        "server/data/uploads/jpg-file-123.jpg",
        "image/jpeg",
        14
      );
      jpgFileId = "jpg-file-123";

      // Create PDF file
      const pdfPath = path.join(FILE_CONFIG.UPLOAD_DIR, "pdf-file-123.pdf");
      await writeFile(pdfPath, Buffer.from("%PDF-1.4 fake pdf"));
      dbUtils.createFile(
        "pdf-file-123",
        adminUserId,
        "test.pdf",
        "pdf-file-123.pdf",
        "server/data/uploads/pdf-file-123.pdf",
        "application/pdf",
        12
      );
      pdfFileId = "pdf-file-123";

      // Create XML file
      const xmlPath = path.join(FILE_CONFIG.UPLOAD_DIR, "xml-file-123.xml");
      await writeFile(xmlPath, Buffer.from("<xml>test</xml>"));
      dbUtils.createFile(
        "xml-file-123",
        adminUserId,
        "test.xml",
        "xml-file-123.xml",
        "server/data/uploads/xml-file-123.xml",
        "application/xml",
        18
      );
      xmlFileId = "xml-file-123";
    });

    it("returns 401 without auth", async () => {
      const res = await makeRequest(app, "GET", "/api/files/test-file-123/content");
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent file", async () => {
      const res = await makeRequest(app, "GET", "/api/files/nonexistent-file/content", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });

    it("returns Content-Disposition: attachment for HTML", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${htmlFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "attachment; filename=\"test.html\"; filename*=UTF-8''test.html"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns Content-Disposition: attachment for SVG", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${svgFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "attachment; filename=\"test.svg\"; filename*=UTF-8''test.svg"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns Content-Disposition: attachment for JS", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${jsFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "attachment; filename=\"test.js\"; filename*=UTF-8''test.js"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns Content-Disposition: inline for PNG", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${pngFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "inline; filename=\"test.png\"; filename*=UTF-8''test.png"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns Content-Disposition: inline for JPEG", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${jpgFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "inline; filename=\"test.jpg\"; filename*=UTF-8''test.jpg"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns Content-Disposition: inline for PDF", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${pdfFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "inline; filename=\"test.pdf\"; filename*=UTF-8''test.pdf"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns Content-Disposition: attachment for XML", async () => {
      const res = await makeRequest(app, "GET", `/api/files/${xmlFileId}/content`, {
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toBe(
        "attachment; filename=\"test.xml\"; filename*=UTF-8''test.xml"
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("POST /api/files (upload)", () => {
    async function uploadFile(app, cookie, { name, type, content }) {
      const fd = new FormData();
      fd.append("file", new File([content], name, { type }));
      return app.request("/api/files", { method: "POST", headers: { Cookie: cookie }, body: fd });
    }

    it("accepts a PNG", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "photo.png",
        type: "image/png",
        content: Buffer.from("fake png data"),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.filename).toBe("photo.png");
    });

    it("accepts a CSV with application/octet-stream MIME (extension fallback)", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "data.csv",
        type: "application/octet-stream",
        content: Buffer.from("a,b\n1,2"),
      });
      expect(res.status).toBe(200);
    });

    it("accepts a Markdown file with empty MIME", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "readme.md",
        type: "",
        content: Buffer.from("# hi"),
      });
      expect(res.status).toBe(200);
    });

    it("rejects a legacy .doc upload", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "report.doc",
        type: "application/msword",
        content: Buffer.from("legacy"),
      });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown binary upload", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "blob.bin",
        type: "application/octet-stream",
        content: Buffer.from([0x00, 0x01, 0x02]),
      });
      expect(res.status).toBe(400);
    });

    it("rejects an SVG upload (unsafe active content)", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "icon.svg",
        type: "image/svg+xml",
        content: Buffer.from("<svg/>"),
      });
      expect(res.status).toBe(400);
    });

    it("persists Phase 2 classification metadata in meta", async () => {
      const res = await uploadFile(app, adminCookie, {
        name: "notes.csv",
        type: "application/octet-stream",
        content: Buffer.from("a,b\n1,2"),
      });
      expect(res.status).toBe(200);
      const { id } = await res.json();
      const metaRes = await makeRequest(app, "GET", `/api/files/${id}`, { cookie: adminCookie });
      const body = await metaRes.json();
      expect(body.meta.attachmentCategory).toBe("textLike");
      expect(body.meta.normalizedMimeType).toBe("text/csv");
      expect(body.meta.downloadPolicy).toBe("inlineSafe");
    });
  });
});
