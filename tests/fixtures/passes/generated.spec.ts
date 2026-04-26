import { describe, expect, it } from "vitest";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import { FIDELITY_FIXTURES } from "./generated";

describe("generated fidelity fixture matrix", () => {
  it("has the expected coverage (10 per style × 5 styles = 50)", () => {
    expect(FIDELITY_FIXTURES.length).toBe(50);
    const byStyle = new Map<string, number>();
    for (const f of FIDELITY_FIXTURES) {
      const s = (f.fixture as { style: string }).style;
      byStyle.set(s, (byStyle.get(s) ?? 0) + 1);
    }
    expect(byStyle.get("boardingPass")).toBe(10);
    expect(byStyle.get("coupon")).toBe(10);
    expect(byStyle.get("eventTicket")).toBe(10);
    expect(byStyle.get("generic")).toBe(10);
    expect(byStyle.get("storeCard")).toBe(10);
  });

  it("every key is unique", () => {
    const keys = FIDELITY_FIXTURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(FIDELITY_FIXTURES.map((f) => [f.key, f] as const))(
    "%s — schema accepts the fixture",
    (_key, fixture) => {
      const parsed = PassDefinitionSchema.safeParse(fixture.fixture);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"} — ${i.message}`)
          .join("\n");
        throw new Error(`rejected:\n${issues}`);
      }
      expect(parsed.success).toBe(true);
    },
  );
});
