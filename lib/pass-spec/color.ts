import type { RgbColor } from "./types";

/**
 * Convert `#RRGGBB` or `#RGB` hex to Apple's required `rgb(r, g, b)` string.
 * Throws on invalid input — callers should validate upstream.
 */
export function hexToRgbString(hex: string): RgbColor {
  const trimmed = hex.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(trimmed);
  const full = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(trimmed);
  let r: number;
  let g: number;
  let b: number;
  if (full) {
    r = parseInt(full[1], 16);
    g = parseInt(full[2], 16);
    b = parseInt(full[3], 16);
  } else if (short) {
    r = parseInt(short[1] + short[1], 16);
    g = parseInt(short[2] + short[2], 16);
    b = parseInt(short[3] + short[3], 16);
  } else {
    throw new Error(`invalid hex color: ${hex}`);
  }
  return `rgb(${r}, ${g}, ${b})` as RgbColor;
}

/** Inverse of `hexToRgbString`, used by the editor to initialize color pickers. */
export function rgbStringToHex(rgb: RgbColor | string): string {
  const match = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(rgb);
  if (!match) throw new Error(`invalid rgb() color: ${rgb}`);
  const [, rs, gs, bs] = match;
  const r = parseInt(rs, 10);
  const g = parseInt(gs, 10);
  const b = parseInt(bs, 10);
  if (r > 255 || g > 255 || b > 255) throw new Error(`rgb() out of range: ${rgb}`);
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
