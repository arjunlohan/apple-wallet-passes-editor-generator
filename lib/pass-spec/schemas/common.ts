import * as z from "zod";
import {
  ALLOWED_URL_SCHEMES,
  BARCODE_ENCODINGS,
  BARCODE_FORMATS,
  DATA_DETECTOR_TYPES,
  DATE_STYLES,
  LIMITS,
  NUMBER_STYLES,
  PREFERRED_STYLE_SCHEMES,
  TEXT_ALIGNMENTS,
} from "../constants";

const RGB_COLOR_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

/**
 * `rgb(r, g, b)` with 0-255 components. This is the only color format Apple
 * parses; named colors / hex / rgba all silently fail on device.
 */
export const rgbColor = z
  .string()
  .regex(RGB_COLOR_RE, "color must be rgb(r, g, b) with 0-255 components")
  .superRefine((value, ctx) => {
    const match = RGB_COLOR_RE.exec(value);
    if (!match) return;
    for (const comp of [match[1], match[2], match[3]]) {
      const n = parseInt(comp, 10);
      if (n < 0 || n > 255) {
        ctx.addIssue({
          code: "custom",
          message: `rgb component ${n} out of 0-255 range`,
        });
        return;
      }
    }
  });

/** ISO 8601 date with time, used across expirationDate/relevantDate/etc. */
export const iso8601DateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?$/,
    "must be an ISO 8601 datetime (e.g., 2026-04-25T12:34:00Z)",
  );

/** ISO 4217 currency code (e.g., USD, EUR, JPY). 3 uppercase letters. */
export const currencyCode = z.string().regex(/^[A-Z]{3}$/, "ISO 4217 code");

// A field's `value` must be present; empty strings render as a blank
// labeled box on device, which is always a pass-authoring bug. Numbers
// (including 0) are accepted as-is. `""` is rejected at the schema
// boundary so hand-authored JSON can't silently ship a broken pass.
const passFieldValue = z.union([z.string().min(1, "value must not be empty"), z.number()]);

/** Sanitize `%@` requirement for change messages and URL-scheme safelist for attributed values. */
const changeMessage = z
  .string()
  .refine((v) => (v.match(/%@/g) ?? []).length === 1, {
    message: "changeMessage must contain exactly one `%@` placeholder",
  });

const attributedValue = z
  .string()
  .superRefine((value, ctx) => {
    // Permit only <a href="...">text</a> anchors; everything else rejects.
    // Find all anchor tags and verify their hrefs use an allowed scheme.
    const anchorRe = /<a\s+href=(?:"([^"]*)"|'([^']*)')[^>]*>(.*?)<\/a>/gi;
    const anchors: string[] = [];
    let m: RegExpExecArray | null;
    let cleaned = value;
    while ((m = anchorRe.exec(value)) !== null) {
      anchors.push(m[1] ?? m[2] ?? "");
      cleaned = cleaned.replace(m[0], m[3] ?? "");
    }
    if (/<[^>]+>/.test(cleaned)) {
      ctx.addIssue({
        code: "custom",
        message: "attributedValue may contain only <a href=...> anchor tags",
      });
      return;
    }
    for (const href of anchors) {
      let scheme: string | null = null;
      try {
        scheme = new URL(href).protocol.toLowerCase();
      } catch {
        ctx.addIssue({
          code: "custom",
          message: `attributedValue anchor href is not a valid URL: ${href}`,
        });
        continue;
      }
      if (!ALLOWED_URL_SCHEMES.includes(scheme as (typeof ALLOWED_URL_SCHEMES)[number])) {
        ctx.addIssue({
          code: "custom",
          message: `attributedValue scheme ${scheme} not in allowed list`,
        });
      }
    }
  });

/**
 * Factory for a PassFieldContent schema. Back-fields additionally permit
 * `attributedValue` and `dataDetectorTypes`; other sections reject them.
 */
export function makePassFieldSchema(options: { allowBackOnly: boolean; allowRow: boolean }) {
  const base = z.object({
    key: z.string().min(1, "key is required"),
    label: z.string().optional(),
    value: passFieldValue,
    changeMessage: changeMessage.optional(),
    textAlignment: z.enum(TEXT_ALIGNMENTS).optional(),
    dateStyle: z.enum(DATE_STYLES).optional(),
    timeStyle: z.enum(DATE_STYLES).optional(),
    numberStyle: z.enum(NUMBER_STYLES).optional(),
    currencyCode: currencyCode.optional(),
    ignoresTimeZone: z.boolean().optional(),
    isRelative: z.boolean().optional(),
    semantics: z.record(z.string(), z.unknown()).optional(),
    attributedValue: options.allowBackOnly ? attributedValue.optional() : z.undefined(),
    dataDetectorTypes: options.allowBackOnly
      ? z.array(z.enum(DATA_DETECTOR_TYPES)).optional()
      : z.undefined(),
    row: options.allowRow ? z.union([z.literal(0), z.literal(1)]).optional() : z.undefined(),
  });
  return base;
}

export type PassFieldSchema = ReturnType<typeof makePassFieldSchema>;

export const barcode = z.object({
  format: z.enum(BARCODE_FORMATS),
  message: z.string().min(1),
  messageEncoding: z.enum(BARCODE_ENCODINGS),
  altText: z.string().optional(),
});

export const location = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  relevantText: z.string().optional(),
});

export const beacon = z.object({
  proximityUUID: z
    .string()
    .regex(
      /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/,
      "proximityUUID must be a hyphenated UUID",
    ),
  major: z.number().int().min(0).max(65535).optional(),
  minor: z.number().int().min(0).max(65535).optional(),
  relevantText: z.string().optional(),
});

export const nfc = z
  .object({
    message: z.string(),
    encryptionPublicKey: z.string(),
    requiresAuthentication: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const bytes = new TextEncoder().encode(value.message).byteLength;
    if (bytes > LIMITS.NFC_MESSAGE_BYTES) {
      ctx.addIssue({
        code: "custom",
        path: ["message"],
        message: `nfc.message is ${bytes} bytes (>${LIMITS.NFC_MESSAGE_BYTES})`,
      });
    }
    try {
      // We validate the base64 decodes and has plausible SPKI length
      // for a P-256 ECDH key. Full curve check happens in the generator
      // via @peculiar/x509 (not imported here to keep this module pure).
      const buf =
        typeof atob === "function"
          ? Uint8Array.from(atob(value.encryptionPublicKey), (c) => c.charCodeAt(0))
          : Uint8Array.from(Buffer.from(value.encryptionPublicKey, "base64"));
      if (buf.byteLength < 64 || buf.byteLength > 120) {
        ctx.addIssue({
          code: "custom",
          path: ["encryptionPublicKey"],
          message: "encryptionPublicKey does not look like an SPKI P-256 key",
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["encryptionPublicKey"],
        message: "encryptionPublicKey must be base64",
      });
    }
  });

/**
 * Apple's SemanticTagType.EventDateInfo dictionary. Only `date` is
 * mandatory in practice; the booleans default to false when omitted.
 * A plain string here would pass Zod's old `record(unknown)` but fail
 * Wallet's structural check — that regression caused the poster pass
 * to error out with "Value ... for semantic key eventStartDateInfo is
 * not a dictionary". See tasks/lessons.md (2026-04-26).
 */
export const semanticEventDateInfo = z.object({
  date: iso8601DateTime,
  timeZone: z.string().optional(),
  ignoreTimeComponents: z.boolean().optional(),
  unannounced: z.boolean().optional(),
  undetermined: z.boolean().optional(),
});

/**
 * Known semantic tag keys that appear on poster event tickets. Tags
 * outside this list are passed through unchanged so we don't break
 * forks that add their own. The goal here is to catch the wrong-type
 * mistakes that Wallet rejects silently (e.g., `eventStartDateInfo`
 * as a string instead of a dictionary).
 */
export const semantics = z
  .looseObject({
    eventName: z.string().optional(),
    venueName: z.string().optional(),
    venueRegionName: z.string().optional(),
    venueRoom: z.string().optional(),
    eventType: z.string().optional(),
    eventStartDate: iso8601DateTime.optional(),
    eventEndDate: iso8601DateTime.optional(),
    eventStartDateInfo: semanticEventDateInfo.optional(),
    eventEndDateInfo: semanticEventDateInfo.optional(),
    performerNames: z.array(z.string()).optional(),
    awayTeamAbbreviation: z.string().optional(),
    homeTeamAbbreviation: z.string().optional(),
    awayTeamName: z.string().optional(),
    homeTeamName: z.string().optional(),
  });

export const relevantDates = z
  .object({
    date: iso8601DateTime.optional(),
    startDate: iso8601DateTime.optional(),
    endDate: iso8601DateTime.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && !value.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "endDate is required when startDate is set (iOS 18+ rule)",
      });
    }
    if (!value.date && !value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "relevantDates entry must have either `date` or `startDate`",
      });
    }
  });

/** Shared top-level pass keys (applies to every style). */
export const baseDefinition = z.object({
  formatVersion: z.literal(1),
  passTypeIdentifier: z.string().min(1),
  teamIdentifier: z
    .string()
    .regex(/^[A-Z0-9]{10}$/, "teamIdentifier must be 10 uppercase alphanumeric chars"),
  serialNumber: z.string().min(1).max(LIMITS.SERIAL_NUMBER_MAX_CHARS),
  organizationName: z.string().min(1),
  description: z.string().min(1),

  backgroundColor: rgbColor.optional(),
  foregroundColor: rgbColor.optional(),
  labelColor: rgbColor.optional(),

  groupingIdentifier: z.string().optional(),
  logoText: z.string().optional(),
  suppressStripShine: z.boolean().optional(),
  sharingProhibited: z.boolean().optional(),
  voided: z.boolean().optional(),

  expirationDate: iso8601DateTime.optional(),
  relevantDate: iso8601DateTime.optional(),
  relevantDates: z.array(relevantDates).optional(),

  locations: z.array(location).max(LIMITS.LOCATIONS_MAX).optional(),
  beacons: z.array(beacon).max(LIMITS.BEACONS_MAX).optional(),

  barcodes: z.array(barcode).min(1).max(4).optional(),
  nfc: nfc.optional(),

  webServiceURL: z.string().url().optional(),
  authenticationToken: z
    .string()
    .min(LIMITS.AUTHENTICATION_TOKEN_MIN_CHARS)
    .optional(),
  associatedStoreIdentifiers: z.array(z.number().int().positive()).optional(),
  appLaunchURL: z.string().optional(),

  // iOS 26+ poster scheme. Order matters: first entry wins, rest are fallbacks.
  // We require a trailing `eventTicket` so pre-iOS 26 devices still render.
  preferredStyleSchemes: z
    .array(z.enum(PREFERRED_STYLE_SCHEMES))
    .min(1)
    .optional(),
  suppressHeaderDarkening: z.boolean().optional(),

  // Poster-only URLs. We don't require them, but they're validated as URLs
  // when present. Apple silently ignores them outside the poster layout.
  accessibilityURL: z.string().url().optional(),
  addOnURL: z.string().url().optional(),
  bagPolicyURL: z.string().url().optional(),
  contactVenueEmail: z.string().email().optional(),
  contactVenuePhoneNumber: z.string().optional(),
  merchandiseURL: z.string().url().optional(),
  orderFoodURL: z.string().url().optional(),
  parkingInformationURL: z.string().url().optional(),
  purchaseParkingURL: z.string().url().optional(),
  sellURL: z.string().url().optional(),
  transferURL: z.string().url().optional(),
  transitInformationURL: z.string().url().optional(),
  directionsInformationURL: z.string().url().optional(),
  auxiliaryStoreIdentifiers: z.array(z.number().int().positive()).optional(),

  userInfo: z
    .record(z.string(), z.unknown())
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const size = new TextEncoder().encode(JSON.stringify(value)).byteLength;
      if (size > LIMITS.USER_INFO_BYTES) {
        ctx.addIssue({
          code: "custom",
          message: `userInfo is ${size} bytes (>${LIMITS.USER_INFO_BYTES})`,
        });
      }
    }),

  semantics: semantics.optional(),
});

/**
 * Shared refinement: webServiceURL and authenticationToken are all-or-none.
 * Apple's docs require both for update-capable passes.
 */
export function addWebServiceRefinement<T extends z.ZodType>(schema: T): T {
  return schema.superRefine((value: unknown, ctx: z.core.$RefinementCtx<unknown>) => {
    const v = value as { webServiceURL?: string; authenticationToken?: string };
    if (v.webServiceURL && !v.authenticationToken) {
      ctx.addIssue({
        code: "custom",
        path: ["authenticationToken"],
        message: "authenticationToken required when webServiceURL is set",
      });
    }
    if (v.authenticationToken && !v.webServiceURL) {
      ctx.addIssue({
        code: "custom",
        path: ["webServiceURL"],
        message: "webServiceURL required when authenticationToken is set",
      });
    }
  }) as T;
}
