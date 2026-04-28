export const MAX_IMAGE_DIMENSION_PX = 8000;

export function getImageDimensions(buffer, mimeType) {
  const type = mimeType?.split(";")[0].trim().toLowerCase();

  if (type === "image/png") return parsePng(buffer);
  if (type === "image/jpeg" || type === "image/jpg") return parseJpeg(buffer);
  if (type === "image/gif") return parseGif(buffer);
  if (type === "image/webp") return parseWebp(buffer);

  throw new Error(`Cannot read dimensions for unsupported type: ${mimeType}`);
}

function parsePng(buf) {
  if (buf.length < 24) throw new Error("Buffer too short for PNG");
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error("Not a valid PNG");
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseJpeg(buf) {
  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error("Not a valid JPEG");
  }
  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xff) throw new Error("Invalid JPEG marker");
    const marker = buf[offset + 1];
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    if (marker === 0xd9 || marker === 0xd8) break;
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  throw new Error("Could not find JPEG SOF marker");
}

function parseGif(buf) {
  if (buf.length < 10) throw new Error("Buffer too short for GIF");
  const header = buf.slice(0, 6).toString("ascii");
  if (header !== "GIF87a" && header !== "GIF89a") throw new Error("Not a valid GIF");
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function parseWebp(buf) {
  if (buf.length < 12) throw new Error("Buffer too short for WebP");
  if (
    buf.slice(0, 4).toString("ascii") !== "RIFF" ||
    buf.slice(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error("Not a valid WebP");
  }
  if (buf.length < 16) throw new Error("Buffer too short for WebP chunk");
  const chunkType = buf.slice(12, 16).toString("ascii");

  if (chunkType === "VP8 ") {
    if (buf.length < 30) throw new Error("Buffer too short for VP8");
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }

  if (chunkType === "VP8L") {
    if (buf.length < 25) throw new Error("Buffer too short for VP8L");
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (chunkType === "VP8X") {
    if (buf.length < 30) throw new Error("Buffer too short for VP8X");
    return {
      width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
      height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
    };
  }

  throw new Error(`Unknown WebP chunk type: ${chunkType}`);
}

export function validateImageDimensions(buffer, mimeType, filename) {
  const dims = getImageDimensions(buffer, mimeType);
  if (dims.width > MAX_IMAGE_DIMENSION_PX || dims.height > MAX_IMAGE_DIMENSION_PX) {
    throw new Error(
      `Image "${filename}" is ${dims.width}×${dims.height}. The maximum supported dimension is ${MAX_IMAGE_DIMENSION_PX} px per side. Resize the image and upload again.`
    );
  }
  return dims;
}
