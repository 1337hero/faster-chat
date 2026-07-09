import { describe, test, expect, beforeAll } from "bun:test";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extractOfficeText, decodeXmlEntities } from "../lib/officeExtraction.js";
import AdmZip from "adm-zip";
import { FILE_CATEGORIES } from "@faster-chat/shared";
import { classifyAttachment } from "../lib/fileUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOC_MIME = "application/msword";
const XLS_MIME = "application/vnd.ms-excel";
const PPT_MIME = "application/vnd.ms-powerpoint";

describe("officeExtraction", () => {
  describe("classifyAttachment integration", () => {
    test("classifies .docx as officeModern", () => {
      const result = classifyAttachment({ filename: "report.docx" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies .xlsx as officeModern", () => {
      const result = classifyAttachment({ filename: "sheet.xlsx" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies .pptx as officeModern", () => {
      const result = classifyAttachment({ filename: "slides.pptx" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies uppercase .DOCX as officeModern", () => {
      const result = classifyAttachment({ filename: "REPORT.DOCX" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies uppercase .XLSX as officeModern", () => {
      const result = classifyAttachment({ filename: "SHEET.XLSX" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies uppercase .PPTX as officeModern", () => {
      const result = classifyAttachment({ filename: "SLIDES.PPTX" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies DOCX MIME without an extension as officeModern", () => {
      const result = classifyAttachment({ filename: "report", mimeType: DOCX_MIME });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies XLSX MIME without an extension as officeModern", () => {
      const result = classifyAttachment({ filename: "sheet", mimeType: XLSX_MIME });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies PPTX MIME without an extension as officeModern", () => {
      const result = classifyAttachment({ filename: "slides", mimeType: PPTX_MIME });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies .doc as officeLegacy", () => {
      const result = classifyAttachment({ filename: "report.doc" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
    });

    test("classifies .xls as officeLegacy", () => {
      const result = classifyAttachment({ filename: "sheet.xls" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
    });

    test("classifies .ppt as officeLegacy", () => {
      const result = classifyAttachment({ filename: "slides.ppt" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
    });

    test("classifies DOC MIME without an extension as officeLegacy", () => {
      const result = classifyAttachment({ filename: "report", mimeType: DOC_MIME });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
    });

    test("classifies XLS MIME without an extension as officeLegacy", () => {
      const result = classifyAttachment({ filename: "sheet", mimeType: XLS_MIME });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
    });

    test("classifies PPT MIME without an extension as officeLegacy", () => {
      const result = classifyAttachment({ filename: "slides", mimeType: PPT_MIME });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
    });
  });

  describe("extractOfficeText - DOCX", () => {
    let docxBuffer;

    beforeAll(async () => {
      const docxPath = path.join(FIXTURES_DIR, "test.docx");
      docxBuffer = await readFile(docxPath);
    });

    test("extracts text from DOCX file", () => {
      const result = extractOfficeText({
        buffer: docxBuffer,
        filename: "test.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      expect(result.kind).toBe("docx");
      expect(result.text).toContain("First paragraph text");
      expect(result.text).toContain("Second paragraph with some content");
    });

    test("returns warnings array even if empty", () => {
      const result = extractOfficeText({
        buffer: docxBuffer,
        filename: "test.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test("falls back to MIME type when the filename has no extension", () => {
      const result = extractOfficeText({
        buffer: docxBuffer,
        filename: "unknown",
        mimeType: DOCX_MIME,
      });

      expect(result.kind).toBe("docx");
      expect(result.text).toContain("First paragraph text");
    });

    test("falls back to MIME type when the filename has an unknown extension", () => {
      const result = extractOfficeText({
        buffer: docxBuffer,
        filename: "report.bin",
        mimeType: DOCX_MIME,
      });

      expect(result.kind).toBe("docx");
      expect(result.text).toContain("First paragraph text");
    });
  });

  describe("extractOfficeText - XLSX", () => {
    let xlsxBuffer;

    beforeAll(async () => {
      const xlsxPath = path.join(FIXTURES_DIR, "test.xlsx");
      xlsxBuffer = await readFile(xlsxPath);
    });

    test("extracts text from XLSX file", () => {
      const result = extractOfficeText({
        buffer: xlsxBuffer,
        filename: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      expect(result.kind).toBe("xlsx");
      expect(result.text).toContain("Sheet1:");
      expect(result.text).toContain("Header A");
      expect(result.text).toContain("Header B");
    });

    test("includes row data in extraction", () => {
      const result = extractOfficeText({
        buffer: xlsxBuffer,
        filename: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      expect(result.text).toContain("Row 1 Col A");
      expect(result.text).toContain("Row 1 Col B");
    });

    test("falls back to MIME type when the filename has no extension", () => {
      const result = extractOfficeText({
        buffer: xlsxBuffer,
        filename: "unknown",
        mimeType: XLSX_MIME,
      });

      expect(result.kind).toBe("xlsx");
      expect(result.text).toContain("Header A");
      expect(result.text).toContain("Header B");
    });
  });

  describe("extractOfficeText - PPTX", () => {
    let pptxBuffer;

    beforeAll(async () => {
      const pptxPath = path.join(FIXTURES_DIR, "test.pptx");
      pptxBuffer = await readFile(pptxPath);
    });

    test("extracts text from PPTX file", () => {
      const result = extractOfficeText({
        buffer: pptxBuffer,
        filename: "test.pptx",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      expect(result.kind).toBe("pptx");
      expect(result.text).toContain("Slide 1:");
      expect(result.text).toContain("Slide 1 Title");
      expect(result.text).toContain("Slide 1 content text");
    });

    test("falls back to MIME type when the filename has no extension", () => {
      const result = extractOfficeText({
        buffer: pptxBuffer,
        filename: "unknown",
        mimeType: PPTX_MIME,
      });

      expect(result.kind).toBe("pptx");
      expect(result.text).toContain("Slide 1 Title");
      expect(result.text).toContain("Slide 1 content text");
    });
  });

  describe("extractOfficeText - Edge cases", () => {
    test("returns empty result for unknown file type", () => {
      const result = extractOfficeText({
        buffer: Buffer.from("not a real office file"),
        filename: "unknown.xyz",
        mimeType: "application/octet-stream",
      });

      expect(result.kind).toBeNull();
      expect(result.text).toBe("");
    });

    test("handles empty buffer gracefully", () => {
      const result = extractOfficeText({
        buffer: Buffer.alloc(0),
        filename: "empty.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Should not throw, but extraction may fail
      expect(result.kind).toBe("docx");
    });

    test("handles invalid ZIP gracefully", () => {
      const result = extractOfficeText({
        buffer: Buffer.from("not a zip file at all"),
        filename: "fake.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      expect(result.kind).toBe("docx");
    });
  });

  describe("decodeXmlEntities", () => {
    test("decodes the five named entities", () => {
      expect(decodeXmlEntities("AT&amp;T &lt;tag&gt; &quot;x&quot; &apos;y&apos;")).toBe(
        "AT&T <tag> \"x\" 'y'"
      );
    });

    test("decodes numeric and hex character references", () => {
      expect(decodeXmlEntities("caf&#233; &#xe9;")).toBe("café é");
    });

    test("leaves unknown entities intact", () => {
      expect(decodeXmlEntities("&unknown; &amp;")).toBe("&unknown; &");
    });
  });

  describe("entity decoding in extraction", () => {
    function makeDocx(text) {
      const zip = new AdmZip();
      zip.addFile(
        "word/document.xml",
        Buffer.from(
          `<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`
        )
      );
      return zip.toBuffer();
    }

    test("docx text containing &amp; round-trips to a literal &", () => {
      const result = extractOfficeText({
        buffer: makeDocx("AT&amp;T meeting &lt;today&gt;"),
        filename: "deal.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(result.text).toContain("AT&T meeting <today>");
      expect(result.text).not.toContain("&amp;");
    });
  });

  describe("decompression-bomb guard", () => {
    test("rejects a high-ratio zip entry instead of inflating it", () => {
      // 8MB of a single byte compresses to a few KB → ratio far above the cap.
      const zip = new AdmZip();
      zip.addFile("word/document.xml", Buffer.alloc(8 * 1024 * 1024, 65));
      const result = extractOfficeText({
        buffer: zip.toBuffer(),
        filename: "bomb.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(result.text).toBe("");
      expect(result.warnings.some((w) => /compression ratio/.test(w))).toBe(true);
    });
  });
});
