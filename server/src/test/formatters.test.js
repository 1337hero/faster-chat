import { describe, test, expect } from "bun:test";
import { formatFileSize, formatPrice, formatContextWindow } from "@faster-chat/shared";

describe("formatters", () => {
  describe("formatFileSize", () => {
    test("0 returns '0 Bytes'", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
    });

    test("1024 returns '1 KB'", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
    });

    test("1048576 returns '1 MB'", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
    });

    test("1073741824 returns '1 GB'", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });

    test("500 returns '500 Bytes'", () => {
      expect(formatFileSize(500)).toBe("500 Bytes");
    });

    test("1536 returns '1.5 KB'", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });
  });

  describe("formatPrice", () => {
    test("null returns 'Free'", () => {
      expect(formatPrice(null)).toBe("Free");
    });

    test("0 returns 'Free'", () => {
      expect(formatPrice(0)).toBe("Free");
    });

    test("undefined returns 'Free'", () => {
      expect(formatPrice(undefined)).toBe("Free");
    });

    test("2.5 returns '$2.50'", () => {
      expect(formatPrice(2.5)).toBe("$2.50");
    });

    test("10 returns '$10.00'", () => {
      expect(formatPrice(10)).toBe("$10.00");
    });

    test("0.001 returns '$0.00'", () => {
      expect(formatPrice(0.001)).toBe("$0.00");
    });
  });

  describe("formatContextWindow", () => {
    test("null returns 'Unknown'", () => {
      expect(formatContextWindow(null)).toBe("Unknown");
    });

    test("0 returns 'Unknown'", () => {
      expect(formatContextWindow(0)).toBe("Unknown");
    });

    test("128000 returns '128K'", () => {
      expect(formatContextWindow(128000)).toBe("128K");
    });

    test("1000000 returns '1.0M'", () => {
      expect(formatContextWindow(1000000)).toBe("1.0M");
    });

    test("1500000 returns '1.5M'", () => {
      expect(formatContextWindow(1500000)).toBe("1.5M");
    });

    test("500 returns '500'", () => {
      expect(formatContextWindow(500)).toBe("500");
    });
  });
});
