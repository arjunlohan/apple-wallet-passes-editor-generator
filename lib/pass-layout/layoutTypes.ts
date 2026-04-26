import type {
  ImageSlot,
  PassStyle,
  RgbColor,
  ValidatedPassDefinition,
} from "@/lib/pass-spec";

/**
 * A single rendered field. The formatted string is the EXACT text that
 * both the preview and the opened pass show. Raw is preserved for the
 * serializer, which writes the Apple style enums in pass.json.
 */
export interface LayoutField {
  key: string;
  label?: string;
  /** Display string as the user sees it (both preview + device). */
  formattedValue: string;
  /** Raw value (plus style keys) that the serializer emits to pass.json. */
  raw: {
    value: string | number;
    label?: string;
    attributedValue?: string;
    changeMessage?: string;
    textAlignment?: string;
    dateStyle?: string;
    timeStyle?: string;
    numberStyle?: string;
    currencyCode?: string;
    ignoresTimeZone?: boolean;
    isRelative?: boolean;
    dataDetectorTypes?: readonly string[];
    row?: 0 | 1;
  };
  /** CSS text-align value computed from textAlignment + section defaults. */
  cssTextAlign: "left" | "center" | "right" | "start" | "end";
  /** Sanitized HTML for attributedValue (back face only). */
  sanitizedHtml?: string;
}

/** A section's fields, already ordered and capped per style. */
export interface LayoutSection {
  /** Stable section name for CSS targeting + serializer emission. */
  name:
    | "headerFields"
    | "primaryFields"
    | "secondaryFields"
    | "auxiliaryFields"
    | "backFields"
    | "additionalInfoFields";
  fields: LayoutField[];
}

/**
 * Ordered, resolved layout for the front face. The serializer iterates
 * sections in THIS order; the preview renders them in THIS order.
 */
export interface LayoutFront {
  style: PassStyle;
  sections: LayoutSection[];
  /** Style-specific extras (e.g., transitType on boardingPass). */
  meta: Record<string, string | undefined>;
}

export interface LayoutBack {
  sections: LayoutSection[];
}

export interface LayoutBarcode {
  format: string;
  message: string;
  messageEncoding: string;
  altText?: string;
}

export interface LayoutColors {
  background: RgbColor;
  foreground: RgbColor;
  label: RgbColor;
}

/** A resolved image reference used by the preview (URL) or serializer (slot). */
export interface LayoutImageRef {
  slot: ImageSlot;
  /** "1x" | "2x" | "3x" with optional "~dark" variant tag. */
  variants: readonly ("1x" | "2x" | "3x" | "1x~dark" | "2x~dark" | "3x~dark")[];
}

/**
 * Resolved poster-layout metadata. Present only when
 * `preferredStyleSchemes[0] === "posterEventTicket"` and the pass style is
 * eventTicket. Both the preview and the serializer read these fields via
 * this struct — neither should reach back into `definition.semantics`.
 */
export interface LayoutPoster {
  active: true;
  eventName: string;
  venueName: string;
  venueRegionName: string;
  venueRoom: string;
  /** Display string for event start; undefined if no date is set. */
  eventDateText?: string;
  /** Event type tag (sports / live performance / etc.) — drives extra rules. */
  eventType?: string;
  /** Live-performance poster line; joined with "·" when more than one. */
  performerNames?: readonly string[];
  /** Sports poster: team abbreviations ("LAA vs SFG"). */
  awayTeamAbbreviation?: string;
  homeTeamAbbreviation?: string;
  /** Apple's `suppressHeaderDarkening` — disables the top gradient overlay. */
  suppressHeaderDarkening: boolean;
}

export interface LayoutTree {
  style: PassStyle;
  passTypeIdentifier: string;
  serialNumber: string;
  organizationName: string;
  description: string;
  logoText?: string;
  colors: LayoutColors;
  front: LayoutFront;
  back: LayoutBack;
  barcodes: LayoutBarcode[];
  images: LayoutImageRef[];
  /** Present only when the pass is rendered in poster mode (iOS 26+). */
  poster?: LayoutPoster;
  /** Re-exported for the serializer only (never used by the preview). */
  definition: ValidatedPassDefinition;
}
