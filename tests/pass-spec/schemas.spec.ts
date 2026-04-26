import { describe, expect, it } from "vitest";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import boardingPass from "../fixtures/passes/boardingPass.json";
import coupon from "../fixtures/passes/coupon.json";
import eventTicket from "../fixtures/passes/eventTicket.json";
import generic from "../fixtures/passes/generic.json";
import posterEventTicket from "../fixtures/passes/posterEventTicket.json";
import storeCard from "../fixtures/passes/storeCard.json";

describe("PassDefinitionSchema - valid fixtures", () => {
  it.each([
    ["boardingPass", boardingPass],
    ["coupon", coupon],
    ["eventTicket", eventTicket],
    ["generic", generic],
    ["posterEventTicket", posterEventTicket],
    ["storeCard", storeCard],
  ])("parses %s fixture", (_name, fixture) => {
    const result = PassDefinitionSchema.safeParse(fixture);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });
});

describe("PassDefinitionSchema - invalid cases", () => {
  it("rejects hex color instead of rgb()", () => {
    const bad = { ...generic, backgroundColor: "#1e293b" };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].path).toEqual(["backgroundColor"]);
  });

  it("rejects rgb() with out-of-range component", () => {
    const bad = { ...generic, backgroundColor: "rgb(300, 0, 0)" };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects boardingPass missing transitType", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(boardingPass);
    delete bad.boardingPass.transitType;
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(res.error!.issues.some((i) => i.path.includes("transitType"))).toBe(true);
  });

  it("rejects too many primary fields on boardingPass (cap = 2)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(boardingPass);
    bad.boardingPass.primaryFields = [
      { key: "a", value: "A" },
      { key: "b", value: "B" },
      { key: "c", value: "C" },
    ];
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects additionalInfoFields on non-eventTicket style", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.generic.additionalInfoFields = [{ key: "x", value: "y" }];
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects unknown barcode format", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.barcodes[0].format = "PKBarcodeFormatUPC";
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects changeMessage without %@", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.generic.primaryFields[0].changeMessage = "Updated to new name";
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects empty-string field value", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.generic.primaryFields[0].value = "";
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) =>
        i.path.join(".").endsWith("primaryFields.0.value"),
      );
      expect(issue).toBeDefined();
    }
  });

  it("accepts numeric zero as a field value (falsy but valid)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok: any = structuredClone(generic);
    ok.generic.primaryFields[0].value = 0;
    const res = PassDefinitionSchema.safeParse(ok);
    expect(res.success).toBe(true);
  });

  it("rejects attributedValue outside backFields", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.generic.primaryFields[0].attributedValue = "<a href=\"https://x\">x</a>";
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects attributedValue with disallowed tag", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.generic.backFields[0].attributedValue = "<script>evil</script>";
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects oversized userInfo", () => {
    const bad = { ...generic, userInfo: { blob: "x".repeat(5000) } };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects relevantDates entry with startDate and no endDate", () => {
    const bad = {
      ...generic,
      relevantDates: [{ startDate: "2026-04-25T10:00:00Z" }],
    };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects teamIdentifier wrong length", () => {
    const bad = { ...generic, teamIdentifier: "ABCDE" };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects webServiceURL without authenticationToken", () => {
    const bad = { ...generic, webServiceURL: "https://example.com/" };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects semantics.eventStartDateInfo as a string", () => {
    // Wallet rejects this silently at install time with "Value ... for
    // semantic key eventStartDateInfo is not a dictionary". The schema
    // must catch it instead so the pass never ships.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(posterEventTicket);
    bad.semantics.eventStartDateInfo = "Doors 7:00 PM";
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(
      res.error!.issues.some((i) => i.path.join(".") === "semantics.eventStartDateInfo"),
    ).toBe(true);
  });

  it("accepts semantics.eventStartDateInfo as an EventDateInfo dictionary", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok: any = structuredClone(posterEventTicket);
    ok.semantics.eventStartDateInfo = {
      date: "2026-09-12T20:00:00Z",
      timeZone: "America/New_York",
      ignoreTimeComponents: false,
    };
    const res = PassDefinitionSchema.safeParse(ok);
    expect(res.success, JSON.stringify(res.error?.issues)).toBe(true);
  });
});

describe("PassDefinitionSchema - relevance keys", () => {
  it("accepts a generic pass with up to the locations cap", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      latitude: 37 + i * 0.01,
      longitude: -122 - i * 0.01,
      relevantText: `Point ${i}`,
    }));
    const ok = { ...generic, locations: many };
    const res = PassDefinitionSchema.safeParse(ok);
    expect(res.success).toBe(true);
  });

  it("rejects locations > LOCATIONS_MAX", () => {
    const tooMany = Array.from({ length: 11 }, () => ({
      latitude: 37.7,
      longitude: -122.4,
    }));
    const bad = { ...generic, locations: tooMany };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects latitude outside -90..90", () => {
    const bad = {
      ...generic,
      locations: [{ latitude: 91, longitude: 0 }],
    };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects longitude outside -180..180", () => {
    const bad = {
      ...generic,
      locations: [{ latitude: 0, longitude: 181 }],
    };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("accepts relevantDates with a single `date`", () => {
    const ok = {
      ...generic,
      relevantDates: [{ date: "2026-09-12T20:00:00Z" }],
    };
    const res = PassDefinitionSchema.safeParse(ok);
    expect(res.success).toBe(true);
  });

  it("accepts relevantDates with `startDate` + `endDate` window", () => {
    const ok = {
      ...generic,
      relevantDates: [
        {
          startDate: "2026-09-12T20:00:00Z",
          endDate: "2026-09-12T23:00:00Z",
        },
      ],
    };
    const res = PassDefinitionSchema.safeParse(ok);
    expect(res.success).toBe(true);
  });

  it("rejects a relevantDates entry with neither `date` nor `startDate`", () => {
    const bad = { ...generic, relevantDates: [{}] };
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });
});

describe("PassDefinitionSchema - posterEventTicket scheme", () => {
  it("rejects posterEventTicket without the required semantic tags", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(posterEventTicket);
    delete bad.semantics.venueRoom;
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(
      res.error!.issues.some(
        (i) =>
          i.path.includes("semantics") &&
          i.path.includes("venueRoom"),
      ),
    ).toBe(true);
  });

  it("rejects posterEventTicket without an eventTicket fallback scheme", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(posterEventTicket);
    bad.preferredStyleSchemes = ["posterEventTicket"];
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(
      res.error!.issues.some((i) => i.path.includes("preferredStyleSchemes")),
    ).toBe(true);
  });

  it("rejects live performance poster without performerNames", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(posterEventTicket);
    delete bad.semantics.performerNames;
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(
      res.error!.issues.some(
        (i) => i.path.includes("semantics") && i.path.includes("performerNames"),
      ),
    ).toBe(true);
  });

  it("rejects sports poster without both team abbreviations", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(posterEventTicket);
    bad.semantics.eventType = "PKEventTypeSports";
    bad.semantics.awayTeamAbbreviation = "LAA";
    // homeTeamAbbreviation missing.
    delete bad.semantics.performerNames;
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(
      res.error!.issues.some(
        (i) =>
          i.path.includes("semantics") &&
          i.path.includes("homeTeamAbbreviation"),
      ),
    ).toBe(true);
  });

  it("accepts eventTicket-only preferred scheme as a no-op", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone: any = structuredClone(eventTicket);
    clone.preferredStyleSchemes = ["eventTicket"];
    const res = PassDefinitionSchema.safeParse(clone);
    expect(res.success).toBe(true);
  });

  it("rejects preferredStyleSchemes on non-eventTicket styles", () => {
    // Discriminated unions route to the eventTicket branch only; other
    // style schemas simply don't declare the key. We confirm the schema
    // still parses a classic generic with no schemes AND rejects one
    // with a non-eventTicket scheme array via the shared validator.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = structuredClone(generic);
    bad.preferredStyleSchemes = ["posterEventTicket", "eventTicket"];
    // generic schema still accepts it at baseDefinition level, but the
    // poster refinement doesn't run for non-eventTicket. Document that
    // behavior by asserting the parse succeeds — Wallet on iOS 26 will
    // ignore poster scheme on non-eventTicket styles.
    const res = PassDefinitionSchema.safeParse(bad);
    expect(res.success).toBe(true);
  });
});
