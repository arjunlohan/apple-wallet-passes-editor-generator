import "server-only";
import { IMAGE_DIMENSION_RULES, readPngDimensions } from "@/lib/pass-spec";
import type { ImageDimensionRule, ImageSlot } from "@/lib/pass-spec";

// Re-export for existing server-side callers so they don't need to know
// about the underlying module split.
export { readPngDimensions };

export interface ValidateImageOptions {
  slot: ImageSlot;
  /** Variant: 1x is the base; 2x/3x are multiplied against the base rule. */
  scale: 1 | 2 | 3;
}

/**
 * Throws if the bytes aren't a PNG or the dimensions fall outside the
 * per-slot rules (scaled by 1x/2x/3x as appropriate).
 */
export function validatePassImage(
  bytes: Uint8Array,
  opts: ValidateImageOptions,
): { width: number; height: number } {
  const dims = readPngDimensions(bytes);
  const rule = IMAGE_DIMENSION_RULES[opts.slot];
  checkRule(rule, dims.width, dims.height, opts.scale, opts.slot);
  return dims;
}

function checkRule(
  rule: ImageDimensionRule,
  width: number,
  height: number,
  scale: 1 | 2 | 3,
  slot: ImageSlot,
): void {
  if (rule.exact) {
    const targetW = rule.exact.width * scale;
    const targetH = rule.exact.height * scale;
    if (width !== targetW || height !== targetH) {
      throw new Error(
        `${slot}@${scale}x must be ${targetW}x${targetH} (got ${width}x${height})`,
      );
    }
    return;
  }
  if (rule.width) {
    const maxW = rule.width.max * scale;
    const minW = (rule.width.min ?? 1) * scale;
    if (width > maxW || width < minW) {
      throw new Error(`${slot}@${scale}x width ${width} out of [${minW}, ${maxW}]`);
    }
  }
  if (rule.height) {
    const maxH = rule.height.max * scale;
    const minH = (rule.height.min ?? 1) * scale;
    if (height > maxH || height < minH) {
      throw new Error(`${slot}@${scale}x height ${height} out of [${minH}, ${maxH}]`);
    }
  }
}
