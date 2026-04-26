import { describe, expect, it } from "vitest";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "@/app/editor/_components/buildDefinition";
import type { EditorFormValues } from "@/app/editor/_components/defaults";

function baseValues(): EditorFormValues {
  return {
    style: "generic",
    passTypeIdentifier: "pass.example.demo",
    teamIdentifier: "ABCDE12345",
    serialNumber: "rel-0001",
    organizationName: "Example Co",
    description: "Example pass",
    logoText: "Example",
    backgroundColorHex: "#1e293b",
    foregroundColorHex: "#f8fafc",
    labelColorHex: "#94a3b8",
    headerFields: [],
    primaryFields: [{ key: "name", label: "NAME", value: "Demo" }],
    secondaryFields: [],
    auxiliaryFields: [],
    backFields: [],
    additionalInfoFields: [],
    transitType: "PKTransitTypeGeneric",
    barcodeFormat: "PKBarcodeFormatQR",
    barcodeMessage: "demo",
    barcodeEncoding: "iso-8859-1",
    barcodeAltText: "",
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
    locations: [],
    relevantDates: [],
    assets: {},
  };
}

describe("buildDefinitionFromForm — relevance", () => {
  it("parses lat/long strings into floats and drops incomplete rows", () => {
    const values = baseValues();
    values.locations = [
      { latitude: "37.7749", longitude: "-122.4194", altitude: "", relevantText: "SF" },
      { latitude: "", longitude: "-122.4194", altitude: "", relevantText: "no lat" },
      { latitude: "not a number", longitude: "-122", altitude: "", relevantText: "bad" },
      { latitude: "40.7128", longitude: "-74.0060", altitude: "10", relevantText: "NYC" },
    ];
    const def = buildDefinitionFromForm(values) as { locations?: Array<Record<string, unknown>> };
    expect(def.locations).toBeDefined();
    expect(def.locations).toHaveLength(2);
    expect(def.locations![0]).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      relevantText: "SF",
    });
    expect(def.locations![1]).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
      altitude: 10,
      relevantText: "NYC",
    });
    // Round-trip: the schema must accept what we produced.
    expect(PassDefinitionSchema.safeParse(def).success).toBe(true);
  });

  it("omits the locations key entirely when every row is incomplete", () => {
    const values = baseValues();
    values.locations = [
      { latitude: "", longitude: "", altitude: "", relevantText: "" },
    ];
    const def = buildDefinitionFromForm(values) as { locations?: unknown };
    expect(def.locations).toBeUndefined();
  });

  it("emits relevantDates with `date` OR `startDate`/`endDate` and drops empty rows", () => {
    const values = baseValues();
    values.relevantDates = [
      { date: "2026-09-12T20:00:00Z", startDate: "", endDate: "" },
      {
        date: "",
        startDate: "2026-09-12T20:00:00Z",
        endDate: "2026-09-12T23:00:00Z",
      },
      { date: "", startDate: "", endDate: "" },
    ];
    const def = buildDefinitionFromForm(values) as {
      relevantDates?: Array<Record<string, unknown>>;
    };
    expect(def.relevantDates).toHaveLength(2);
    expect(def.relevantDates![0]).toEqual({ date: "2026-09-12T20:00:00Z" });
    expect(def.relevantDates![1]).toEqual({
      startDate: "2026-09-12T20:00:00Z",
      endDate: "2026-09-12T23:00:00Z",
    });
    expect(PassDefinitionSchema.safeParse(def).success).toBe(true);
  });

  it("omits relevantDates when no row has any date set", () => {
    const values = baseValues();
    values.relevantDates = [{ date: "", startDate: "", endDate: "" }];
    const def = buildDefinitionFromForm(values) as { relevantDates?: unknown };
    expect(def.relevantDates).toBeUndefined();
  });
});
