import { describe, test, expect, beforeAll } from "bun:test";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  extractOfficeText,
  isOfficeModernFile,
  isOfficeLegacyFile,
  decodeXmlEntities,
} from "../lib/officeExtraction.js";
import AdmZip from "adm-zip";
import { FILE_CATEGORIES, classifyAttachment } from "../lib/fileUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("officeExtraction", () => {
  describe("isOfficeModernFile", () => {
    test("returns true for .docx files", () => {
      expect(isOfficeModernFile({ filename: "document.docx" })).toBe(true);
      expect(isOfficeModernFile({ filename: "report.DOCX" })).toBe(true);
    });

    test("returns true for .xlsx files", () => {
      expect(isOfficeModernFile({ filename: "sheet.xlsx" })).toBe(true);
      expect(isOfficeModernFile({ filename: "data.XLSX" })).toBe(true);
    });

    test("returns true for .pptx files", () => {
      expect(isOfficeModernFile({ filename: "slides.pptx" })).toBe(true);
      expect(isOfficeModernFile({ filename: "presentation.PPTX" })).toBe(true);
    });

    test("returns false for legacy Office files", () => {
      expect(isOfficeModernFile({ filename: "document.doc" })).toBe(false);
      expect(isOfficeModernFile({ filename: "sheet.xls" })).toBe(false);
      expect(isOfficeModernFile({ filename: "slides.ppt" })).toBe(false);
    });

    test("returns false for non-Office files", () => {
      expect(isOfficeModernFile({ filename: "document.pdf" })).toBe(false);
      expect(isOfficeModernFile({ filename: "file.txt" })).toBe(false);
      expect(isOfficeModernFile({ filename: "image.png" })).toBe(false);
    });

    test("returns true based on MIME type", () => {
      expect(
        isOfficeModernFile({
          filename: "unknown",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      ).toBe(true);
      expect(
        isOfficeModernFile({
          filename: "unknown",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      ).toBe(true);
      expect(
        isOfficeModernFile({
          filename: "unknown",
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        })
      ).toBe(true);
    });
  });

  describe("isOfficeLegacyFile", () => {
    test("returns true for .doc files", () => {
      expect(isOfficeLegacyFile({ filename: "document.doc" })).toBe(true);
    });

    test("returns true for .xls files", () => {
      expect(isOfficeLegacyFile({ filename: "sheet.xls" })).toBe(true);
    });

    test("returns true for .ppt files", () => {
      expect(isOfficeLegacyFile({ filename: "slides.ppt" })).toBe(true);
    });

    test("returns false for modern Office files", () => {
      expect(isOfficeLegacyFile({ filename: "document.docx" })).toBe(false);
      expect(isOfficeLegacyFile({ filename: "sheet.xlsx" })).toBe(false);
      expect(isOfficeLegacyFile({ filename: "slides.pptx" })).toBe(false);
    });

    test("returns false for non-Office files", () => {
      expect(isOfficeLegacyFile({ filename: "document.pdf" })).toBe(false);
      expect(isOfficeLegacyFile({ filename: "file.txt" })).toBe(false);
    });
  });

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

    test("handles filename without extension using MIME type", () => {
      const result = extractOfficeText({
        buffer: docxBuffer,
        filename: "unknown",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
});
