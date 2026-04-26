import { LIMITS } from "./constants";

/**
 * Read a PNG's width/height from its IHDR chunk. Pure, no I/O — runs in
 * both the browser (for upload validation) and Node (for server-side
 * revalidation). No `server-only` import here.
 */
export function readPngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const magic = LIMITS.PNG_MAGIC;
  if (bytes.byteLength < 24) throw new Error("file is too small to be a PNG");
  for (let i = 0; i < magic.byteLength; i++) {
    if (bytes[i] !== magic[i]) {
      throw new Error("file is not a PNG (magic bytes mismatch)");
    }
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}
