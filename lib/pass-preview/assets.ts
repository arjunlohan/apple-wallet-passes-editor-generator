import type { PassAssets } from "@/lib/pass-spec";
import type { ImageSlot, ImageVariants } from "@/lib/pass-spec";

/**
 * Convert a Uint8Array into a `data:image/png;base64,...` URL the browser
 * can render in an <img>. Used by the preview; never shipped server-side.
 */
export function bytesToDataUrl(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.byteLength))),
    );
  }
  return `data:image/png;base64,${btoa(bin)}`;
}

/**
 * For a given slot, pick the best available variant. Preference:
 *   3x > 2x > 1x, with matching dark variant used when `dark = true`.
 */
export function pickVariant(
  variants: ImageVariants,
  dark: boolean,
): Uint8Array | null {
  const scaleOrder: (keyof ImageVariants)[] = dark
    ? ["3x~dark", "2x~dark", "1x~dark", "3x", "2x", "1x"]
    : ["3x", "2x", "1x"];
  for (const key of scaleOrder) {
    const bytes = variants[key];
    if (bytes instanceof Uint8Array) return bytes;
  }
  return null;
}

export function getSlotDataUrl(
  assets: PassAssets,
  slot: ImageSlot,
  dark = false,
): string | null {
  const variants = assets[slot];
  if (!variants) return null;
  const bytes = pickVariant(variants, dark);
  return bytes ? bytesToDataUrl(bytes) : null;
}
