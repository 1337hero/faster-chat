import { describe, test, expect } from "vitest";
import { extractErrorMessage } from "@/lib/errorHandler";

describe("extractErrorMessage", () => {
  test("raw JSON string with {code, error, details} -> formatted human message", () => {
    const raw = JSON.stringify({
      code: "ATTACHMENT_PROVIDER_UNSUPPORTED",
      error: "One or more attachments are not supported by the selected model.",
      details: [
        {
          filename: "report.pdf",
          reason: "This model does not support PDFs.",
          suggestion: "Try a model that supports PDFs.",
        },
      ],
    });
    const msg = extractErrorMessage(raw);
    expect(msg).toBe(
      '- "report.pdf": This model does not support PDFs. (Try a model that supports PDFs.)'
    );
    expect(msg).not.toContain("{");
    expect(msg).not.toContain("code");
  });

  test("multiple details render as newline-separated lines", () => {
    const raw = JSON.stringify({
      code: "ATTACHMENT_UNSUPPORTED",
      error: "unsupported",
      details: [
        { filename: "a.pdf", reason: "no pdf", suggestion: "" },
        { filename: "b.doc", reason: "no doc", suggestion: "" },
      ],
    });
    const msg = extractErrorMessage(raw);
    expect(msg).toContain("\n");
    expect(msg).toContain('"a.pdf"');
    expect(msg).toContain('"b.doc"');
  });

  test("plain string -> passthrough", () => {
    expect(extractErrorMessage("Something broke")).toBe("Something broke");
  });

  test("malformed JSON -> passthrough, does not throw", () => {
    const bad = '{"code":"X","details":';
    expect(extractErrorMessage(bad)).toBe(bad);
  });

  test("Error whose message is structured JSON -> formatted", () => {
    const raw = JSON.stringify({
      code: "ATTACHMENT_UNSUPPORTED",
      error: "unsupported",
      details: [{ filename: "x.doc", reason: "not supported", suggestion: "" }],
    });
    const msg = extractErrorMessage(new Error(raw));
    expect(msg).toBe('- "x.doc": not supported ');
    expect(msg).not.toContain("code");
  });

  test("JSON string of a non-object -> passthrough", () => {
    expect(extractErrorMessage("42")).toBe("42");
  });

  test("JSON empty array -> passthrough (banner-visible original string)", () => {
    expect(extractErrorMessage("[]")).toBe("[]");
  });

  test("JSON array -> passthrough", () => {
    expect(extractErrorMessage("[1,2]")).toBe("[1,2]");
  });

  test("JSON empty object -> passthrough", () => {
    expect(extractErrorMessage("{}")).toBe("{}");
  });

  test("unrecognized object shape -> passthrough of original JSON string", () => {
    const raw = '{"detail":"Rate limited"}';
    expect(extractErrorMessage(raw)).toBe(raw);
  });
});
