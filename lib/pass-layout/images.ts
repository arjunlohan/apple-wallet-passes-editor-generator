import type { PassAssets } from "@/lib/pass-spec";
import { ALLOWED_IMAGE_SLOTS, IMAGE_SLOT_GROUPS } from "@/lib/pass-spec";
import type { PassStyle } from "@/lib/pass-spec";
import type { LayoutImageRef } from "./layoutTypes";

/**
 * Resolve the supplied assets into an ordered list of layout image refs,
 * enforcing the per-style slot rules. Assets that don't belong to any
 * allowed group are silently dropped (schema validation rejects them at
 * the form boundary; this is a defensive layer for library consumers
 * that pass assets directly).
 */
export function resolveImages(style: PassStyle, assets: PassAssets): LayoutImageRef[] {
  const allowed = new Set(ALLOWED_IMAGE_SLOTS[style]);
  const groups = IMAGE_SLOT_GROUPS[style];
  const present = (Object.keys(assets) as (keyof PassAssets)[]).filter(
    (slot) => allowed.has(slot) && hasAny(assets[slot]),
  );

  // Choose the first group that is a superset of present slots.
  const chosenGroup =
    groups.find((group) => present.every((slot) => group.includes(slot))) ?? groups[0];

  const ordered = chosenGroup.filter((slot) => present.includes(slot));
  return ordered.map((slot) => {
    const variants = assets[slot];
    const keys: LayoutImageRef["variants"] = (
      ["1x", "2x", "3x", "1x~dark", "2x~dark", "3x~dark"] as const
    ).filter((k) => variants?.[k] instanceof Uint8Array);
    return { slot, variants: keys };
  });
}

function hasAny(variants: PassAssets[keyof PassAssets] | undefined): boolean {
  if (!variants) return false;
  return (
    variants["1x"] instanceof Uint8Array ||
    variants["2x"] instanceof Uint8Array ||
    variants["3x"] instanceof Uint8Array ||
    variants["1x~dark"] instanceof Uint8Array ||
    variants["2x~dark"] instanceof Uint8Array ||
    variants["3x~dark"] instanceof Uint8Array
  );
}
