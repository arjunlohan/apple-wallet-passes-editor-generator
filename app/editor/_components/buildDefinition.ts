import type { PassStyle } from "@/lib/pass-spec";
import { hexToRgbString } from "@/lib/pass-spec";
import type { EditorBeacon, EditorField, EditorFormValues } from "./defaults";

/**
 * Translate flat form values into the discriminated PassDefinition shape
 * the schema accepts. Unused fields for a given style are stripped.
 *
 * `mode: "preview"` (default) DROPS shape-invalid mid-edit values so the
 * live preview never throws inside `PassDefinitionSchema.parse()`. This
 * keeps the editor usable while the user is typing a currency code or
 * pasting a URL.
 *
 * `mode: "validate"` KEEPS those values so `PassDefinitionSchema.safeParse`
 * surfaces them to the issue tray. Use this in the validation path so the
 * user sees the error message next to the problem field.
 */
export type BuildMode = "preview" | "validate";

export function buildDefinitionFromForm(
  values: EditorFormValues,
  mode: BuildMode = "preview",
): unknown {
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

  // NFC (Value Added Services). Apple requires a special entitlement for
  // this — without it the keys still ship but Wallet ignores them. The
  // editor exposes the fields anyway so people with the entitlement can
  // use the tool. Only emit when both required properties are filled.
  const nfc = buildNfc(values);
  if (nfc) base.nfc = nfc;

  // Poster event ticket (iOS 26+). Only relevant on eventTicket; we still
  // write the semantic tags so the pass.json round-trips cleanly. Apple
  // silently falls back to the classic ticket on a pass without NFC, so
  // we only emit `preferredStyleSchemes` when the NFC block is present
  // AND every required semantic tag is filled — keeping the preview
  // honest about what Wallet will actually render.
  if (style === "eventTicket" && values.useEventTicketPoster) {
    const semantics = buildPosterSemantics(values);
    if (Object.keys(semantics).length > 0) base.semantics = semantics;
    const requiredFilled = isPosterReady(values);
    if (requiredFilled && nfc) {
      base.preferredStyleSchemes = ["posterEventTicket", "eventTicket"];
      if (values.suppressHeaderDarkening) base.suppressHeaderDarkening = true;
    }
  }

  const locations = buildLocations(values);
  if (locations.length > 0) base.locations = locations;

  const relevantDates = buildRelevantDates(values);
  if (relevantDates.length > 0) base.relevantDates = relevantDates;

  assignTopLevelMetadata(base, values, mode);

  const block = buildStyleBlock(style, values, mode);
  base[style] = block;
  return base;
}

/**
 * Merge in the "Advanced metadata" top-level properties — lifecycle
 * (expirationDate/voided), UX flags (sharingProhibited, suppressStripShine,
 * groupingIdentifier, appLaunchURL), update service pair, store links,
 * beacons, and userInfo. Every property is optional; empty / unset values
 * are dropped so the schema never has to special-case blanks. userInfo is
 * parsed as JSON when present; a malformed string is left for the schema
 * to reject so the issue tray surfaces the parse error inline.
 */
function assignTopLevelMetadata(
  base: Record<string, unknown>,
  values: EditorFormValues,
  mode: BuildMode,
): void {
  const preview = mode === "preview";
  const expiry = values.expirationDate.trim();
  if (expiry !== "" && (!preview || isIsoDateTime(expiry))) {
    base.expirationDate = expiry;
  }
  if (values.voided) base.voided = true;
  if (values.sharingProhibited) base.sharingProhibited = true;
  if (values.suppressStripShine) base.suppressStripShine = true;
  if (values.groupingIdentifier.trim() !== "") base.groupingIdentifier = values.groupingIdentifier.trim();
  const webServiceURL = values.webServiceURL.trim();
  const token = values.authenticationToken.trim();
  if (preview) {
    // Only emit as a valid pair, so the preview never trips the
    // addWebServiceRefinement cross-field refinement on partial input.
    if (isValidUrl(webServiceURL) && token.length >= 32) {
      base.webServiceURL = webServiceURL;
      base.authenticationToken = token;
    }
  } else {
    // Validate mode: pass through whatever the user has typed so each half
    // of the mismatch shows up in the issue tray independently.
    if (webServiceURL !== "") base.webServiceURL = webServiceURL;
    if (token !== "") base.authenticationToken = token;
  }
  const appLaunch = values.appLaunchURL.trim();
  if (appLaunch !== "") base.appLaunchURL = appLaunch;
  const ids = buildAssociatedStoreIdentifiers(values.associatedStoreIdentifiers);
  if (ids.length > 0) base.associatedStoreIdentifiers = ids;
  const beacons = buildBeacons(values.beacons);
  if (beacons.length > 0) base.beacons = beacons;
  const userInfo = tryParseUserInfo(values.userInfoJson);
  if (userInfo === undefined) return;
  if (!preview || isPlainObject(userInfo)) base.userInfo = userInfo;
}

function isIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?$/.test(
    value,
  );
}

function isValidUrl(value: string): boolean {
  if (value === "") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse the comma-separated list of integer App Store IDs. Silently drops
 * malformed entries so the preview survives mid-edit; the schema still
 * surfaces a full-field error if the user submits garbage. */
function buildAssociatedStoreIdentifiers(input: string): number[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Build the beacons array; rows missing a proximityUUID are dropped so the
 * preview doesn't blow up while the user is mid-paste. Major/minor parse as
 * integers when set. */
function buildBeacons(rows: EditorBeacon[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const row of rows ?? []) {
    const uuid = row.proximityUUID.trim();
    if (uuid === "") continue;
    const entry: Record<string, unknown> = { proximityUUID: uuid };
    const major = Number.parseInt(row.major, 10);
    if (Number.isFinite(major)) entry.major = major;
    const minor = Number.parseInt(row.minor, 10);
    if (Number.isFinite(minor)) entry.minor = minor;
    if (row.relevantText.trim() !== "") entry.relevantText = row.relevantText.trim();
    out.push(entry);
  }
  return out;
}

/** Parse userInfo JSON. Returns the parsed object when it's an object,
 * `undefined` when the input is empty or the parse fails (the schema
 * won't add a bogus userInfo key). If the user typed invalid JSON we
 * still want the schema to flag *something*, so we return the raw
 * string and let the schema reject it with a typed error. */
function tryParseUserInfo(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed;
  } catch {
    // Let the schema reject it by passing the raw string.
    return trimmed;
  }
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

/**
 * Build the Apple `nfc` dictionary from the editor form. Returns null when
 * NFC is toggled off, either required property is missing, OR the public
 * key isn't valid base64 yet — so the live preview stays valid while the
 * user is mid-paste. The validate.ts pass still surfaces schema errors to
 * the issue tray, so users aren't misled; they just aren't blocked by
 * in-progress typing. The schema enforces the final ≤64-byte + SPKI check.
 */
function buildNfc(values: EditorFormValues): Record<string, unknown> | null {
  if (!values.useNfc) return null;
  const message = values.nfcMessage.trim();
  const keyCompact = values.nfcEncryptionPublicKey.replace(/\s+/g, "");
  if (message === "" || keyCompact === "") return null;
  if (!looksLikePlausibleSpki(keyCompact)) return null;
  const out: Record<string, unknown> = {
    message,
    encryptionPublicKey: keyCompact,
  };
  if (values.nfcRequiresAuthentication) out.requiresAuthentication = true;
  return out;
}

/**
 * Mirror the schema's shape check: valid base64 that decodes to 64–120
 * bytes (the range an ECDH P-256 SubjectPublicKeyInfo falls into). Used
 * only to keep the preview valid while the user is mid-paste. Final
 * validation runs in the schema as the pass is generated.
 */
function looksLikePlausibleSpki(input: string): boolean {
  if (input.length === 0 || input.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+=?=?$/.test(input)) return false;
  const padding = (input.match(/=+$/)?.[0].length ?? 0);
  const byteLength = (input.length / 4) * 3 - padding;
  return byteLength >= 64 && byteLength <= 120;
}

function buildStyleBlock(
  style: PassStyle,
  values: EditorFormValues,
  mode: BuildMode,
): Record<string, unknown> {
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
    const arr = values[section] as EditorField[];
    if (!arr || arr.length === 0) continue;
    const isBack = section === "backFields";
    const allowRow = style === "boardingPass";
    block[section] = arr
      .filter((f) => f.key.trim() !== "" && f.value.trim() !== "")
      .map((f) => emitField(f, { isBack, allowRow, mode }));
  }

  if (style === "boardingPass") {
    block.transitType = values.transitType;
  }
  return block;
}

/**
 * Serialize a single editor field row into the shape Apple's PassFieldContent
 * accepts. Empty strings / falsy booleans are dropped so the schema sees a
 * clean row and we don't ship useless keys. `attributedValue` +
 * `dataDetectorTypes` only emit when the row is a back field; `row` only
 * when the style is boardingPass.
 */
function emitField(
  f: EditorField,
  options: { isBack: boolean; allowRow: boolean; mode: BuildMode },
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    key: f.key.trim(),
    label: f.label.trim() === "" ? undefined : f.label.trim(),
    value: f.value,
  };
  if (f.dateStyle) out.dateStyle = f.dateStyle;
  if (f.timeStyle) out.timeStyle = f.timeStyle;
  if (f.ignoresTimeZone) out.ignoresTimeZone = true;
  if (f.isRelative) out.isRelative = true;
  if (f.numberStyle) out.numberStyle = f.numberStyle;
  const currency = f.currencyCode.trim().toUpperCase();
  if (currency !== "") {
    // Preview: drop anything that isn't already a valid ISO 4217 code so
    // the live `buildLayout(PassDefinitionSchema.parse(...))` path doesn't
    // throw while the user is typing. Validate mode keeps it so the issue
    // tray surfaces the message inline.
    if (options.mode === "validate" || /^[A-Z]{3}$/.test(currency)) {
      out.currencyCode = currency;
    }
  }
  if (f.textAlignment) out.textAlignment = f.textAlignment;
  const changeMsg = f.changeMessage.trim();
  if (changeMsg !== "") {
    if (options.mode === "validate" || /%@/.test(changeMsg)) {
      out.changeMessage = f.changeMessage;
    }
  }
  if (options.isBack) {
    if (f.attributedValue.trim() !== "") out.attributedValue = f.attributedValue;
    const detectors = f.dataDetectorTypes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (detectors.length > 0) out.dataDetectorTypes = detectors;
  }
  if (options.allowRow && (f.row === "0" || f.row === "1")) {
    out.row = Number(f.row) as 0 | 1;
  }
  return out;
}
