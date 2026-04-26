/**
 * Programmatic fixture matrix for the fidelity harness.
 *
 * Writing 50 .json files would be unreviewable noise — the structural
 * delta between any two boarding-pass fixtures is a handful of values.
 * This module exports a single typed array of `FidelityFixture`s so each
 * entry stays concise, diffs stay readable, and we can reuse helpers
 * (colors, transit types, semantic-tag blocks) without copy-paste.
 *
 * The harness consumes `FIDELITY_FIXTURES` — see scripts/fidelity/run.ts
 * and app/fidelity/page.tsx. Each entry:
 *   - `key`    — unique URL-safe id, doubles as output directory name.
 *   - `assetKinds` — which synthetic images the harness should generate
 *                    for the pkpass build (icon is always included).
 *   - `fixture` — the pass.json itself (hand-typed object, not file).
 *
 * Coverage targets are documented in the section comments. The matrix is
 * deliberately diverse: different colors, barcode formats, date styles,
 * currency formatting, locations, relevance, and rare flags like
 * sharingProhibited / groupingIdentifier / back-field attributedValue.
 */

import type { ImageSlot } from "@/lib/pass-spec";

export interface FidelityFixture {
  key: string;
  assetKinds: readonly ImageSlot[];
  fixture: Readonly<Record<string, unknown>>;
}

// Shared constants --------------------------------------------------------

const PASS_TYPE_ID = "pass.example.demo";
const TEAM_ID = "ABCDE12345";
const FORMAT_VERSION = 1;

const PALETTES: Record<string, { bg: string; fg: string; label: string }> = {
  midnight: { bg: "rgb(15, 23, 42)", fg: "rgb(241, 245, 249)", label: "rgb(125, 211, 252)" },
  skyward: { bg: "rgb(21, 94, 117)", fg: "rgb(255, 255, 255)", label: "rgb(207, 250, 254)" },
  deltaBlue: { bg: "rgb(0, 45, 114)", fg: "rgb(255, 255, 255)", label: "rgb(220, 232, 255)" },
  unitedNavy: { bg: "rgb(3, 25, 99)", fg: "rgb(248, 250, 255)", label: "rgb(196, 213, 255)" },
  olive: { bg: "rgb(50, 69, 45)", fg: "rgb(253, 245, 230)", label: "rgb(201, 215, 168)" },
  mocha: { bg: "rgb(68, 43, 30)", fg: "rgb(255, 248, 236)", label: "rgb(222, 198, 173)" },
  plum: { bg: "rgb(59, 7, 100)", fg: "rgb(253, 244, 255)", label: "rgb(233, 213, 255)" },
  rose: { bg: "rgb(159, 18, 57)", fg: "rgb(255, 241, 242)", label: "rgb(254, 205, 211)" },
  forest: { bg: "rgb(20, 83, 45)", fg: "rgb(240, 253, 244)", label: "rgb(187, 247, 208)" },
  ember: { bg: "rgb(124, 45, 18)", fg: "rgb(255, 247, 237)", label: "rgb(254, 215, 170)" },
  mint: { bg: "rgb(207, 250, 228)", fg: "rgb(6, 78, 59)", label: "rgb(22, 101, 76)" },
  gold: { bg: "rgb(251, 191, 36)", fg: "rgb(17, 24, 39)", label: "rgb(55, 48, 18)" },
  grape: { bg: "rgb(88, 28, 135)", fg: "rgb(245, 243, 255)", label: "rgb(216, 180, 254)" },
  steel: { bg: "rgb(44, 52, 64)", fg: "rgb(236, 239, 244)", label: "rgb(129, 161, 193)" },
  sunset: { bg: "rgb(239, 68, 68)", fg: "rgb(255, 255, 255)", label: "rgb(254, 226, 226)" },
  fog: { bg: "rgb(229, 231, 235)", fg: "rgb(31, 41, 55)", label: "rgb(107, 114, 128)" },
  ocean: { bg: "rgb(14, 116, 144)", fg: "rgb(255, 255, 255)", label: "rgb(165, 243, 252)" },
  clay: { bg: "rgb(180, 83, 9)", fg: "rgb(255, 251, 235)", label: "rgb(253, 230, 138)" },
};

const ICON_LOGO: readonly ImageSlot[] = ["icon", "logo"];
const ICON_LOGO_STRIP: readonly ImageSlot[] = ["icon", "logo", "strip"];
const ICON_LOGO_FOOTER: readonly ImageSlot[] = ["icon", "logo", "footer"];
const ICON_LOGO_THUMB: readonly ImageSlot[] = ["icon", "logo", "thumbnail"];
const ICON_LOGO_BG_THUMB: readonly ImageSlot[] = ["icon", "logo", "background", "thumbnail"];

// -- helpers -------------------------------------------------------------

function base(
  style: string,
  serial: string,
  org: string,
  description: string,
  palette: keyof typeof PALETTES,
  logoText?: string,
): Record<string, unknown> {
  const p = PALETTES[palette];
  return {
    formatVersion: FORMAT_VERSION,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    serialNumber: serial,
    organizationName: org,
    description,
    backgroundColor: p.bg,
    foregroundColor: p.fg,
    labelColor: p.label,
    ...(logoText ? { logoText } : {}),
    style,
  };
}

function qr(message: string, altText?: string): Record<string, unknown> {
  return {
    format: "PKBarcodeFormatQR",
    message,
    messageEncoding: "iso-8859-1",
    ...(altText ? { altText } : {}),
  };
}
function pdf417(message: string, altText?: string): Record<string, unknown> {
  return {
    format: "PKBarcodeFormatPDF417",
    message,
    messageEncoding: "iso-8859-1",
    ...(altText ? { altText } : {}),
  };
}
function aztec(message: string, altText?: string): Record<string, unknown> {
  return {
    format: "PKBarcodeFormatAztec",
    message,
    messageEncoding: "iso-8859-1",
    ...(altText ? { altText } : {}),
  };
}
function code128(message: string, altText?: string): Record<string, unknown> {
  return {
    format: "PKBarcodeFormatCode128",
    message,
    messageEncoding: "iso-8859-1",
    ...(altText ? { altText } : {}),
  };
}

// ========================================================================
// Boarding pass fixtures (10)
//
// Coverage: all 5 transit types; row 0/1 split on auxiliary; PDF417 + Aztec
// barcodes; short/medium/long dateStyle; ISO 8601 dates with
// ignoresTimeZone; international flights (multi-character airport codes).
// ========================================================================

const BOARDING_FIXTURES: FidelityFixture[] = [
  {
    key: "bp-air-dl773",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-dl773-0001", "Delta-like Air", "DL 773 · JFK → LAX", "deltaBlue", "Fleet"),
      groupingIdentifier: "trip-dl773-0609",
      boardingPass: {
        transitType: "PKTransitTypeAir",
        headerFields: [
          { key: "flight", label: "FLIGHT", value: "DL 773" },
          { key: "date", label: "DATE", value: "2026-06-09T12:55:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
        primaryFields: [
          { key: "from", label: "NEW YORK", value: "JFK" },
          { key: "to", label: "LOS ANGELES", value: "LAX" },
        ],
        secondaryFields: [
          { key: "sched", label: "SCHEDULED", value: "2026-06-09T13:55:00Z", dateStyle: "PKDateStyleNone", timeStyle: "PKDateStyleShort" },
          { key: "term", label: "TERM", value: "4" },
          { key: "gate", label: "GATE", value: "B30" },
          { key: "group", label: "GROUP", value: "3" },
          { key: "seat", label: "SEAT", value: "30C" },
        ],
        auxiliaryFields: [
          { key: "pax", label: "PASSENGER", value: "RAUL HERNANDEZ" },
          { key: "tsa", label: "TSA Pre✓", value: "YES" },
        ],
        backFields: [
          { key: "conf", label: "CONFIRMATION", value: "XRT9P2" },
          { key: "bag", label: "BAG CLAIM", value: "25" },
        ],
      },
      barcodes: [qr("DL773-XRT9P2-30C", "XRT9P2")],
    },
  },
  {
    key: "bp-air-ua881",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-ua881-0001", "United-like Air", "UA 881 · ORD → HND", "unitedNavy", "STAR ALLIANCE MEMBER"),
      boardingPass: {
        transitType: "PKTransitTypeAir",
        headerFields: [{ key: "flight", label: "FLIGHT", value: "UA 881" }],
        primaryFields: [
          { key: "from", label: "CHICAGO", value: "ORD" },
          { key: "to", label: "TOKYO", value: "HND" },
        ],
        secondaryFields: [
          { key: "dep", label: "DEPART", value: "2026-06-09T17:50:00Z", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone" },
          { key: "arr", label: "ARRIVE", value: "2026-06-10T19:55:00Z", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone" },
          { key: "gate", label: "GATE", value: "C16" },
          { key: "group", label: "GROUP", value: "3" },
          { key: "seat", label: "SEAT", value: "44A" },
        ],
        auxiliaryFields: [
          { key: "pax", label: "PASSENGER", value: "DANNY RICO" },
          { key: "status", label: "STATUS", value: "Travel Ready" },
          { key: "class", label: "CLASS", value: "Economy" },
        ],
        backFields: [
          { key: "kit", label: "CARRY-ON", value: "1 personal item + 1 carry-on" },
          { key: "pets", label: "SERVICE ANIMAL", value: "Approved" },
        ],
      },
      barcodes: [pdf417("M1RICO/DANNY          UA0881 ORDHND 3  44A", "UA881")],
    },
  },
  {
    key: "bp-air-sk204",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-sk204-0001", "Skyward Air", "SK 204 · SFO → JFK", "skyward", "Skyward Air"),
      expirationDate: "2026-09-13T03:00:00Z",
      relevantDates: [
        { startDate: "2026-09-12T17:40:00Z", endDate: "2026-09-13T03:00:00Z" },
      ],
      locations: [
        { latitude: 37.6213, longitude: -122.379, relevantText: "Gate B14 · SFO" },
      ],
      boardingPass: {
        transitType: "PKTransitTypeAir",
        headerFields: [{ key: "gate", label: "GATE", value: "B14" }],
        primaryFields: [
          { key: "from", label: "SAN FRANCISCO", value: "SFO" },
          { key: "to", label: "NEW YORK", value: "JFK" },
        ],
        secondaryFields: [
          { key: "sched", label: "SCHEDULED", value: "2026-09-12T18:40:00Z", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone" },
          { key: "flight", label: "FLIGHT", value: "SK 204" },
          { key: "seat", label: "SEAT", value: "14A" },
          { key: "group", label: "GROUP", value: "B" },
        ],
        auxiliaryFields: [
          { key: "pax", label: "PASSENGER", value: "Liz Chetelat" },
          { key: "class", label: "CLASS", value: "Economy" },
        ],
      },
      barcodes: [qr("SK204-XRT9P2-14A")],
    },
  },
  {
    key: "bp-train-acela",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-acela-0001", "Northeast Rail", "Acela 2173 · WAS → BOS", "sunset", "NE Rail"),
      relevantDates: [{ startDate: "2026-07-04T08:05:00Z", endDate: "2026-07-04T15:45:00Z" }],
      boardingPass: {
        transitType: "PKTransitTypeTrain",
        headerFields: [{ key: "train", label: "TRAIN", value: "2173" }],
        primaryFields: [
          { key: "from", label: "WASHINGTON", value: "WAS" },
          { key: "to", label: "BOSTON", value: "BOS" },
        ],
        secondaryFields: [
          { key: "dep", label: "DEPART", value: "2026-07-04T08:05:00Z", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone" },
          { key: "arr", label: "ARRIVE", value: "2026-07-04T15:45:00Z", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone" },
          { key: "car", label: "CAR", value: "6" },
          { key: "seat", label: "SEAT", value: "14B" },
        ],
        auxiliaryFields: [
          { key: "pax", label: "PASSENGER", value: "Phoenix Rivers" },
          { key: "class", label: "CLASS", value: "Business" },
        ],
      },
      barcodes: [aztec("NR-ACELA-2173-14B", "Acela 2173")],
    },
  },
  {
    key: "bp-train-commuter",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-caltrain-0001", "Baybound Commuter", "Commuter Pass · Peninsula Line", "olive", "Baybound"),
      boardingPass: {
        transitType: "PKTransitTypeTrain",
        headerFields: [{ key: "zone", label: "ZONES", value: "1-4" }],
        primaryFields: [
          { key: "from", label: "PALO ALTO", value: "PAO" },
          { key: "to", label: "SAN FRANCISCO", value: "SFC" },
        ],
        secondaryFields: [
          { key: "valid", label: "VALID", value: "Monthly" },
          { key: "exp", label: "THROUGH", value: "2026-07-31T23:59:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
        auxiliaryFields: [{ key: "pax", label: "PASSENGER", value: "Morgan Patel" }],
      },
      barcodes: [code128("NR5521904", "NR5521904")],
    },
  },
  {
    key: "bp-bus-greyhound",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-bus-0001", "Interstate Coach", "SF → LA overnight", "steel", "Interstate"),
      boardingPass: {
        transitType: "PKTransitTypeBus",
        headerFields: [{ key: "bus", label: "BUS", value: "4412" }],
        primaryFields: [
          { key: "from", label: "SAN FRANCISCO", value: "SFC" },
          { key: "to", label: "LOS ANGELES", value: "LAX" },
        ],
        secondaryFields: [
          { key: "dep", label: "DEPART", value: "2026-10-11T22:30:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
          { key: "arr", label: "ARRIVE", value: "2026-10-12T06:45:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
          { key: "seat", label: "SEAT", value: "21" },
        ],
        auxiliaryFields: [{ key: "pax", label: "PASSENGER", value: "Joan Bellingham" }],
      },
      barcodes: [qr("IC-4412-21-OCT11")],
    },
  },
  {
    key: "bp-ferry-harbor",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-ferry-0001", "Harbor Ferry", "Pier 41 → Sausalito", "ocean", "Harbor Ferry"),
      boardingPass: {
        transitType: "PKTransitTypeBoat",
        headerFields: [{ key: "boat", label: "VESSEL", value: "MV Pelican" }],
        primaryFields: [
          { key: "from", label: "PIER 41", value: "SFW" },
          { key: "to", label: "SAUSALITO", value: "SAU" },
        ],
        secondaryFields: [
          { key: "dep", label: "DEPARTS", value: "2026-05-18T14:30:00Z", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone" },
          { key: "dock", label: "DOCK", value: "B" },
          { key: "deck", label: "DECK", value: "Upper" },
        ],
        auxiliaryFields: [{ key: "pax", label: "PASSENGER", value: "Phoenix Rivers" }],
      },
      barcodes: [qr("HF-PELICAN-0501")],
    },
  },
  {
    key: "bp-generic-shuttle",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-shuttle-0001", "Campus Shuttle", "Main Campus → Airport", "mint", "Campus"),
      boardingPass: {
        transitType: "PKTransitTypeGeneric",
        primaryFields: [
          { key: "from", label: "MAIN CAMPUS", value: "CAMPUS" },
          { key: "to", label: "SFO", value: "SFO" },
        ],
        secondaryFields: [
          { key: "pickup", label: "PICKUP", value: "2026-08-15T05:30:00Z", dateStyle: "PKDateStyleShort", timeStyle: "PKDateStyleShort" },
          { key: "eta", label: "ETA", value: "06:15 AM" },
          { key: "seat", label: "SEAT", value: "12" },
        ],
        auxiliaryFields: [{ key: "pax", label: "PASSENGER", value: "Arjun Lohan" }],
      },
      barcodes: [qr("SHUTTLE-0815-12")],
    },
  },
  {
    key: "bp-air-minimal",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-air-min-0001", "Thrifty Jet", "DEN → PHX", "clay", "Thrifty Jet"),
      boardingPass: {
        transitType: "PKTransitTypeAir",
        headerFields: [{ key: "flight", label: "FL", value: "TJ 412" }],
        primaryFields: [
          { key: "from", label: "DENVER", value: "DEN" },
          { key: "to", label: "PHOENIX", value: "PHX" },
        ],
        secondaryFields: [{ key: "seat", label: "SEAT", value: "22F" }],
        auxiliaryFields: [{ key: "pax", label: "PAX", value: "Sam Kim" }],
      },
      barcodes: [qr("TJ412-22F")],
    },
  },
  {
    key: "bp-air-richback",
    assetKinds: ICON_LOGO_FOOTER,
    fixture: {
      ...base("boardingPass", "bp-air-richback-0001", "Cloudline Air", "YYZ → FRA · long-haul", "midnight", "Cloudline"),
      sharingProhibited: true,
      boardingPass: {
        transitType: "PKTransitTypeAir",
        headerFields: [{ key: "flight", label: "FLIGHT", value: "CL 2026" }],
        primaryFields: [
          { key: "from", label: "TORONTO", value: "YYZ" },
          { key: "to", label: "FRANKFURT", value: "FRA" },
        ],
        secondaryFields: [
          // International flight: depart wall-clock in YYZ (ET), arrive in
          // FRA (CET). ignoresTimeZone: true pins each to its local
          // wall-clock so the boarding time reads correctly on any device.
          { key: "dep", label: "DEPART", value: "2026-11-18T22:10:00-05:00", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone", ignoresTimeZone: true },
          { key: "arr", label: "ARRIVE", value: "2026-11-19T11:45:00+01:00", timeStyle: "PKDateStyleShort", dateStyle: "PKDateStyleNone", ignoresTimeZone: true },
          { key: "gate", label: "GATE", value: "E71" },
          { key: "seat", label: "SEAT", value: "3A" },
        ],
        auxiliaryFields: [{ key: "pax", label: "PASSENGER", value: "Priyanka R. Desai" }],
        backFields: [
          {
            key: "terms",
            label: "TERMS",
            value: "Boarding closes 20 minutes before departure. Visit cloudline.example for rebooking.",
            attributedValue: `Visit <a href="https://cloudline.example/rebook">cloudline.example/rebook</a> to rebook.`,
            dataDetectorTypes: ["PKDataDetectorTypeLink"],
            changeMessage: "Gate changed to %@.",
          },
          { key: "meal", label: "MEAL", value: "Kosher" },
          { key: "baggage", label: "BAGS CHECKED", value: "2" },
        ],
      },
      barcodes: [pdf417("M1DESAI/PRIYANKA      CL2026 YYZFRA 1  003A", "CL2026-3A")],
    },
  },
];

// ========================================================================
// Coupon fixtures (10)
//
// Coverage: % off, flat $, BOGO, gift; QR + Aztec + Code128 + PDF417;
// dateStyle Short/Medium; expirationDate + relevantDates; currencyCode.
// ========================================================================

const COUPON_FIXTURES: FidelityFixture[] = [
  {
    key: "cpn-moonlight-20",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-moon-0001", "Moonlight Brews", "20% OFF · Moonlight Brews", "plum", "Moonlight"),
      expirationDate: "2026-12-31T23:59:00Z",
      coupon: {
        headerFields: [{ key: "offer", label: "OFFER", value: "20% OFF" }],
        primaryFields: [{ key: "promo", label: "PROMO CODE", value: "MOON20" }],
        secondaryFields: [
          { key: "expires", label: "EXPIRES", value: "2026-12-31T23:59:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
        auxiliaryFields: [
          { key: "min", label: "MIN ORDER", value: "15.00", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" },
        ],
        backFields: [
          { key: "terms", label: "TERMS", value: "One use per customer. Not combinable with other offers." },
        ],
      },
      barcodes: [qr("MOON20", "MOON20")],
    },
  },
  {
    key: "cpn-baker-bogo",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-bogo-0001", "Golden Crust Bakery", "BOGO · Pastries", "gold", "Golden Crust"),
      coupon: {
        headerFields: [{ key: "offer", label: "OFFER", value: "BUY 1 GET 1" }],
        primaryFields: [{ key: "promo", label: "CODE", value: "PASTRY2FOR1" }],
        secondaryFields: [{ key: "valid", label: "VALID", value: "Weekends only" }],
        backFields: [
          { key: "terms", label: "TERMS", value: "Dine-in only. Pastries of equal or lesser value." },
        ],
      },
      barcodes: [aztec("PASTRY2FOR1", "BOGO")],
    },
  },
  {
    key: "cpn-petal-flat10",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-petal-0001", "Petal Florist", "$10 off bouquets", "rose", "Petal"),
      expirationDate: "2026-06-30T23:59:00Z",
      coupon: {
        headerFields: [{ key: "off", label: "AMOUNT OFF", value: "10.00", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" }],
        primaryFields: [{ key: "promo", label: "CODE", value: "BLOOM10" }],
        secondaryFields: [
          { key: "min", label: "MIN ORDER", value: "35.00", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" },
        ],
        backFields: [{ key: "terms", label: "TERMS", value: "Valid at any Petal Florist location." }],
      },
      barcodes: [qr("BLOOM10", "BLOOM10")],
    },
  },
  {
    key: "cpn-gift-50",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-gift-0001", "Ember Coffee Club", "Gift card · $50", "ember", "Ember Coffee"),
      coupon: {
        headerFields: [{ key: "type", label: "TYPE", value: "Gift Card" }],
        primaryFields: [{ key: "bal", label: "BALANCE", value: "50.00", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" }],
        secondaryFields: [
          { key: "from", label: "FROM", value: "Amelia" },
          { key: "to", label: "TO", value: "Jordan" },
        ],
      },
      barcodes: [code128("EMBER-GC-000501", "0005 01")],
    },
  },
  {
    key: "cpn-fashion-holiday",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-holiday-0001", "Aurora Apparel", "Holiday 30% off", "forest", "COMPANY NAME"),
      relevantDates: [{ startDate: "2026-11-24T00:00:00Z", endDate: "2026-11-28T23:59:00Z" }],
      coupon: {
        headerFields: [{ key: "off", label: "OFF", value: "30%" }],
        primaryFields: [{ key: "off2", label: "SAVE", value: "30% OFF" }],
        secondaryFields: [
          { key: "win", label: "WINDOW", value: "2026-11-24T00:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
        auxiliaryFields: [{ key: "channel", label: "WHERE", value: "Stores + Online" }],
      },
      barcodes: [pdf417("AURORA30FRIDAY", "AURORA30")],
    },
  },
  {
    key: "cpn-sushi-minimal",
    assetKinds: ICON_LOGO,
    fixture: {
      ...base("coupon", "cpn-sushi-0001", "Maki Bar", "Free miso soup", "midnight", "Maki Bar"),
      coupon: {
        primaryFields: [{ key: "offer", label: "OFFER", value: "FREE MISO" }],
        secondaryFields: [{ key: "with", label: "WITH", value: "Any entrée" }],
      },
      barcodes: [qr("MAKI-MISO")],
    },
  },
  {
    key: "cpn-grocery-15",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-grocery-0001", "Greenfield Grocers", "15% off produce", "mint", "Greenfield"),
      coupon: {
        headerFields: [{ key: "off", label: "OFF", value: "15%" }],
        primaryFields: [{ key: "dept", label: "DEPT", value: "Produce" }],
        secondaryFields: [{ key: "until", label: "UNTIL", value: "2026-04-30T23:59:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" }],
        backFields: [{ key: "terms", label: "TERMS", value: "Excludes sale items." }],
      },
      barcodes: [qr("GF-PROD15", "PROD15")],
    },
  },
  {
    key: "cpn-tickets-subscribe",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-tickets-0001", "Frame One Cinema", "2-for-1 Tuesdays", "sunset", "Frame One"),
      coupon: {
        headerFields: [{ key: "when", label: "WHEN", value: "Every Tue" }],
        primaryFields: [{ key: "offer", label: "OFFER", value: "2 for 1" }],
        secondaryFields: [{ key: "cat", label: "CATEGORY", value: "Standard seats" }],
      },
      barcodes: [aztec("FRAMEONE-TUE-2FOR1", "TUE2FOR1")],
    },
  },
  {
    key: "cpn-learning-early",
    assetKinds: ICON_LOGO,
    fixture: {
      ...base("coupon", "cpn-learn-0001", "Atlas Academy", "Early-bird 25% off course", "steel", "Atlas"),
      coupon: {
        headerFields: [{ key: "off", label: "OFF", value: "25%" }],
        primaryFields: [{ key: "course", label: "COURSE", value: "Data structures" }],
        secondaryFields: [
          { key: "starts", label: "STARTS", value: "2026-09-01T15:00:00Z", dateStyle: "PKDateStyleLong", timeStyle: "PKDateStyleNone" },
        ],
      },
      barcodes: [qr("ATLAS-DS-EARLY25")],
    },
  },
  {
    key: "cpn-spa-voucher",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("coupon", "cpn-spa-0001", "Serenity Spa", "Voucher · 60-min massage", "fog", "Serenity"),
      sharingProhibited: true,
      coupon: {
        headerFields: [{ key: "type", label: "TYPE", value: "Voucher" }],
        primaryFields: [{ key: "title", label: "SERVICE", value: "60-min deep tissue" }],
        secondaryFields: [
          { key: "val", label: "VALUE", value: "125.00", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" },
          { key: "code", label: "CODE", value: "SPA-8861" },
        ],
        backFields: [
          { key: "terms", label: "TERMS", value: "Non-transferable. Single-use. Non-refundable." },
        ],
      },
      barcodes: [code128("SPA8861", "SPA 8861")],
    },
  },
];

// ========================================================================
// Event ticket fixtures (10)
//
// Coverage: GA vs reserved; sports (team abbreviations), live performance
// (performer names), movie, conference, festival; classic strip vs
// background+thumbnail layouts; additionalInfoFields; locations; dark
// poster fallback (without NFC so preview matches Wallet's classic render).
// ========================================================================

const EVENT_FIXTURES: FidelityFixture[] = [
  {
    key: "evt-concert-fallen",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-fallen-0001", "Apollo Live", "Fallen Voices Live · Apollo Theater", "plum", "Apollo Live"),
      relevantDate: "2026-09-12T20:00:00Z",
      relevantDates: [{ startDate: "2026-09-12T19:00:00Z", endDate: "2026-09-13T00:30:00Z" }],
      locations: [{ latitude: 40.809898, longitude: -73.950089, relevantText: "Apollo Theater — doors at 7" }],
      semantics: {
        eventName: "Fallen Voices Live",
        venueName: "Apollo Theater",
        venueRegionName: "New York, NY",
        venueRoom: "Main Stage",
        eventType: "PKEventTypeLivePerformance",
        eventStartDate: "2026-09-12T20:00:00Z",
        performerNames: ["Phoenix Rivers", "The Outliers"],
      },
      eventTicket: {
        headerFields: [
          // ignoresTimeZone: true so Wallet always displays 8:00 PM — the
          // door time the author intended — regardless of where the ticket
          // holder opens the pass.
          { key: "date", label: "DATE", value: "2026-09-12T20:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort", ignoresTimeZone: true },
        ],
        primaryFields: [{ key: "name", label: "EVENT", value: "Fallen Voices Live" }],
        secondaryFields: [
          { key: "sec", label: "Section", value: "ORCH" },
          { key: "row", label: "Row", value: "D" },
          { key: "seat", label: "Seat", value: "14" },
        ],
        auxiliaryFields: [{ key: "venue", label: "VENUE", value: "Apollo Theater" }],
        additionalInfoFields: [
          { key: "gates", label: "Gates Open", value: "7:00 PM" },
          { key: "curfew", label: "Curfew", value: "11:30 PM" },
        ],
      },
      barcodes: [qr("evt-fallen-0001")],
    },
  },
  {
    key: "evt-sports-angels",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-angels-0001", "Oracle Park Live", "Angels at Giants · MLB", "ocean", "Oracle Park"),
      semantics: {
        eventName: "Angels at Giants",
        venueName: "Oracle Park",
        venueRegionName: "San Francisco, CA",
        venueRoom: "Main Field",
        eventType: "PKEventTypeSports",
        eventStartDate: "2026-08-10T19:30:00Z",
        awayTeamAbbreviation: "LAA",
        homeTeamAbbreviation: "SFG",
        awayTeamName: "Los Angeles Angels",
        homeTeamName: "San Francisco Giants",
      },
      eventTicket: {
        headerFields: [
          { key: "date", label: "GAME", value: "2026-08-10T19:30:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [
          { key: "away", label: "AWAY", value: "LAA" },
          { key: "home", label: "HOME", value: "SFG" },
        ],
        secondaryFields: [
          { key: "sec", label: "Section", value: "VRF 114" },
          { key: "row", label: "Row", value: "24" },
          { key: "seat", label: "Seat", value: "7" },
        ],
        auxiliaryFields: [{ key: "gate", label: "Gate", value: "B" }],
      },
      barcodes: [qr("evt-angels-0001")],
    },
  },
  {
    key: "evt-movie-frame",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("eventTicket", "evt-movie-0001", "Frame One Cinema", "Starshade (2026) · 7:15 PM", "sunset", "Frame One"),
      semantics: {
        eventName: "Starshade",
        venueName: "Frame One Cinema",
        venueRegionName: "Oakland, CA",
        venueRoom: "Auditorium 3",
        eventType: "PKEventTypeMovie",
        eventStartDate: "2026-07-18T19:15:00Z",
      },
      eventTicket: {
        headerFields: [
          { key: "time", label: "TIME", value: "2026-07-18T19:15:00Z", dateStyle: "PKDateStyleNone", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [{ key: "title", label: "MOVIE", value: "Starshade" }],
        secondaryFields: [
          { key: "aud", label: "Auditorium", value: "3" },
          { key: "seat", label: "Seat", value: "F12" },
        ],
      },
      barcodes: [qr("FRAME-STARSHADE-F12")],
    },
  },
  {
    key: "evt-conf-devdays",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-devdays-0001", "DevDays 2026", "DevDays · Moscone Center", "midnight", "DevDays"),
      semantics: {
        eventName: "DevDays 2026",
        venueName: "Moscone Center",
        venueRegionName: "San Francisco, CA",
        venueRoom: "Hall A",
        eventType: "PKEventTypeConference",
        eventStartDate: "2026-11-15T09:00:00Z",
        eventEndDate: "2026-11-17T17:00:00Z",
      },
      eventTicket: {
        headerFields: [
          { key: "date", label: "DATES", value: "2026-11-15T09:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
        primaryFields: [{ key: "name", label: "ATTENDEE", value: "Arjun Lohan" }],
        secondaryFields: [
          { key: "badge", label: "BADGE", value: "All Access" },
          { key: "id", label: "ID", value: "DD-2026-4811" },
        ],
        additionalInfoFields: [
          { key: "track", label: "Track", value: "Platform" },
          { key: "hotel", label: "Hotel", value: "Marriott Marquis" },
        ],
      },
      barcodes: [aztec("DD-2026-4811")],
    },
  },
  {
    key: "evt-theater-shakes",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-shakes-0001", "Riverbend Shakespeare", "A Midsummer Night's Dream", "forest", "Riverbend"),
      semantics: {
        eventName: "A Midsummer Night's Dream",
        venueName: "Riverbend Amphitheater",
        venueRegionName: "Portland, OR",
        venueRoom: "Green Lawn",
        eventType: "PKEventTypeLivePerformance",
        eventStartDate: "2026-07-14T20:00:00Z",
        performerNames: ["Portland Shakes Ensemble"],
      },
      eventTicket: {
        headerFields: [
          // PKDateStyleMedium keeps the header date to one line. PKDateStyleFull
          // expands to ~37 chars ("Tuesday, July 14, 2026 at 8:00 PM"), which is
          // realistic only in back-field text or an additionalInfoFields row;
          // Wallet's header font + narrow column would wrap the full form.
          { key: "date", label: "DATE", value: "2026-07-14T20:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [{ key: "play", label: "PLAY", value: "A Midsummer Night's Dream" }],
        secondaryFields: [
          { key: "sec", label: "Section", value: "Lawn" },
          { key: "row", label: "Row", value: "N/A" },
          { key: "seat", label: "Seat", value: "GA" },
        ],
      },
      barcodes: [qr("RIVERBEND-MIDSUMMER-0714")],
    },
  },
  {
    key: "evt-museum-timed",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-museum-0001", "Hall of Light Museum", "Luminous · timed entry", "fog", "Hall of Light"),
      eventTicket: {
        headerFields: [
          { key: "time", label: "ENTRY", value: "2026-05-18T14:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [{ key: "exhibit", label: "EXHIBIT", value: "Luminous: 200 Years of Light" }],
        secondaryFields: [
          { key: "ticket", label: "TYPE", value: "Adult" },
          { key: "count", label: "QTY", value: "2" },
        ],
      },
      barcodes: [qr("HOL-LUMINOUS-2-0518")],
    },
  },
  {
    key: "evt-festival-camp",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-fest-0001", "Sierra Sound", "Sierra Sound Fest · 3-day", "clay", "Sierra Sound"),
      semantics: {
        eventName: "Sierra Sound Fest",
        venueName: "Mariposa Meadows",
        venueRegionName: "Mariposa, CA",
        venueRoom: "Main Grounds",
        eventType: "PKEventTypeLivePerformance",
        eventStartDate: "2026-08-21T15:00:00Z",
        eventEndDate: "2026-08-23T23:00:00Z",
        performerNames: ["Phoenix Rivers", "The Outliers", "Kora Sound", "Mellow Tides", "Blue Electric"],
      },
      eventTicket: {
        headerFields: [
          { key: "dates", label: "DATES", value: "2026-08-21T15:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
        primaryFields: [{ key: "name", label: "FEST", value: "Sierra Sound 26" }],
        secondaryFields: [
          { key: "pass", label: "PASS", value: "3-day GA" },
          { key: "camp", label: "CAMP", value: "Yes" },
        ],
        additionalInfoFields: [
          { key: "gates", label: "Gates Open", value: "Fri 12:00 PM" },
          { key: "curfew", label: "Curfew", value: "11:00 PM" },
        ],
      },
      barcodes: [qr("SIERRA26-3DAY-CAMP")],
    },
  },
  {
    key: "evt-standup-mic",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("eventTicket", "evt-mic-0001", "Open Mic Room", "Comedy · Sat 9 PM", "rose", "Open Mic"),
      eventTicket: {
        headerFields: [
          { key: "date", label: "DATE", value: "2026-04-26T21:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [{ key: "show", label: "SHOW", value: "Late Night Mic" }],
        secondaryFields: [
          { key: "row", label: "Row", value: "A" },
          { key: "seat", label: "Seat", value: "5" },
        ],
      },
      barcodes: [qr("MIC-SAT-A5")],
    },
  },
  {
    key: "evt-sports-cup",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-cup-0001", "City FC", "City FC vs Rivers United", "grape", "City FC"),
      semantics: {
        eventName: "City FC vs Rivers United",
        venueName: "Crown Stadium",
        venueRegionName: "Seattle, WA",
        venueRoom: "Pitch",
        eventType: "PKEventTypeSports",
        eventStartDate: "2026-10-04T19:30:00Z",
        awayTeamAbbreviation: "RUV",
        homeTeamAbbreviation: "CFC",
      },
      eventTicket: {
        headerFields: [
          { key: "date", label: "MATCH", value: "2026-10-04T19:30:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [
          { key: "away", label: "AWAY", value: "RUV" },
          { key: "home", label: "HOME", value: "CFC" },
        ],
        secondaryFields: [
          { key: "block", label: "Block", value: "North 214" },
          { key: "row", label: "Row", value: "12" },
          { key: "seat", label: "Seat", value: "9" },
        ],
      },
      barcodes: [qr("CFC-RUV-N214-12-9")],
    },
  },
  {
    key: "evt-charity-gala",
    assetKinds: ICON_LOGO_BG_THUMB,
    fixture: {
      ...base("eventTicket", "evt-gala-0001", "Harvest Foundation", "Annual Gala · 2026", "gold", "Harvest"),
      sharingProhibited: true,
      eventTicket: {
        headerFields: [
          { key: "date", label: "DATE", value: "2026-10-25T18:30:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
        primaryFields: [{ key: "guest", label: "GUEST", value: "Dr. Priyanka Desai" }],
        secondaryFields: [
          { key: "table", label: "TABLE", value: "14" },
          { key: "seat", label: "Seat", value: "3" },
        ],
        additionalInfoFields: [
          { key: "dress", label: "Dress", value: "Black Tie" },
          { key: "park", label: "Parking", value: "Valet · $25" },
        ],
      },
      barcodes: [qr("HV-GALA-26-T14-S3")],
    },
  },
];

// ========================================================================
// Generic fixtures (10)
//
// Coverage: employee ID, gym, library, student, conference attendee,
// volunteer, VIP, press, lounge, loyalty non-card. Mix of dark/light
// palettes; back-field attributedValue; dataDetectorTypes.
// ========================================================================

const GENERIC_FIXTURES: FidelityFixture[] = [
  {
    key: "gen-employee",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-emp-0001", "Example Co", "Employee ID · Example Co", "midnight", "Example Co"),
      generic: {
        headerFields: [{ key: "badge", label: "BADGE", value: "A123" }],
        primaryFields: [{ key: "name", label: "NAME", value: "Liz Chetelat" }],
        secondaryFields: [
          { key: "role", label: "ROLE", value: "Staff Engineer" },
          { key: "team", label: "TEAM", value: "Platform" },
        ],
        auxiliaryFields: [{ key: "since", label: "MEMBER SINCE", value: "2021" }],
        backFields: [
          {
            key: "help",
            label: "LOST BADGE",
            value: "Contact IT at help@example.com or call (555) 010-1234.",
            dataDetectorTypes: ["PKDataDetectorTypeLink", "PKDataDetectorTypePhoneNumber"],
          },
        ],
      },
      barcodes: [qr("https://example.com/badge/A123", "A123")],
    },
  },
  {
    key: "gen-gym",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-gym-0001", "Iron Hall Gym", "Iron Hall membership", "ember", "Iron Hall"),
      generic: {
        headerFields: [{ key: "tier", label: "PLAN", value: "Unlimited" }],
        primaryFields: [{ key: "member", label: "MEMBER", value: "Phoenix Rivers" }],
        secondaryFields: [
          { key: "mid", label: "MEMBER ID", value: "IH-2026-884" },
          { key: "since", label: "SINCE", value: "2023" },
        ],
      },
      barcodes: [code128("IH2026884", "IH2026884")],
    },
  },
  {
    key: "gen-library",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-lib-0001", "Ferry Hill Library", "Ferry Hill Library card", "forest", "Ferry Hill Library"),
      generic: {
        headerFields: [{ key: "card", label: "CARD", value: "FH-884201" }],
        primaryFields: [{ key: "patron", label: "PATRON", value: "Arjun Lohan" }],
        secondaryFields: [
          { key: "exp", label: "EXPIRES", value: "2027-04-01T00:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
      },
      barcodes: [code128("FH884201")],
    },
  },
  {
    key: "gen-student",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-stu-0001", "Bay Uni", "Student ID · CS-401", "grape", "Bay Uni"),
      generic: {
        headerFields: [{ key: "acad", label: "YEAR", value: "2026–2027" }],
        primaryFields: [{ key: "name", label: "STUDENT", value: "Danny Rico" }],
        secondaryFields: [
          { key: "sid", label: "ID", value: "90218442" },
          { key: "major", label: "MAJOR", value: "Computer Science" },
        ],
      },
      barcodes: [qr("BAY-STU-90218442", "90218442")],
    },
  },
  {
    key: "gen-conference-attendee",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-conf-0001", "Open Source Summit", "OSS Summit · 2026", "steel", "OSS Summit"),
      generic: {
        headerFields: [{ key: "track", label: "TRACK", value: "Kernel" }],
        primaryFields: [{ key: "name", label: "ATTENDEE", value: "Morgan Patel" }],
        secondaryFields: [
          { key: "role", label: "ROLE", value: "Speaker" },
          { key: "day", label: "DAY 1", value: "Tue 5/12" },
        ],
        auxiliaryFields: [{ key: "seat", label: "TABLE", value: "15" }],
      },
      barcodes: [aztec("OSS-26-SPK-MP")],
    },
  },
  {
    key: "gen-volunteer",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-vol-0001", "City Marathon", "Volunteer credential", "sunset", "City Marathon"),
      generic: {
        headerFields: [{ key: "zone", label: "ZONE", value: "8" }],
        primaryFields: [{ key: "name", label: "VOLUNTEER", value: "Joan Bellingham" }],
        secondaryFields: [
          { key: "role", label: "ROLE", value: "Aid Station" },
          { key: "date", label: "DATE", value: "2026-04-26T06:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
      },
      barcodes: [qr("CM-VOL-8-JB")],
    },
  },
  {
    key: "gen-vip",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-vip-0001", "Backstage Co", "Backstage VIP", "rose", "Backstage"),
      sharingProhibited: true,
      generic: {
        headerFields: [{ key: "lvl", label: "ACCESS", value: "VIP" }],
        primaryFields: [{ key: "name", label: "GUEST", value: "Priyanka Desai" }],
        secondaryFields: [
          { key: "zone", label: "ZONE", value: "Green Room" },
          { key: "esc", label: "ESCORT", value: "Required" },
        ],
      },
      barcodes: [code128("BSVIP9981", "BS VIP 9981")],
    },
  },
  {
    key: "gen-press",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-press-0001", "City Press Corps", "Press credential", "midnight", "Press"),
      generic: {
        headerFields: [{ key: "year", label: "YEAR", value: "2026" }],
        primaryFields: [{ key: "name", label: "JOURNALIST", value: "Amelia Hart" }],
        secondaryFields: [
          { key: "outlet", label: "OUTLET", value: "Bay Chronicle" },
          { key: "beat", label: "BEAT", value: "Tech" },
        ],
      },
      barcodes: [qr("PRESS-26-AH-TECH")],
    },
  },
  {
    key: "gen-lounge",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-lounge-0001", "Sky Lounge", "Sky Lounge access", "ocean", "Sky Lounge"),
      generic: {
        headerFields: [{ key: "tier", label: "TIER", value: "Gold" }],
        primaryFields: [{ key: "name", label: "GUEST", value: "Raul Hernandez" }],
        secondaryFields: [
          { key: "airports", label: "ACCESS", value: "120+ airports" },
          { key: "guests", label: "GUESTS", value: "2 allowed" },
        ],
      },
      barcodes: [qr("SKY-GOLD-RH-001")],
    },
  },
  {
    key: "gen-parking",
    assetKinds: ICON_LOGO_THUMB,
    fixture: {
      ...base("generic", "gen-park-0001", "Downtown Garage", "Monthly parking · L4", "steel", "Downtown Garage"),
      generic: {
        headerFields: [{ key: "lvl", label: "LEVEL", value: "4" }],
        primaryFields: [{ key: "space", label: "SPACE", value: "B-182" }],
        secondaryFields: [
          { key: "valid", label: "VALID", value: "Monthly" },
          { key: "exp", label: "EXPIRES", value: "2026-07-31T23:59:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
      },
      barcodes: [code128("DG-B-182", "DG B-182")],
    },
  },
];

// ========================================================================
// Store card fixtures (10)
//
// Coverage: coffee points, gift card, airline miles, cashback, punch card,
// hotel loyalty, car wash, pharmacy Rx, bakery, bike share.
// Uses strip image on most; numberStyle+currencyCode for balance fields.
// ========================================================================

const STORE_CARD_FIXTURES: FidelityFixture[] = [
  {
    key: "sc-coffee-points",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-coffee-0001", "Ember Coffee Club", "Ember loyalty", "ember", "Ember"),
      storeCard: {
        headerFields: [{ key: "tier", label: "TIER", value: "Gold" }],
        primaryFields: [
          { key: "bal", label: "BALANCE", value: "42.50", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" },
        ],
        secondaryFields: [
          { key: "pts", label: "POINTS", value: "1240", numberStyle: "PKNumberStyleDecimal" },
          { key: "since", label: "SINCE", value: "2024" },
        ],
        auxiliaryFields: [{ key: "next", label: "NEXT REWARD", value: "260 pts" }],
      },
      barcodes: [qr("ember-member-0001")],
    },
  },
  {
    key: "sc-giftcard",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-gift-0001", "Aurora Apparel", "Gift card · $125", "forest", "Aurora"),
      storeCard: {
        primaryFields: [
          { key: "bal", label: "BALANCE", value: "125.00", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" },
        ],
        secondaryFields: [
          { key: "num", label: "CARD", value: "AU-2601-4882" },
          { key: "pin", label: "PIN", value: "• • • •" },
        ],
      },
      barcodes: [code128("AU26014882", "AU2601 4882")],
    },
  },
  {
    key: "sc-airline-miles",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-miles-0001", "Skyward Miles", "Skyward · Platinum", "skyward", "Skyward Miles"),
      storeCard: {
        headerFields: [{ key: "tier", label: "STATUS", value: "Platinum" }],
        primaryFields: [
          { key: "miles", label: "MILES", value: "94820", numberStyle: "PKNumberStyleDecimal" },
        ],
        secondaryFields: [
          { key: "mid", label: "MEMBER ID", value: "SW-772910" },
          { key: "since", label: "JOINED", value: "2019" },
        ],
      },
      barcodes: [qr("SW772910", "SW 772910")],
    },
  },
  {
    key: "sc-cashback",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-cash-0001", "Mesa Credit Union", "Cashback rewards", "steel", "Mesa CU"),
      storeCard: {
        headerFields: [{ key: "rate", label: "RATE", value: "2% cashback" }],
        primaryFields: [
          { key: "bal", label: "REWARDS", value: "88.17", numberStyle: "PKNumberStyleDecimal", currencyCode: "USD" },
        ],
        secondaryFields: [
          { key: "period", label: "PERIOD", value: "Apr 2026" },
          { key: "next", label: "NEXT STATEMENT", value: "2026-05-01T00:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
      },
      barcodes: [qr("MCU-88210-APR26")],
    },
  },
  {
    key: "sc-punch-smoothies",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-punch-0001", "Jungle Juice Bar", "Buy 9 get 1 free", "mint", "Jungle Juice"),
      storeCard: {
        headerFields: [{ key: "visits", label: "VISITS", value: "7 / 10" }],
        primaryFields: [
          { key: "next", label: "NEXT FREE", value: "3 more visits" },
        ],
      },
      barcodes: [qr("JJ-PUNCH-007")],
    },
  },
  {
    key: "sc-hotel-points",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-hotel-0001", "Anchor Hotels", "Anchor Rewards · Silver", "deltaBlue", "Anchor"),
      storeCard: {
        headerFields: [{ key: "tier", label: "TIER", value: "Silver" }],
        primaryFields: [
          { key: "pts", label: "POINTS", value: "18200", numberStyle: "PKNumberStyleDecimal" },
        ],
        secondaryFields: [
          { key: "mid", label: "MEMBER ID", value: "AH-551-8812" },
          { key: "nights", label: "NIGHTS", value: "12 / 40" },
        ],
      },
      barcodes: [pdf417("AH55188120", "AH 551-8812")],
    },
  },
  {
    key: "sc-carwash",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-wash-0001", "Splash Car Wash", "Unlimited · Monthly", "ocean", "Splash"),
      storeCard: {
        headerFields: [{ key: "plan", label: "PLAN", value: "Deluxe" }],
        primaryFields: [{ key: "renew", label: "RENEWS", value: "2026-05-12T00:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" }],
        secondaryFields: [{ key: "plate", label: "PLATE", value: "ARV-8-LET" }],
      },
      barcodes: [code128("SPLASH-DEL-2026")],
    },
  },
  {
    key: "sc-pharmacy-rx",
    assetKinds: ICON_LOGO,
    fixture: {
      ...base("storeCard", "sc-pharma-0001", "Cedar Pharmacy", "Rx member ID", "mint", "Cedar Rx"),
      storeCard: {
        headerFields: [{ key: "plan", label: "PLAN", value: "Advantage" }],
        primaryFields: [{ key: "name", label: "MEMBER", value: "Liz Chetelat" }],
        secondaryFields: [
          { key: "mid", label: "ID", value: "CD 9981 2240 1" },
          { key: "grp", label: "GROUP", value: "A" },
        ],
      },
      barcodes: [qr("CD-998122401-A", "CD9981 22401")],
    },
  },
  {
    key: "sc-bakery",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-bakery-0001", "Golden Crust Bakery", "Bread club", "gold", "Golden Crust"),
      storeCard: {
        headerFields: [{ key: "weeks", label: "WEEKS", value: "4 / 12" }],
        primaryFields: [{ key: "next", label: "NEXT LOAF", value: "Sourdough" }],
        secondaryFields: [
          { key: "pickup", label: "PICKUP", value: "2026-04-28T10:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
        ],
      },
      barcodes: [qr("GC-LOAF-0428")],
    },
  },
  {
    key: "sc-bike-share",
    assetKinds: ICON_LOGO_STRIP,
    fixture: {
      ...base("storeCard", "sc-bike-0001", "City Bike Share", "Annual pass", "sunset", "City Bike"),
      storeCard: {
        headerFields: [{ key: "type", label: "TYPE", value: "Annual" }],
        primaryFields: [{ key: "rides", label: "RIDES THIS YEAR", value: "148", numberStyle: "PKNumberStyleDecimal" }],
        secondaryFields: [
          { key: "until", label: "UNTIL", value: "2027-01-01T00:00:00Z", dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleNone" },
        ],
      },
      barcodes: [code128("CBA-2026-1482", "CBA 2026-1482")],
    },
  },
];

export const FIDELITY_FIXTURES: readonly FidelityFixture[] = [
  ...BOARDING_FIXTURES,
  ...COUPON_FIXTURES,
  ...EVENT_FIXTURES,
  ...GENERIC_FIXTURES,
  ...STORE_CARD_FIXTURES,
] as const;

export const FIDELITY_FIXTURES_BY_KEY: Record<string, FidelityFixture> = Object.fromEntries(
  FIDELITY_FIXTURES.map((f) => [f.key, f]),
);
