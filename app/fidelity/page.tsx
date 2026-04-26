import { notFound } from "next/navigation";
import { Buffer } from "node:buffer";
import boardingPass from "@/tests/fixtures/passes/boardingPass.json";
import coupon from "@/tests/fixtures/passes/coupon.json";
import eventTicket from "@/tests/fixtures/passes/eventTicket.json";
import generic from "@/tests/fixtures/passes/generic.json";
import posterEventTicket from "@/tests/fixtures/passes/posterEventTicket.json";
import storeCard from "@/tests/fixtures/passes/storeCard.json";
import { FIDELITY_FIXTURES_BY_KEY } from "@/tests/fixtures/passes/generated";
import { ALLOWED_IMAGE_SLOTS, IMAGE_DIMENSION_RULES, type ImageSlot, type PassStyle } from "@/lib/pass-spec";
import { makePng } from "@/tests/pass-generator/helpers/tinyPng";
import { FidelityPreview } from "./FidelityPreview";

/**
 * Dev-only fidelity harness page. Renders a single <PassPreview/> against
 * a known fixture at a fixed viewport so Playwright can screenshot it
 * deterministically.
 *
 * URL: /fidelity?style=<key>&face=front
 *
 * Assets: generated on the server at page render time. Each slot gets a
 * distinct solid-color fill so the side-by-side visual check makes slot
 * placement obvious (teal strip, olive background, etc). Bytes are
 * base64-encoded before crossing the RSC boundary because Uint8Array
 * doesn't serialize through that boundary.
 */

export const dynamic = "force-dynamic";

const CANONICAL: Record<string, unknown> = {
  boardingPass,
  coupon,
  eventTicket,
  generic,
  posterEventTicket,
  storeCard,
};

function resolveFixture(key: string): { fixture: unknown; assetKinds: readonly ImageSlot[] } | null {
  if (key in CANONICAL) {
    const fixture = CANONICAL[key];
    const style = (fixture as { style: PassStyle }).style;
    // Poster needs a background so Wallet's layout engine (and ours) knows
    // to render the hero slot; canonical eventTicket covers strip.
    const assetKinds =
      key === "posterEventTicket"
        ? (["icon", "logo", "background", "thumbnail"] as const)
        : (ALLOWED_IMAGE_SLOTS[style] ?? ["icon", "logo"]);
    return { fixture, assetKinds };
  }
  const generated = FIDELITY_FIXTURES_BY_KEY[key];
  return generated
    ? { fixture: generated.fixture, assetKinds: generated.assetKinds }
    : null;
}

// Per-slot solid color so alignment bugs show up visually. Alpha = opaque.
// Chosen to contrast against most pass background palettes without being
// garish enough to distract from the layout itself.
const SLOT_COLORS: Record<ImageSlot, { r: number; g: number; b: number }> = {
  icon: { r: 240, g: 240, b: 240 },
  logo: { r: 226, g: 199, b: 255 },
  strip: { r: 45, g: 140, b: 148 },
  background: { r: 96, g: 110, b: 72 },
  thumbnail: { r: 240, g: 178, b: 88 },
  footer: { r: 180, g: 180, b: 190 },
};

function buildAssetsBase64(kinds: readonly ImageSlot[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of kinds) {
    const rule = IMAGE_DIMENSION_RULES[slot];
    const w = rule.exact?.width ?? rule.width?.max ?? 160;
    const h = rule.exact?.height ?? rule.height?.max ?? 50;
    const color = SLOT_COLORS[slot];
    for (const scale of [1, 2, 3] as const) {
      const bytes = makePng(w * scale, h * scale, color);
      const b64 = Buffer.from(bytes).toString("base64");
      out[`${slot}.${scale}x`] = b64;
    }
  }
  return out;
}

export default async function FidelityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const style = Array.isArray(params.style) ? params.style[0] : params.style;
  const face = (Array.isArray(params.face) ? params.face[0] : params.face) === "back" ? "back" : "front";
  if (!style) return notFound();
  const resolved = resolveFixture(style);
  if (!resolved) return notFound();

  const assetsBase64 = buildAssetsBase64(resolved.assetKinds);

  return (
    <div
      data-fidelity-root
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        background: "#0b0b0b",
        padding: 20,
        minHeight: "100vh",
      }}
    >
      <div data-fidelity-target>
        <FidelityPreview definition={resolved.fixture} face={face} assetsBase64={assetsBase64} />
      </div>
    </div>
  );
}
