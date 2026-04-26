"use client";
import { useMemo } from "react";
import { PassPreview } from "@/lib/pass-preview";
import type { ImageSlot, ImageVariants, PassAssets } from "@/lib/pass-spec";

/**
 * Thin client wrapper around PassPreview. The server component passes
 * base64-encoded PNG bytes (since Uint8Array doesn't serialize cleanly
 * across the RSC boundary); we decode them back to Uint8Array here
 * before handing them to PassPreview.
 *
 * Props: `assetsBase64` is a flat map of `{slot}.{variant}` → base64 PNG.
 * Shape matches what the editor emits for its in-browser preview, so the
 * same decoder would work there too if we ever consolidate the two.
 */
export interface FidelityPreviewProps {
  definition: unknown;
  face: "front" | "back";
  assetsBase64: Record<string, string>;
}

export function FidelityPreview({ definition, face, assetsBase64 }: FidelityPreviewProps) {
  const assets: PassAssets = useMemo(() => buildAssets(assetsBase64), [assetsBase64]);
  return <PassPreview definition={definition} face={face} assets={assets} />;
}

function buildAssets(flat: Record<string, string>): PassAssets {
  const out: PassAssets = {};
  for (const [key, b64] of Object.entries(flat)) {
    const [slot, variant] = key.split(".") as [ImageSlot, keyof ImageVariants];
    const slotMap = (out[slot] ??= {});
    slotMap[variant] = base64ToBytes(b64);
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
