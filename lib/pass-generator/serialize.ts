import "server-only";
import type { LayoutTree } from "@/lib/pass-layout";
import { PASS_FORMAT_VERSION } from "@/lib/pass-spec";

/**
 * The ordering imposed here is the canonical key order for `pass.json`.
 * We write keys in the same order every time so manifest SHA-1 digests
 * are deterministic across runs — essential for byte-reproducible tests.
 */
const TOP_LEVEL_KEY_ORDER = [
  "formatVersion",
  "passTypeIdentifier",
  "teamIdentifier",
  "serialNumber",
  "organizationName",
  "description",
  "logoText",
  "groupingIdentifier",
  "backgroundColor",
  "foregroundColor",
  "labelColor",
  "suppressStripShine",
  "suppressHeaderDarkening",
  "sharingProhibited",
  "voided",
  "expirationDate",
  "relevantDate",
  "relevantDates",
  "locations",
  "beacons",
  "barcodes",
  "nfc",
  "webServiceURL",
  "authenticationToken",
  "associatedStoreIdentifiers",
  "auxiliaryStoreIdentifiers",
  "appLaunchURL",
  // Poster-only auxiliary URLs (iOS 26+). Ignored by pre-26 Wallet.
  "accessibilityURL",
  "addOnURL",
  "bagPolicyURL",
  "contactVenueEmail",
  "contactVenuePhoneNumber",
  "merchandiseURL",
  "orderFoodURL",
  "parkingInformationURL",
  "purchaseParkingURL",
  "sellURL",
  "transferURL",
  "transitInformationURL",
  "directionsInformationURL",
  "preferredStyleSchemes",
  "userInfo",
  "semantics",
  // Style blocks come last — exactly one of these will be present.
  "boardingPass",
  "coupon",
  "eventTicket",
  "generic",
  "storeCard",
] as const;

const FIELD_SECTION_KEY_ORDER = [
  "headerFields",
  "primaryFields",
  "secondaryFields",
  "auxiliaryFields",
  "additionalInfoFields",
  "backFields",
] as const;

const FIELD_KEY_ORDER = [
  "key",
  "label",
  "value",
  "attributedValue",
  "changeMessage",
  "textAlignment",
  "dateStyle",
  "timeStyle",
  "numberStyle",
  "currencyCode",
  "ignoresTimeZone",
  "isRelative",
  "dataDetectorTypes",
  "row",
  "semantics",
] as const;

function orderedClone<K extends string>(
  src: Record<string, unknown>,
  order: readonly K[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of order) {
    if (src[k] !== undefined) out[k] = src[k];
  }
  // Preserve any keys not in the canonical order (future-proofing).
  for (const k of Object.keys(src)) {
    if (!(order as readonly string[]).includes(k) && src[k] !== undefined) {
      out[k] = src[k];
    }
  }
  return out;
}

function normalizeField(field: Record<string, unknown>): Record<string, unknown> {
  return orderedClone(field, FIELD_KEY_ORDER);
}

function normalizeStyleBlock(
  block: Record<string, unknown>,
): Record<string, unknown> {
  const sections = orderedClone(block, FIELD_SECTION_KEY_ORDER);
  const out: Record<string, unknown> = {};
  // Keep style-specific keys (e.g., transitType) AFTER sections as Apple samples do.
  for (const k of Object.keys(block)) {
    if (!(FIELD_SECTION_KEY_ORDER as readonly string[]).includes(k) && block[k] !== undefined) {
      out[k] = block[k];
    }
  }
  for (const [name, arr] of Object.entries(sections)) {
    if (Array.isArray(arr)) {
      out[name] = arr.map((f) => normalizeField(f as Record<string, unknown>));
    }
  }
  return out;
}

/**
 * Produce the `pass.json` object Apple's Wallet consumes. The output is a
 * plain JS object with deterministic key ordering; callers serialize with
 * `JSON.stringify` (no indent to keep the manifest digest stable).
 */
export function serializePassJson(tree: LayoutTree): Record<string, unknown> {
  const definition = tree.definition as unknown as Record<string, unknown> & {
    style: string;
  };
  // Drop the internal `style` discriminator — it's not an Apple key.
  const { style, ...rest } = definition;
  void style;

  // Normalize the style block's field sections.
  const stylesToNormalize: readonly string[] = [
    "boardingPass",
    "coupon",
    "eventTicket",
    "generic",
    "storeCard",
  ];
  for (const key of stylesToNormalize) {
    if (rest[key] && typeof rest[key] === "object") {
      rest[key] = normalizeStyleBlock(rest[key] as Record<string, unknown>);
    }
  }

  // Ensure formatVersion is present (Apple requires it).
  rest.formatVersion = PASS_FORMAT_VERSION;

  return orderedClone(rest, TOP_LEVEL_KEY_ORDER);
}

/**
 * Serialize to a UTF-8 byte buffer with stable output. Two calls with the
 * same input always produce identical bytes.
 */
export function passJsonBytes(tree: LayoutTree): Uint8Array {
  const json = JSON.stringify(serializePassJson(tree));
  return new TextEncoder().encode(json);
}
