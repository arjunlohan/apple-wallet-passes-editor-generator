import { describe, expect, it } from "vitest";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "@/app/editor/_components/buildDefinition";
import { defaultValues } from "@/app/editor/_components/defaults";

// Verify the defaults for every style parse cleanly through both modes.
describe("defaults round-trip", () => {
  for (const style of ["boardingPass","coupon","eventTicket","generic","storeCard"] as const) {
    it(`${style} — preview mode builds a schema-valid definition`, () => {
      const v = defaultValues(style);
      const def = buildDefinitionFromForm(v, "preview");
      const parsed = PassDefinitionSchema.safeParse(def);
      if (!parsed.success) {
        const msg = parsed.error.issues.map(i => `${i.path.join(".")} — ${i.message}`).join("\n");
        throw new Error("rejected:\n" + msg);
      }
      expect(parsed.success).toBe(true);
    });
    it(`${style} — validate mode builds a schema-valid definition`, () => {
      const v = defaultValues(style);
      const def = buildDefinitionFromForm(v, "validate");
      const parsed = PassDefinitionSchema.safeParse(def);
      expect(parsed.success).toBe(true);
    });
  }
});
