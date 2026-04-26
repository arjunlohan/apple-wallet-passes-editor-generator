import type { PassStyle } from "@/lib/pass-spec";

export interface EditorFormValues {
  style: PassStyle;
  passTypeIdentifier: string;
  teamIdentifier: string;
  serialNumber: string;
  organizationName: string;
  description: string;
  logoText: string;
  backgroundColorHex: string;
  foregroundColorHex: string;
  labelColorHex: string;

  // One shared bag for field sections — sliced by style at submit time.
  headerFields: EditorField[];
  primaryFields: EditorField[];
  secondaryFields: EditorField[];
  auxiliaryFields: EditorField[];
  backFields: EditorField[];
  additionalInfoFields: EditorField[];

  transitType: string; // Only used when style === "boardingPass".

  barcodeFormat: string;
  barcodeMessage: string;
  barcodeEncoding: string;
  barcodeAltText: string;

  // iOS 26+ poster event ticket. Only honored when style === "eventTicket".
  useEventTicketPoster: boolean;
  suppressHeaderDarkening: boolean;
  posterEventName: string;
  posterVenueName: string;
  posterVenueRegionName: string;
  posterVenueRoom: string;
  posterEventType: string; // "" = not set. One of POSTER_EVENT_TYPES.
  posterEventStartDate: string; // ISO 8601.
  posterPerformerNames: string; // Comma-separated list.
  posterAwayTeamAbbreviation: string;
  posterHomeTeamAbbreviation: string;

  // Relevance — Lock Screen surfacing rules.
  locations: EditorLocation[];
  relevantDates: EditorRelevantDate[];

  // Base64-encoded PNG bytes, keyed slot.variantKey (e.g., "icon.2x").
  assets: Record<string, string>;
}

export interface EditorField {
  key: string;
  label: string;
  value: string;
}

/**
 * Stored as strings so the RHF inputs stay uncontrolled + empty-friendly.
 * `buildDefinition` parses lat/long as floats and drops incomplete rows.
 */
export interface EditorLocation {
  latitude: string;
  longitude: string;
  altitude: string;
  relevantText: string;
}

export interface EditorRelevantDate {
  date: string;
  startDate: string;
  endDate: string;
}

export interface EditorDefaultsOverride {
  passTypeIdentifier?: string;
  teamIdentifier?: string;
}

/**
 * Shape of a per-style template: ONLY the style-specific fields. Merged
 * with the shared defaults in `defaultValues()`. Each template should
 * fully populate the fields that make this style visually distinct —
 * e.g., boardingPass uses from/to pairs, coupon uses promo code, etc.
 */
interface StyleTemplate {
  organizationName: string;
  description: string;
  logoText: string;
  backgroundColorHex: string;
  foregroundColorHex: string;
  labelColorHex: string;
  headerFields: EditorField[];
  primaryFields: EditorField[];
  secondaryFields: EditorField[];
  auxiliaryFields: EditorField[];
  backFields: EditorField[];
  additionalInfoFields?: EditorField[];
  transitType?: string;
  barcodeFormat: string;
  barcodeMessage: string;
  barcodeAltText: string;
  locations: EditorLocation[];
  relevantDates: EditorRelevantDate[];
  serialPrefix: string;
}

// --------- Per-style templates ---------

const GENERIC_TEMPLATE: StyleTemplate = {
  organizationName: "Example Co",
  description: "Employee ID",
  logoText: "Example Co",
  backgroundColorHex: "#1e293b",
  foregroundColorHex: "#f8fafc",
  labelColorHex: "#94a3b8",
  headerFields: [{ key: "badge", label: "BADGE", value: "A123" }],
  primaryFields: [{ key: "name", label: "NAME", value: "Liz Chetelat" }],
  secondaryFields: [{ key: "role", label: "ROLE", value: "Staff Engineer" }],
  auxiliaryFields: [{ key: "since", label: "MEMBER SINCE", value: "2021" }],
  backFields: [
    {
      key: "terms",
      label: "TERMS",
      value: "This pass is property of Example Co. Lost passes, please contact HR.",
    },
  ],
  barcodeFormat: "PKBarcodeFormatQR",
  barcodeMessage: "https://example.com/badge/A123",
  barcodeAltText: "A123",
  locations: [],
  relevantDates: [],
  serialPrefix: "gen",
};

const BOARDING_PASS_TEMPLATE: StyleTemplate = {
  organizationName: "Skyward Air",
  description: "Flight SK204 · SFO → JFK",
  logoText: "Skyward Air",
  backgroundColorHex: "#0f172a",
  foregroundColorHex: "#f1f5f9",
  labelColorHex: "#7dd3fc",
  headerFields: [{ key: "gate", label: "GATE", value: "B14" }],
  primaryFields: [
    { key: "origin", label: "SAN FRANCISCO", value: "SFO" },
    { key: "destination", label: "NEW YORK", value: "JFK" },
  ],
  secondaryFields: [
    { key: "passenger", label: "Passenger", value: "Liz Chetelat" },
    { key: "flight", label: "Flight", value: "SK204" },
  ],
  auxiliaryFields: [
    { key: "boards", label: "Boards", value: "2026-09-12T18:40:00Z" },
    { key: "seat", label: "Seat", value: "14A" },
    { key: "class", label: "Class", value: "Economy" },
  ],
  backFields: [
    {
      key: "confirmation",
      label: "CONFIRMATION",
      value: "XRT9P2",
    },
    {
      key: "terms",
      label: "TERMS OF CARRIAGE",
      value: "Arrive at the gate 30 minutes before departure.",
    },
  ],
  transitType: "PKTransitTypeAir",
  barcodeFormat: "PKBarcodeFormatPDF417",
  barcodeMessage: "M1CHETELAT/LIZ         XRT9P2 SFOJFKSK 0204 255Y014A0001 147",
  barcodeAltText: "XRT9P2",
  locations: [
    {
      latitude: "37.6213",
      longitude: "-122.3790",
      altitude: "",
      relevantText: "Welcome to SFO — Skyward Gate B14",
    },
  ],
  relevantDates: [
    {
      date: "",
      startDate: "2026-09-12T18:40:00Z",
      endDate: "2026-09-13T03:00:00Z",
    },
  ],
  serialPrefix: "bp",
};

const COUPON_TEMPLATE: StyleTemplate = {
  organizationName: "Moonlight Brews",
  description: "20% OFF · Moonlight Brews",
  logoText: "Moonlight Brews",
  backgroundColorHex: "#3b0764",
  foregroundColorHex: "#fdf4ff",
  labelColorHex: "#e9d5ff",
  headerFields: [{ key: "offer", label: "OFFER", value: "20% OFF" }],
  primaryFields: [
    { key: "promo", label: "PROMO CODE", value: "MOON20" },
  ],
  secondaryFields: [
    { key: "expires", label: "Expires", value: "2026-12-31T23:59:00Z" },
  ],
  auxiliaryFields: [
    { key: "terms", label: "Min. Order", value: "$15.00" },
  ],
  backFields: [
    {
      key: "details",
      label: "DETAILS",
      value:
        "Valid at any Moonlight Brews location. One redemption per customer. Not combinable with other offers.",
    },
  ],
  barcodeFormat: "PKBarcodeFormatQR",
  barcodeMessage: "MOON20",
  barcodeAltText: "MOON20",
  locations: [],
  relevantDates: [
    {
      date: "",
      startDate: "2026-04-25T00:00:00Z",
      endDate: "2026-12-31T23:59:00Z",
    },
  ],
  serialPrefix: "coup",
};

const EVENT_TICKET_TEMPLATE: StyleTemplate = {
  organizationName: "BOT-anist Disco",
  description: "BOT-anist Disco · Cupertino",
  logoText: "BOT-anist Disco",
  backgroundColorHex: "#581c87",
  foregroundColorHex: "#fdf4ff",
  labelColorHex: "#e9d5ff",
  headerFields: [
    {
      key: "date",
      label: "DATE",
      value: "2026-06-10T19:00:00Z",
    },
  ],
  primaryFields: [
    { key: "section", label: "General Admission", value: "GA" },
  ],
  secondaryFields: [
    { key: "sec", label: "Sec", value: "115" },
    { key: "row", label: "Row", value: "22" },
    { key: "seat", label: "Seat", value: "5" },
  ],
  auxiliaryFields: [
    { key: "venue", label: "Venue", value: "Flint Center" },
  ],
  backFields: [
    {
      key: "doors",
      label: "DOORS",
      value: "Doors open at 6:30 PM. Show starts at 7:00 PM.",
    },
  ],
  additionalInfoFields: [
    { key: "ageLimit", label: "Age Limit", value: "All ages" },
    { key: "parking", label: "Parking", value: "Lot A · $20 flat" },
  ],
  barcodeFormat: "PKBarcodeFormatQR",
  barcodeMessage: "evt-bot-anist-0001",
  barcodeAltText: "evt-0001",
  locations: [
    {
      latitude: "37.3220",
      longitude: "-122.0479",
      altitude: "",
      relevantText: "Welcome to the BOT-anist Disco",
    },
  ],
  relevantDates: [
    {
      date: "",
      startDate: "2026-06-10T18:30:00Z",
      endDate: "2026-06-10T23:00:00Z",
    },
  ],
  serialPrefix: "evt",
};

const STORE_CARD_TEMPLATE: StyleTemplate = {
  organizationName: "Ember Coffee Club",
  description: "Ember Coffee Club · Loyalty",
  logoText: "Ember Coffee",
  backgroundColorHex: "#7c2d12",
  foregroundColorHex: "#fff7ed",
  labelColorHex: "#fed7aa",
  headerFields: [{ key: "tier", label: "TIER", value: "Gold" }],
  primaryFields: [
    { key: "balance", label: "BALANCE", value: "$42.50" },
  ],
  secondaryFields: [
    { key: "points", label: "Points", value: "1,240" },
    { key: "since", label: "Member Since", value: "2024" },
  ],
  auxiliaryFields: [
    { key: "next", label: "Next Reward", value: "260 pts" },
  ],
  backFields: [
    {
      key: "terms",
      label: "TERMS",
      value:
        "Earn 1 point per $1 spent. 1,500 points = a free drink. Visit ember.example.com for full details.",
    },
  ],
  barcodeFormat: "PKBarcodeFormatQR",
  barcodeMessage: "ember-member-0001",
  barcodeAltText: "0001",
  locations: [],
  relevantDates: [],
  serialPrefix: "sc",
};

const TEMPLATES: Record<PassStyle, StyleTemplate> = {
  boardingPass: BOARDING_PASS_TEMPLATE,
  coupon: COUPON_TEMPLATE,
  eventTicket: EVENT_TICKET_TEMPLATE,
  generic: GENERIC_TEMPLATE,
  storeCard: STORE_CARD_TEMPLATE,
};

/**
 * Public entry point. Builds a fully-populated form state for the given
 * style. Overrides (env-sourced passTypeIdentifier / teamIdentifier)
 * win over the template's placeholders so the download link keeps
 * pointing at the user's real Apple credentials.
 */
export function defaultValues(
  style: PassStyle = "generic",
  overrides: EditorDefaultsOverride = {},
): EditorFormValues {
  const t = TEMPLATES[style];
  return {
    style,
    passTypeIdentifier: overrides.passTypeIdentifier ?? "pass.example.demo",
    teamIdentifier: overrides.teamIdentifier ?? "ABCDE12345",
    serialNumber: `${t.serialPrefix}-${Date.now().toString(36)}`,
    organizationName: t.organizationName,
    description: t.description,
    logoText: t.logoText,
    backgroundColorHex: t.backgroundColorHex,
    foregroundColorHex: t.foregroundColorHex,
    labelColorHex: t.labelColorHex,

    headerFields: deepClone(t.headerFields),
    primaryFields: deepClone(t.primaryFields),
    secondaryFields: deepClone(t.secondaryFields),
    auxiliaryFields: deepClone(t.auxiliaryFields),
    backFields: deepClone(t.backFields),
    additionalInfoFields: deepClone(t.additionalInfoFields ?? []),

    transitType: t.transitType ?? "PKTransitTypeGeneric",

    barcodeFormat: t.barcodeFormat,
    barcodeMessage: t.barcodeMessage,
    barcodeEncoding: "iso-8859-1",
    barcodeAltText: t.barcodeAltText,

    useEventTicketPoster: false,
    suppressHeaderDarkening: false,
    posterEventName: "",
    posterVenueName: "",
    posterVenueRegionName: "",
    posterVenueRoom: "",
    posterEventType: "",
    posterEventStartDate: "",
    posterPerformerNames: "",
    posterAwayTeamAbbreviation: "",
    posterHomeTeamAbbreviation: "",

    locations: deepClone(t.locations),
    relevantDates: deepClone(t.relevantDates),

    assets: {},
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
