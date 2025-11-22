import { FILE_CONSTANTS } from "../constants/files.js";

export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = FILE_CONSTANTS.BYTES_PER_KB;
  const sizes = FILE_CONSTANTS.SIZE_UNITS;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
