export const PASS_STYLES = [
  "boardingPass",
  "coupon",
  "eventTicket",
  "generic",
  "storeCard",
] as const;
export type PassStyle = (typeof PASS_STYLES)[number];

/**
 * `preferredStyleSchemes` (iOS 26+). Wallet reads the list in preference
 * order; `posterEventTicket` requires `eventTicket` as the fallback or the
 * system rejects the scheme entirely. Only eventTicket passes support this
 * key; we accept `"eventTicket"` alone as a no-op for forward compat.
 */
export const PREFERRED_STYLE_SCHEMES = [
  "posterEventTicket",
  "eventTicket",
] as const;
export type PreferredStyleScheme = (typeof PREFERRED_STYLE_SCHEMES)[number];

/**
 * Semantic-tag keys Apple documents as required for every poster event
 * ticket; omitting any falls the pass back to the legacy event layout.
 */
export const POSTER_REQUIRED_SEMANTIC_TAGS = [
  "eventName",
  "venueName",
  "venueRegionName",
  "venueRoom",
] as const;

/**
 * Subset of Apple's event types that apply extra semantic requirements in
 * poster mode (sports → team abbreviations; live performance → performer
 * names). Generic/conference do not add requirements.
 */
export const POSTER_EVENT_TYPES = [
  "PKEventTypeSports",
  "PKEventTypeLivePerformance",
  "PKEventTypeMovie",
  "PKEventTypeConference",
  "PKEventTypeConvention",
  "PKEventTypeSocialGathering",
  "PKEventTypeGeneric",
] as const;
export type PosterEventType = (typeof POSTER_EVENT_TYPES)[number];

export const BARCODE_FORMATS = [
  "PKBarcodeFormatQR",
  "PKBarcodeFormatPDF417",
  "PKBarcodeFormatAztec",
  "PKBarcodeFormatCode128",
] as const;
export type BarcodeFormat = (typeof BARCODE_FORMATS)[number];

export const TRANSIT_TYPES = [
  "PKTransitTypeAir",
  "PKTransitTypeBoat",
  "PKTransitTypeBus",
  "PKTransitTypeGeneric",
  "PKTransitTypeTrain",
] as const;
export type TransitType = (typeof TRANSIT_TYPES)[number];

export const TEXT_ALIGNMENTS = [
  "PKTextAlignmentLeft",
  "PKTextAlignmentCenter",
  "PKTextAlignmentRight",
  "PKTextAlignmentNatural",
] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

export const DATE_STYLES = [
  "PKDateStyleNone",
  "PKDateStyleShort",
  "PKDateStyleMedium",
  "PKDateStyleLong",
  "PKDateStyleFull",
] as const;
export type DateStyle = (typeof DATE_STYLES)[number];

export const NUMBER_STYLES = [
  "PKNumberStyleDecimal",
  "PKNumberStylePercent",
  "PKNumberStyleScientific",
  "PKNumberStyleSpellOut",
] as const;
export type NumberStyle = (typeof NUMBER_STYLES)[number];

export const DATA_DETECTOR_TYPES = [
  "PKDataDetectorTypePhoneNumber",
  "PKDataDetectorTypeLink",
  "PKDataDetectorTypeAddress",
  "PKDataDetectorTypeCalendarEvent",
] as const;
export type DataDetectorType = (typeof DATA_DETECTOR_TYPES)[number];

export const FIELD_SECTIONS = [
  "headerFields",
  "primaryFields",
  "secondaryFields",
  "auxiliaryFields",
  "backFields",
  "additionalInfoFields",
] as const;
export type FieldSection = (typeof FIELD_SECTIONS)[number];

// Per-style section caps. Conventions matched to Apple's published layouts.
// additionalInfoFields only applies to eventTicket.
// backFields is unbounded; we cap at 20 as a soft limit enforced by schema.
export const FIELD_CAPS: Record<
  PassStyle,
  Record<FieldSection, { max: number } | undefined>
> = {
  boardingPass: {
    headerFields: { max: 3 },
    primaryFields: { max: 2 },
    secondaryFields: { max: 5 },
    auxiliaryFields: { max: 5 },
    backFields: { max: 20 },
    additionalInfoFields: undefined,
  },
  coupon: {
    headerFields: { max: 3 },
    primaryFields: { max: 1 },
    secondaryFields: { max: 4 },
    auxiliaryFields: { max: 4 },
    backFields: { max: 20 },
    additionalInfoFields: undefined,
  },
  eventTicket: {
    headerFields: { max: 3 },
    primaryFields: { max: 2 },
    secondaryFields: { max: 4 },
    auxiliaryFields: { max: 5 },
    backFields: { max: 20 },
    additionalInfoFields: { max: 10 },
  },
  generic: {
    headerFields: { max: 3 },
    primaryFields: { max: 2 },
    secondaryFields: { max: 4 },
    auxiliaryFields: { max: 4 },
    backFields: { max: 20 },
    additionalInfoFields: undefined,
  },
  storeCard: {
    headerFields: { max: 3 },
    primaryFields: { max: 1 },
    secondaryFields: { max: 4 },
    auxiliaryFields: { max: 4 },
    backFields: { max: 20 },
    additionalInfoFields: undefined,
  },
};

export const IMAGE_SLOTS = [
  "icon",
  "logo",
  "thumbnail",
  "strip",
  "background",
  "footer",
] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];

// Per-slot base (1x) dimensions from Apple's pass design guidelines.
// Width/height stored as pixels at 1x resolution. @2x doubles, @3x triples.
// `maxWidth` / `maxHeight` allow a modest tolerance; `exact` locks the slot.
export type ImageDimensionRule = {
  exact?: { width: number; height: number };
  width?: { min?: number; max: number };
  height?: { min?: number; max: number };
};

export const IMAGE_DIMENSION_RULES: Record<ImageSlot, ImageDimensionRule> = {
  icon: { exact: { width: 29, height: 29 } },
  logo: { width: { max: 160 }, height: { max: 50 } },
  thumbnail: { width: { min: 90, max: 90 }, height: { min: 90, max: 90 } },
  strip: { width: { max: 375 }, height: { max: 144 } },
  background: { exact: { width: 180, height: 220 } },
  footer: { width: { max: 286 }, height: { max: 15 } },
};

// Which slots each style supports visually. Used for validation.
// A slot not listed is rejected at the schema boundary.
export const ALLOWED_IMAGE_SLOTS: Record<PassStyle, readonly ImageSlot[]> = {
  boardingPass: ["icon", "logo", "footer"],
  coupon: ["icon", "logo", "strip"],
  eventTicket: ["icon", "logo", "strip", "background", "thumbnail"],
  generic: ["icon", "logo", "thumbnail"],
  storeCard: ["icon", "logo", "strip"],
};

// Mutually exclusive image slot groups per style — Apple's layout rules.
// Example: an eventTicket can have strip OR (background + thumbnail),
// not both. One group ~ "all can coexist"; arrays of groups mean "pick one".
export const IMAGE_SLOT_GROUPS: Record<PassStyle, readonly (readonly ImageSlot[])[]> = {
  boardingPass: [["icon", "logo", "footer"]],
  coupon: [["icon", "logo", "strip"]],
  eventTicket: [
    ["icon", "logo", "strip"],
    ["icon", "logo", "background", "thumbnail"],
  ],
  generic: [["icon", "logo", "thumbnail"]],
  storeCard: [["icon", "logo", "strip"]],
};

// Barcode message encoding. Apple requires an IANA charset name;
// practical safelist to keep output interoperable.
export const BARCODE_ENCODINGS = [
  "iso-8859-1",
  "utf-8",
  "utf-16",
  "shift_jis",
] as const;
export type BarcodeEncoding = (typeof BARCODE_ENCODINGS)[number];

// URL schemes allowed in attributed values (<a href>) and back-field links.
export const ALLOWED_URL_SCHEMES = ["https:", "http:", "mailto:", "tel:"] as const;

// Byte limits Apple enforces (or we enforce more strictly for safety).
export const LIMITS = {
  NFC_MESSAGE_BYTES: 64,
  USER_INFO_BYTES: 4096,
  AUTHENTICATION_TOKEN_MIN_CHARS: 32, // Apple says 16; we enforce 32.
  SERIAL_NUMBER_MAX_CHARS: 256,
  LOCATIONS_MAX: 10,
  BEACONS_MAX: 10,
  PNG_MAGIC: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
} as const;

// pkpass format version. Constant: Apple has never changed this from 1.
export const PASS_FORMAT_VERSION = 1;
