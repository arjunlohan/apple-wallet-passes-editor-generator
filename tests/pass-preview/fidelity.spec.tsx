import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PassPreview } from "@/lib/pass-preview";
import { buildLayout } from "@/lib/pass-layout";
import boardingPass from "../fixtures/passes/boardingPass.json";
import coupon from "../fixtures/passes/coupon.json";
import eventTicket from "../fixtures/passes/eventTicket.json";
import generic from "../fixtures/passes/generic.json";
import posterEventTicket from "../fixtures/passes/posterEventTicket.json";
import storeCard from "../fixtures/passes/storeCard.json";

const FIXTURES = [
  ["boardingPass", boardingPass],
  ["coupon", coupon],
  ["eventTicket", eventTicket],
  ["generic", generic],
  ["storeCard", storeCard],
] as const;

describe("PassPreview fidelity", () => {
  it.each(FIXTURES)(
    "renders every layout-tree field's formattedValue in the DOM for %s (front)",
    (_name, fixture) => {
      const tree = buildLayout(fixture);
      const { container } = render(<PassPreview definition={fixture} face="front" />);
      const text = container.textContent ?? "";
      for (const section of tree.front.sections) {
        for (const field of section.fields) {
          if (field.formattedValue.trim().length === 0) continue;
          expect(
            text,
            `expected front to contain "${field.formattedValue}" for ${section.name}.${field.key}`,
          ).toContain(field.formattedValue);
        }
      }
    },
  );

  it.each(FIXTURES)(
    "renders every layout-tree back field's text in the DOM for %s",
    (_name, fixture) => {
      const tree = buildLayout(fixture);
      const hasBackFields = tree.back.sections.some((s) => s.fields.length > 0);
      if (!hasBackFields) return; // Nothing to assert.
      const { container } = render(<PassPreview definition={fixture} face="back" />);
      const text = container.textContent ?? "";
      for (const section of tree.back.sections) {
        for (const field of section.fields) {
          if (field.sanitizedHtml) {
            // When attributedValue is set, the preview renders the sanitized
            // HTML. Compare against the plain-text projection.
            const plain = stripTags(field.sanitizedHtml);
            if (plain.trim().length === 0) continue;
            expect(text).toContain(plain);
          } else {
            if (field.formattedValue.trim().length === 0) continue;
            expect(text).toContain(field.formattedValue);
          }
        }
      }
    },
  );

  function stripTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  it("applies the pass background color to the preview root", () => {
    const { container } = render(<PassPreview definition={generic} face="front" />);
    const root = container.querySelector('[data-style]') as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root!.style.background).toContain("rgb(30, 41, 59)");
  });

  it("renders sanitized anchor HTML on the back face", () => {
    const { container } = render(<PassPreview definition={generic} face="back" />);
    const anchor = container.querySelector("a[href='https://example.com/terms']");
    expect(anchor).not.toBeNull();
  });

  it("labels every field section with the Apple field key for debugging", () => {
    const { container } = render(<PassPreview definition={boardingPass} face="front" />);
    const fieldGroups = container.querySelectorAll("[data-field-key]");
    expect(fieldGroups.length).toBeGreaterThan(0);
  });

  describe("posterEventTicket (iOS 26+)", () => {
    it("renders the poster front face with semantic-driven content", () => {
      const tree = buildLayout(posterEventTicket);
      expect(tree.poster).toBeDefined();
      const { container } = render(
        <PassPreview definition={posterEventTicket} face="front" />,
      );
      const scheme = container.querySelector('[data-scheme="posterEventTicket"]');
      expect(scheme).not.toBeNull();

      const text = container.textContent ?? "";
      expect(text).toContain(tree.poster!.eventName);
      expect(text).toContain(tree.poster!.venueName);
      expect(text).toContain(tree.poster!.venueRegionName);
      expect(text).toContain(tree.poster!.venueRoom);
      // Performer names list ("Phoenix Rivers · The Outliers") must be on the front.
      for (const performer of tree.poster!.performerNames!) {
        expect(text).toContain(performer);
      }
    });

    it("renders NO barcode on the poster front face (moved to back)", () => {
      const { container } = render(
        <PassPreview definition={posterEventTicket} face="front" />,
      );
      expect(container.querySelector("canvas")).toBeNull();
    });

    it("renders the barcode on the poster back face", () => {
      const { container } = render(
        <PassPreview definition={posterEventTicket} face="back" />,
      );
      expect(container.querySelector("canvas")).not.toBeNull();
    });

    it("renders back fields on the poster back face", () => {
      const tree = buildLayout(posterEventTicket);
      const { container } = render(
        <PassPreview definition={posterEventTicket} face="back" />,
      );
      const text = container.textContent ?? "";
      for (const section of tree.back.sections) {
        for (const field of section.fields) {
          if (field.formattedValue.trim().length === 0) continue;
          expect(text).toContain(field.formattedValue);
        }
      }
    });
  });
});
