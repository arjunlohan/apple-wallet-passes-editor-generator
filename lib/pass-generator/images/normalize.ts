import "server-only";
import type { ImageSlot, ImageVariants, PassAssets } from "@/lib/pass-spec";
import { validatePassImage } from "./validate";

const VARIANT_SCALES: Record<keyof ImageVariants, 1 | 2 | 3> = {
  "1x": 1,
  "2x": 2,
  "3x": 3,
  "1x~dark": 1,
  "2x~dark": 2,
  "3x~dark": 3,
};

/**
 * Convert a PassAssets record into a flat `{ posixPath: bytes }` map using
 * Apple's canonical filenames:
 *   icon.png, icon@2x.png, icon@3x.png
 *   icon~dark.png, icon@2x~dark.png, icon@3x~dark.png
 *
 * Validates each image against its slot's dimension rules. Throws on the
 * first invalid image — the caller should have pre-validated at the form.
 */
export function normalizeAssets(
  assets: PassAssets,
): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {};
  for (const [slotKey, variants] of Object.entries(assets)) {
    if (!variants) continue;
    const slot = slotKey as ImageSlot;
    for (const [variantKey, bytes] of Object.entries(variants)) {
      if (!(bytes instanceof Uint8Array)) continue;
      const variant = variantKey as keyof ImageVariants;
      const scale = VARIANT_SCALES[variant];
      validatePassImage(bytes, { slot, scale });
      const filename = variantFilename(slot, variant);
      out[filename] = bytes;
    }
  }
  return out;
}

export function variantFilename(slot: ImageSlot, variant: keyof ImageVariants): string {
  const isDark = variant.endsWith("~dark");
  const scalePart = variant.startsWith("2x")
    ? "@2x"
    : variant.startsWith("3x")
      ? "@3x"
      : "";
  const darkPart = isDark ? "~dark" : "";
  return `${slot}${scalePart}${darkPart}.png`;
}
