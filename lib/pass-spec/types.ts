import type {
  BarcodeEncoding,
  BarcodeFormat,
  DataDetectorType,
  DateStyle,
  NumberStyle,
  PassStyle,
  PreferredStyleScheme,
  TextAlignment,
  TransitType,
} from "./constants";

/**
 * RGB color string in Apple's required `rgb(r, g, b)` format.
 * Constructed via `hexToRgbString`; validated by the schema layer.
 */
export type RgbColor = `rgb(${number}, ${number}, ${number})`;

/** A single value displayed in a pass field. */
export type FieldValue = string | number; // ISO 8601 datetimes are strings.

/**
 * A single field inside a field section (header/primary/secondary/...).
 * Mirrors Apple's `PassFieldContent` dictionary.
 */
export interface PassField {
  key: string;
  label?: string;
  value: FieldValue;
  attributedValue?: string; // Back-face only; `<a href>` sanitized.
  changeMessage?: string; // Must contain exactly one `%@`.
  textAlignment?: TextAlignment;
  dateStyle?: DateStyle;
  timeStyle?: DateStyle;
  numberStyle?: NumberStyle;
  currencyCode?: string; // ISO 4217.
  ignoresTimeZone?: boolean;
  isRelative?: boolean;
  dataDetectorTypes?: DataDetectorType[]; // Back fields only.
  /** Boarding pass only: row grouping (0 or 1). */
  row?: 0 | 1;
}

export interface FieldSections {
  headerFields?: PassField[];
  primaryFields?: PassField[];
  secondaryFields?: PassField[];
  auxiliaryFields?: PassField[];
  backFields?: PassField[];
  /** eventTicket only. */
  additionalInfoFields?: PassField[];
}

export interface Barcode {
  format: BarcodeFormat;
  message: string;
  messageEncoding: BarcodeEncoding;
  altText?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
}

export interface Beacon {
  proximityUUID: string;
  major?: number;
  minor?: number;
  relevantText?: string;
}

export interface Nfc {
  message: string;
  encryptionPublicKey: string; // Base64 DER SPKI of an ECDH P-256 key.
  requiresAuthentication?: boolean;
}

export interface RelevantDates {
  date?: string;
  startDate?: string;
  endDate?: string;
}

/** Apple's SemanticTagType.EventDateInfo dictionary. `date` is the ISO 8601 string. */
export interface SemanticEventDateInfo {
  date: string;
  timeZone?: string;
  ignoreTimeComponents?: boolean;
  unannounced?: boolean;
  undetermined?: boolean;
}

/**
 * Typed keys for the semantic tags we actively render or validate.
 * Unknown keys are allowed (forks often add their own) — the schema
 * only enforces the shape of the ones we know Wallet rejects when
 * mis-typed.
 */
export interface PassSemantics {
  eventName?: string;
  venueName?: string;
  venueRegionName?: string;
  venueRoom?: string;
  eventType?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventStartDateInfo?: SemanticEventDateInfo;
  eventEndDateInfo?: SemanticEventDateInfo;
  performerNames?: string[];
  awayTeamAbbreviation?: string;
  homeTeamAbbreviation?: string;
  awayTeamName?: string;
  homeTeamName?: string;
  [k: string]: unknown;
}

/** Binary image payload keyed by variant. Never crosses to the client. */
export interface ImageVariants {
  "1x"?: Uint8Array;
  "2x"?: Uint8Array;
  "3x"?: Uint8Array;
  "1x~dark"?: Uint8Array;
  "2x~dark"?: Uint8Array;
  "3x~dark"?: Uint8Array;
}

/** Slot -> variant -> bytes. Empty slots omitted. */
export type PassAssets = Partial<Record<import("./constants").ImageSlot, ImageVariants>>;

/**
 * A single classic pass style block (headerFields, primaryFields, etc.).
 * Extends FieldSections with style-specific keys as needed.
 */
export interface ClassicStyleBlock extends FieldSections {}

export interface BoardingPassBlock extends ClassicStyleBlock {
  transitType: TransitType;
}

export type CouponBlock = ClassicStyleBlock;
export type EventTicketBlock = ClassicStyleBlock;
export type GenericBlock = ClassicStyleBlock;
export type StoreCardBlock = ClassicStyleBlock;

/** Shared keys across every style's top-level pass definition. */
interface BasePassDefinition {
  formatVersion: 1;
  passTypeIdentifier: string;
  teamIdentifier: string;
  serialNumber: string;
  organizationName: string;
  description: string;

  backgroundColor?: RgbColor;
  foregroundColor?: RgbColor;
  labelColor?: RgbColor;

  groupingIdentifier?: string;
  logoText?: string;
  suppressStripShine?: boolean;
  sharingProhibited?: boolean;
  voided?: boolean;

  expirationDate?: string;
  relevantDate?: string; // Deprecated but still accepted; superseded by relevantDates.
  relevantDates?: RelevantDates[];

  locations?: Location[];
  beacons?: Beacon[];

  barcodes?: Barcode[];
  nfc?: Nfc;

  webServiceURL?: string;
  authenticationToken?: string;
  associatedStoreIdentifiers?: number[];
  appLaunchURL?: string;

  userInfo?: Record<string, unknown>;

  // Known semantic tags typed precisely; unknown keys pass through.
  // Apple's Wallet validator rejects mis-shaped values silently, so the
  // schema + types now match the dictionary contract for dated tags.
  semantics?: PassSemantics;

  /**
   * iOS 26+. When the first entry is `"posterEventTicket"` Wallet renders
   * the new poster layout (full-bleed background, semantic-driven header,
   * barcode on the back). A trailing `"eventTicket"` is required so
   * pre-iOS 26 devices still render the pass.
   */
  preferredStyleSchemes?: PreferredStyleScheme[];

  /** Poster event ticket only — disables the automatic top-gradient overlay. */
  suppressHeaderDarkening?: boolean;

  // Poster-only auxiliary URLs. Apple documents each as "works only for
  // poster event tickets" — we accept them and the serializer emits them.
  accessibilityURL?: string;
  addOnURL?: string;
  bagPolicyURL?: string;
  contactVenueEmail?: string;
  contactVenuePhoneNumber?: string;
  merchandiseURL?: string;
  orderFoodURL?: string;
  parkingInformationURL?: string;
  purchaseParkingURL?: string;
  sellURL?: string;
  transferURL?: string;
  transitInformationURL?: string;
  directionsInformationURL?: string;
  auxiliaryStoreIdentifiers?: number[];
}

/**
 * Discriminated union keyed on `style`. Exactly one style block is populated.
 * At serialization time the `style` discriminator is dropped and the block
 * is placed under its Apple-native key (e.g., `boardingPass`).
 */
export type PassDefinition =
  | (BasePassDefinition & { style: "boardingPass"; boardingPass: BoardingPassBlock })
  | (BasePassDefinition & { style: "coupon"; coupon: CouponBlock })
  | (BasePassDefinition & { style: "eventTicket"; eventTicket: EventTicketBlock })
  | (BasePassDefinition & { style: "generic"; generic: GenericBlock })
  | (BasePassDefinition & { style: "storeCard"; storeCard: StoreCardBlock });

/**
 * Brand applied to a PassDefinition that has passed `PassDefinitionSchema.parse`.
 * Production code that accepts a raw `PassDefinition` from outside a trust
 * boundary should demand a `ValidatedPassDefinition` instead.
 */
declare const __validatedBrand: unique symbol;
export type ValidatedPassDefinition = PassDefinition & {
  readonly [__validatedBrand]: "ValidatedPassDefinition";
};

export type { PassStyle };
