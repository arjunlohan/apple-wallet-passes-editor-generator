import { describe, expect, it } from "vitest";
import { buildLayout } from "@/lib/pass-layout";
import boardingPass from "../fixtures/passes/boardingPass.json";
import coupon from "../fixtures/passes/coupon.json";
import eventTicket from "../fixtures/passes/eventTicket.json";
import generic from "../fixtures/passes/generic.json";
import posterEventTicket from "../fixtures/passes/posterEventTicket.json";
import storeCard from "../fixtures/passes/storeCard.json";

describe("buildLayout", () => {
  it.each([
    ["boardingPass", boardingPass],
    ["coupon", coupon],
    ["eventTicket", eventTicket],
    ["generic", generic],
    ["storeCard", storeCard],
  ])("produces a LayoutTree for %s", (style, fixture) => {
    const tree = buildLayout(fixture);
    expect(tree.style).toBe(style);
    expect(tree.colors.background).toMatch(/^rgb\(/);
    expect(Array.isArray(tree.front.sections)).toBe(true);
    expect(Array.isArray(tree.back.sections)).toBe(true);
  });

  it("boardingPass exposes transitType in front.meta", () => {
    const tree = buildLayout(boardingPass);
    expect(tree.front.meta.transitType).toBe("PKTransitTypeAir");
  });

  it("preserves field order within a section", () => {
    const tree = buildLayout(boardingPass);
    const primary = tree.front.sections.find((s) => s.name === "primaryFields")!;
    expect(primary.fields.map((f) => f.key)).toEqual(["from", "to"]);
  });

  it("formats dates via PKDateStyleMedium / PKDateStyleShort", () => {
    const tree = buildLayout(eventTicket);
    const header = tree.front.sections.find((s) => s.name === "headerFields")!;
    // Must NOT emit the raw ISO string — the whole point of the formatter.
    expect(header.fields[0].formattedValue).not.toBe("2026-06-10T12:00:00Z");
    expect(header.fields[0].formattedValue.length).toBeGreaterThan(0);
  });

  it("sanitizes attributedValue to safe <a href>", () => {
    const tree = buildLayout(generic);
    const backFields = tree.back.sections.find((s) => s.name === "backFields")!;
    expect(backFields.fields[0].sanitizedHtml).toContain('<a href="https://example.com/terms"');
    expect(backFields.fields[0].sanitizedHtml).not.toContain("<script");
  });

  it("eventTicket puts additionalInfoFields on the back face", () => {
    const extended = structuredClone(eventTicket) as typeof eventTicket & {
      eventTicket: { additionalInfoFields?: unknown[] };
    };
    extended.eventTicket.additionalInfoFields = [
      { key: "gates", label: "Gates Open", value: "9:00 PM" },
    ];
    const tree = buildLayout(extended);
    const backNames = tree.back.sections.map((s) => s.name);
    expect(backNames).toContain("additionalInfoFields");
  });

  it("applies default label color when labelColor omitted", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripped: any = structuredClone(generic);
    delete stripped.labelColor;
    const tree = buildLayout(stripped);
    expect(tree.colors.label).toBe("rgb(102, 102, 102)");
  });

  it("buildLayout is idempotent under parse→rebuild", () => {
    const a = buildLayout(generic);
    const b = buildLayout(a.definition);
    expect(b.front.sections.map((s) => s.fields.map((f) => f.formattedValue))).toEqual(
      a.front.sections.map((s) => s.fields.map((f) => f.formattedValue)),
    );
  });

  describe("posterEventTicket", () => {
    it("exposes resolved poster metadata when scheme requests poster mode", () => {
      const tree = buildLayout(posterEventTicket);
      expect(tree.poster).toBeDefined();
      expect(tree.poster!.active).toBe(true);
      expect(tree.poster!.eventName).toBe("Fallen Voices Live");
      expect(tree.poster!.venueName).toBe("Apollo Theater");
      expect(tree.poster!.venueRegionName).toBe("New York, NY");
      expect(tree.poster!.venueRoom).toBe("Main Stage");
      expect(tree.poster!.eventType).toBe("PKEventTypeLivePerformance");
      expect(tree.poster!.performerNames).toEqual([
        "Phoenix Rivers",
        "The Outliers",
      ]);
      expect(tree.poster!.eventDateText).toBeDefined();
      expect(tree.poster!.eventDateText).not.toBe("2026-09-12T20:00:00Z");
      expect(tree.poster!.suppressHeaderDarkening).toBe(false);
    });

    it("omits poster metadata for classic event tickets", () => {
      const tree = buildLayout(eventTicket);
      expect(tree.poster).toBeUndefined();
    });

    it("still builds classic sections alongside poster metadata (pre-iOS 26 fallback)", () => {
      const tree = buildLayout(posterEventTicket);
      // Poster mode does NOT drop the classic sections — those are the
      // fallback rendering on pre-iOS 26 devices.
      const primary = tree.front.sections.find((s) => s.name === "primaryFields");
      expect(primary).toBeDefined();
      expect(primary!.fields[0].formattedValue).toBe("Fallen Voices Live");
    });

    it("honors suppressHeaderDarkening", () => {
      const mod = structuredClone(posterEventTicket) as typeof posterEventTicket & {
        suppressHeaderDarkening?: boolean;
      };
      mod.suppressHeaderDarkening = true;
      const tree = buildLayout(mod);
      expect(tree.poster!.suppressHeaderDarkening).toBe(true);
    });
  });
});
