import { describe, expect, it } from "vitest";
import { buildDefinitionFromForm } from "@/app/editor/_components/buildDefinition";
import type { EditorFormValues } from "@/app/editor/_components/defaults";

function eventTicketValues(): EditorFormValues {
  return {
    style: "eventTicket",
    passTypeIdentifier: "pass.example.demo",
    teamIdentifier: "ABCDE12345",
    serialNumber: "evt-0001",
    organizationName: "Example Co",
    description: "Event ticket",
    logoText: "Example",
    backgroundColorHex: "#1e293b",
    foregroundColorHex: "#f8fafc",
    labelColorHex: "#94a3b8",
    headerFields: [],
    primaryFields: [{ key: "section", label: "GA", value: "GA" }],
    secondaryFields: [],
    auxiliaryFields: [],
    backFields: [],
    additionalInfoFields: [],
    transitType: "PKTransitTypeGeneric",
    barcodeFormat: "PKBarcodeFormatQR",
    barcodeMessage: "evt-0001",
    barcodeEncoding: "iso-8859-1",
    barcodeAltText: "",
    useEventTicketPoster: true,
    suppressHeaderDarkening: false,
    posterEventName: "Fallen Voices Live",
    posterVenueName: "Apollo Theater",
    posterVenueRegionName: "New York, NY",
    posterVenueRoom: "Main Stage",
    posterEventType: "PKEventTypeLivePerformance",
    posterEventStartDate: "2026-09-12T20:00:00Z",
    posterPerformerNames: "Phoenix Rivers",
    posterAwayTeamAbbreviation: "",
    posterHomeTeamAbbreviation: "",
    locations: [],
    relevantDates: [],
    useNfc: false,
    nfcMessage: "",
    nfcEncryptionPublicKey: "",
    nfcRequiresAuthentication: false,
    assets: {},
  };
}

// A plausible-looking base64 SPKI for an ECDH P-256 key (91 bytes decoded —
// inside the 64–120 range the schema accepts). Not a real key; tests don't
// need a valid curve because the runtime curve check lives in the generator.
const SAMPLE_SPKI_BASE64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEryTQpJR9eMzN2H9hSR0Ecl6jO0jU7dPwzQFJvuY7eK1gk1dW0FLBWnM16uUFpsLquCFqZU6pEL2wQxzkGnOhOQ==";

describe("buildDefinitionFromForm — poster event ticket", () => {
  it("omits preferredStyleSchemes when NFC is not configured, even with every semantic tag filled", () => {
    const def = buildDefinitionFromForm(eventTicketValues()) as {
      preferredStyleSchemes?: unknown;
      semantics?: Record<string, unknown>;
      nfc?: unknown;
    };
    expect(def.preferredStyleSchemes).toBeUndefined();
    expect(def.nfc).toBeUndefined();
    // Semantic tags still flow through so the pass.json round-trips cleanly.
    expect(def.semantics).toBeDefined();
    expect(def.semantics?.eventName).toBe("Fallen Voices Live");
  });

  it("emits preferredStyleSchemes when NFC + semantics are all present", () => {
    const values = eventTicketValues();
    values.useNfc = true;
    values.nfcMessage = "vas-payload-001";
    values.nfcEncryptionPublicKey = SAMPLE_SPKI_BASE64;
    const def = buildDefinitionFromForm(values) as {
      preferredStyleSchemes?: readonly string[];
      nfc?: { message: string; encryptionPublicKey: string };
    };
    expect(def.preferredStyleSchemes).toEqual(["posterEventTicket", "eventTicket"]);
    expect(def.nfc).toBeDefined();
    expect(def.nfc?.message).toBe("vas-payload-001");
  });

  it("emits no semantics block when useEventTicketPoster is off", () => {
    const values = eventTicketValues();
    values.useEventTicketPoster = false;
    const def = buildDefinitionFromForm(values) as {
      preferredStyleSchemes?: unknown;
      semantics?: unknown;
    };
    expect(def.preferredStyleSchemes).toBeUndefined();
    expect(def.semantics).toBeUndefined();
  });

  it("emits nfc block independently of style — works on generic pass too", () => {
    const values = eventTicketValues();
    values.style = "generic";
    values.useEventTicketPoster = false;
    values.useNfc = true;
    values.nfcMessage = "generic-vas";
    values.nfcEncryptionPublicKey = SAMPLE_SPKI_BASE64;
    values.nfcRequiresAuthentication = true;
    const def = buildDefinitionFromForm(values) as {
      nfc?: { message: string; requiresAuthentication?: boolean };
      preferredStyleSchemes?: unknown;
    };
    expect(def.nfc?.message).toBe("generic-vas");
    expect(def.nfc?.requiresAuthentication).toBe(true);
    // Generic passes don't get preferredStyleSchemes — that's eventTicket only.
    expect(def.preferredStyleSchemes).toBeUndefined();
  });

  it("drops the nfc block when useNfc is on but required fields are empty", () => {
    const values = eventTicketValues();
    values.useNfc = true;
    values.nfcMessage = "";
    values.nfcEncryptionPublicKey = SAMPLE_SPKI_BASE64;
    const def = buildDefinitionFromForm(values) as { nfc?: unknown };
    expect(def.nfc).toBeUndefined();
  });
});
