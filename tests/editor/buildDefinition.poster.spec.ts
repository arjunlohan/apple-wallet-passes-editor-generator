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
    assets: {},
  };
}

describe("buildDefinitionFromForm — poster event ticket", () => {
  it("omits preferredStyleSchemes even when every semantic tag is filled, because the editor cannot supply NFC", () => {
    const def = buildDefinitionFromForm(eventTicketValues()) as {
      preferredStyleSchemes?: unknown;
      semantics?: Record<string, unknown>;
    };
    expect(def.preferredStyleSchemes).toBeUndefined();
    // Semantic tags still flow through so the pass.json round-trips cleanly.
    expect(def.semantics).toBeDefined();
    expect(def.semantics?.eventName).toBe("Fallen Voices Live");
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
});
