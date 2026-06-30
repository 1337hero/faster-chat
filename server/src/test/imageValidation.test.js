import { describe, test, expect } from "bun:test";
import {
  getImageDimensions,
  validateImageDimensions,
  MAX_IMAGE_DIMENSION_PX,
} from "../lib/imageValidation.js";

// --- buffer builders ---

function makePng(width, height) {
  const buf = Buffer.alloc(24);
  // signature
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf[4] = 0x0d;
  buf[5] = 0x0a;
  buf[6] = 0x1a;
  buf[7] = 0x0a;
  // IHDR length (13)
  buf.writeUInt32BE(13, 8);
  // "IHDR"
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function makeJpeg(width, height) {
  // SOI + SOF0 marker
  const buf = Buffer.alloc(20);
  buf[0] = 0xff;
  buf[1] = 0xd8; // SOI
  buf[2] = 0xff;
  buf[3] = 0xc0; // SOF0
  buf.writeUInt16BE(17, 4); // length
  buf[6] = 8; // precision
  buf.writeUInt16BE(height, 7);
  buf.writeUInt16BE(width, 9);
  return buf;
}

function makeGif(width, height) {
  const buf = Buffer.alloc(10);
  buf.write("GIF89a", 0, "ascii");
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

function makeWebpVp8(width, height) {
  const buf = Buffer.alloc(32);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(buf.length - 8, 4);
  buf.write("WEBP", 8, "ascii");
  buf.write("VP8 ", 12, "ascii");
  buf.writeUInt32LE(10, 16); // chunk size
  // 3-byte frame tag at offset 20-22 (ignored)
  // start code at 23-25 (0x9d 0x01 0x2a)
  buf[23] = 0x9d;
  buf[24] = 0x01;
  buf[25] = 0x2a;
  buf.writeUInt16LE(width & 0x3fff, 26);
  buf.writeUInt16LE(height & 0x3fff, 28);
  return buf;
}

// --- tests ---

describe("getImageDimensions", () => {
  test("PNG under 8000 px", () => {
    const dims = getImageDimensions(makePng(1920, 1080), "image/png");
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });

  test("JPEG under 8000 px", () => {
    const dims = getImageDimensions(makeJpeg(800, 600), "image/jpeg");
    expect(dims).toEqual({ width: 800, height: 600 });
  });

  test("GIF under 8000 px", () => {
    const dims = getImageDimensions(makeGif(320, 240), "image/gif");
    expect(dims).toEqual({ width: 320, height: 240 });
  });

  test("WebP VP8 lossy under 8000 px", () => {
    const dims = getImageDimensions(makeWebpVp8(1280, 720), "image/webp");
    expect(dims).toEqual({ width: 1280, height: 720 });
  });

  test("invalid PNG bytes throw", () => {
    expect(() => getImageDimensions(Buffer.from("notapng"), "image/png")).toThrow();
  });

  test("invalid JPEG bytes throw", () => {
    expect(() => getImageDimensions(Buffer.from("notajpeg"), "image/jpeg")).toThrow();
  });

  test("invalid GIF bytes throw", () => {
    expect(() => getImageDimensions(Buffer.from("NOTGIF"), "image/gif")).toThrow();
  });

  test("unsupported mime type throws", () => {
    expect(() => getImageDimensions(Buffer.alloc(100), "application/pdf")).toThrow(
      "Cannot read dimensions for unsupported type"
    );
  });
});

describe("validateImageDimensions", () => {
  test("passes for valid dimensions", () => {
    const dims = validateImageDimensions(makePng(1920, 1080), "image/png", "photo.png");
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });

  test("throws when width exceeds max", () => {
    const oversized = makePng(9000, 1080);
    expect(() => validateImageDimensions(oversized, "image/png", "fleet.png")).toThrow(
      'Image "fleet.png" is 9000×1080. The maximum supported dimension is 8000 px per side.'
    );
  });

  test("throws when height exceeds max", () => {
    const oversized = makePng(1920, 9500);
    expect(() => validateImageDimensions(oversized, "image/png", "tall.png")).toThrow(
      'Image "tall.png" is 1920×9500. The maximum supported dimension is 8000 px per side.'
    );
  });

  test("passes at exactly max dimension", () => {
    const exact = makePng(MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_DIMENSION_PX);
    const dims = validateImageDimensions(exact, "image/png", "exact.png");
    expect(dims.width).toBe(8000);
    expect(dims.height).toBe(8000);
  });

  test("JPEG oversized width rejected with filename", () => {
    const oversized = makeJpeg(12000, 6400);
    expect(() => validateImageDimensions(oversized, "image/jpeg", "banner.jpg")).toThrow(
      '"banner.jpg" is 12000×6400'
    );
  });
});
