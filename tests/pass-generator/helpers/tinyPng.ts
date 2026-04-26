// Minimal valid PNGs generated inline so tests don't need binary fixtures.
// We synthesize a one-color square at the exact required dimensions.

import { deflateSync } from "fflate";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.byteLength; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function u32be(n: number): Uint8Array {
  const v = new Uint8Array(4);
  new DataView(v.buffer).setUint32(0, n, false);
  return v;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const length = u32be(data.byteLength);
  const payload = new Uint8Array(typeBytes.byteLength + data.byteLength);
  payload.set(typeBytes, 0);
  payload.set(data, typeBytes.byteLength);
  const crc = u32be(crc32(payload));
  const buf = new Uint8Array(length.byteLength + payload.byteLength + crc.byteLength);
  buf.set(length, 0);
  buf.set(payload, length.byteLength);
  buf.set(crc, length.byteLength + payload.byteLength);
  return buf;
}

/**
 * Build a tiny RGB PNG of the given dimensions. By default the pixels are
 * black — sufficient for magic+IHDR checks in the generator tests. Pass an
 * explicit `color` to get a solid-fill PNG, which the fidelity preview uses
 * to make image-slot placement visually verifiable (e.g. teal strip,
 * olive background, amber thumbnail).
 */
export function makePng(
  width: number,
  height: number,
  color?: { r: number; g: number; b: number },
): Uint8Array {
  const ihdrData = new Uint8Array(13);
  const dv = new DataView(ihdrData.buffer);
  dv.setUint32(0, width, false);
  dv.setUint32(4, height, false);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Raw scanlines: each row prefixed with filter byte 0, followed by 3 bytes per pixel.
  const rowBytes = width * 3;
  const raw = new Uint8Array(height * (rowBytes + 1));
  const [r, g, b] = color ? [color.r, color.g, color.b] : [0, 0, 0];
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0;
    if (color) {
      const rowStart = y * (rowBytes + 1) + 1;
      for (let x = 0; x < width; x++) {
        const p = rowStart + x * 3;
        raw[p] = r;
        raw[p + 1] = g;
        raw[p + 2] = b;
      }
    }
    // Black (zero-filled) is the default.
  }
  const idatData = deflateSync(raw);

  const ihdr = chunk("IHDR", ihdrData);
  const idat = chunk("IDAT", idatData);
  const iend = chunk("IEND", new Uint8Array(0));

  const out = new Uint8Array(
    PNG_MAGIC.byteLength + ihdr.byteLength + idat.byteLength + iend.byteLength,
  );
  let off = 0;
  out.set(PNG_MAGIC, off);
  off += PNG_MAGIC.byteLength;
  out.set(ihdr, off);
  off += ihdr.byteLength;
  out.set(idat, off);
  off += idat.byteLength;
  out.set(iend, off);
  return out;
}
