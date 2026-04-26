import type { PassStyle } from "@/lib/pass-spec";
import { hexToRgbString } from "@/lib/pass-spec";
import type { EditorFormValues } from "./defaults";

/**
 * Translate flat form values into the discriminated PassDefinition shape
 * the schema accepts. Unused fields for a given style are stripped.
 */
export function buildDefinitionFromForm(values: EditorFormValues): unknown {
  const style = values.style;
  const base: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: values.passTypeIdentifier,
    teamIdentifier: values.teamIdentifier,
    serialNumber: values.serialNumber,
    organizationName: values.organizationName,
    description: values.description,
    backgroundColor: values.backgroundColorHex ? hexToRgbString(values.backgroundColorHex) : undefined,
    foregroundColor: values.foregroundColorHex ? hexToRgbString(values.foregroundColorHex) : undefined,
    labelColor: values.labelColorHex ? hexToRgbString(values.labelColorHex) : undefined,
    logoText: values.logoText || undefined,
    style,
  };

  if (values.barcodeMessage) {
    base.barcodes = [
      {
        format: values.barcodeFormat,
        message: values.barcodeMessage,
        messageEncoding: values.barcodeEncoding,
        ...(values.barcodeAltText ? { altText: values.barcodeAltText } : {}),
      },
    ];
  }

  // Poster event ticket (iOS 26+). Only relevant on eventTicket; we still
  // write the semantic tags so the pass.json round-trips cleanly, but we
  // DO NOT emit `preferredStyleSchemes` unless an `nfc` block is present.
  // Apple ignores the poster scheme entirely on a pass without NFC and
  // falls back to the classic event ticket — so the honest preview is the
  // classic layout too. Once we add NFC form fields (requires Apple's NFC
  // entitlement), flip the `hasNfc` check below to read from those values.
  if (style === "eventTicket" && values.useEventTicketPoster) {
    const semantics = buildPosterSemantics(values);
    if (Object.keys(semantics).length > 0) base.semantics = semantics;
    const hasNfc = false; // TODO: wire to NFC form fields when they exist.
    const requiredFilled = isPosterReady(values);
    if (requiredFilled && hasNfc) {
      base.preferredStyleSchemes = ["posterEventTicket", "eventTicket"];
      if (values.suppressHeaderDarkening) base.suppressHeaderDarkening = true;
    }
  }

  const locations = buildLocations(values);
  if (locations.length > 0) base.locations = locations;

  const relevantDates = buildRelevantDates(values);
  if (relevantDates.length > 0) base.relevantDates = relevantDates;

  const block = buildStyleBlock(style, values);
  base[style] = block;
  return base;
}

/**
 * Parse the editor's string-typed location rows into Apple's numeric shape.
 * Rows missing a latitude OR longitude are silently dropped so the live
 * preview doesn't explode while the user is still typing a coordinate.
 * Non-finite values (e.g. typos) are also dropped. Altitude is optional.
 */
function buildLocations(values: EditorFormValues): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const row of values.locations ?? []) {
    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const entry: Record<string, unknown> = { latitude: lat, longitude: lon };
    const alt = parseFloat(row.altitude);
    if (Number.isFinite(alt)) entry.altitude = alt;
    if (row.relevantText.trim() !== "") entry.relevantText = row.relevantText.trim();
    out.push(entry);
  }
  return out;
}

/**
 * Parse the editor's relevant-dates rows. The schema allows either a single
 * `date` OR a `startDate`/`endDate` pair, so we keep whichever fields the
 * user filled in. Rows with nothing in any of the three fields are dropped
 * so the preview stays valid while the user is still editing.
 */
function buildRelevantDates(values: EditorFormValues): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const row of values.relevantDates ?? []) {
    const entry: Record<string, unknown> = {};
    if (row.date.trim() !== "") entry.date = row.date.trim();
    if (row.startDate.trim() !== "") entry.startDate = row.startDate.trim();
    if (row.endDate.trim() !== "") entry.endDate = row.endDate.trim();
    if (Object.keys(entry).length === 0) continue;
    out.push(entry);
  }
  return out;
}

/**
 * True once every semantic tag Apple requires for a poster ticket is set.
 * Gate opening the scheme on this so the preview doesn't explode while
 * the user is still typing. Sports + live-performance add extra checks.
 */
function isPosterReady(values: EditorFormValues): boolean {
  const requiredStrings = [
    values.posterEventName,
    values.posterVenueName,
    values.posterVenueRegionName,
    values.posterVenueRoom,
  ];
  if (requiredStrings.some((v) => v.trim() === "")) return false;
  if (values.posterEventType === "PKEventTypeSports") {
    if (values.posterAwayTeamAbbreviation.trim() === "") return false;
    if (values.posterHomeTeamAbbreviation.trim() === "") return false;
  }
  if (values.posterEventType === "PKEventTypeLivePerformance") {
    const performers = values.posterPerformerNames
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (performers.length === 0) return false;
  }
  return true;
}

function buildPosterSemantics(values: EditorFormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const putString = (k: string, v: string) => {
    if (v.trim() !== "") out[k] = v.trim();
  };
  putString("eventName", values.posterEventName);
  putString("venueName", values.posterVenueName);
  putString("venueRegionName", values.posterVenueRegionName);
  putString("venueRoom", values.posterVenueRoom);
  putString("eventType", values.posterEventType);
  putString("eventStartDate", values.posterEventStartDate);
  putString("awayTeamAbbreviation", values.posterAwayTeamAbbreviation);
  putString("homeTeamAbbreviation", values.posterHomeTeamAbbreviation);
  const performers = values.posterPerformerNames
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (performers.length > 0) out.performerNames = performers;
  return out;
}

function buildStyleBlock(style: PassStyle, values: EditorFormValues): Record<string, unknown> {
  const block: Record<string, unknown> = {};
  const sections: (keyof EditorFormValues)[] = [
    "headerFields",
    "primaryFields",
    "secondaryFields",
    "auxiliaryFields",
    "backFields",
  ];
  if (style === "eventTicket") sections.push("additionalInfoFields");

  for (const section of sections) {
    const arr = values[section] as { key: string; label: string; value: string }[];
    if (!arr || arr.length === 0) continue;
    block[section] = arr
      .filter((f) => f.key.trim() !== "" && f.value.trim() !== "")
      .map((f) => ({
        key: f.key.trim(),
        label: f.label || undefined,
        value: f.value,
      }));
  }

  if (style === "boardingPass") {
    block.transitType = values.transitType;
  }
  return block;
}
