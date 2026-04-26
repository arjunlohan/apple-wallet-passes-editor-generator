import { PassDefinitionSchema, formatZodError, type PassValidationIssue, type PassStyle } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "./buildDefinition";
import type { EditorFormValues } from "./defaults";

export interface EditorIssue {
  /** Dot-path into EditorFormValues, e.g. "primaryFields.0.value". */
  formPath: string;
  message: string;
  /** Original schema path so we can display it verbatim if mapping missed. */
  rawPath: string;
}

const TOP_LEVEL_TO_FORM: Record<string, string> = {
  passTypeIdentifier: "passTypeIdentifier",
  teamIdentifier: "teamIdentifier",
  serialNumber: "serialNumber",
  organizationName: "organizationName",
  description: "description",
  logoText: "logoText",
  backgroundColor: "backgroundColorHex",
  foregroundColor: "foregroundColorHex",
  labelColor: "labelColorHex",
};

/**
 * Translate a schema-path (e.g. `eventTicket.primaryFields.0.value`) into the
 * form-path the editor uses (`primaryFields.0.value`). Style blocks are
 * stripped because the form flattens them; barcodes[0].* maps back to
 * `barcode*` keys; semantics/poster keys map to the `poster*` form fields.
 */
function mapPath(segments: (string | number)[], style: PassStyle): string {
  if (segments.length === 0) return "";
  const [head, ...rest] = segments;

  if (head === style) return segments.slice(1).join(".");

  if (head === "barcodes") {
    const field = rest[1];
    if (field === "format") return "barcodeFormat";
    if (field === "message") return "barcodeMessage";
    if (field === "messageEncoding") return "barcodeEncoding";
    if (field === "altText") return "barcodeAltText";
    return segments.join(".");
  }

  if (head === "nfc") {
    const field = rest[0];
    if (field === "message") return "nfcMessage";
    if (field === "encryptionPublicKey") return "nfcEncryptionPublicKey";
    if (field === "requiresAuthentication") return "nfcRequiresAuthentication";
    return segments.join(".");
  }

  if (head === "semantics") {
    const tag = rest[0];
    const suffix: Record<string, string> = {
      eventName: "posterEventName",
      venueName: "posterVenueName",
      venueRegionName: "posterVenueRegionName",
      venueRoom: "posterVenueRoom",
      eventType: "posterEventType",
      eventStartDate: "posterEventStartDate",
      awayTeamAbbreviation: "posterAwayTeamAbbreviation",
      homeTeamAbbreviation: "posterHomeTeamAbbreviation",
      performerNames: "posterPerformerNames",
    };
    const mapped = typeof tag === "string" ? suffix[tag] : undefined;
    return mapped ?? segments.join(".");
  }

  if (head === "locations" || head === "relevantDates") {
    return segments.join(".");
  }

  if (typeof head === "string" && TOP_LEVEL_TO_FORM[head]) {
    return TOP_LEVEL_TO_FORM[head];
  }

  return segments.join(".");
}

export function validateEditor(values: EditorFormValues): EditorIssue[] {
  let definition: unknown;
  try {
    definition = buildDefinitionFromForm(values);
  } catch (err) {
    return [
      {
        formPath: "",
        rawPath: "",
        message: err instanceof Error ? err.message : "failed to build definition",
      },
    ];
  }
  const parsed = PassDefinitionSchema.safeParse(definition);
  if (parsed.success) return [];
  return formatZodError(parsed.error).map((issue) => toEditorIssue(issue, values.style));
}

function toEditorIssue(issue: PassValidationIssue, style: PassStyle): EditorIssue {
  const segments = issue.path.split(".").filter((s) => s.length > 0).map((s) => {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && String(n) === s ? n : s;
  });
  return {
    formPath: mapPath(segments, style),
    rawPath: issue.path,
    message: issue.message,
  };
}
